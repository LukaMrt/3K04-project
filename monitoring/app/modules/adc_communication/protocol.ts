/**
 * Internal to the ADC Communication Manager: the message formats of the ADC ↔ Monitoring
 * interface contract (docs/part-b/interface-adc-monitoring.md). Part of the module's
 * secret: no other module may import this file.
 *
 * The body parser has already turned empty strings into null, so "absent or empty"
 * (contract §6.3) is simply `undefined` or `null` here.
 */

import vine from '@vinejs/vine'
import app from '@adonisjs/core/services/app'
import type { AdcId, AlarmSeverity } from '#modules/shared/types'
import type { AdcCommand, AdcSettings, DeliveryOutcome } from '#modules/adc_communication/types'

/** Contract §2: identifiers are lowercase UUID v4. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
/** Contract §2: RFC 3339, UTC, with the Z suffix and milliseconds. */
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const MAX_LABEL_LENGTH = 128

const SEVERITIES: AlarmSeverity[] = ['info', 'warning', 'error', 'critical']
/** Contract §5.2: reserved to the Monitoring System (FR-HLT-04). */
const RESERVED_ALARM_TYPE = 'communication_loss'

/** Contract §3.1. */
export const HEARTBEAT_PERIOD_SECONDS = 30

const uuid = () => vine.string().regex(UUID_V4)
const label = () => vine.string().maxLength(MAX_LABEL_LENGTH)

/** Contract §3.1. `http://` is accepted outside production, for demonstrations (D-35). */
export const registrationValidator = vine.create({
  adcId: uuid(),
  label: label(),
  contactAddress: vine.string().url({
    require_protocol: true,
    require_tld: false,
    protocols: app.inProduction ? ['https'] : ['https', 'http'],
  }),
  location: vine.object({
    floor: vine.number({ strict: true }).withoutDecimals(),
    description: vine.string(),
  }),
})

/**
 * Contract §3.2, envelope only. A transaction only needs a usable transactionId here; its
 * other fields are checked one by one by readTransaction.
 */
export const heartbeatValidator = vine.create({
  adcId: uuid(),
  sentAt: vine.string().regex(TIMESTAMP),
  state: vine.enum(['online', 'maintenance', 'fault'] as const),
  inventory: vine
    .array(
      vine.object({
        medicationId: uuid(),
        medicationName: label(),
        quantityInBoxes: vine.number({ strict: true }).withoutDecimals().min(0),
      })
    )
    .distinct('medicationId'),
  transactions: vine.array(vine.object({ transactionId: uuid() }).allowUnknownProperties()),
})

/** Contract §6.3. */
export type RejectionReason =
  'MISSING_FIELD' | 'INVALID_SEVERITY' | 'INVALID_VALUE' | 'UNKNOWN_TYPE'

/** A transaction read from a heartbeat: what to record, or why it is rejected. */
export type ReadTransaction =
  | {
      kind: 'alarm'
      timestamp: Date
      alarmType: string
      severity: AlarmSeverity
      description: string | null
    }
  | {
      kind: 'dispensing'
      timestamp: Date
      medicationId: string
      medicationName: string
      quantityInBoxes: number
      patientId: string
      staffMemberId: string
      staffMemberName: string
    }
  | { kind: 'rejected'; reason: RejectionReason; field?: string }

/** Classifies a transaction, checking its rows of SPEC-COM-03 in order. */
export function readTransaction(transaction: Record<string, unknown>): ReadTransaction {
  if (transaction.type === 'alarm') return readAlarm(transaction)
  if (transaction.type === 'dispensing') return readDispensing(transaction)
  return { kind: 'rejected', reason: 'UNKNOWN_TYPE' }
}

