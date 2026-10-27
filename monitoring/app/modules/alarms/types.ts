import type { AdcId, AlarmId, AlarmSeverity, TransactionId, UserId } from '#modules/shared/types'

/** Alarm received from an ADC, already validated against SPEC-COM-03. */
export interface NewAdcAlarm {
  transactionId: TransactionId
  adcId: AdcId
  /** Set by the ADC (A-14). */
  timestamp: Date
  alarmType: string
  severity: AlarmSeverity
  description: string | null
}

export interface Alarm {
  alarmId: AlarmId
  adcId: AdcId
  timestamp: Date
  alarmType: string
  severity: AlarmSeverity
  description: string | null
  source: 'adc' | 'communication_loss'
  acknowledgement: { by: UserId; at: Date } | null
}

/** An unacknowledged alarm with how often its audible cue repeats (SPEC-ALM-02, D-27). */
export interface UnacknowledgedAlarm extends Alarm {
  /** 60 for a critical alarm, null otherwise. */
  audibleRepeatSeconds: number | null
}

/** Result of acknowledge (SPEC-ALM-01, D-30). */
export type AcknowledgeResult =
  { kind: 'acknowledged'; at: Date } | { kind: 'alreadyAcknowledged'; by: UserId; at: Date }

/** Announced to subscribers after the change is stored (D-27). */
export type AlarmEvent =
  | {
      kind: 'raised'
      alarm: Alarm
      /** 60 for a critical alarm, null otherwise (SPEC-ALM-02, NFR-SAF-04). */
      audibleRepeatSeconds: number | null
    }
  | { kind: 'acknowledged'; alarmId: AlarmId; by: UserId; at: Date }
