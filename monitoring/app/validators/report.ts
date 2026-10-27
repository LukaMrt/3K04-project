import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { TIME_ZONE } from '#modules/dashboard/presentation'
import type { DateRange } from '#modules/shared/types'

const day = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const uuid = () => vine.string().trim().uuid().nullable().optional()

/** A period of whole days, as typed in the forms (FR-RPT-01, FR-HIS-04, FR-HIS-07). */
export const periodValidator = vine.create({ from: day(), to: day() })

/** FR-RPT-01 to 05: period and optional filters. */
export const consumptionValidator = vine.create({
  from: day(),
  to: day(),
  adcId: uuid(),
  medicationId: uuid(),
  patientId: uuid(),
  staffMemberId: uuid(),
})

/** FR-HIS-07: period, optionally one ADC or one user. */
export const auditValidator = vine.create({
  from: day(),
  to: day(),
  adcId: uuid(),
  userId: vine.number().withoutDecimals().nullable().optional(),
})

/**
 * The days from `from` to `to`, both included, in the time zone of the hospital (D-43);
 * null when the end comes before the start (US-RPT-01, "invalid date range").
 */
export function toRange(from: string, to: string): DateRange | null {
  const range = {
    from: DateTime.fromISO(from, { zone: TIME_ZONE }).startOf('day').toJSDate(),
    to: DateTime.fromISO(to, { zone: TIME_ZONE }).endOf('day').toJSDate(),
  }
  return range.from <= range.to ? range : null
}

/** The last `days` days up to today in the hospital, as form values. */
export function lastDays(days: number) {
  const today = DateTime.now().setZone(TIME_ZONE)
  return { from: today.minus({ days: days - 1 }).toISODate()!, to: today.toISODate()! }
}
