import type {
  AdcId,
  AlarmId,
  AlarmSeverity,
  Connectivity,
  DateRange,
  MedicationId,
  PatientId,
  ReportedState,
  StaffMemberId,
  TransactionId,
  UserId,
} from '#modules/shared/types'

export type ReportId = number

export interface StoredAlarm {
  /** Transaction identifier for an ADC alarm, generated identifier for a communication loss. */
  alarmId: AlarmId
  adcId: AdcId
  /** Set by the ADC (A-14), or by the system for a communication loss. */
  timestamp: Date
  alarmType: string
  severity: AlarmSeverity
  description: string | null
  source: 'adc' | 'communication_loss'
}

export interface AcknowledgementRecord {
  alarmId: AlarmId
  userId: UserId
  at: Date
}

export interface StoredAlarmWithAck extends StoredAlarm {
  acknowledgement: { userId: UserId; at: Date } | null
}

export interface DispensingRecord {
  transactionId: TransactionId
  adcId: AdcId
  timestamp: Date
  medicationId: MedicationId
  medicationName: string
  quantityInBoxes: number
  patientId: PatientId
  staffMemberId: StaffMemberId
  staffMemberName: string
}

export interface StatusChangeRecord {
  adcId: AdcId
  reportedState: ReportedState | null
  connectivity: Connectivity
  at: Date
}

export interface AuditEntry {
  userId: UserId
  action: string
  /** ADC, account or report the action was about. */
  target: string
  outcome: string | null
  at: Date
}

export interface SystemLogEntry {
  event: string
  adcId: AdcId | null
  details: string | null
  at: Date
}

export interface SavedReport {
  kind: 'consumption' | 'alarms'
  parameters: Record<string, unknown>
  /** Figures as they were at generation time (FR-RPT-08). */
  figures: unknown
  generatedAt: Date
  generatedBy: UserId
}

export interface AdcHistory {
  adcId: AdcId
  range: DateRange
  dispensing: DispensingRecord[]
  statusChanges: StatusChangeRecord[]
  alarms: StoredAlarmWithAck[]
}

export interface DispensingFilter {
  range: DateRange
  adcId?: AdcId
  medicationId?: MedicationId
  patientId?: PatientId
  staffMemberId?: StaffMemberId
}

export interface AuditFilter {
  range: DateRange
  adcId?: AdcId
  userId?: UserId
}
