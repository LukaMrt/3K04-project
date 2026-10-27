import { randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import { AlarmAlreadyAcknowledgedError } from '#modules/history/errors'
import type { StoredAlarm, StoredAlarmWithAck } from '#modules/history/types'
import { UnknownAlarmError } from '#modules/alarms/errors'
import type {
  Actor,
  AdcId,
  AlarmSeverity,
  AlarmId,
  RecordOutcome,
  Unsubscribe,
  UserId,
} from '#modules/shared/types'
import type {
  AcknowledgeResult,
  Alarm,
  AlarmEvent,
  NewAdcAlarm,
  UnacknowledgedAlarm,
} from '#modules/alarms/types'

/** The audible cue of an unacknowledged critical alarm is repeated this often (SPEC-ALM-02). */
const CRITICAL_REPEAT_SECONDS = 60

/**
 * Alarm Manager — module interface.
 *
 * Responsibility: record alarms, keep their acknowledgement state, and announce
 * new and acknowledged alarms to subscribers (the Operator Dashboard, D-27).
 *
 * Secret (anticipated change): the alarm lifecycle and presentation rules
 * (e.g. how often a critical alarm is repeated).
 *
 * Invariant: an alarm becomes acknowledged only through acknowledge(), and never goes
 * back to unacknowledged (NFR-SAF-02).
 *
 * Every operation that reads or writes alarms throws StorageUnavailableError when the
 * storage cannot be used.
 */
@inject()
export default class AlarmService {
  private listeners = new Set<(event: AlarmEvent) => void>()

  constructor(
    protected history: HistoryService,
    protected clock: ClockService
  ) {}

  /**
   * Pre: `alarm` validated against SPEC-COM-03 by the ADC Communication Manager;
   * its ADC is registered.
   * Effects: if 'recorded', stored unacknowledged with the ADC timestamp (A-14), then a
   * 'raised' event is announced; if 'duplicate', nothing (D-28).
   */
  async recordFromAdc(alarm: NewAdcAlarm): Promise<RecordOutcome> {
    const { transactionId, ...fields } = alarm
    return this.record({ alarmId: transactionId, ...fields, source: 'adc' })
  }

  /**
   * Pre: called by the Cabinet Health Monitor only, when `adcId` becomes offline.
   * Effects: new alarm of type 'communication_loss', severity 'error', timestamp
   * clock.now(), stored unacknowledged, then a 'raised' event is announced
   * (FR-HLT-04, D-15).
   */
  async raiseCommunicationLoss(adcId: AdcId): Promise<AlarmId> {
    const alarmId = randomUUID()
    await this.record({
      alarmId,
      adcId,
      timestamp: this.clock.now(),
      alarmType: 'communication_loss',
      severity: 'error',
      description: 'Communication with the ADC is lost',
      source: 'communication_loss',
    })
    return alarmId
  }

  /**
   * Pre: `actor` may acknowledge alarms (D-09, checked by the caller, D-31).
   * Effects (SPEC-ALM-01): if the alarm is unacknowledged, the acknowledgement is stored
   * and audited (NFR-AUD-01), then an 'acknowledged' event is announced; otherwise
   * nothing changes and the result names who acknowledged it (FR-ALM-06). An
   * AlarmAlreadyAcknowledgedError from history.recordAcknowledgement (another
   * acknowledgement won the race) is caught and handled the same way: nothing changes.
   * Throws: UnknownAlarmError.
   */
  async acknowledge(actor: Actor, alarmId: AlarmId): Promise<AcknowledgeResult> {
    const stored = await this.history.findAlarm(alarmId)
    if (!stored) throw new UnknownAlarmError(`Alarm ${alarmId} does not exist`)
    if (stored.acknowledgement) return alreadyAcknowledged(stored.acknowledgement)

    const at = this.clock.now()
    try {
      await this.history.recordAcknowledgement({ alarmId, userId: actor.userId, at })
    } catch (error) {
      if (!(error instanceof AlarmAlreadyAcknowledgedError)) throw error
      const winner = await this.history.findAlarm(alarmId)
      return alreadyAcknowledged(winner!.acknowledgement!)
    }

    await this.history.appendAudit({
      userId: actor.userId,
      action: 'acknowledge_alarm',
      target: stored.adcId,
      outcome: `acknowledged ${alarmId}`,
      at,
    })
    this.announce({ kind: 'acknowledged', alarmId, by: actor.userId, at })
    return { kind: 'acknowledged', at }
  }

  /**
   * Unacknowledged alarms, most recent first (FR-ALM-04), each with the repetition of its
   * audible cue, so that a dashboard opened later repeats it too (SPEC-ALM-02).
   */
  async listUnacknowledged(): Promise<UnacknowledgedAlarm[]> {
    const stored = await this.history.listUnacknowledgedAlarms()
    return stored.map((alarm) => ({
      ...toAlarm(alarm),
      audibleRepeatSeconds: audibleRepeatSeconds(alarm.severity),
    }))
  }

  /** `listener` is called for every later 'raised' and 'acknowledged' event. */
  subscribe(listener: (event: AlarmEvent) => void): Unsubscribe {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Stores a new alarm, then announces it if it was not already stored. */
  private async record(alarm: StoredAlarm): Promise<RecordOutcome> {
    const outcome = await this.history.recordAlarm(alarm)
    if (outcome === 'recorded') {
      this.announce({
        kind: 'raised',
        alarm: { ...alarm, acknowledgement: null },
        audibleRepeatSeconds: audibleRepeatSeconds(alarm.severity),
      })
    }
    return outcome
  }

  /**
   * Calls every listener once the change is stored (D-27). A failing listener is logged
   * and does not stop the others nor undo the change (D-36).
   */
  private announce(event: AlarmEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        logger.error({ err: error, event: event.kind }, 'Alarm listener failed')
      }
    }
  }
}

/** The Historical Data Store names the acknowledging user `userId`; alarms name it `by`. */
function toAlarm({ acknowledgement, ...alarm }: StoredAlarmWithAck): Alarm {
  return {
    ...alarm,
    acknowledgement: acknowledgement && { by: acknowledgement.userId, at: acknowledgement.at },
  }
}

/** SPEC-ALM-02: only a critical alarm repeats its audible cue. */
function audibleRepeatSeconds(severity: AlarmSeverity): number | null {
  return severity === 'critical' ? CRITICAL_REPEAT_SECONDS : null
}

function alreadyAcknowledged(ack: { userId: UserId; at: Date }): AcknowledgeResult {
  return { kind: 'alreadyAcknowledged', by: ack.userId, at: ack.at }
}
