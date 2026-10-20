import { StatusChangeSchema } from '#database/schema'
import type { Connectivity, ReportedState } from '#modules/shared/types'
import type { StatusChangeRecord } from '#modules/history/types'

/** Internal to the Historical Data Store: never returned by its operations. */
export default class StatusChangeModel extends StatusChangeSchema {
  static table = 'status_changes'
  toRecord(): StatusChangeRecord {
    return {
      adcId: this.adcId,
      reportedState: this.reportedState as ReportedState | null,
      connectivity: this.connectivity as Connectivity,
      at: this.at.toJSDate(),
    }
  }
}
