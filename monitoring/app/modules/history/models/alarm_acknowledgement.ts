import { AlarmAcknowledgementSchema } from '#database/schema'

/**
 * Internal to the Historical Data Store. Kept apart from the alarm so that a stored alarm is
 * never modified (NFR-AUD-02); its primary key allows one acknowledgement per alarm.
 */
export default class AlarmAcknowledgementModel extends AlarmAcknowledgementSchema {
  static table = 'alarm_acknowledgements'
  static selfAssignPrimaryKey = true
}