function readAlarm(t: Record<string, unknown>): ReadTransaction {
  const missing = firstMissing(t, ['timestamp', 'alarmType', 'severity'])
  if (missing) return { kind: 'rejected', reason: 'MISSING_FIELD', field: missing }

  if (!SEVERITIES.includes(t.severity as AlarmSeverity)) {
    return { kind: 'rejected', reason: 'INVALID_SEVERITY', field: 'severity' }
  }

  const timestamp = parseTimestamp(t.timestamp)
  if (!timestamp) return invalid('timestamp')
  if (!isLabel(t.alarmType) || t.alarmType === RESERVED_ALARM_TYPE) return invalid('alarmType')
  if (t.description !== undefined && t.description !== null && typeof t.description !== 'string') {
    return invalid('description')
  }

  return {
    kind: 'alarm',
    timestamp,
    alarmType: t.alarmType,
    severity: t.severity as AlarmSeverity,
    description: (t.description as string | undefined) ?? null,
  }
}

function readDispensing(t: Record<string, unknown>): ReadTransaction {
  const missing = firstMissing(t, [
    'timestamp',
    'medicationId',
    'medicationName',
    'quantityInBoxes',
    'patientId',
    'staffMemberId',
    'staffMemberName',
  ])
  if (missing) return { kind: 'rejected', reason: 'MISSING_FIELD', field: missing }

  const timestamp = parseTimestamp(t.timestamp)
  if (!timestamp) return invalid('timestamp')
  for (const field of ['medicationId', 'patientId', 'staffMemberId']) {
    if (!isUuid(t[field])) return invalid(field)
  }
  for (const field of ['medicationName', 'staffMemberName']) {
    if (!isLabel(t[field])) return invalid(field)
  }
  if (!Number.isInteger(t.quantityInBoxes) || (t.quantityInBoxes as number) < 1) {
    return invalid('quantityInBoxes')
  }

  return {
    kind: 'dispensing',
    timestamp,
    medicationId: t.medicationId as string,
    medicationName: t.medicationName as string,
    quantityInBoxes: t.quantityInBoxes as number,
    patientId: t.patientId as string,
    staffMemberId: t.staffMemberId as string,
    staffMemberName: t.staffMemberName as string,
  }
}

function firstMissing(t: Record<string, unknown>, fields: string[]): string | undefined {
  return fields.find((field) => t[field] === undefined || t[field] === null)
}

function invalid(field: string): ReadTransaction {
  return { kind: 'rejected', reason: 'INVALID_VALUE', field }
}

function parseTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string' || !TIMESTAMP.test(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4.test(value)
}

function isLabel(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_LABEL_LENGTH
}

/** Contract §4: the Monitoring System waits 10 s at most for an ADC (FR-COM-06). */
export const ADC_ANSWER_TIMEOUT_MS = 10_000

/** Contract §4.1 and §4.2: path, identifier field and body of what is sent to an ADC. */
export function commandMessage(adcId: AdcId, command: AdcCommand, id: string, issuedAt: Date) {
  return {
    path: '/api/v1/commands',
    idField: 'commandId',
    body: {
      commandId: id,
      adcId,
      command: 'set_maintenance_mode',
      parameters: { enabled: command.enabled },
      issuedAt: issuedAt.toISOString(),
    },
  }
}

export function configurationMessage(
  adcId: AdcId,
  settings: AdcSettings,
  id: string,
  issuedAt: Date
) {
  return {
    path: '/api/v1/configuration',
    idField: 'configurationId',
    body: { configurationId: id, adcId, settings, issuedAt: issuedAt.toISOString() },
  }
}

/** SPEC-COM-05: outcome of an ADC answer; `null` means no answer in time. */
export function readDeliveryAnswer(
  answer: { status: number; body: any } | null,
  expected: { idField: string; id: string; adcId: AdcId }
): Exclude<DeliveryOutcome, { kind: 'refusedOffline' }> {
  if (!answer) {
    return { kind: 'failed', code: 'TIMEOUT', message: 'No answer from the ADC within 10 s.' }
  }
  if (answer.status !== 200) {
    return {
      kind: 'failed',
      code: answer.body?.error?.code ?? `HTTP_${answer.status}`,
      message: answer.body?.error?.message ?? 'The ADC refused the request.',
    }
  }
  if (answer.body?.[expected.idField] !== expected.id || answer.body?.adcId !== expected.adcId) {
    return { kind: 'failed', code: 'ID_MISMATCH', message: 'The ADC acknowledged another request.' }
  }
  return { kind: 'delivered' }
}
