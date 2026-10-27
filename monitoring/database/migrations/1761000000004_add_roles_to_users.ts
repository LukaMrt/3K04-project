import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Accounts of User Management (app/modules/users): one role each (FR-USR-03) and an
 * active flag, false once the account is deactivated (FR-USR-05).
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('role').notNullable().defaultTo('nurse')
      table.boolean('active').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('role')
      table.dropColumn('active')
    })
  }
}
