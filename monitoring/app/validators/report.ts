import vine from '@vinejs/vine'
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
 * The days from `from` to `to`, both included, in the server's time zone; null when the
 * end comes before the start (US-RPT-01, "invalid date range").
 */
export function toRange(from: string, to: string): DateRange | null {
  const range = { from: new Date(`${from}T00:00:00`), to: new Date(`${to}T23:59:59`) }
  return range.from <= range.to ? range : null
}

/** The last `days` days up to today, as form values. */
export function lastDays(days: number) {
  const iso = (date: Date) => date.toLocaleDateString('sv-SE')
  return { from: iso(new Date(Date.now() - (days - 1) * 86_400_000)), to: iso(new Date()) }
}
