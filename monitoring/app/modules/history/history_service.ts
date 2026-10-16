import { inject } from '@adonisjs/core'
import ClockService from '#modules/clock/clock_service'
import { notImplemented } from '#modules/shared/errors'
import type { AdcId, AlarmId, DateRange, RecordOutcome } from '#modules/shared/types'
import type {
  AcknowledgementRecord,
  AdcHistory,
  AuditEntry,
  AuditFilter,
  DispensingFilter,
  DispensingRecord,
  ReportId,
  SavedReport,
  StatusChangeRecord,
  StoredAlarm,
  StoredAlarmWithAck,
  SystemLogEntry,
} from '#modules/history/types'

/**
 * Historical Data Store — module interface.
 *
 * Responsibility: append-only storage of every record the system must retain
 * (alarms, acknowledgements, dispensing activities, status changes, audit and system
 * log entries, saved reports), and queries over them.
 *
 * Secret (anticipated change): the storage technology and layout (SQLite today, through
 * Lucid) and how retention is enforced. No other module reads its tables, and no
 * operation returns a Lucid model.
 *
 * Invariant: no record is ever modified, and none is deleted before the end of its
 * retention period (NFR-AUD-02, NFR-AUD-03, SPEC-HIS-01).
 *
 * Every operation throws StorageUnavailableError when the storage cannot be used.
 */
@inject()
export default class HistoryService {
  constructor(protected clock: ClockService) {}

  /**
   * Effects: if no alarm or dispensing activity is stored with `alarm.alarmId` as
   * transaction identifier, stores the alarm and answers 'recorded'; otherwise stores
   * nothing and answers 'duplicate' (D-28, FR-COM-08).
   */
  async recordAlarm(alarm: StoredAlarm): Promise<RecordOutcome> {
    return notImplemented('HistoryService.recordAlarm', alarm)
  }

  /**
   * Pre: the fields of FR-COM-09 are present and valid.
   * Effects: same uniqueness rule as recordAlarm (D-28).
   */
  async recordDispensing(activity: DispensingRecord): Promise<RecordOutcome> {
    return notImplemented('HistoryService.recordDispensing', activity)
  }

  /**
   * Pre: the alarm is stored and has no acknowledgement yet.
   * Effects: stores the acknowledgement.
   * Throws: UnknownRecordError if the alarm is not stored.
   */
  async recordAcknowledgement(ack: AcknowledgementRecord): Promise<void> {
    return notImplemented('HistoryService.recordAcknowledgement', ack)
  }

  async findAlarm(alarmId: AlarmId): Promise<StoredAlarmWithAck | null> {
    return notImplemented('HistoryService.findAlarm', alarmId)
  }

  /** Unacknowledged alarms, most recent first. */
  async listUnacknowledgedAlarms(): Promise<StoredAlarmWithAck[]> {
    return notImplemented('HistoryService.listUnacknowledgedAlarms')
  }

  /** Effects: stores the status change (FR-HIS-03). */
  async recordStatusChange(change: StatusChangeRecord): Promise<void> {
    return notImplemented('HistoryService.recordStatusChange', change)
  }

  /** Effects: stores the audit entry (NFR-AUD-01, 04, 05, 06). */
  async appendAudit(entry: AuditEntry): Promise<void> {
    return notImplemented('HistoryService.appendAudit', entry)
  }

  /** Effects: stores the system log entry (FR-HIS-08, NFR-AVL-05). */
  async appendSystemLog(entry: SystemLogEntry): Promise<void> {
    return notImplemented('HistoryService.appendSystemLog', entry)
  }

  /** Effects: stores the report with its figures as generated (FR-HIS-06, FR-RPT-08). */
  async saveReport(report: SavedReport): Promise<ReportId> {
    return notImplemented('HistoryService.saveReport', report)
  }

  async findReport(reportId: ReportId): Promise<SavedReport | null> {
    return notImplemented('HistoryService.findReport', reportId)
  }

  /** Everything stored for an ADC over a range, patient identifiers included (FR-HIS-04). */
  async queryAdcHistory(adcId: AdcId, range: DateRange): Promise<AdcHistory> {
    return notImplemented('HistoryService.queryAdcHistory', adcId, range)
  }

  async queryDispensing(filter: DispensingFilter): Promise<DispensingRecord[]> {
    return notImplemented('HistoryService.queryDispensing', filter)
  }

  async queryAlarms(range: DateRange): Promise<StoredAlarmWithAck[]> {
    return notImplemented('HistoryService.queryAlarms', range)
  }

  async queryAudit(filter: AuditFilter): Promise<AuditEntry[]> {
    return notImplemented('HistoryService.queryAudit', filter)
  }

  /**
   * Effects: deletes every record whose retention period ended (SPEC-HIS-01), as of
   * clock.now(). Must be called at least every 24 h (FR-HIS-09).
   * Returns the number of records deleted.
   */
  async purgeExpired(): Promise<number> {
    return notImplemented('HistoryService.purgeExpired')
  }
}
