import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import AdcCommunicationService from '#modules/adc_communication/adc_communication_service'
import AlarmService from '#modules/alarms/alarms_service'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import { ManualClock } from '#tests/helpers/manual_clock'

const ADC = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const T0 = new Date('2026-10-16T14:00:00.000Z')
const TECHNICIAN = { userId: 3, role: 'technician' as const }

function at(seconds: number) {
  return new Date(T0.getTime() + seconds * 1000)
}

/** Displayed status of the ADC, as the Cabinet Health Monitor in use gives it. */
async function displayed() {
  const health = await app.container.make(CabinetHealthService)
  const status = await health.getStatus(ADC)
  return status.displayedStatus
}

function heartbeat(transactions: unknown[] = []) {
  return { adcId: ADC, sentAt: T0.toISOString(), state: 'online', inventory: [], transactions }
}

/**
 * The two scenarios of the D2 demonstration, through the HTTP interface and the real
 * modules: an alarm received from an ADC, then the loss of communication with that ADC.
 */
test.group('Demonstration scenarios (real modules)', (group) => {
  const modules = {} as { clock: ManualClock; alarms: AlarmService; health: CabinetHealthService }

  group.each.setup(async () => {
    const clock = new ManualClock(T0)
    const history = new HistoryService(clock)
    const alarms = new AlarmService(history, clock)
    const health = new CabinetHealthService(alarms, history, clock)
    Object.assign(modules, { clock, alarms, health })
    app.container.swap(ClockService, () => clock)
    app.container.swap(AlarmService, () => alarms)
    app.container.swap(CabinetHealthService, () => health)
    const rollback = await testUtils.db().withGlobalTransaction()
    return () => {
      app.container.restoreAll([ClockService, AlarmService, CabinetHealthService])
      return rollback()
    }
  })

  test('an alarm from an ADC is recorded and announced', async ({ client, assert }) => {
    const raised: string[] = []
    modules.alarms.subscribe((event) => event.kind === 'raised' && raised.push(event.alarm.alarmId))
    await client.post('/api/v1/adcs/register').json({
      adcId: ADC,
      label: 'ADC West 214',
      contactAddress: 'http://localhost:8443',
      location: { floor: 2, description: 'West wing, room 214' },
    })

    const alarmId = '3f2c8a1e-9b4d-4c7a-8e21-5d0f6b9a1c34'
    const response = await client.post('/api/v1/heartbeats').json(
      heartbeat([
        {
          type: 'alarm',
          transactionId: alarmId,
          timestamp: T0.toISOString(),
          alarmType: 'temperature_out_of_range',
          severity: 'critical',
          description: 'Drawer 3 at 11.2 °C',
        },
      ])
    )

    response.assertStatus(200)
    assert.deepEqual(raised, [alarmId])
    assert.equal(await displayed(), 'ONLINE')
  })

  test('a silent ADC goes unreachable, then offline with one alarm; commands are refused', async ({
    client,
    assert,
  }) => {
    await client.post('/api/v1/adcs/register').json({
      adcId: ADC,
      label: 'ADC West 214',
      contactAddress: 'http://localhost:8443',
      location: { floor: 2, description: 'West wing, room 214' },
    })
    await client.post('/api/v1/heartbeats').json(heartbeat())

    modules.clock.set(at(45))
    await modules.health.checkTimeouts()
    assert.equal(await displayed(), 'UNREACHABLE')

    modules.clock.set(at(75))
    await modules.health.checkTimeouts()
    assert.equal(await displayed(), 'OFFLINE')
    const [loss] = await modules.alarms.listUnacknowledged()
    assert.containsSubset(loss, { adcId: ADC, alarmType: 'communication_loss', severity: 'error' })

    const communication = await app.container.make(AdcCommunicationService)
    const outcome = await communication.sendCommand(TECHNICIAN, ADC, {
      kind: 'setMaintenanceMode',
      enabled: true,
    })
    assert.deepEqual(outcome, { kind: 'refusedOffline' })

    modules.clock.set(at(90))
    await client.post('/api/v1/heartbeats').json(heartbeat())
    assert.equal(await displayed(), 'ONLINE')
    assert.lengthOf(await modules.alarms.listUnacknowledged(), 1)
  })
})
