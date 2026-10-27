import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

/**
 * Accounts of the demonstration (`node ace db:seed`). Accounts are never created by their
 * own users (FR-USR-03): the first administrator comes from here, the others are created
 * by an administrator. The roles are added with the operator dashboard (#40).
 */
export default class DemoAccountsSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    await User.updateOrCreate(
      { email: 'admin@hospital.test' },
      { fullName: 'Demo Administrator', password: 'demo-admin-2026' }
    )
  }
}
