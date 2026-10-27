import { inject } from '@adonisjs/core'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import UserService from '#modules/users/users_service'
import type { Actor, AdcId, DateRange } from '#modules/shared/types'
import type { AuditEntry, AuditFilter, ReportId } from '#modules/history/types'
import { UnknownReportError } from '#modules/reporting/errors'
import type {
  AdcHistoryView,
  ConsumptionParams,
  ExportFile,
  Report,
  ReportKind,
  SavedReportSummary,
} from '#modules/reporting/types'

/** What is saved for a report: its figures as generated, patient identifiers included. */
interface Figures {
  total: number
  rows: Array<Record<string, unknown>>
}

/** The function of the D-14 matrix that lets a role generate, and reopen, each kind. */
const GENERATE: Record<ReportKind, 'consumptionReport' | 'alarmReport'> = {
  consumption: 'consumptionReport',
  alarms: 'alarmReport',
}

const ALARM_COLUMNS = [
  'timestamp',
  'adcLabel',
  'alarmType',
  'severity',
  'description',
  'acknowledgedBy',
  'acknowledgedAt',
]

/**
 * Reporting — module interface.
 *
 * Responsibility: build reports (consumption, alarms) over a date range with filters,
 * save and export them, and give users the event history and the audit log (D-33).
 *
 * Secret (anticipated change): report formats and export targets, and the filtering of
 * patient identifiers by role (SPEC-USR-02).
 *
 * Every operation throws StorageUnavailableError when the storage cannot be used.
 */
@inject()
export default class ReportingService {
  constructor(
    protected history: HistoryService,
    protected users: UserService,
    protected cabinetHealth: CabinetHealthService,
    protected clock: ClockService
  ) {}

  /**
   * Pre: `actor` may generate this report with these filters (D-14); range.from ≤ range.to.
   * Effects: report saved with its parameters and generation time (FR-HIS-06); patient
   * identifiers included only if users.canSeePatientIds(actor), and their display
   * audited (SPEC-USR-02).
   */
  async consumptionReport(actor: Actor, params: ConsumptionParams): Promise<Report> {
    const { range, ...filters } = params
    const activities = await this.history.queryDispensing(params)
    const labels = await this.adcLabels()

    const figures: Figures = {
      total: activities.reduce((sum, activity) => sum + activity.quantityInBoxes, 0),
      rows: activities.map((activity) => ({
        timestamp: activity.timestamp.toISOString(),
        adcId: activity.adcId,
        adcLabel: labels.get(activity.adcId) ?? activity.adcId,
        medicationId: activity.medicationId,
        medicationName: activity.medicationName,
        quantityInBoxes: activity.quantityInBoxes,
        patientId: activity.patientId,
        staffMemberId: activity.staffMemberId,
        staffMemberName: activity.staffMemberName,
      })),
    }
    return this.save(actor, 'consumption', { ...isoRange(range), ...filters }, figures)
  }

  /**
   * Pre: `actor` may generate alarm reports; range.from ≤ range.to.
   * Effects: report saved (FR-RPT-06, FR-HIS-06).
   */
  async alarmReport(actor: Actor, range: DateRange): Promise<Report> {
    const alarms = await this.history.queryAlarms(range)
    const labels = await this.adcLabels()

    const figures: Figures = {
      total: alarms.length,
      rows: alarms.map((alarm) => ({
        timestamp: alarm.timestamp.toISOString(),
        adcId: alarm.adcId,
        adcLabel: labels.get(alarm.adcId) ?? alarm.adcId,
        alarmType: alarm.alarmType,
        severity: alarm.severity,
        description: alarm.description,
        acknowledgedBy: alarm.acknowledgement?.userId ?? null,
        acknowledgedAt: alarm.acknowledgement?.at.toISOString() ?? null,
      })),
    }
    return this.save(actor, 'alarms', isoRange(range), figures)
  }

  /**
   * The alarm report as a CSV file, one line per alarm (FR-RPT-07).
   * Throws: UnknownReportError if no alarm report has this identifier.
   */
  async exportReport(reportId: ReportId): Promise<ExportFile> {
    const saved = await this.history.findReport(reportId)
    if (!saved || saved.kind !== 'alarms') {
      throw new UnknownReportError(`No alarm report ${reportId}`)
    }

    const { rows } = saved.figures as Figures
    const lines = [ALARM_COLUMNS, ...rows.map((row) => ALARM_COLUMNS.map((column) => row[column]))]
    const { from, to } = saved.parameters as { from: string; to: string }
    return {
      fileName: `alarm-report-${from.slice(0, 10)}-to-${to.slice(0, 10)}.csv`,
      contentType: 'text/csv',
      content: lines.map((line) => line.map(csvCell).join(',')).join('\r\n') + '\r\n',
    }
  }

