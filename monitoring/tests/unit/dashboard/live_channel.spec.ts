import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import transmit from '@adonisjs/transmit/services/main'
import AlarmService from '#modules/alarms/alarms_service'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import LiveChannel, { ADCS_CHANNEL, ALARMS_CHANNEL } from '#modules/dashboard/live_channel'
import HistoryService from '#modules/history/history_service'
import UserService from '#modules/users/users_service'
import { ManualClock } from '#tests/helpers/manual_clock'

const ADC = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const NOW = new Date('2026-10-16T14:00:00.000Z')

test.group('LiveChannel (D-27, NFR-PRF-01)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('pushes status changes and raised alarms, with the label of the ADC', async ({
    assert,
    cleanup,
  }) => {
    const clock = new ManualClock(NOW)
    const history = new HistoryService(clock)
    const alarms = new AlarmService(history, clock)
    const health = new CabinetHealthService(alarms, history, clock)
    const live = new LiveChannel(alarms, health, new UserService(history, clock))

    const pushed: Array<{ channel: string; payload: any }> = []
    const broadcast = transmit.broadcast
    transmit.broadcast = ((channel: string, payload: any) => {
      pushed.push({ channel, payload })
    }) as typeof transmit.broadcast
    cleanup(() => {
      transmit.broadcast = broadcast
    })
    live.start()

    await health.register({ adcId: ADC, label: 'ADC-101', floor: 1, description: '' }, NOW)
    await alarms.recordFromAdc({
      transactionId: '3f2c8a1e-9b4d-4c7a-8e21-5d0f6b9a1c34',
      adcId: ADC,
      timestamp: NOW,
      alarmType: 'temperature_out_of_range',
      severity: 'critical',
      description: null,
    })
    await new Promise((resolve) => setTimeout(resolve, 50))

    assert.deepEqual(
      pushed.map(({ channel }) => channel),
      [ADCS_CHANNEL, ALARMS_CHANNEL]
    )
    assert.containsSubset(pushed[0].payload, {
      label: 'ADC-101',
      previous: null,
      status: { displayedStatus: 'PENDING' },
    })
    assert.containsSubset(pushed[1].payload, {
      kind: 'raised',
      adcLabel: 'ADC-101',
      audibleRepeatSeconds: 60,
      alarm: { timestamp: NOW.toISOString() },
    })
  })
})
