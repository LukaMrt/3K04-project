import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import type { Role } from '#modules/shared/types'

/**
 * Accounts of the demonstration (`node ace db:seed`), one per role, so that each line of
 * the D-14 matrix can be shown by logging in with another account. Accounts are never
 * created by their own users (FR-USR-03): any other one is created by an administrator.
 * Passwords: demo-admin-2026 for the administrator, demo-<role>-2026 for the others
 * (e.g. demo-nurse-2026, demo-risk_management-2026).
 */
const ACCOUNTS: Array<{ role: Role; email: string; fullName: string }> = [
  { role: 'administrator', email: 'admin@hospital.test', fullName: 'Demo Administrator' },
  { role: 'nurse', email: 'nurse@hospital.test', fullName: 'Demo Nurse' },
  { role: 'pharmacist', email: 'pharmacist@hospital.test', fullName: 'Demo Pharmacist' },
  { role: 'technician', email: 'technician@hospital.test', fullName: 'Demo Technician' },
  { role: 'risk_management', email: 'risk@hospital.test', fullName: 'Demo Risk Manager' },
]

export default class DemoAccountsSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    for (const { role, email, fullName } of ACCOUNTS) {
      const password = `demo-${role === 'administrator' ? 'admin' : role}-2026`
      await User.updateOrCreate({ email }, { fullName, role, password, active: true })
    }
  }
}
