import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import ClockService from '#modules/clock/clock_service'
import { ManualClock } from '#tests/helpers/manual_clock'
import { recordLifecycleEvent, SHUTDOWN_EVENT, START_UP_EVENT } from '#start/lifecycle'

const T0 = new Date('2026-10-16T14:00:00.000Z')

test.group('Lifecycle (NFR-AVL-05)', (group) => {
  group.each.setup(async () => {
    app.container.swap(ClockService, () => new ManualClock(T0))
    const rollback = await testUtils.db().withGlobalTransaction()
    return () => {
      app.container.restore(ClockService)
      return rollback()
    }
  })

  test('records the start-up and the shutdown in the system log', async ({ db }) => {
    await recordLifecycleEvent(START_UP_EVENT)
    await recordLifecycleEvent(SHUTDOWN_EVENT)

    await db.assertHas('system_log_entries', { event: 'system_start_up', adc_id: null })
    await db.assertHas('system_log_entries', { event: 'system_shutdown', adc_id: null })
  })
})
