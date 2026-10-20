import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Tables of the Inventory Supervisor (app/modules/inventory). No other module reads them.
 * Only the latest inventory of each ADC is kept (SPEC-HIS-01).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('inventory_snapshots', (table) => {
      table.string('adc_id').primary()
      table.timestamp('heartbeat_at').notNullable()
    })

    this.schema.createTable('inventory_lines', (table) => {
      table.increments('id')
      table.string('adc_id').notNullable().references('adc_id').inTable('inventory_snapshots')
      table.string('medication_id').notNullable().index()
      table.string('medication_name').notNullable()
      table.integer('quantity_in_boxes').notNullable()
      table.unique(['adc_id', 'medication_id'])
    })
  }

  async down() {
    this.schema.dropTable('inventory_lines')
    this.schema.dropTable('inventory_snapshots')
  }
}
