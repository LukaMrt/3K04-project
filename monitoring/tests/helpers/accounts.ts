import User from '#models/user'
import type { Role } from '#modules/shared/types'

let sequence = 0

/** A new active account with `role`, to log in with `client.get(...).loginAs(user)`. */
export async function account(role: Role, overrides: Partial<{ active: boolean }> = {}) {
  sequence++
  return User.create({
    fullName: `Test ${role}`,
    email: `${role}-${sequence}@hospital.test`,
    password: 'test-password',
    role,
    active: true,
    ...overrides,
  })
}
