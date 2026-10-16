import type {
  AdcId,
  DateRange,
  MedicationId,
  PatientId,
  StaffMemberId,
} from '#modules/shared/types'
import type { ReportId } from '#modules/history/types'

export interface ConsumptionParams {
  range: DateRange
  adcId?: AdcId
  medicationId?: MedicationId
  patientId?: PatientId
  staffMemberId?: StaffMemberId
}

export interface Report {
  reportId: ReportId
  kind: 'consumption' | 'alarms'
  parameters: Record<string, unknown>
  generatedAt: Date
  /** Rows as generated; patient identifiers left out unless the viewer may see them. */
  rows: Array<Record<string, unknown>>
}

export interface ExportFile {
  fileName: string
  contentType: string
  content: string
}
