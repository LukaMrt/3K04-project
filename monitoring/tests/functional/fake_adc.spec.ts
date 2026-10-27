import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import InventoryService from '#modules/inventory/inventory_service'
import env from '#start/env'
import { FakeAdc } from '#simulator/fake_adc'
import { useFakeModules } from '#tests/helpers/fake_modules'

const MONITORING_URL = `http://${env.get('HOST')}:${env.get('PORT')}`
const MORPHINE = '8c1d5e2a-4f3b-4a9e-b7d6-1e2f3a4b5c6d'
const PATIENT = '6b0f3c2e-8d1a-4f7b-9e5c-3a2d1f0e9b8c'
const NURSE = 'e9d8c7b6-a5f4-4e3d-8c2b-1a0f9e8d7c6b'

function fakeAdc(monitoringUrl = MONITORING_URL) {
  return new FakeAdc({
    adcId: 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47',
    label: 'ADC Test',
    floor: 2,
    description: 'Test bench',
    monitoringUrl,
    inventory: [
      { medicationId: MORPHINE, medicationName: 'Morphine 10 mg/mL', quantityInBoxes: 3 },
    ],
  })
}

test.group('Fake ADC / talking to the Monitoring System', (group) => {
  const fakes = useFakeModules(group, new Date('2026-10-16T14:00:00.000Z'))

  test('registers, then forgets its transactions once acknowledged', async ({
    assert,
    cleanup,
  }) => {
    const adc = fakeAdc()
    await adc.start()
    cleanup(() => adc.stop())

    const registration = await adc.register()
    assert.equal(registration.httpStatus, 200)
    assert.isTrue(fakes.cabinetHealth.registered.has(adc.adcId))

    adc.dispense(MORPHINE, PATIENT, NURSE, 'Jane Doe, RN')
    const result = await adc.raiseAlarm('door_left_open', 'warning')

    assert.equal(result.httpStatus, 200)
    assert.deepEqual(
      result.acknowledgements.map((a) => a.status),
      ['received', 'received']
    )
    assert.lengthOf(adc.pending, 0)
    assert.lengthOf(fakes.alarms.recorded, 1)
    assert.equal(adc.inventory[0].quantityInBoxes, 2)
  })

  test('forgets a rejected transaction too', async ({ assert, cleanup }) => {
    const adc = fakeAdc()
    await adc.start()
    cleanup(() => adc.stop())
    await adc.register()

    const result = await adc.raiseAlarm('door_left_open', 'urgent')

    assert.deepEqual(
      result.acknowledgements.map((a) => [a.status, a.reason]),
      [['rejected', 'INVALID_SEVERITY']]
    )
    assert.lengthOf(adc.pending, 0)
  })

  test('registers again when the Monitoring System does not know it', async ({
    assert,
    cleanup,
  }) => {
    const adc = fakeAdc()
    await adc.start()
    cleanup(() => adc.stop())

    const result = await adc.setState('maintenance')

    assert.equal(result.httpStatus, 200)
    assert.isTrue(fakes.cabinetHealth.registered.has(adc.adcId))
    assert.equal(fakes.cabinetHealth.heartbeats.at(-1)?.state, 'maintenance')
  })

  test('keeps its transactions while the Monitoring System is unreachable', async ({
    assert,
    cleanup,
  }) => {
    const adc = fakeAdc('http://localhost:1')
    await adc.start()
    cleanup(() => adc.stop())

    const result = await adc.raiseAlarm('power_failure', 'critical')

    assert.isNull(result.httpStatus)
    assert.lengthOf(adc.pending, 1)
  })
})

test.group('Fake ADC / receiving commands', (group) => {
  const fakes = useFakeModules(group, new Date('2026-10-16T14:00:00.000Z'))

  async function sendCommand(adc: FakeAdc, body: Record<string, unknown>) {
    const response = await fetch(`${adc.contactAddress}/api/v1/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: response.status, body: (await response.json()) as any }
  }

  const command = (adcId: string, enabled: boolean) => ({
    commandId: '5d6e7f80-91a2-4b3c-8d4e-5f6a7b8c9d0e',
    adcId,
    command: 'set_maintenance_mode',
    parameters: { enabled },
    issuedAt: '2026-10-16T14:10:00.000Z',
  })

  test('applies a maintenance command and reports the new state at once', async ({
    assert,
    cleanup,
  }) => {
    const adc = fakeAdc()
    await adc.start()
    cleanup(() => adc.stop())
    await adc.register()

    const answer = await sendCommand(adc, command(adc.adcId, true))
    await adc.sendHeartbeat()

    assert.deepEqual(answer, {
      status: 200,
      body: { commandId: command(adc.adcId, true).commandId, adcId: adc.adcId, status: 'applied' },
    })
    assert.equal(adc.state, 'maintenance')
    assert.equal(fakes.cabinetHealth.heartbeats.at(-1)?.state, 'maintenance')
  })

  test('refills a medication and reports the new inventory at once', async ({
    assert,
    cleanup,
  }) => {
    const adc = fakeAdc()
    await adc.start()
    cleanup(() => adc.stop())
    await adc.register()

    const result = await adc.refill(MORPHINE, 10)

    assert.equal(result?.httpStatus, 200)
    assert.lengthOf(adc.pending, 0)
    const inventoryService = await app.container.make(InventoryService)
    const inventory = await inventoryService.getInventory(adc.adcId)
    assert.equal(inventory?.lines[0].quantityInBoxes, 13)
    assert.isNull(adc.refill(MORPHINE, 0))
    assert.isNull(adc.refill('00000000-0000-4000-8000-000000000000', 5))
  })

  test('refuses a command meant for another ADC or impossible in fault', async ({
    assert,
    cleanup,
  }) => {
    const adc = fakeAdc()
    await adc.start()
    cleanup(() => adc.stop())

    const mismatch = await sendCommand(adc, command('9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', true))
    adc.state = 'fault'
    const inFault = await sendCommand(adc, command(adc.adcId, true))

    assert.equal(mismatch.status, 409)
    assert.equal(mismatch.body.error.code, 'ADC_ID_MISMATCH')
    assert.equal(inFault.status, 409)
    assert.equal(inFault.body.error.code, 'COMMAND_NOT_APPLICABLE')
  })
})
