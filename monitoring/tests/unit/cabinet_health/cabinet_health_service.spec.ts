import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AlarmService from '#modules/alarms/alarms_service'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import { UnknownAdcError } from '#modules/cabinet_health/errors'
import type { AdcIdentity, StatusChangedEvent } from '#modules/cabinet_health/types'
import HistoryService from '#modules/history/history_service'
import { ManualClock } from '#tests/helpers/manual_clock'

const WEST = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const EAST = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const NORTH = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e'
const T0 = new Date('2026-10-16T14:00:00.000Z')
const DAY = { from: new Date('2026-10-16T00:00:00Z'), to: new Date('2026-10-16T23:59:59Z') }

function identity(adcId: string, label: string, floor = 2): AdcIdentity {
  return { adcId, label, floor, description: `${label}, floor ${floor}` }
}

/** `seconds` after T0. */
function at(seconds: number) {
  return new Date(T0.getTime() + seconds * 1000)
}

/** A Cabinet Health Monitor on the real Alarm Manager and Historical Data Store. */
function setup() {
  const clock = new ManualClock(T0)
  const history = new HistoryService(clock)
  const alarms = new AlarmService(history, clock)
  const health = new CabinetHealthService(alarms, history, clock)
  const events: StatusChangedEvent[] = []
  health.subscribe((event) => events.push(event))

  /** Moves the clock to `seconds` after T0, then runs the scheduler's check. */
  async function checkAt(seconds: number) {
    clock.set(at(seconds))
    await health.checkTimeouts()
  }
  async function statusChanges(adcId = WEST) {
    const adcHistory = await history.queryAdcHistory(adcId, DAY)
    return adcHistory.statusChanges
  }
  async function displayed(adcId = WEST) {
    const status = await health.getStatus(adcId)
    return status.displayedStatus
  }

  return { clock, history, alarms, health, events, checkAt, statusChanges, displayed }
}

test.group('CabinetHealthService / registration (SPEC-COM-01, D-20)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a new ADC is PENDING, with its registration time as last contact', async ({ assert }) => {
    const { health, events, statusChanges } = setup()

    assert.deepEqual(await health.register(identity(WEST, 'ADC West'), T0), {
      firstRegistration: true,
    })

    const status = { adcId: WEST, displayedStatus: 'PENDING', stale: false, lastContact: T0 }
    assert.deepEqual(await health.getStatus(WEST), status)
    assert.isTrue(await health.isRegistered(WEST))
    assert.deepEqual(events, [{ status, previous: null }])
    assert.deepEqual(await statusChanges(), [
      { adcId: WEST, reportedState: null, connectivity: 'reachable', at: T0 },
    ])
  })

  test('a re-registration replaces label and location, and nothing else', async ({ assert }) => {
    const { health, events } = setup()
    await health.register(identity(WEST, 'ADC West'), T0)
    await health.recordHeartbeat(WEST, 'online', at(10))

    const result = await health.register(identity(WEST, 'ADC West 214', 3), at(20))

    assert.deepEqual(result, { firstRegistration: false })
    const [summary] = await health.listAdcs({})
    assert.containsSubset(summary, {
      label: 'ADC West 214',
      floor: 3,
      displayedStatus: 'ONLINE',
      lastContact: at(10),
    })
    assert.lengthOf(events, 2)
  })

  test('an unknown ADC is not registered and has no status', async ({ assert }) => {
    const { health } = setup()

    assert.isFalse(await health.isRegistered(WEST))
    await assert.rejects(() => health.getStatus(WEST), UnknownAdcError)
    await assert.rejects(() => health.recordHeartbeat(WEST, 'online', T0), UnknownAdcError)
  })
})

test.group('CabinetHealthService / heartbeats (SPEC-HLT-01)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a heartbeat shows the reported state; the same state again changes nothing', async ({
    assert,
  }) => {
    const { health, events, statusChanges } = setup()
    await health.register(identity(WEST, 'ADC West'), T0)

    await health.recordHeartbeat(WEST, 'maintenance', at(5))
    await health.recordHeartbeat(WEST, 'maintenance', at(35))

    assert.deepEqual(await health.getStatus(WEST), {
      adcId: WEST,
      displayedStatus: 'MAINTENANCE',
      stale: false,
      lastContact: at(35),
    })
    assert.lengthOf(events, 2)
    assert.equal(events[1].previous, 'PENDING')
    assert.lengthOf(await statusChanges(), 2)
  })
})

