import { randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

/**
 * Fake ADC unit: plays the ADC side of the ADC ↔ Monitoring interface contract
 * (docs/part-b/interface-adc-monitoring.md) so that the Monitoring System can be tested and
 * demonstrated without the Part A software.
 *
 * It only speaks the JSON of the contract: it imports nothing from app/, like a real ADC.
 * Used by the `adc:simulate` command and by the tests.
 */

export type AdcState = 'online' | 'maintenance' | 'fault'

/** How the ADC answers the commands and configurations it receives (tests and demos). */
export type ReplyMode = 'apply' | 'error' | 'wrongId' | 'silent'

export interface InventoryEntry {
  medicationId: string
  medicationName: string
  quantityInBoxes: number
}

export interface FakeAdcOptions {
  adcId: string
  label: string
  floor: number
  description: string
  /** Base URL of the Monitoring System, e.g. http://localhost:3333 */
  monitoringUrl: string
  /** Port of the command server; 0 picks a free one. */
  port?: number
  inventory?: InventoryEntry[]
  log?: (message: string) => void
}

export interface HeartbeatResult {
  httpStatus: number | null
  acknowledgements: Array<{ transactionId: string; status: string; reason?: string }>
}

/** The ADC waits 10 s at most for the Monitoring System (contract §7). */
const REQUEST_TIMEOUT_MS = 10_000

export class FakeAdc {
  readonly adcId: string
  readonly label: string
  state: AdcState = 'online'
  replyMode: ReplyMode = 'apply'
  settings: Record<string, unknown> = {}
  inventory: InventoryEntry[]
  /** Transactions not yet acknowledged "received" or "rejected" (contract §3.2). */
  pending: Array<Record<string, unknown>> = []
  /** Every command and configuration received, for tests. */
  received: Array<{ path: string; body: Record<string, unknown> }> = []

  private server: Server | null = null
  private heartbeatQueue: Promise<unknown> = Promise.resolve()
  private appliedCommandIds = new Set<string>()

  constructor(private options: FakeAdcOptions) {
    this.adcId = options.adcId
    this.label = options.label
    this.inventory = options.inventory ?? []
  }

  get contactAddress() {
    const { port } = this.server!.address() as AddressInfo
    return `http://localhost:${port}`
  }

  /** Starts the command server (contract §4). */
  async start() {
    this.server = createServer((request, response) => this.handle(request, response))
    await new Promise<void>((resolve) => this.server!.listen(this.options.port ?? 0, resolve))
  }

  async stop() {
    if (!this.server) return
    this.server.closeAllConnections()
    await new Promise((resolve) => this.server!.close(resolve))
    this.server = null
  }

  /** Contract §3.1: sent at start-up and whenever the Monitoring System answers 404. */
  async register() {
    if (!this.server) return { httpStatus: null, body: null }
    const { httpStatus, body } = await this.post('/api/v1/adcs/register', {
      adcId: this.adcId,
      label: this.label,
      contactAddress: this.contactAddress,
      location: { floor: this.options.floor, description: this.options.description },
    })
    this.log(`registration → ${httpStatus ?? 'no answer'}`)
    return { httpStatus, body }
  }

  /**
   * Contract §3.2 and §7: sends the state, the complete inventory and every pending
   * transaction. Heartbeats go one at a time; the acknowledged transactions are forgotten,
   * the others are kept for the next one.
   */
  sendHeartbeat(): Promise<HeartbeatResult> {
    const next = this.heartbeatQueue.then(() => this.heartbeatOnce(true))
    this.heartbeatQueue = next.catch(() => {})
    return next
  }

  /** Raises an alarm and sends it at once (A-08). */
  raiseAlarm(alarmType: string, severity: string, description: string | null = null) {
    this.pending.push({
      type: 'alarm',
      transactionId: randomUUID(),
      timestamp: new Date().toISOString(),
      alarmType,
      severity,
      ...(description ? { description } : {}),
    })
    return this.sendHeartbeat()
  }

  /** Dispenses one box; the activity goes with the next heartbeat. */
  dispense(
    medicationId: string,
    patientId: string,
    staffMemberId: string,
    staffMemberName: string
  ) {
    const entry = this.inventory.find((e) => e.medicationId === medicationId)
    if (!entry || entry.quantityInBoxes === 0) return false
    entry.quantityInBoxes -= 1
    this.pending.push({
      type: 'dispensing',
      transactionId: randomUUID(),
      timestamp: new Date().toISOString(),
      medicationId,
      medicationName: entry.medicationName,
      quantityInBoxes: 1,
      patientId,
      staffMemberId,
      staffMemberName,
    })
    return true
  }

  /**
   * Adds boxes of a medication already in the ADC and sends a heartbeat at once. The
   * contract has no restock transaction: only the complete inventory changes (contract §3.2).
   */
  refill(medicationId: string, boxes: number) {
    const entry = this.inventory.find((e) => e.medicationId === medicationId)
    if (!entry || !Number.isInteger(boxes) || boxes < 1) return null
    entry.quantityInBoxes += boxes
    return this.sendHeartbeat()
  }

  /** Changes the state and sends a heartbeat at once (contract §4.1). */
  setState(state: AdcState) {
    this.state = state
    return this.sendHeartbeat()
  }

  private async heartbeatOnce(registerIfUnknown: boolean): Promise<HeartbeatResult> {
    // A stopped ADC sends nothing (e.g. a heartbeat triggered just before stop()).
    if (!this.server) return { httpStatus: null, acknowledgements: [] }
    const sent = [...this.pending]
    const { httpStatus, body } = await this.post('/api/v1/heartbeats', {
      adcId: this.adcId,
      sentAt: new Date().toISOString(),
      state: this.state,
      inventory: this.inventory,
      transactions: sent,
    })

    if (httpStatus === 404 && registerIfUnknown) {
      await this.register()
      return this.heartbeatOnce(false)
    }
    if (httpStatus !== 200) {
      this.log(`heartbeat → ${httpStatus ?? 'no answer'}, ${sent.length} transaction(s) kept`)
      return { httpStatus, acknowledgements: [] }
    }

    const { acknowledgements } = body as HeartbeatResult
    const acknowledged = new Set(acknowledgements.map((a) => a.transactionId))
    this.pending = this.pending.filter((t) => !acknowledged.has(t.transactionId as string))
    for (const a of acknowledgements) {
      this.log(`  ${a.transactionId} ${a.status}${a.reason ? ` (${a.reason})` : ''}`)
    }
    this.log(`heartbeat → 200, state ${this.state}`)
    return { httpStatus, acknowledgements }
  }

  /** Contract §4: commands and configurations received from the Monitoring System. */
  private async handle(request: IncomingMessage, response: ServerResponse) {
    const path = request.url ?? ''
    const body = await readJson(request)
    if (request.method !== 'POST' || !body) return reply(response, 400, error('INVALID_MESSAGE'))
    if (path !== '/api/v1/commands' && path !== '/api/v1/configuration') {
      return reply(response, 404, error('NOT_FOUND'))
    }

    this.received.push({ path, body })
    const idField = path === '/api/v1/commands' ? 'commandId' : 'configurationId'
    this.log(`received ${path} ${JSON.stringify(body)} (reply mode: ${this.replyMode})`)

    if (this.replyMode === 'silent') return
    if (this.replyMode === 'error') return reply(response, 500, error('INTERNAL_ERROR'))
    if (body.adcId !== this.adcId) return reply(response, 409, error('ADC_ID_MISMATCH'))

    const answer = {
      [idField]: this.replyMode === 'wrongId' ? randomUUID() : body[idField],
      adcId: this.adcId,
      status: 'applied',
    }
    if (idField === 'configurationId') {
      Object.assign(this.settings, body.settings)
      return reply(response, 200, answer)
    }

    if (body.command !== 'set_maintenance_mode')
      return reply(response, 400, error('UNKNOWN_COMMAND'))
    if (this.state === 'fault') return reply(response, 409, error('COMMAND_NOT_APPLICABLE'))

    // A command received twice is acknowledged again without being applied twice.
    const commandId = body.commandId as string
    if (!this.appliedCommandIds.has(commandId)) {
      this.appliedCommandIds.add(commandId)
      const enabled = (body.parameters as { enabled?: boolean } | undefined)?.enabled
      reply(response, 200, answer)
      await this.setState(enabled ? 'maintenance' : 'online')
      return
    }
    reply(response, 200, answer)
  }

  private async post(path: string, payload: unknown) {
    try {
      const response = await fetch(`${this.options.monitoringUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      return { httpStatus: response.status, body: await response.json().catch(() => null) }
    } catch {
      return { httpStatus: null, body: null }
    }
  }

  private log(message: string) {
    this.options.log?.(`[${this.label}] ${message}`)
  }
}

function error(code: string) {
  return { error: { code, message: code } }
}

function reply(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body))
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown> | null> {
  let raw = ''
  for await (const chunk of request) raw += chunk
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}
