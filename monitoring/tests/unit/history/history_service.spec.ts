import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import { AlarmAlreadyAcknowledgedError, UnknownRecordError } from '#modules/history/errors'
import type { DispensingRecord, StoredAlarm } from '#modules/history/types'
import { ManualClock } from '#tests/helpers/manual_clock'

const ADC = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const OTHER_ADC = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const PATIENT = '6b0f3c2e-8d1a-4f7b-9e5c-3a2d1f0e9b8c'

function alarm(overrides: Partial<StoredAlarm> = {}): StoredAlarm {
  return {
    alarmId: '3f2c8a1e-9b4d-4c7a-8e21-5d0f6b9a1c34',
    adcId: ADC,
    timestamp: new Date('2026-10-16T14:03:27.000Z'),
    alarmType: 'temperature_out_of_range',
    severity: 'critical',
    description: 'Drawer 3 at 11.2 °C',
    source: 'adc',
    ...overrides,
  }
}

function dispensing(overrides: Partial<DispensingRecord> = {}): DispensingRecord {
  return {
    transactionId: 'a7b8c9d0-e1f2-4a3b-9c4d-5e6f7a8b9c0d',
    adcId: ADC,
    timestamp: new Date('2026-10-16T14:01:02.000Z'),
    medicationId: '8c1d5e2a-4f3b-4a9e-b7d6-1e2f3a4b5c6d',
    medicationName: 'Morphine 10 mg/mL',
    quantityInBoxes: 1,
    patientId: PATIENT,
    staffMemberId: 'e9d8c7b6-a5f4-4e3d-8c2b-1a0f9e8d7c6b',
    staffMemberName: 'Jane Doe, RN',
    ...overrides,
  }
}

const OCTOBER = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-31T23:59:59Z') }

test.group('HistoryService / transactions (D-28)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('records an alarm once, then answers duplicate', async ({ assert }) => {
    const history = await app.container.make(HistoryService)

    assert.equal(await history.recordAlarm(alarm()), 'recorded')
    assert.equal(await history.recordAlarm(alarm({ description: 'changed' })), 'duplicate')

    const stored = await history.findAlarm(alarm().alarmId)
    assert.deepEqual(stored, { ...alarm(), acknowledgement: null })
  })

  test('records a dispensing activity once, then answers duplicate', async ({ assert }) => {
    const history = await app.container.make(HistoryService)

    assert.equal(await history.recordDispensing(dispensing()), 'recorded')
    assert.equal(await history.recordDispensing(dispensing()), 'duplicate')
    assert.lengthOf(await history.queryDispensing({ range: OCTOBER }), 1)
  })

  test('alarms and dispensing activities share one identifier space', async ({ assert }) => {
    const history = await app.container.make(HistoryService)
    const id = '11111111-2222-4333-8444-555555555555'

    assert.equal(await history.recordAlarm(alarm({ alarmId: id })), 'recorded')
    assert.equal(await history.recordDispensing(dispensing({ transactionId: id })), 'duplicate')
  })
})

test.group('HistoryService / acknowledgements', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('an acknowledged alarm leaves the unacknowledged list', async ({ assert }) => {
    const history = await app.container.make(HistoryService)
    const older = alarm({ alarmId: '00000000-0000-4000-8000-000000000001' })
    const newer = alarm({
      alarmId: '00000000-0000-4000-8000-000000000002',
      timestamp: new Date('2026-10-16T15:00:00.000Z'),
    })
    await history.recordAlarm(older)
    await history.recordAlarm(newer)

    const listed = await history.listUnacknowledgedAlarms()
    assert.deepEqual(
      listed.map((a) => a.alarmId),
      [newer.alarmId, older.alarmId]
    )

    const at = new Date('2026-10-16T15:01:00.000Z')
    await history.recordAcknowledgement({ alarmId: newer.alarmId, userId: 7, at })

    const remaining = await history.listUnacknowledgedAlarms()
    assert.deepEqual(
      remaining.map((a) => a.alarmId),
      [older.alarmId]
    )
    const acknowledged = await history.findAlarm(newer.alarmId)
    assert.deepEqual(acknowledged?.acknowledgement, { userId: 7, at })
  })

  test('acknowledging an unknown alarm throws UnknownRecordError', async ({ assert }) => {
    const history = await app.container.make(HistoryService)

    await assert.rejects(
      () => history.recordAcknowledgement({ alarmId: alarm().alarmId, userId: 1, at: new Date() }),
      UnknownRecordError
    )
  })

  test('a second acknowledgement throws and keeps the first one', async ({ assert }) => {
    const history = await app.container.make(HistoryService)
    const first = { alarmId: alarm().alarmId, userId: 1, at: new Date('2026-10-16T15:00:00Z') }
    await history.recordAlarm(alarm())
    await history.recordAcknowledgement(first)

    await assert.rejects(
      () => history.recordAcknowledgement({ ...first, userId: 2 }),
      AlarmAlreadyAcknowledgedError
    )
    const stored = await history.findAlarm(first.alarmId)
    assert.deepEqual(stored?.acknowledgement, {
      userId: 1,
      at: first.at,
    })
  })
})