test.group('CabinetHealthService / timeouts (SPEC-HLT-02, FR-HLT-02 to 04)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('unreachable at 45 s, stale, with the time of the last contact', async ({ assert }) => {
    const { health, checkAt, events, displayed } = setup()
    await health.register(identity(WEST, 'ADC West'), T0)
    await health.recordHeartbeat(WEST, 'online', T0)

    await checkAt(44)
    assert.equal(await displayed(), 'ONLINE')

    await checkAt(45)
    assert.deepEqual(await health.getStatus(WEST), {
      adcId: WEST,
      displayedStatus: 'UNREACHABLE',
      stale: true,
      lastContact: T0,
    })
    assert.equal(events.at(-1)?.previous, 'ONLINE')
  })

  test('offline at 75 s with one communication loss alarm, never raised again', async ({
    assert,
  }) => {
    const { health, alarms, checkAt, statusChanges, displayed } = setup()
    await health.register(identity(WEST, 'ADC West'), T0)
    await health.recordHeartbeat(WEST, 'online', T0)

    await checkAt(45)
    await checkAt(75)
    await checkAt(76)
    await checkAt(300)

    assert.equal(await displayed(), 'OFFLINE')
    const raised = await alarms.listUnacknowledged()
    assert.lengthOf(raised, 1)
    assert.containsSubset(raised[0], {
      adcId: WEST,
      alarmType: 'communication_loss',
      severity: 'error',
      timestamp: at(75),
    })
    const changes = await statusChanges()
    assert.deepEqual(
      changes.map((change) => change.connectivity),
      ['reachable', 'reachable', 'unreachable', 'offline']
    )
  })

  test('a missed check goes straight from online to offline, with its alarm', async ({
    assert,
  }) => {
    const { health, alarms, checkAt, displayed } = setup()
    await health.register(identity(WEST, 'ADC West'), T0)
    await health.recordHeartbeat(WEST, 'online', T0)

    await checkAt(90)

    assert.equal(await displayed(), 'OFFLINE')
    assert.lengthOf(await alarms.listUnacknowledged(), 1)
  })

  test('the ADC comes back, its alarm stays unacknowledged (FR-HLT-07)', async ({ assert }) => {
    const { health, alarms, checkAt, events } = setup()
    await health.register(identity(WEST, 'ADC West'), T0)
    await health.recordHeartbeat(WEST, 'online', T0)
    await checkAt(80)

    await health.recordHeartbeat(WEST, 'fault', at(100))

    assert.deepEqual(await health.getStatus(WEST), {
      adcId: WEST,
      displayedStatus: 'FAULT',
      stale: false,
      lastContact: at(100),
    })
    assert.equal(events.at(-1)?.previous, 'OFFLINE')
    assert.lengthOf(await alarms.listUnacknowledged(), 1)
  })

  test('a PENDING ADC that never sends a heartbeat goes offline too (FR-HLT-06)', async ({
    assert,
  }) => {
    const { health, checkAt, displayed } = setup()
    await health.register(identity(WEST, 'ADC West'), T0)

    await checkAt(75)

    assert.equal(await displayed(), 'OFFLINE')
  })
})

test.group('CabinetHealthService / lists (FR-DSH-01 to 03, D-23)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lists the ADCs sorted by label, filtered by displayed status', async ({ assert }) => {
    const { health, checkAt } = setup()
    await health.register(identity(WEST, 'C West'), T0)
    await health.register(identity(EAST, 'A East'), T0)
    await health.register(identity(NORTH, 'B North'), T0)
    await health.recordHeartbeat(EAST, 'online', at(40))
    await health.recordHeartbeat(NORTH, 'online', at(40))
    await checkAt(50)

    const all = await health.listAdcs({})
    assert.deepEqual(
      all.map((adc) => adc.label),
      ['A East', 'B North', 'C West']
    )
    const unreachable = await health.listAdcs({ status: 'UNREACHABLE' })
    assert.deepEqual(
      unreachable.map((adc) => adc.label),
      ['C West']
    )
  })

  test('same-floor sources: the other reachable ADCs of the floor only', async ({ assert }) => {
    const { health, clock } = setup()
    await health.register(identity(WEST, 'West'), T0)
    await health.register(identity(EAST, 'East'), T0)
    await health.register(identity(NORTH, 'North', 5), T0)
    await health.recordHeartbeat(EAST, 'online', at(10))
    await health.recordHeartbeat(WEST, 'online', at(50))
    clock.set(at(54))

    // East: silence 44 s, same floor. North: other floor.
    assert.deepEqual(await health.reachableOnSameFloor(WEST), [{ adcId: EAST, label: 'East' }])

    clock.set(at(55))
    // East: silence 45 s, no longer a source.
    assert.deepEqual(await health.reachableOnSameFloor(WEST), [])
  })
})

test.group('CabinetHealthService / subscribers (D-27, D-36)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a failing listener does not stop the change nor the other listeners', async ({
    assert,
  }) => {
    const { health, events } = setup()
    health.subscribe(() => {
      throw new Error('dashboard down')
    })

    await health.register(identity(WEST, 'ADC West'), T0)

    assert.lengthOf(events, 1)
    assert.isTrue(await health.isRegistered(WEST))
  })
})
