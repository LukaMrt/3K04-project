import type { Role } from '#modules/shared/types'

/**
 * Accounts of the demonstration, one per role, so that each line of the D-14 matrix can be
 * shown by logging in with another account. Created by `node ace db:seed`; offered as
 * one-click fills on the login page in development only.
 */
export const DEMO_ACCOUNTS: Array<{
  role: Role
  email: string
  fullName: string
  password: string
}> = [
  {
    role: 'administrator',
    email: 'admin@hospital.test',
    fullName: 'Demo Administrator',
    password: 'demo-admin-2026',
  },
  {
    role: 'nurse',
    email: 'nurse@hospital.test',
    fullName: 'Demo Nurse',
    password: 'demo-nurse-2026',
  },
  {
    role: 'pharmacist',
    email: 'pharmacist@hospital.test',
    fullName: 'Demo Pharmacist',
    password: 'demo-pharmacist-2026',
  },
  {
    role: 'technician',
    email: 'technician@hospital.test',
    fullName: 'Demo Technician',
    password: 'demo-technician-2026',
  },
  {
    role: 'risk_management',
    email: 'risk@hospital.test',
    fullName: 'Demo Risk Manager',
    password: 'demo-risk_management-2026',
  },
]
