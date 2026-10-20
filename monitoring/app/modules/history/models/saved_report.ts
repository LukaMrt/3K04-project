import { SavedReportSchema } from '#database/schema'
import type { SavedReport } from '#modules/history/types'

/**
 * Internal to the Historical Data Store: never returned by its operations. Parameters and
 * figures are stored as JSON text.
 */
export default class SavedReportModel extends SavedReportSchema {
  static table = 'saved_reports'
  toRecord(): SavedReport {
    return {
      kind: this.kind as SavedReport['kind'],
      parameters: JSON.parse(this.parameters),
      figures: JSON.parse(this.figures),
      generatedAt: this.generatedAt.toJSDate(),
      generatedBy: this.generatedBy,
    }
  }
}
