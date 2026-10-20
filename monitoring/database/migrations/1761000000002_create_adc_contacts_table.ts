import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Table of the ADC Communication Manager (app/modules/adc_communication): the contact
 * address each ADC gave at its latest registration (D-32). No other module reads it.
 */
export default class extends BaseSchema {
  protected tableName = 'adc_contacts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('adc_id').primary()
      table.string('contact_address').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
