import { SystemLogEntrySchema } from '#database/schema'

/** Internal to the Historical Data Store: never returned by its operations. */
export default class SystemLogEntryModel extends SystemLogEntrySchema {
  static table = 'system_log_entries'
}
