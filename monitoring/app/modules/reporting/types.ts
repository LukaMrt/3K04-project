import type {
  AdcId,
  DateRange,
  MedicationId,
  PatientId,
  StaffMemberId,
} from '#modules/shared/types'
import type { AdcHistory, DispensingRecord, ReportId } from '#modules/history/types'

export type ReportKind = 'consumption' | 'alarms'

export interface ConsumptionParams {
  range: DateRange
  adcId?: AdcId
  medicationId?: MedicationId
  patientId?: PatientId
  staffMemberId?: StaffMemberId
}

export interface Report {
  reportId: ReportId
  kind: ReportKind
  /** As chosen by the user, dates in ISO format (FR-RPT-08). */
  parameters: Record<string, unknown>
  generatedAt: Date
  /** Boxes dispensed for a consumption report, number of alarms for an alarm report. */
  total: number
  /** Rows as generated; patient identifiers left out unless the viewer may see them. */
  rows: Array<Record<string, unknown>>
}

/** A saved report, without its figures, to choose which one to open (FR-RPT-08). */
export interface SavedReportSummary {
  reportId: ReportId
  kind: ReportKind
  parameters: Record<string, unknown>
  generatedAt: Date
}

export interface ExportFile {
  fileName: string
  contentType: string
  content: string
}

/** The event history of an ADC as a user sees it: patient identifiers only if allowed. */
export interface AdcHistoryView extends Omit<AdcHistory, 'dispensing'> {
  dispensing: Array<Omit<DispensingRecord, 'patientId'> & { patientId?: PatientId }>
}
