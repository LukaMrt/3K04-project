import { DispensingActivitySchema } from '#database/schema'
import type { DispensingRecord } from '#modules/history/types'

/** Internal to the Historical Data Store: never returned by its operations. */
export default class DispensingActivityModel extends DispensingActivitySchema {
  static table = 'dispensing_activities'
  static selfAssignPrimaryKey = true

  toRecord(): DispensingRecord {
    return {
      transactionId: this.transactionId,
      adcId: this.adcId,
      timestamp: this.timestamp.toJSDate(),
      medicationId: this.medicationId,
      medicationName: this.medicationName,
      quantityInBoxes: this.quantityInBoxes,
      patientId: this.patientId,
      staffMemberId: this.staffMemberId,
      staffMemberName: this.staffMemberName,
    }
  }
}
