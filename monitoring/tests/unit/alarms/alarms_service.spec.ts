import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import AlarmService from '#modules/alarms/alarms_service'
import { UnknownAlarmError } from '#modules/alarms/errors'
import type { AlarmEvent, NewAdcAlarm } from '#modules/alarms/types'
import HistoryService from '#modules/history/history_service'
import type { StoredAlarmWithAck } from '#modules/history/types'
import type { AlarmId } from '#modules/shared/types'
import { ManualClock } from '#tests/helpers/manual_clock'

const ADC = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const NOW = new Date('2026-10-16T14:05:00.000Z')
const NURSE = { userId: 7, role: 'nurse' as const }
const PHARMACIST = { userId: 8, role: 'pharmacist' as const }
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function adcAlarm(overrides: Partial<NewAdcAlarm> = {}): NewAdcAlarm {
  return {
    transactionId: '3f2c8a1e-9b4d-4c7a-8e21-5d0f6b9a1c34',
    adcId: ADC,
    timestamp: new Date('2026-10-16T14:03:27.000Z'),
    alarmType: 'temperature_out_of_range',
    severity: 'critical',
    description: 'Drawer 3 at 11.2 °C',
    ...overrides,
  }
}

/** A fresh Alarm Manager on the real Historical Data Store, with a clock set to NOW. */
async function setup(history?: HistoryService) {
  const clock = new ManualClock(NOW)
  const alarms = new AlarmService(history ?? (await app.container.make(HistoryService)), clock)
  const events: AlarmEvent[] = []
  alarms.subscribe((event) => events.push(event))
  return { alarms, clock, events }
}

test.group('AlarmService / alarms from ADCs (SPEC-COM-03, D-28)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('stores the alarm unacknowledged with the ADC timestamp, then announces it', async ({
    assert,
  }) => {
    const { alarms, events } = await setup()

    assert.equal(await alarms.recordFromAdc(adcAlarm()), 'recorded')

    const { transactionId, ...fields } = adcAlarm()
    const expected = { alarmId: transactionId, ...fields, source: 'adc', acknowledgement: null }
    assert.deepEqual(await alarms.listUnacknowledged(), [expected])
    assert.deepEqual(events, [{ kind: 'raised', alarm: expected, audibleRepeatSeconds: 60 }])
  })

  test('only a critical alarm repeats its audible cue (SPEC-ALM-02)', async ({ assert }) => {
    const { alarms, events } = await setup()

    await alarms.recordFromAdc(adcAlarm({ severity: 'warning' }))

    assert.lengthOf(events, 1)
    assert.isNull(events[0].kind === 'raised' && events[0].audibleRepeatSeconds)
  })

  test('a duplicate is neither stored again nor announced again', async ({ assert }) => {
    const { alarms, events } = await setup()
    await alarms.recordFromAdc(adcAlarm())

    assert.equal(await alarms.recordFromAdc(adcAlarm({ description: 'resent' })), 'duplicate')

    assert.lengthOf(await alarms.listUnacknowledged(), 1)
    assert.lengthOf(events, 1)
  })
})

test.group('AlarmService / communication loss (FR-HLT-04, D-15)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('raises an error alarm dated now, with a new UUID, and announces it', async ({ assert }) => {
    const { alarms, events } = await setup()

    const alarmId = await alarms.raiseCommunicationLoss(ADC)

    assert.match(alarmId, UUID_V4)
    const [stored] = await alarms.listUnacknowledged()
    assert.containsSubset(stored, {
      alarmId,
      adcId: ADC,
      timestamp: NOW,
      alarmType: 'communication_loss',
      severity: 'error',
      source: 'communication_loss',
      acknowledgement: null,
    })
    assert.deepEqual(events, [{ kind: 'raised', alarm: stored, audibleRepeatSeconds: null }])
  })

  test('each loss of communication is a new alarm', async ({ assert }) => {
    const { alarms } = await setup()

    const first = await alarms.raiseCommunicationLoss(ADC)
    const second = await alarms.raiseCommunicationLoss(ADC)

    assert.notEqual(first, second)
    assert.lengthOf(await alarms.listUnacknowledged(), 2)
  })
})

