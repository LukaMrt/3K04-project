/**
 * Historical Data Store — module interface.
 *
 * Responsibility: append-only storage of events and audit entries, and queries over them.
 *
 * Secret (anticipated change): the storage technology (SQLite today, through Lucid).
 * Other modules never query the database tables of this module directly.
 */
export default class HistoryService {}
