import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Table of the Cabinet Health Monitor (app/modules/cabinet_health): the registry of ADCs,
 * with their last contact, reported state and connectivity (SPEC-HLT-02). No other module
 * reads it.
 */
export default class extends BaseSchema {
  protected tableName = 'adcs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('adc_id').primary()
      table.string('label').notNullable()
      table.integer('floor').notNullable().index()
      table.text('description').notNullable()
      table.timestamp('registered_at').notNullable()
      table.timestamp('last_contact').notNullable()
      table.string('reported_state').nullable()
      table.string('connectivity').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
