import type { Role } from '#modules/shared/types'

/** Dashboard functions of the D-14 permission matrix. */
export type DashboardFunction =
  | 'viewAdcStatuses'
  | 'viewAdcInventory'
  | 'viewStockSources'
  | 'viewAlarms'
  | 'acknowledgeAlarm'
  | 'sendCommand'
  | 'sendConfiguration'
  | 'viewAdcHistory'
  | 'consumptionReport'
  | 'consumptionReportByStaff'
  | 'alarmReport'
  | 'openSavedReport'
  | 'manageAccounts'
  | 'viewAuditLog'

export interface NewAccount {
  fullName: string
  email: string
  password: string
  role: Role
}
