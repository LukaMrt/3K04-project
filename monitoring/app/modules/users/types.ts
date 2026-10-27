import type { Role, UserId } from '#modules/shared/types'

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

/** An account as the administrator sees it (FR-USR-03 to 05); never the password. */
export interface AccountSummary {
  userId: UserId
  fullName: string | null
  email: string
  role: Role
  active: boolean
}
