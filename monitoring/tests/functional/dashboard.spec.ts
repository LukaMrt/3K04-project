import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import AlarmService from '#modules/alarms/alarms_service'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import { account } from '#tests/helpers/accounts'

const ADC_A = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const ADC_B = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const ALARM = '3f2c8a1e-9b4d-4c7a-8e21-5d0f6b9a1c34'

/** Two ADCs: ADC-A online with a critical alarm, ADC-B registered only (PENDING). */
async function twoAdcs() {
  const health = await app.container.make(CabinetHealthService)
  const now = new Date()
  await health.register({ adcId: ADC_A, label: 'ADC-A', floor: 1, description: '' }, now)
  await health.register({ adcId: ADC_B, label: 'ADC-B', floor: 1, description: '' }, now)
  await health.recordHeartbeat(ADC_A, 'online', now)
  const alarms = await app.container.make(AlarmService)
  await alarms.recordFromAdc({
    transactionId: ALARM,
    adcId: ADC_A,
    timestamp: now,
    alarmType: 'temperature_out_of_range',
    severity: 'critical',
    description: 'Drawer 3 at 11.2 °C',
  })
}

test.group('Dashboard / main view (FR-DSH-01 to 03, FR-ALM-04, NFR-USA-01)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a nurse sees the ADCs and the unacknowledged alarms', async ({ client }) => {
    await twoAdcs()
    const nurse = await account('nurse')

    const response = await client.get('/dashboard').loginAs(nurse)

    response.assertStatus(200)
    response.assertTextIncludes('ADC-A')
    response.assertTextIncludes('ADC-B')
    response.assertTextIncludes('temperature_out_of_range')
    response.assertTextIncludes('&quot;audibleRepeatSeconds&quot;:60')
  })

  test('the list is filtered by status', async ({ client, assert }) => {
    await twoAdcs()
    const nurse = await account('nurse')

    const response = await client.get('/dashboard?status=PENDING').loginAs(nurse)

    // ADC-A appears only as the ADC of its alarm, not in the filtered list.
    const state = response.text()
    assert.include(state, '&quot;filter&quot;:&quot;PENDING&quot;')
    assert.match(state, /&quot;adcs&quot;:\[\{&quot;adcId&quot;:&quot;9a8b7c6d/)
  })

  test('hospital risk management sees neither statuses nor alarms (D-14)', async ({
    client,
    assert,
  }) => {
    await twoAdcs()
    const risk = await account('risk_management')

    const response = await client.get('/dashboard').loginAs(risk)

    response.assertStatus(200)
    assert.notInclude(response.text(), 'ADC-A')
    assert.notInclude(response.text(), 'temperature_out_of_range')
  })
})

test.group('Dashboard / acknowledgement (FR-ALM-05, FR-ALM-06, SPEC-ALM-01)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a technician acknowledges; a second acknowledgement names the first', async ({
    client,
    assert,
  }) => {
    await twoAdcs()
    const technician = await account('technician')
    const nurse = await account('nurse')

    const first = await client
      .post(`/alarms/${ALARM}/acknowledge`)
      .withCsrfToken()
      .loginAs(technician)
      .redirects(0)
    first.assertFlashMessage('success', 'Alarm acknowledged.')

    const second = await client
      .post(`/alarms/${ALARM}/acknowledge`)
      .withCsrfToken()
      .loginAs(nurse)
      .redirects(0)
    const message = second.flashMessages().error as string
    assert.match(message, /^Already acknowledged by Test technician at /)

    const alarms = await app.container.make(AlarmService)
    assert.deepEqual(await alarms.listUnacknowledged(), [])
  })

  test('an administrator may not acknowledge (D-09)', async ({ client }) => {
    await twoAdcs()
    const admin = await account('administrator')

    const response = await client
      .post(`/alarms/${ALARM}/acknowledge`)
      .withCsrfToken()
      .loginAs(admin)

    response.assertStatus(403)
  })
})
