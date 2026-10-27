import { DateTime } from 'luxon'
import { HOSPITAL_TIME_ZONE } from '#modules/shared/time_zone'
import type { AlarmSeverity, Role } from '#modules/shared/types'

/**
 * Wording of the dashboard (secret of the Operator Dashboard: page layout and wording).
 * Shared with every Edge view by start/view.ts.
 */

/** Times are stored in UTC and shown in the time zone of the hospital (D-43). */
export const TIME_ZONE = HOSPITAL_TIME_ZONE

export const ROLES: Role[] = [
  'nurse',
  'pharmacist',
  'technician',
  'administrator',
  'risk_management',
]

const ROLE_NAMES: Record<Role, string> = {
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
  technician: 'Technician',
  administrator: 'Administrator',
  risk_management: 'Hospital risk management',
}

export function roleName(role: Role): string {
  return ROLE_NAMES[role] ?? role
}

/**
 * Visual weight of a D-16 label: it only adds colour to the text label, which is always
 * shown (NFR-ACC-02).
 */
export function labelClass(value: string): string {
  if (['OFFLINE', 'UNREACHABLE', 'FAULT', 'critical', 'error', 'LOW STOCK'].includes(value)) {
    return 'label label--danger'
  }
  if (['MAINTENANCE', 'PENDING', 'warning'].includes(value)) return 'label label--warn'
  if (value === 'ONLINE') return 'label label--ok'
  return 'label'
}

/** D-16 label of a severity: the severity itself, in capitals. */
export function severityLabel(severity: AlarmSeverity): string {
  return severity.toUpperCase()
}

/** Times are shown to the second (D-34), in the time zone of the hospital (D-43). */
export function formatTime(value: Date | string | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return DateTime.fromJSDate(date, { zone: TIME_ZONE }).toFormat('yyyy-LL-dd HH:mm:ss')
}
