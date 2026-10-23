import { inject } from '@adonisjs/core'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import { UnknownAlarmError } from '#modules/shared/errors'
import type { Actor, AdcId, AlarmId, RecordOutcome, Unsubscribe } from '#modules/shared/types'
import type { AcknowledgeResult, Alarm, AlarmEvent, NewAdcAlarm } from '#modules/alarms/types'

/**
 * Alarm Manager — module interface.
 * Responsibility: record alarms, keep their acknowledgement state, and announce
 * new and acknowledged alarms to subscribers (the Operator Dashboard, D-27).
 * Secret (anticipated change): the alarm lifecycle and presentation rules
 * (e.g. how often a critical alarm is repeated).
 * Invariant: an alarm becomes acknowledged only through acknowledge(), and never goes
 * back to unacknowledged (NFR-SAF-02).
 */
@inject()
export default class AlarmService {
  private listeners = new Set<(event: AlarmEvent) => void>()

  constructor(
    protected history: HistoryService,
    protected clock: ClockService
  ) {}

  /**
   * Pre: alarm validated against SPEC-COM-03 by the ADC Communication Manager;
   * its ADC is registered.
   * Effects: if 'recorded', stored unacknowledged with the ADC timestamp (A-14), then a
   * 'raised' event is announced; if 'duplicate', nothing (D-28).
   */
  async recordFromAdc(newAlarm: NewAdcAlarm): Promise<RecordOutcome> {
    const alarmId = newAlarm.transactionId as unknown as AlarmId

    const alarm: Alarm = {
      alarmId,
      adcId: newAlarm.adcId,
      timestamp: newAlarm.timestamp,
      alarmType: newAlarm.alarmType,
      severity: newAlarm.severity,
      description: newAlarm.description,
      source: 'adc',
      acknowledgement: null,
    }

    // Attempt to store in Historical Data Store
    const outcome = await this.history.recordAlarm(alarm)

    if (outcome === 'recorded') {
      // Audible cue repeats every 60s for critical alarms (SPEC-ALM-02, NFR-SAF-04)
      const audibleRepeatSeconds = alarm.severity === 'critical' ? 60 : null

      this.notifyListeners({
        kind: 'raised',
        alarm,
        audibleRepeatSeconds,
      })
    }

    return outcome
  }

  /**
   * Pre: called by the Cabinet Health Monitor only, when adcId becomes offline.
   * Effects: new alarm of type 'communication_loss', severity 'error', timestamp
   * clock.now(), stored unacknowledged, then a 'raised' event is announced
   * (FR-HLT-04, D-15).
   */
  async raiseCommunicationLoss(adcId: AdcId): Promise<AlarmId> {
    const now = this.clock.now()
    const alarmId = `ALM-COMMLOSS-${adcId}-${now.getTime()}` as AlarmId

    const alarm: Alarm = {
      alarmId,
      adcId,
      timestamp: now,
      alarmType: 'communication_loss',
      severity: 'error',
      description: 'Communication lost with cabinet (silent >= 75 seconds)',
      source: 'communication_loss',
      acknowledgement: null,
    }

    await this.history.recordAlarm(alarm)

    this.notifyListeners({
      kind: 'raised',
      alarm,
      audibleRepeatSeconds: null,
    })

    return alarmId
  }

  /**
   * Pre: actor may acknowledge alarms (D-09, checked by caller, D-31).
   * Effects (SPEC-ALM-01): if the alarm is unacknowledged, acknowledgement is stored
   * and audited (NFR-AUD-01), then an 'acknowledged' event is announced; otherwise
   * nothing changes and result names who acknowledged it (FR-ALM-06).
   */
  async acknowledge(actor: Actor, alarmId: AlarmId): Promise<AcknowledgeResult> {
    const existing = await this.history.findAlarm(alarmId)
    if (!existing) {
      throw new UnknownAlarmError(alarmId)
    }

    // FR-ALM-06: Check if already acknowledged
    if (existing.acknowledgement) {
      return {
        kind: 'alreadyAcknowledged',
        by: existing.acknowledgement.by,
        at: existing.acknowledgement.at,
      }
    }

    const now = this.clock.now()

    try {
      await this.history.recordAcknowledgement({
        alarmId,
        userId: actor.userId,
        at: now,
      })

      // Log in audit log (NFR-AUD-01)
      await this.history.appendAudit({
        userId: actor.userId,
        action: 'acknowledge_alarm',
        target: existing.adcId,
        at: now,
        outcome: 'success',
      })

      this.notifyListeners({
        kind: 'acknowledged',
        alarmId,
        by: actor.userId,
        at: now,
      })

      return {
        kind: 'acknowledged',
        at: now,
      }
    } catch (error) {
      // Handles race condition where another user acknowledged simultaneously
      if (error.name === 'AlarmAlreadyAcknowledgedError') {
        const recheck = await this.history.findAlarm(alarmId)
        return {
          kind: 'alreadyAcknowledged',
          by: recheck!.acknowledgement!.by,
          at: recheck!.acknowledgement!.at,
        }
      }
      throw error
    }
  }

  /** Unacknowledged alarms, most recent first (FR-ALM-04). */
  async listUnacknowledged(): Promise<Alarm[]> {
    return await this.history.listUnacknowledgedAlarms()
  }

  /** listener is called for every later 'raised' and 'acknowledged' event. */
  subscribe(listener: (event: AlarmEvent) => void): Unsubscribe {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(event: AlarmEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}
