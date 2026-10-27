import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import env from '#start/env'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import InventoryService from '#modules/inventory/inventory_service'
import { FakeAdc } from '#simulator/fake_adc'
import { account } from '#tests/helpers/accounts'

const WEST = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const EAST = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const MORPHINE = '8c1d5e2a-4f3b-4a9e-b7d6-1e2f3a4b5c6d'

/** Two reachable ADCs of floor 2: West low on morphine, East a source of it. */
async function twoAdcs() {
  const health = await app.container.make(CabinetHealthService)
  const inventory = await app.container.make(InventoryService)
  const now = new Date()
  for (const [adcId, label, boxes] of [
    [WEST, 'ADC-West', 4],
    [EAST, 'ADC-East', 20],
  ] as const) {
    await health.register({ adcId, label, floor: 2, description: 'Ward' }, now)
    await health.recordHeartbeat(adcId, 'online', now)
    await inventory.replaceInventory(
      adcId,
      [{ medicationId: MORPHINE, medicationName: 'Morphine 10 mg/mL', quantityInBoxes: boxes }],
      now
    )
  }
}

test.group('Dashboard / ADC page (FR-INV-02 to 06, D-14)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a nurse sees the inventory and its low-stock flag, without sources', async ({
    client,
    assert,
  }) => {
    await twoAdcs()
    const nurse = await account('nurse')

    const response = await client.get(`/adcs/${WEST}`).loginAs(nurse)

    response.assertStatus(200)
    response.assertTextIncludes('LOW STOCK')
    assert.notInclude(response.text(), 'Same-floor sources')
    assert.notInclude(response.text(), 'Enter maintenance mode')
  })

  test('a pharmacist sees the same-floor sources and the aggregated stock', async ({ client }) => {
    await twoAdcs()
    const pharmacist = await account('pharmacist')

    const response = await client.get(`/adcs/${WEST}`).loginAs(pharmacist)

    response.assertTextIncludes('Same-floor sources')
    response.assertTextIncludes('ADC-East')
    response.assertTextIncludes('<td>24</td>')
  })

  test('a technician sends commands but does not see the inventory', async ({ client, assert }) => {
    await twoAdcs()
    const technician = await account('technician')

    const response = await client.get(`/adcs/${WEST}`).loginAs(technician)

    response.assertTextIncludes('Enter maintenance mode')
    assert.notInclude(response.text(), 'Morphine')
    assert.notInclude(response.text(), 'Send configuration')
  })

  test('hospital risk management may not open the page', async ({ client }) => {
    await twoAdcs()
    const risk = await account('risk_management')

    const response = await client.get(`/adcs/${WEST}`).loginAs(risk)

    response.assertStatus(403)
  })
})

test.group('Dashboard / commands and configuration (FR-COM-04 to 06, FR-COM-12)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a command to an offline ADC is refused', async ({ client }) => {
    const health = await app.container.make(CabinetHealthService)
    await health.register(
      { adcId: WEST, label: 'ADC-West', floor: 2, description: '' },
      new Date(Date.now() - 100_000)
    )
    await health.checkTimeouts()
    const technician = await account('technician')

    const response = await client
      .post(`/adcs/${WEST}/maintenance`)
      .form({ enabled: 'true' })
      .withCsrfToken()
      .loginAs(technician)
      .redirects(0)

    response.assertFlashMessage('error', 'Maintenance mode on: refused, the ADC is offline.')
  })

  test('a command delivered to the ADC is shown as delivered', async ({
    client,
    assert,
    cleanup,
  }) => {
    const adc = new FakeAdc({
      adcId: WEST,
      label: 'ADC-West',
      floor: 2,
      description: 'Ward',
      monitoringUrl: `http://${env.get('HOST')}:${env.get('PORT')}`,
    })
    await adc.start()
    cleanup(() => adc.stop())
    await adc.register()
    const technician = await account('technician')

    const response = await client
      .post(`/adcs/${WEST}/maintenance`)
      .form({ enabled: 'true' })
      .withCsrfToken()
      .loginAs(technician)
      .redirects(0)

    response.assertFlashMessage('success', 'Maintenance mode on: delivered.')
    assert.equal(adc.state, 'maintenance')
  })

  test('a configuration out of its rules, or empty, is not sent', async ({ client }) => {
    await twoAdcs()
    const admin = await account('administrator')

    const outOfRange = await client
      .post(`/adcs/${WEST}/configuration`)
      .form({ timeServer: '', screenLockTimeoutSeconds: '5' })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)
    outOfRange.assertStatus(302)
    outOfRange.assertFlashMessage('inputErrorsBag', {
      screenLockTimeoutSeconds: ['The screenLockTimeoutSeconds field must be between 15 and 600'],
    })

    const empty = await client
      .post(`/adcs/${WEST}/configuration`)
      .form({ timeServer: '', screenLockTimeoutSeconds: '' })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)
    empty.assertFlashMessage('error', 'Give at least one setting to change.')
  })
})
