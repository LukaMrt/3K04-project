import { inject } from '@adonisjs/core'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import UserService from '#modules/users/users_service'
import { notImplemented } from '#modules/shared/errors'
import type { Actor, AdcId, DateRange } from '#modules/shared/types'
import type { AdcHistory, AuditEntry, AuditFilter, ReportId } from '#modules/history/types'
import type { ConsumptionParams, ExportFile, Report } from '#modules/reporting/types'

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
    protected clock: ClockService
  ) {}

  /**
   * Pre: `actor` may generate this report with these filters (D-14).
   * Effects: report saved with its parameters and generation time (FR-HIS-06); patient
   * identifiers included only if users.canSeePatientIds(actor), and their display
   * audited (SPEC-USR-02).
   */
  async consumptionReport(actor: Actor, params: ConsumptionParams): Promise<Report> {
    return notImplemented('ReportingService.consumptionReport', actor, params)
  }

  /**
   * Pre: `actor` may generate alarm reports.
   * Effects: report saved (FR-RPT-06, FR-HIS-06).
   */
  async alarmReport(actor: Actor, range: DateRange): Promise<Report> {
    return notImplemented('ReportingService.alarmReport', actor, range)
  }

  /**
   * Pre: the report is an alarm report (FR-RPT-07).
   * Throws: UnknownReportError.
   */
  async exportReport(reportId: ReportId): Promise<ExportFile> {
    return notImplemented('ReportingService.exportReport', reportId)
  }

  /**
   * Pre: `actor` may generate reports of that kind.
   * A saved report with its figures at generation time (FR-RPT-08), patient
   * identifiers filtered as in consumptionReport.
   * Throws: UnknownReportError.
   */
  async openSavedReport(actor: Actor, reportId: ReportId): Promise<Report> {
    return notImplemented('ReportingService.openSavedReport', actor, reportId)
  }

  /**
   * Pre: `actor` may view event history.
   * Effects: patient identifiers filtered and their display audited (FR-HIS-04, D-33).
   */
  async adcHistory(actor: Actor, adcId: AdcId, range: DateRange): Promise<AdcHistory> {
    return notImplemented('ReportingService.adcHistory', actor, adcId, range)
  }

  /** Pre: `actor` may view the audit log (FR-HIS-07). */
  async auditLog(actor: Actor, filter: AuditFilter): Promise<AuditEntry[]> {
    return notImplemented('ReportingService.auditLog', actor, filter)
  }
}
