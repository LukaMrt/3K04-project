import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import { DEMO_ACCOUNTS } from '#database/demo_accounts'

/**
 * Accounts of the demonstration (`node ace db:seed`), listed in database/demo_accounts.ts.
 * Accounts are never created by their own users (FR-USR-03): any other one is created by
 * an administrator.
 */
export default class DemoAccountsSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    for (const { role, email, fullName, password } of DEMO_ACCOUNTS) {
      await User.updateOrCreate({ email }, { fullName, role, password, active: true })
    }
  }
}