test.group('HistoryService / queries', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the ADC history holds only the records of that ADC within the range', async ({
    assert,
  }) => {
    const history = await app.container.make(HistoryService)
    await history.recordAlarm(alarm())
    await history.recordAlarm(
      alarm({ alarmId: '00000000-0000-4000-8000-000000000003', adcId: OTHER_ADC })
    )
    await history.recordDispensing(dispensing())
    await history.recordDispensing(
      dispensing({
        transactionId: '00000000-0000-4000-8000-000000000004',
        timestamp: new Date('2026-09-30T23:59:59Z'),
      })
    )
    await history.recordStatusChange({
      adcId: ADC,
      reportedState: 'online',
      connectivity: 'reachable',
      at: new Date('2026-10-16T14:00:00Z'),
    })

    const result = await history.queryAdcHistory(ADC, OCTOBER)

    assert.deepEqual(
      result.alarms.map((a) => a.alarmId),
      [alarm().alarmId]
    )
    assert.deepEqual(
      result.dispensing.map((d) => d.transactionId),
      [dispensing().transactionId]
    )
    assert.equal(result.dispensing[0].patientId, PATIENT)
    assert.deepEqual(result.statusChanges, [
      {
        adcId: ADC,
        reportedState: 'online',
        connectivity: 'reachable',
        at: new Date('2026-10-16T14:00:00Z'),
      },
    ])
  })

  test('range bounds are inclusive', async ({ assert }) => {
    const history = await app.container.make(HistoryService)
    await history.recordAlarm(alarm({ timestamp: OCTOBER.from }))

    assert.lengthOf(await history.queryAlarms(OCTOBER), 1)
  })

  test('dispensing activities are filtered by patient and staff member', async ({ assert }) => {
    const history = await app.container.make(HistoryService)
    await history.recordDispensing(dispensing())
    await history.recordDispensing(
      dispensing({
        transactionId: '00000000-0000-4000-8000-000000000005',
        patientId: '00000000-0000-4000-8000-0000000000aa',
      })
    )

    assert.lengthOf(await history.queryDispensing({ range: OCTOBER, patientId: PATIENT }), 1)
    assert.lengthOf(
      await history.queryDispensing({ range: OCTOBER, staffMemberId: dispensing().staffMemberId }),
      2
    )
  })

  test('audit entries are filtered by ADC and user', async ({ assert }) => {
    const history = await app.container.make(HistoryService)
    const at = new Date('2026-10-16T14:00:00Z')
    await history.appendAudit({
      userId: 1,
      action: 'send_command',
      target: ADC,
      outcome: 'delivered',
      at,
    })
    await history.appendAudit({
      userId: 2,
      action: 'acknowledge_alarm',
      target: OTHER_ADC,
      outcome: null,
      at,
    })

    assert.deepEqual(await history.queryAudit({ range: OCTOBER, adcId: ADC }), [
      { userId: 1, action: 'send_command', target: ADC, outcome: 'delivered', at },
    ])
    assert.lengthOf(await history.queryAudit({ range: OCTOBER, userId: 2 }), 1)
  })

  test('a saved report is found again with its figures as generated', async ({ assert }) => {
    const history = await app.container.make(HistoryService)
    const report = {
      kind: 'alarms' as const,
      parameters: { from: '2026-10-01', to: '2026-10-31' },
      figures: { total: 3, bySeverity: { critical: 1, error: 2 } },
      generatedAt: new Date('2026-10-20T09:00:00Z'),
      generatedBy: 4,
    }

    const id = await history.saveReport(report)

    assert.deepEqual(await history.findReport(id), report)
    assert.isNull(await history.findReport(id + 1))
  })
})

test.group('HistoryService / retention (SPEC-HIS-01)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => app.container.restore(ClockService))

  test('purges each kind of record after its own retention period', async ({ assert }) => {
    const clock = new ManualClock(new Date('2027-10-16T14:00:00Z'))
    app.container.swap(ClockService, () => clock)
    const history = await app.container.make(HistoryService)

    // One year and one hour old: past the 1-year retention.
    const yearOld = new Date('2026-10-16T13:00:00Z')
    await history.recordAlarm(alarm({ timestamp: yearOld }))
    await history.recordAcknowledgement({ alarmId: alarm().alarmId, userId: 1, at: yearOld })
    await history.appendSystemLog({ event: 'registration', adcId: ADC, details: null, at: yearOld })
    // Seven months old: kept for an alarm, past the 6-month retention for a dispensing.
    const sevenMonthsOld = new Date('2027-03-16T14:00:00Z')
    const keptAlarm = alarm({
      alarmId: '00000000-0000-4000-8000-000000000006',
      timestamp: sevenMonthsOld,
    })
    await history.recordAlarm(keptAlarm)
    await history.recordDispensing(dispensing({ timestamp: sevenMonthsOld }))

    assert.equal(await history.purgeExpired(), 4)

    const everything = { from: new Date(0), to: clock.now() }
    const alarms = await history.queryAlarms(everything)
    assert.deepEqual(
      alarms.map((a) => a.alarmId),
      [keptAlarm.alarmId]
    )
    assert.lengthOf(await history.queryDispensing({ range: everything }), 0)
  })

  test('keeps a record until the end of its retention period', async ({ assert }) => {
    const clock = new ManualClock(new Date('2027-10-16T13:59:59Z'))
    app.container.swap(ClockService, () => clock)
    const history = await app.container.make(HistoryService)
    await history.recordAlarm(alarm({ timestamp: new Date('2026-10-16T14:00:00Z') }))

    assert.equal(await history.purgeExpired(), 0)
  })
})
