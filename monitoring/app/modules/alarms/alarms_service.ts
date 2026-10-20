import { inject } from '@adonisjs/core'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import { notImplemented } from '#modules/shared/errors'
import type { Actor, AdcId, AlarmId, RecordOutcome, Unsubscribe } from '#modules/shared/types'
import type { AcknowledgeResult, Alarm, AlarmEvent, NewAdcAlarm } from '#modules/alarms/types'

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
    return notImplemented('AlarmService.recordFromAdc', alarm)
  }

  /**
   * Pre: called by the Cabinet Health Monitor only, when `adcId` becomes offline.
   * Effects: new alarm of type 'communication_loss', severity 'error', timestamp
   * clock.now(), stored unacknowledged, then a 'raised' event is announced
   * (FR-HLT-04, D-15).
   */
  async raiseCommunicationLoss(adcId: AdcId): Promise<AlarmId> {
    return notImplemented('AlarmService.raiseCommunicationLoss', adcId)
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
    return notImplemented('AlarmService.acknowledge', actor, alarmId)
  }

  /** Unacknowledged alarms, most recent first (FR-ALM-04). */
  async listUnacknowledged(): Promise<Alarm[]> {
    return notImplemented('AlarmService.listUnacknowledged')
  }

  /** `listener` is called for every later 'raised' and 'acknowledged' event. */
  subscribe(listener: (event: AlarmEvent) => void): Unsubscribe {
    return notImplemented('AlarmService.subscribe', listener)
  }
}
