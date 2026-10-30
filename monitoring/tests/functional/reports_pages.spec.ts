import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import HistoryService from '#modules/history/history_service'
import { account } from '#tests/helpers/accounts'
import { HOSPITAL_TIME_ZONE } from '#modules/shared/time_zone'

const ADC = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const PATIENT = '6b0f3c2e-8d1a-4f7b-9e5c-3a2d1f0e9b8c'
const STAFF = 'e9d8c7b6-a5f4-4e3d-8c2b-1a0f9e8d7c6b'
/** Report dates are days of the hospital, not of the machine (TZ=UTC in .env). */
const TODAY = DateTime.now().setZone(HOSPITAL_TIME_ZONE).toISODate()!

/** One ADC with a dispensing of 6 boxes and a critical alarm, today. */
async function activity() {
  const health = await app.container.make(CabinetHealthService)
  const history = await app.container.make(HistoryService)
  const now = new Date()
  await health.register({ adcId: ADC, label: 'ADC-101', floor: 1, description: '' }, now)
  await history.recordDispensing({
    transactionId: 'a7b8c9d0-e1f2-4a3b-9c4d-5e6f7a8b9c0d',
    adcId: ADC,
    timestamp: now,
    medicationId: '8c1d5e2a-4f3b-4a9e-b7d6-1e2f3a4b5c6d',
    medicationName: 'Heparin',
    quantityInBoxes: 6,
    patientId: PATIENT,
    staffMemberId: STAFF,
    staffMemberName: 'Jane Doe, RN',
  })
  await history.recordAlarm({
    alarmId: '3f2c8a1e-9b4d-4c7a-8e21-5d0f6b9a1c34',
    adcId: ADC,
    timestamp: now,
    alarmType: 'temperature_out_of_range',
    severity: 'critical',
    description: null,
    source: 'adc',
  })
}

test.group('Dashboard / reports (FR-RPT-01 to 08)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a pharmacist generates a consumption report, with patient identifiers', async ({
    client,
  }) => {
    await activity()
    const pharmacist = await account('pharmacist')

    const generated = await client
      .post('/reports/consumption')
      .form({ from: TODAY, to: TODAY, patientId: PATIENT })
      .withCsrfToken()
      .loginAs(pharmacist)
      .redirects(0)
    generated.assertStatus(302)

    const page = await client.get(generated.header('location')!).loginAs(pharmacist)
    page.assertTextIncludes('6 boxes dispensed')
    page.assertTextIncludes(PATIENT)
  })

  test('an end before the start is an invalid date range (US-RPT-01)', async ({ client }) => {
    const pharmacist = await account('pharmacist')

    const response = await client
      .post('/reports/consumption')
      .form({ from: '2026-09-30', to: '2026-09-01' })
      .withCsrfToken()
      .loginAs(pharmacist)
      .redirects(0)

    response.assertFlashMessage('error', 'Invalid date range: the end comes before the start.')
  })

  test('only an administrator filters by staff member (D-14)', async ({ client }) => {
    const pharmacist = await account('pharmacist')

    const response = await client
      .post('/reports/consumption')
      .form({ from: TODAY, to: TODAY, staffMemberId: STAFF })
      .withCsrfToken()
      .loginAs(pharmacist)

    response.assertStatus(403)
  })

  test('risk management exports an alarm report but cannot open a consumption one', async ({
    client,
    assert,
  }) => {
    await activity()
    const risk = await account('risk_management')
    const pharmacist = await account('pharmacist')
    const consumption = await client
      .post('/reports/consumption')
      .form({ from: TODAY, to: TODAY })
      .withCsrfToken()
      .loginAs(pharmacist)
      .redirects(0)

    const alarms = await client
      .post('/reports/alarms')
      .form({ from: TODAY, to: TODAY })
      .withCsrfToken()
      .loginAs(risk)
      .redirects(0)
    const file = await client.get(`${alarms.header('location')!}/export`).loginAs(risk)
    file.assertHeader('content-type', 'text/csv')
    file.assertHeader(
      'content-disposition',
      'attachment; filename="alarm-report-' + TODAY + '-to-' + TODAY + '.csv"'
    )
    assert.include(file.text(), 'temperature_out_of_range')

    const refused = await client.get(consumption.header('location')!).loginAs(risk)
    refused.assertStatus(403)
  })
})

test.group('Dashboard / history and audit (FR-HIS-04, FR-HIS-07, D-11)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('risk management reads the history without patient identifiers', async ({
    client,
    assert,
  }) => {
    await activity()
    const risk = await account('risk_management')

    const response = await client.get(`/adcs/${ADC}/history`).loginAs(risk)

    response.assertStatus(200)
    response.assertTextIncludes('Heparin')
    assert.notInclude(response.text(), PATIENT)
  })

  test('a period without any event says "no data found" (D1 activity 4)', async ({
    client,
    assert,
  }) => {
    await activity()
    const pharmacist = await account('pharmacist')

    const empty = await client
      .get(`/adcs/${ADC}/history`)
      .qs({ from: '2020-01-01', to: '2020-01-02' })
      .loginAs(pharmacist)
    const today = await client.get(`/adcs/${ADC}/history`).loginAs(pharmacist)

    empty.assertTextIncludes('No data found for this period.')
    today.assertStatus(200)
    today.assertTextIncludes('Heparin')
    assert.notInclude(today.text(), 'No data found')
  })

  test('the audit log shows who did what', async ({ client }) => {
    const admin = await account('administrator')
    await client
      .post('/accounts')
      .form({ fullName: 'Ada', email: 'ada@hospital.test', password: 'long-enough', role: 'nurse' })
      .withCsrfToken()
      .loginAs(admin)

    const response = await client.get('/audit').loginAs(admin)

    response.assertTextIncludes('create_account')
    response.assertTextIncludes('Test administrator')
  })

  test('a nurse may not read the audit log', async ({ client }) => {
    const nurse = await account('nurse')

    const response = await client.get('/audit').loginAs(nurse)

    response.assertStatus(403)
  })
})