test.group('AlarmService / acknowledgement (SPEC-ALM-01, NFR-SAF-02)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('acknowledges, audits and announces an unacknowledged alarm', async ({ assert }) => {
    const { alarms, events } = await setup()
    await alarms.recordFromAdc(adcAlarm())
    const alarmId = adcAlarm().transactionId

    const result = await alarms.acknowledge(NURSE, alarmId)

    assert.deepEqual(result, { kind: 'acknowledged', at: NOW })
    assert.deepEqual(await alarms.listUnacknowledged(), [])
    assert.deepEqual(events.at(-1), { kind: 'acknowledged', alarmId, by: NURSE.userId, at: NOW })

    const history = await app.container.make(HistoryService)
    const audit = await history.queryAudit({ range: { from: NOW, to: NOW }, adcId: ADC })
    assert.deepEqual(audit, [
      {
        userId: NURSE.userId,
        action: 'acknowledge_alarm',
        target: ADC,
        outcome: `acknowledged ${alarmId}`,
        at: NOW,
      },
    ])
  })

  test('a second acknowledgement changes nothing and names the first one (FR-ALM-06)', async ({
    assert,
  }) => {
    const { alarms, clock, events } = await setup()
    await alarms.recordFromAdc(adcAlarm())
    const alarmId = adcAlarm().transactionId
    await alarms.acknowledge(NURSE, alarmId)
    clock.set(new Date('2026-10-16T14:06:00.000Z'))

    const result = await alarms.acknowledge(PHARMACIST, alarmId)

    assert.deepEqual(result, { kind: 'alreadyAcknowledged', by: NURSE.userId, at: NOW })
    assert.lengthOf(events, 2)
    const history = await app.container.make(HistoryService)
    const audit = await history.queryAudit({ range: { from: NOW, to: clock.now() } })
    assert.lengthOf(audit, 1)
  })

  test('an acknowledgement that loses the race answers alreadyAcknowledged', async ({ assert }) => {
    /** Answers findAlarm as it was before the other acknowledgement, the first time only. */
    class StaleHistory extends HistoryService {
      stale = true

      async findAlarm(alarmId: AlarmId): Promise<StoredAlarmWithAck | null> {
        const alarm = await super.findAlarm(alarmId)
        if (!this.stale || !alarm) return alarm
        this.stale = false
        return { ...alarm, acknowledgement: null }
      }
    }
    const history = new StaleHistory(new ManualClock(NOW))
    const { alarms, events } = await setup(history)
    await alarms.recordFromAdc(adcAlarm())
    const alarmId = adcAlarm().transactionId
    await history.recordAcknowledgement({ alarmId, userId: NURSE.userId, at: NOW })

    const result = await alarms.acknowledge(PHARMACIST, alarmId)

    assert.deepEqual(result, { kind: 'alreadyAcknowledged', by: NURSE.userId, at: NOW })
    assert.lengthOf(events, 1)
  })

  test('acknowledging an unknown alarm throws UnknownAlarmError', async ({ assert }) => {
    const { alarms } = await setup()

    await assert.rejects(
      () => alarms.acknowledge(NURSE, adcAlarm().transactionId),
      UnknownAlarmError
    )
  })
})

test.group('AlarmService / subscribers (D-27, D-36)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a failing listener neither stops the others nor undoes the recording', async ({
    assert,
  }) => {
    const { alarms, events } = await setup()
    alarms.subscribe(() => {
      throw new Error('dashboard down')
    })
    const after: AlarmEvent[] = []
    alarms.subscribe((event) => after.push(event))

    assert.equal(await alarms.recordFromAdc(adcAlarm()), 'recorded')

    assert.lengthOf(events, 1)
    assert.lengthOf(after, 1)
    assert.lengthOf(await alarms.listUnacknowledged(), 1)
  })

  test('an unsubscribed listener is no longer called', async ({ assert }) => {
    const { alarms } = await setup()
    const received: AlarmEvent[] = []
    const unsubscribe = alarms.subscribe((event) => received.push(event))

    unsubscribe()
    await alarms.recordFromAdc(adcAlarm())

    assert.deepEqual(received, [])
  })

  test('every module gets the same Alarm Manager (D-37)', async ({ assert }) => {
    assert.strictEqual(
      await app.container.make(AlarmService),
      await app.container.make(AlarmService)
    )
  })
})
