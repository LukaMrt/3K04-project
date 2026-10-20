import { hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import { AlarmSchema } from '#database/schema'
import type { AlarmSeverity } from '#modules/shared/types'
import type { StoredAlarm, StoredAlarmWithAck } from '#modules/history/types'
import AlarmAcknowledgementModel from '#modules/history/models/alarm_acknowledgement'

/** Internal to the Historical Data Store: never returned by its operations. */
export default class AlarmModel extends AlarmSchema {
  static table = 'alarms'
  static selfAssignPrimaryKey = true

  @hasOne(() => AlarmAcknowledgementModel, { foreignKey: 'alarmId', localKey: 'alarmId' })
  declare acknowledgement: HasOne<typeof AlarmAcknowledgementModel>

  /** Pre: the acknowledgement relation is preloaded. */
  toRecord(): StoredAlarmWithAck {
    return {
      alarmId: this.alarmId,
      adcId: this.adcId,
      timestamp: this.timestamp.toJSDate(),
      alarmType: this.alarmType,
      severity: this.severity as AlarmSeverity,
      description: this.description,
      source: this.source as StoredAlarm['source'],
      acknowledgement: this.acknowledgement
        ? { userId: this.acknowledgement.userId, at: this.acknowledgement.at.toJSDate() }
        : null,
    }
  }
}
