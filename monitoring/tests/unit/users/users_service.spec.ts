import { test } from '@japa/runner'
import UserService from '#modules/users/users_service'
import type { Role } from '#modules/shared/types'

const users = new UserService(null as any, null as any)
const as = (role: Role) => ({ userId: 1, role })

test.group('UserService / permissions (D-14, SPEC-USR-01)', () => {
  test('administrators cannot acknowledge alarms (D-09)', ({ assert }) => {
    assert.isTrue(users.can(as('nurse'), 'acknowledgeAlarm'))
    assert.isTrue(users.can(as('technician'), 'acknowledgeAlarm'))
    assert.isFalse(users.can(as('administrator'), 'acknowledgeAlarm'))
  })

  test('commands for technicians and administrators, configuration for administrators', ({
    assert,
  }) => {
    assert.isTrue(users.can(as('technician'), 'sendCommand'))
    assert.isFalse(users.can(as('technician'), 'sendConfiguration'))
    assert.isTrue(users.can(as('administrator'), 'sendConfiguration'))
    assert.isFalse(users.can(as('nurse'), 'sendCommand'))
  })

  test('hospital risk management only reads history, alarm reports and the audit log', ({
    assert,
  }) => {
    const riskManagement = as('risk_management')
    assert.isTrue(users.can(riskManagement, 'viewAdcHistory'))
    assert.isTrue(users.can(riskManagement, 'alarmReport'))
    assert.isTrue(users.can(riskManagement, 'viewAuditLog'))
    assert.isFalse(users.can(riskManagement, 'consumptionReport'))
    assert.isFalse(users.can(riskManagement, 'viewAlarms'))
  })

  test('the staff filter of a consumption report is for administrators only', ({ assert }) => {
    assert.isTrue(users.can(as('pharmacist'), 'consumptionReport'))
    assert.isFalse(users.can(as('pharmacist'), 'consumptionReportByStaff'))
    assert.isTrue(users.can(as('administrator'), 'consumptionReportByStaff'))
  })
})

test.group('UserService / patient identifiers (SPEC-USR-02, D-11)', () => {
  test('only pharmacists and administrators see patient identifiers', ({ assert }) => {
    const roles: Role[] = ['nurse', 'pharmacist', 'technician', 'administrator', 'risk_management']
    assert.deepEqual(
      roles.filter((role) => users.canSeePatientIds(as(role))),
      ['pharmacist', 'administrator']
    )
  })
})
