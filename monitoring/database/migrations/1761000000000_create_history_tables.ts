import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Tables of the Historical Data Store (app/modules/history). No other module reads them.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('alarms', (table) => {
      table.string('alarm_id').primary()
      table.string('adc_id').notNullable().index()
      table.timestamp('timestamp').notNullable().index()
      table.string('alarm_type').notNullable()
      table.string('severity').notNullable()
      table.text('description').nullable()
      table.string('source').notNullable()
    })

    // Kept apart so that a stored alarm is never modified (NFR-AUD-02); the primary key
    // allows one acknowledgement per alarm (NFR-SAF-02).
    this.schema.createTable('alarm_acknowledgements', (table) => {
      table.string('alarm_id').primary().references('alarm_id').inTable('alarms')
      table.integer('user_id').notNullable()
      table.timestamp('at').notNullable()
    })

    this.schema.createTable('dispensing_activities', (table) => {
      table.string('transaction_id').primary()
      table.string('adc_id').notNullable().index()
      table.timestamp('timestamp').notNullable().index()
      table.string('medication_id').notNullable()
      table.string('medication_name').notNullable()
      table.integer('quantity_in_boxes').notNullable()
      table.string('patient_id').notNullable()
      table.string('staff_member_id').notNullable()
      table.string('staff_member_name').notNullable()
    })

    this.schema.createTable('status_changes', (table) => {
      table.increments('id')
      table.string('adc_id').notNullable().index()
      table.string('reported_state').nullable()
      table.string('connectivity').notNullable()
      table.timestamp('at').notNullable().index()
    })

    this.schema.createTable('audit_entries', (table) => {
      table.increments('id')
      table.integer('user_id').notNullable()
      table.string('action').notNullable()
      table.string('target').notNullable()
      table.string('outcome').nullable()
      table.timestamp('at').notNullable().index()
    })

    this.schema.createTable('system_log_entries', (table) => {
      table.increments('id')
      table.string('event').notNullable()
      table.string('adc_id').nullable()
      table.text('details').nullable()
      table.timestamp('at').notNullable().index()
    })

    this.schema.createTable('saved_reports', (table) => {
      table.increments('id')
      table.string('kind').notNullable()
      table.text('parameters').notNullable()
      table.text('figures').notNullable()
      table.timestamp('generated_at').notNullable().index()
      table.integer('generated_by').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('saved_reports')
    this.schema.dropTable('system_log_entries')
    this.schema.dropTable('audit_entries')
    this.schema.dropTable('status_changes')
    this.schema.dropTable('dispensing_activities')
    this.schema.dropTable('alarm_acknowledgements')
    this.schema.dropTable('alarms')
  }
}
