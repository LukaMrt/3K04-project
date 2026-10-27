import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import ClockService from '#modules/clock/clock_service'
import { StorageUnavailableError } from '#modules/shared/errors'
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
  SavedReportHeader,
  StatusChangeRecord,
  StoredAlarm,
  StoredAlarmWithAck,
  SystemLogEntry,
} from '#modules/history/types'
import { AlarmAlreadyAcknowledgedError, UnknownRecordError } from '#modules/history/errors'
import AlarmModel from '#modules/history/models/alarm'
import AlarmAcknowledgementModel from '#modules/history/models/alarm_acknowledgement'
import AuditEntryModel from '#modules/history/models/audit_entry'
import DispensingActivityModel from '#modules/history/models/dispensing_activity'
import SavedReportModel from '#modules/history/models/saved_report'
import StatusChangeModel from '#modules/history/models/status_change'
import SystemLogEntryModel from '#modules/history/models/system_log_entry'

/** Retention periods of SPEC-HIS-01 (D-06). */
const LONG_RETENTION = { years: 1 }
const SHORT_RETENTION = { months: 6 }

/**
 * Historical Data Store — module interface.
 *
 * Responsibility: append-only storage of every record the system must retain
 * (alarms, acknowledgements, dispensing activities, status changes, audit and system
 * log entries, saved reports), and queries over them.
 *
 * Secret (anticipated change): the storage technology and layout (SQLite today, through
 * the Lucid models of models/) and how retention is enforced. No other module reads its
 * tables, and no operation returns a Lucid model.
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
    return this.store(() =>
      db.transaction(async (client) => {
        if (await this.isTransactionStored(alarm.alarmId, client)) return 'duplicate'
        await AlarmModel.create(
          { ...alarm, timestamp: DateTime.fromJSDate(alarm.timestamp) },
          { client }
        )
        return 'recorded'
      })
    )
  }

  /**
   * Pre: the fields of FR-COM-09 are present and valid.
   * Effects: same uniqueness rule as recordAlarm (D-28).
   */
  async recordDispensing(activity: DispensingRecord): Promise<RecordOutcome> {
    return this.store(() =>
      db.transaction(async (client) => {
        if (await this.isTransactionStored(activity.transactionId, client)) return 'duplicate'
        await DispensingActivityModel.create(
          { ...activity, timestamp: DateTime.fromJSDate(activity.timestamp) },
          { client }
        )
        return 'recorded'
      })
    )
  }

  /**
   * Pre: the alarm is stored and has no acknowledgement yet.
   * Effects: stores the acknowledgement.
   * Throws: UnknownRecordError if the alarm is not stored; AlarmAlreadyAcknowledgedError
   * if it already has an acknowledgement (only when two acknowledgements race: the
   * caller treats it as a no-op).
   */
  async recordAcknowledgement(ack: AcknowledgementRecord): Promise<void> {
    return this.store(() =>
      db.transaction(async (client) => {
        if (!(await AlarmModel.find(ack.alarmId, { client }))) {
          throw new UnknownRecordError(`Alarm ${ack.alarmId} is not stored`)
        }
        if (await AlarmAcknowledgementModel.find(ack.alarmId, { client })) {
          throw new AlarmAlreadyAcknowledgedError(`Alarm ${ack.alarmId} is already acknowledged`)
        }
        await AlarmAcknowledgementModel.create(
          { alarmId: ack.alarmId, userId: ack.userId, at: DateTime.fromJSDate(ack.at) },
          { client }
        )
      })
    )
  }

  async findAlarm(alarmId: AlarmId): Promise<StoredAlarmWithAck | null> {
    return this.store(async () => {
      const alarm = await AlarmModel.query()
        .where('alarm_id', alarmId)
        .preload('acknowledgement')
        .first()
      return alarm?.toRecord() ?? null
    })
  }

  /** Unacknowledged alarms, most recent first. */
  async listUnacknowledgedAlarms(): Promise<StoredAlarmWithAck[]> {
    return this.store(async () => {
      const alarms = await AlarmModel.query()
        .doesntHave('acknowledgement')
        .preload('acknowledgement')
        .orderBy('timestamp', 'desc')
      return alarms.map((alarm) => alarm.toRecord())
    })
  }

  /** Effects: stores the status change (FR-HIS-03). */
  async recordStatusChange(change: StatusChangeRecord): Promise<void> {
    return this.store(async () => {
      await StatusChangeModel.create({ ...change, at: DateTime.fromJSDate(change.at) })
    })
  }

  /** Effects: stores the audit entry (NFR-AUD-01, 04, 05, 06). */
  async appendAudit(entry: AuditEntry): Promise<void> {
    return this.store(async () => {
      await AuditEntryModel.create({ ...entry, at: DateTime.fromJSDate(entry.at) })
    })
  }

  /** Effects: stores the system log entry (FR-HIS-08, NFR-AVL-05). */
  async appendSystemLog(entry: SystemLogEntry): Promise<void> {
    return this.store(async () => {
      await SystemLogEntryModel.create({ ...entry, at: DateTime.fromJSDate(entry.at) })
    })
  }

  /** Effects: stores the report with its figures as generated (FR-HIS-06, FR-RPT-08). */
  async saveReport(report: SavedReport): Promise<ReportId> {
    return this.store(async () => {
      const saved = await SavedReportModel.create({
        ...report,
        parameters: JSON.stringify(report.parameters),
        figures: JSON.stringify(report.figures),
        generatedAt: DateTime.fromJSDate(report.generatedAt),
      })
      return saved.id
    })
  }

  async findReport(reportId: ReportId): Promise<SavedReport | null> {
    return this.store(async () => {
      const report = await SavedReportModel.find(reportId)
      return report?.toRecord() ?? null
    })
  }

  /** Saved reports of the given kinds, without their figures, most recent first. */
  async listReports(kinds: SavedReport['kind'][]): Promise<SavedReportHeader[]> {
    return this.store(async () => {
      const reports = await SavedReportModel.query()
        .whereIn('kind', kinds)
        .orderBy('generated_at', 'desc')
        .orderBy('id', 'desc')
      return reports.map((report) => ({
        reportId: report.id,
        kind: report.kind as SavedReport['kind'],
        parameters: JSON.parse(report.parameters),
        generatedAt: report.generatedAt.toJSDate(),
      }))
    })
  }

  /** Everything stored for an ADC over a range, patient identifiers included (FR-HIS-04). */
  async queryAdcHistory(adcId: AdcId, range: DateRange): Promise<AdcHistory> {
    return this.store(async () => {
      const dispensing = await this.queryDispensing({ range, adcId })
      const statusChanges = await StatusChangeModel.query()
        .where('adc_id', adcId)
        .whereBetween('at', bounds(range))
        .orderBy('at')
        .orderBy('id')
      const alarms = await AlarmModel.query()
        .where('adc_id', adcId)
        .whereBetween('timestamp', bounds(range))
        .preload('acknowledgement')
        .orderBy('timestamp')

      return {
        adcId,
        range,
        dispensing,
        statusChanges: statusChanges.map((change) => change.toRecord()),
        alarms: alarms.map((alarm) => alarm.toRecord()),
      }
    })
  }

  async queryDispensing(filter: DispensingFilter): Promise<DispensingRecord[]> {
    return this.store(async () => {
      const query = DispensingActivityModel.query()
        .whereBetween('timestamp', bounds(filter.range))
        .orderBy('timestamp')
      if (filter.adcId) query.where('adc_id', filter.adcId)
      if (filter.medicationId) query.where('medication_id', filter.medicationId)
      if (filter.patientId) query.where('patient_id', filter.patientId)
      if (filter.staffMemberId) query.where('staff_member_id', filter.staffMemberId)

      const activities = await query
      return activities.map((activity) => activity.toRecord())
    })
  }

  async queryAlarms(range: DateRange): Promise<StoredAlarmWithAck[]> {
    return this.store(async () => {
      const alarms = await AlarmModel.query()
        .whereBetween('timestamp', bounds(range))
        .preload('acknowledgement')
        .orderBy('timestamp')
      return alarms.map((alarm) => alarm.toRecord())
    })
  }

  async queryAudit(filter: AuditFilter): Promise<AuditEntry[]> {
    return this.store(async () => {
      const query = AuditEntryModel.query()
        .whereBetween('at', bounds(filter.range))
        .orderBy('at')
        .orderBy('id')
      if (filter.adcId) query.where('target', filter.adcId)
      if (filter.userId !== undefined) query.where('user_id', filter.userId)

      const entries = await query
      return entries.map((entry) => entry.toRecord())
    })
  }

  /**
   * Effects: deletes every record whose retention period ended (SPEC-HIS-01), as of
   * clock.now(). Must be called at least every 24 h (FR-HIS-09).
   * Returns the number of records deleted.
   */
  async purgeExpired(): Promise<number> {
    const now = DateTime.fromJSDate(this.clock.now())
    const longCutoff = toColumn(now.minus(LONG_RETENTION))
    const shortCutoff = toColumn(now.minus(SHORT_RETENTION))

    return this.store(() =>
      db.transaction(async (client) => {
        const expiredAlarms = AlarmModel.query({ client })
          .select('alarm_id')
          .where('timestamp', '<=', longCutoff)
        const counts = [
          // Acknowledgements go with their alarm, before it (foreign key).
          await AlarmAcknowledgementModel.query({ client })
            .whereIn('alarm_id', expiredAlarms)
            .delete(),
          await AlarmModel.query({ client }).where('timestamp', '<=', longCutoff).delete(),
          await AuditEntryModel.query({ client }).where('at', '<=', longCutoff).delete(),
          await SystemLogEntryModel.query({ client }).where('at', '<=', longCutoff).delete(),
          await SavedReportModel.query({ client }).where('generated_at', '<=', longCutoff).delete(),
          await DispensingActivityModel.query({ client })
            .where('timestamp', '<=', shortCutoff)
            .delete(),
          await StatusChangeModel.query({ client }).where('at', '<=', shortCutoff).delete(),
        ]
        return counts.reduce<number>((sum, count) => sum + Number(count), 0)
      })
    )
  }

  /** Alarms and dispensing activities share one space of transaction identifiers (D-28). */
  private async isTransactionStored(id: string, client: TransactionClientContract) {
    if (await AlarmModel.find(id, { client })) return true
    return Boolean(await DispensingActivityModel.find(id, { client }))
  }

  /**
   * Runs a storage operation: the exceptions of this module go through, any other failure
   * becomes StorageUnavailableError.
   */
  private async store<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof Exception) throw error
      throw new StorageUnavailableError('The historical data store cannot be used', {
        cause: error,
      })
    }
  }
}

/**
 * A time as Lucid writes it in a datetime column. Lucid formats the values it stores, but
 * not the values given to `where`, so comparisons must use the same format.
 */
function toColumn(time: DateTime): string {
  return time.toFormat(db.connection().dialect.dateTimeFormat)
}

function bounds(range: DateRange): [string, string] {
  return [toColumn(DateTime.fromJSDate(range.from)), toColumn(DateTime.fromJSDate(range.to))]
}