  /**
   * The saved reports that `actor` may reopen: those of the kinds its role may generate
   * (FR-RPT-08, D-14), most recent first, without their figures.
   */
  async listSavedReports(actor: Actor): Promise<SavedReportSummary[]> {
    const kinds = (Object.keys(GENERATE) as ReportKind[]).filter((kind) =>
      this.users.can(actor, GENERATE[kind])
    )
    if (kinds.length === 0) return []
    return this.history.listReports(kinds)
  }

  /**
   * Pre: `reportId` is one of listSavedReports(actor).
   * A saved report with its figures at generation time (FR-RPT-08), patient
   * identifiers filtered as in consumptionReport.
   * Throws: UnknownReportError.
   */
  async openSavedReport(actor: Actor, reportId: ReportId): Promise<Report> {
    const saved = await this.history.findReport(reportId)
    if (!saved) throw new UnknownReportError(`No report ${reportId}`)
    const report = { reportId, ...saved, ...(saved.figures as Figures) }
    return this.forViewer(actor, report)
  }

  /**
   * Pre: `actor` may view event history.
   * Effects: patient identifiers filtered and their display audited (FR-HIS-04, D-33).
   */
  async adcHistory(actor: Actor, adcId: AdcId, range: DateRange): Promise<AdcHistoryView> {
    const adcHistory = await this.history.queryAdcHistory(adcId, range)
    if (!this.users.canSeePatientIds(actor)) {
      return { ...adcHistory, dispensing: adcHistory.dispensing.map(withoutPatientId) }
    }
    if (adcHistory.dispensing.length > 0) await this.auditPatientIds(actor, adcId)
    return adcHistory
  }

  /** Pre: `actor` may view the audit log (FR-HIS-07). */
  async auditLog(_actor: Actor, filter: AuditFilter): Promise<AuditEntry[]> {
    return this.history.queryAudit(filter)
  }

  /** Saves the figures as generated, then gives them to `actor` as it may see them. */
  private async save(
    actor: Actor,
    kind: ReportKind,
    parameters: Record<string, unknown>,
    figures: Figures
  ): Promise<Report> {
    const generatedAt = this.clock.now()
    const reportId = await this.history.saveReport({
      kind,
      parameters,
      figures,
      generatedAt,
      generatedBy: actor.userId,
    })
    return this.forViewer(actor, { reportId, kind, parameters, generatedAt, ...figures })
  }

  /**
   * SPEC-USR-02: patient identifiers, in the rows and in the parameters, are left out for
   * a role that may not see them; otherwise their display is audited (NFR-AUD-06).
   */
  private async forViewer(actor: Actor, report: Report): Promise<Report> {
    const hasPatientIds = report.rows.some((row) => row.patientId !== undefined)
    if (!this.users.canSeePatientIds(actor)) {
      return {
        ...report,
        parameters: withoutPatientId(report.parameters),
        rows: report.rows.map(withoutPatientId),
      }
    }
    if (hasPatientIds) await this.auditPatientIds(actor, `report ${report.reportId}`)
    return report
  }

  private async auditPatientIds(actor: Actor, target: string) {
    await this.history.appendAudit({
      userId: actor.userId,
      action: 'view_patient_ids',
      target,
      outcome: null,
      at: this.clock.now(),
    })
  }

  /** Labels of the registered ADCs, so that reports name them as the dashboard does. */
  private async adcLabels(): Promise<Map<AdcId, string>> {
    const adcs = await this.cabinetHealth.listAdcs({})
    return new Map(adcs.map((adc) => [adc.adcId, adc.label]))
  }
}

function isoRange(range: DateRange) {
  return { from: range.from.toISOString(), to: range.to.toISOString() }
}

function withoutPatientId<T extends object>(record: T): Omit<T, 'patientId'> {
  const { patientId, ...rest } = record as T & { patientId?: unknown }
  return rest
}

/** A CSV cell: empty for no value, quoted when it holds a comma, a quote or a line break. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
