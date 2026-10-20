import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { errors as vineErrors } from '@vinejs/vine'
import AlarmService from '#modules/alarms/alarms_service'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import InventoryService from '#modules/inventory/inventory_service'
import { notImplemented } from '#modules/shared/errors'
import type { Actor, AdcId } from '#modules/shared/types'
import type {
  AdcCommand,
  AdcSettings,
  DeliveryOutcome,
  ProtocolResponse,
} from '#modules/adc_communication/types'
import AdcContactModel from '#modules/adc_communication/models/adc_contact'
import {
  HEARTBEAT_PERIOD_SECONDS,
  heartbeatValidator,
  readTransaction,
  registrationValidator,
} from '#modules/adc_communication/protocol'

/**
 * ADC Communication Manager — module interface.
 *
 * Responsibility: receive and validate everything sent by ADC units (heartbeats,
 * inventory, alarms, dispensing activity) and send commands / configuration to them.
 *
 * Secret (anticipated change): the communication protocol and message format agreed
 * with the Part A sub-team, and the contact address of each ADC (D-32). No other module
 * knows about HTTP payloads or ADC addresses.
 */
@inject()
export default class AdcCommunicationService {
  constructor(
    protected cabinetHealth: CabinetHealthService,
    protected inventory: InventoryService,
    protected alarms: AlarmService,
    protected history: HistoryService,
    protected clock: ClockService
  ) {}

  /**
   * Handles POST /api/v1/adcs/register (SPEC-COM-01).
   * Effects: invalid request → 400 and rejection logged; valid → cabinetHealth.register(),
   * contact address kept, 200. An internal failure answers 500.
   */
  async receiveRegistration(payload: unknown): Promise<ProtocolResponse> {
    try {
      const now = this.clock.now()
      const [error, registration] = await registrationValidator.tryValidate(payload)
      if (error) {
        await this.logSystemEvent('registration_rejected', null, error.message)
        return invalidMessage(error)
      }

      const { adcId, label, contactAddress, location } = registration
      const result = await this.cabinetHealth.register({ adcId, label, ...location }, now)
      await AdcContactModel.updateOrCreate({ adcId }, { contactAddress })

      return ok({
        adcId,
        registeredAt: now.toISOString(),
        firstRegistration: result.firstRegistration,
        heartbeatPeriodSeconds: HEARTBEAT_PERIOD_SECONDS,
      })
    } catch (error) {
      return internalError(error)
    }
  }

  /**
   * Handles POST /api/v1/heartbeats (SPEC-COM-02, SPEC-COM-03).
   * Effects: invalid envelope → 400; unknown ADC → 404 and discard logged; otherwise each
   * transaction recorded (alarms.recordFromAdc, history.recordDispensing) or rejected and
   * logged, then inventory.replaceInventory(), then cabinetHealth.recordHeartbeat() last,
   * and only then 200 with one acknowledgement per transaction (FR-REQ-01).
   * A storage failure answers 500, acknowledges nothing and does not count as a contact
   * (FR-COM-03): the transactions already recorded are detected as duplicates when the
   * ADC sends them again (D-28).
   */
  async receiveHeartbeat(payload: unknown): Promise<ProtocolResponse> {
    try {
      const now = this.clock.now()
      const [error, heartbeat] = await heartbeatValidator.tryValidate(payload)
      if (error) return invalidMessage(error)

      const { adcId } = heartbeat
      if (!(await this.cabinetHealth.isRegistered(adcId))) {
        await this.logSystemEvent('heartbeat_discarded', adcId, 'ADC not registered')
        return failure(404, 'ADC_NOT_REGISTERED', `ADC ${adcId} is not registered`)
      }

      const acknowledgements = []
      for (const transaction of heartbeat.transactions) {
        acknowledgements.push(await this.handleTransaction(adcId, transaction))
      }
      await this.inventory.replaceInventory(adcId, heartbeat.inventory, now)
      await this.cabinetHealth.recordHeartbeat(adcId, heartbeat.state, now)

      return ok({ receivedAt: now.toISOString(), acknowledgements })
    } catch (error) {
      return internalError(error)
    }
  }

  /**
   * Answer to an ADC request whose body could not be read as JSON (contract §6.1), called
   * by the HTTP exception handler before any route is reached.
   */
  answerUnreadableBody(): ProtocolResponse {
    return failure(400, 'INVALID_MESSAGE', 'The body is not valid JSON.')
  }

  /**
   * Pre: `actor` may send commands (D-10, checked by the caller, D-31).
   * Effects (SPEC-COM-04, SPEC-COM-05): offline ADC → nothing sent; otherwise sent, and
   * the answer awaited for 10 s at most. Sending and outcome audited (NFR-AUD-01, 05).
   * No automatic retry (D-04).
   * Throws: UnknownAdcError.
   */
  async sendCommand(actor: Actor, adcId: AdcId, command: AdcCommand): Promise<DeliveryOutcome> {
    return notImplemented('AdcCommunicationService.sendCommand', actor, adcId, command)
  }

  /**
   * Pre: `actor` may send configuration (D-10, D-31); settings within their rules
   * (interface §4.2).
   * Effects: same as sendCommand.
   * Throws: UnknownAdcError.
   */
  async sendConfiguration(
    actor: Actor,
    adcId: AdcId,
    settings: AdcSettings
  ): Promise<DeliveryOutcome> {
    return notImplemented('AdcCommunicationService.sendConfiguration', actor, adcId, settings)
  }

  /** SPEC-COM-03: records the transaction, or rejects it and logs why. */
  private async handleTransaction(adcId: AdcId, transaction: { transactionId: string }) {
    const { transactionId } = transaction
    const read = readTransaction(transaction)

    if (read.kind === 'rejected') {
      const { reason, field } = read
      await this.logSystemEvent(
        'transaction_rejected',
        adcId,
        `${transactionId}: ${reason}${field ? ` (${field})` : ''}`
      )
      return { transactionId, status: 'rejected', reason, ...(field && { field }) }
    }

    // 'recorded' and 'duplicate' are both acknowledged as received (FR-COM-08, D-07).
    if (read.kind === 'alarm') {
      const { kind, ...alarm } = read
      await this.alarms.recordFromAdc({ transactionId, adcId, ...alarm })
    } else {
      const { kind, ...activity } = read
      await this.history.recordDispensing({ transactionId, adcId, ...activity })
    }
    return { transactionId, status: 'received' }
  }

  private async logSystemEvent(event: string, adcId: AdcId | null, details: string) {
    await this.history.appendSystemLog({ event, adcId, details, at: this.clock.now() })
  }
}

function ok(body: unknown): ProtocolResponse {
  return { httpStatus: 200, body }
}

/** Error body of contract §2. */
function failure(httpStatus: number, code: string, message: string, details?: unknown) {
  return { httpStatus, body: { error: { code, message, ...(details ? { details } : {}) } } }
}

function invalidMessage(error: InstanceType<typeof vineErrors.E_VALIDATION_ERROR>) {
  const details = (error.messages as Array<{ field: string; rule: string }>).map((m) => ({
    field: m.field,
    problem: m.rule,
  }))
  return failure(400, 'INVALID_MESSAGE', 'The message breaks the interface contract.', details)
}

function internalError(error: unknown): ProtocolResponse {
  logger.error({ err: error }, 'ADC request failed')
  return failure(500, 'INTERNAL_ERROR', 'Unexpected failure; nothing was acknowledged.')
}
