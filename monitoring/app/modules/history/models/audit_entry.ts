import { AuditEntrySchema } from '#database/schema'
import type { AuditEntry } from '#modules/history/types'

/** Internal to the Historical Data Store: never returned by its operations. */
export default class AuditEntryModel extends AuditEntrySchema {
  static table = 'audit_entries'
  toRecord(): AuditEntry {
    return {
      userId: this.userId,
      action: this.action,
      target: this.target,
      outcome: this.outcome,
      at: this.at.toJSDate(),
    }
  }
}
