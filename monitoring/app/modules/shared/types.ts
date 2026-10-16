/**
 * Types shared by every module. This folder is not a module: it has no state,
 * no behaviour and no secret, only the vocabulary the module interfaces are written in.
 */

/** UUID v4 strings, as in the ADC ↔ Monitoring interface contract (§2). */
export type AdcId = string
export type AlarmId = string
export type TransactionId = string
export type MedicationId = string
export type PatientId = string
export type StaffMemberId = string
export type CommandId = string

/** Account number of a dashboard user. */
export type UserId = number

/** Roles of the D-14 permission matrix. */
export type Role = 'nurse' | 'pharmacist' | 'technician' | 'administrator' | 'risk_management'

/** The user on whose behalf an operation is called. */
export interface Actor {
  userId: UserId
  role: Role
}

/** Severity of an alarm (FR-ALM-03). */
export type AlarmSeverity = 'info' | 'warning' | 'error' | 'critical'

/** Operational state reported by an ADC in its heartbeats (FR-HLT-01). */
export type ReportedState = 'online' | 'maintenance' | 'fault'

/** Connectivity detected by the system (SPEC-HLT-02). */
export type Connectivity = 'reachable' | 'unreachable' | 'offline'

/** Inclusive date range. */
export interface DateRange {
  from: Date
  to: Date
}

/** Answer of an operation that records a transaction received from an ADC (D-28). */
export type RecordOutcome = 'recorded' | 'duplicate'

/** Removes a listener given to a `subscribe` operation. */
export type Unsubscribe = () => void
