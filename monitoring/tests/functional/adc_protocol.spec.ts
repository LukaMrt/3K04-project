import { test } from '@japa/runner'
import type { Group } from '@japa/runner/core'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import AlarmService from '#modules/alarms/alarms_service'
import type { NewAdcAlarm } from '#modules/alarms/types'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import type { AdcIdentity, RegistrationResult } from '#modules/cabinet_health/types'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import InventoryService from '#modules/inventory/inventory_service'
import type { AdcId, RecordOutcome, ReportedState } from '#modules/shared/types'
import { ManualClock } from '#tests/helpers/manual_clock'

const ADC = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const MORPHINE = '8c1d5e2a-4f3b-4a9e-b7d6-1e2f3a4b5c6d'
const NOW = new Date('2026-10-16T14:03:28.000Z')

/** Stands in for the Cabinet Health Monitor (#39): a set of registered ADCs. */
class FakeCabinetHealth extends CabinetHealthService {
  registered = new Map<AdcId, AdcIdentity>()
  heartbeats: Array<{ adcId: AdcId; state: ReportedState; at: Date }> = []

  async register(identity: AdcIdentity): Promise<RegistrationResult> {
    const firstRegistration = !this.registered.has(identity.adcId)
    this.registered.set(identity.adcId, identity)
    return { firstRegistration }
  }

  async isRegistered(adcId: AdcId) {
    return this.registered.has(adcId)
  }

  async recordHeartbeat(adcId: AdcId, state: ReportedState, at: Date) {
    this.heartbeats.push({ adcId, state, at })
  }
}

/** Stands in for the Alarm Manager (#38): keeps alarms in memory, once each (D-28). */
class FakeAlarms extends AlarmService {
  recorded: NewAdcAlarm[] = []
  failing = false

  async recordFromAdc(alarm: NewAdcAlarm): Promise<RecordOutcome> {
    if (this.failing) throw new Error('storage down')
    if (this.recorded.some((a) => a.transactionId === alarm.transactionId)) return 'duplicate'
    this.recorded.push(alarm)
    return 'recorded'
  }
}

let cabinetHealth: FakeCabinetHealth
let alarms: FakeAlarms

function registration(overrides: Record<string, unknown> = {}) {
  return {
    adcId: ADC,
    label: 'ADC West 214',
    contactAddress: 'http://localhost:8443',
    location: { floor: 2, description: 'West wing, room 214' },
    ...overrides,
  }
}

function alarmTransaction(overrides: Record<string, unknown> = {}) {
  return {
    type: 'alarm',
    transactionId: '3f2c8a1e-9b4d-4c7a-8e21-5d0f6b9a1c34',
    timestamp: '2026-10-16T14:03:27.100Z',
    alarmType: 'temperature_out_of_range',
    severity: 'critical',
    description: 'Drawer 3 at 11.2 °C',
    ...overrides,
  }
}

function dispensingTransaction(overrides: Record<string, unknown> = {}) {
  return {
    type: 'dispensing',
    transactionId: 'a7b8c9d0-e1f2-4a3b-9c4d-5e6f7a8b9c0d',
    timestamp: '2026-10-16T14:01:02.000Z',
    medicationId: MORPHINE,
    medicationName: 'Morphine 10 mg/mL',
    quantityInBoxes: 1,
    patientId: '6b0f3c2e-8d1a-4f7b-9e5c-3a2d1f0e9b8c',
    staffMemberId: 'e9d8c7b6-a5f4-4e3d-8c2b-1a0f9e8d7c6b',
    staffMemberName: 'Jane Doe, RN',
    ...overrides,
  }
}

function heartbeat(transactions: unknown[] = [], overrides: Record<string, unknown> = {}) {
  return {
    adcId: ADC,
    sentAt: '2026-10-16T14:03:27.512Z',
    state: 'online',
    inventory: [
      { medicationId: MORPHINE, medicationName: 'Morphine 10 mg/mL', quantityInBoxes: 14 },
    ],
    transactions,
    ...overrides,
  }
}

function setup(group: Group) {
  group.each.setup(async () => {
    cabinetHealth = new FakeCabinetHealth(null as any, null as any, null as any)
    alarms = new FakeAlarms(null as any, null as any)
    app.container.swap(CabinetHealthService, () => cabinetHealth)
    app.container.swap(AlarmService, () => alarms)
    app.container.swap(ClockService, () => new ManualClock(NOW))
    const rollback = await testUtils.db().withGlobalTransaction()
    return () => {
      app.container.restoreAll([CabinetHealthService, AlarmService, ClockService])
      return rollback()
    }
  })
}

test.group('ADC protocol / registration (SPEC-COM-01)', (group) => {
  setup(group)

  test('registers a new ADC', async ({ client, assert, db }) => {
    const response = await client.post('/api/v1/adcs/register').json(registration())

    response.assertStatus(200)
    response.assertBody({
      adcId: ADC,
      registeredAt: NOW.toISOString(),
      firstRegistration: true,
      heartbeatPeriodSeconds: 30,
    })
    assert.deepEqual(cabinetHealth.registered.get(ADC), {
      adcId: ADC,
      label: 'ADC West 214',
      floor: 2,
      description: 'West wing, room 214',
    })
    await db.assertHas('adc_contacts', {
      adc_id: ADC,
      contact_address: 'http://localhost:8443',
    })
  })

  test('accepts a re-registration and keeps the latest contact address', async ({ client, db }) => {
    await client.post('/api/v1/adcs/register').json(registration())
    const response = await client
      .post('/api/v1/adcs/register')
      .json(registration({ contactAddress: 'https://10.0.2.16:8443' }))

    response.assertStatus(200)
    response.assertBodyContains({ firstRegistration: false })
    await db.assertHas('adc_contacts', { contact_address: 'https://10.0.2.16:8443' })
    await db.assertCount('adc_contacts', 1)
  })

  test('refuses an invalid registration and logs it', async ({ client, assert, db }) => {
    const response = await client
      .post('/api/v1/adcs/register')
      .json(registration({ adcId: 'ADC-01', label: '' }))

    response.assertStatus(400)
    response.assertBodyContains({ error: { code: 'INVALID_MESSAGE' } })
    assert.deepEqual(
      response.body().error.details.map((d: { field: string }) => d.field),
      ['adcId', 'label']
    )
    assert.equal(cabinetHealth.registered.size, 0)
    await db.assertHas('system_log_entries', { event: 'registration_rejected' })
  })

  test('answers a body that is not JSON in the contract format', async ({ client }) => {
    const response = await client.post('/api/v1/adcs/register').unsafeJson('{not json')

    response.assertStatus(400)
    response.assertBodyContains({ error: { code: 'INVALID_MESSAGE' } })
  })
})

test.group('ADC protocol / heartbeat (SPEC-COM-02)', (group) => {
  setup(group)
  group.each.setup(() => {
    cabinetHealth.registered.set(ADC, {
      adcId: ADC,
      label: 'ADC West 214',
      floor: 2,
      description: '',
    })
  })

  test('records the contact, the state and the inventory', async ({ client, assert }) => {
    const response = await client.post('/api/v1/heartbeats').json(heartbeat([], { state: 'fault' }))

    response.assertStatus(200)
    response.assertBody({ receivedAt: NOW.toISOString(), acknowledgements: [] })
    assert.deepEqual(cabinetHealth.heartbeats, [{ adcId: ADC, state: 'fault', at: NOW }])

    const inventoryService = await app.container.make(InventoryService)
    const inventory = await inventoryService.getInventory(ADC)
    assert.deepEqual(inventory?.lines, [
      {
        medicationId: MORPHINE,
        medicationName: 'Morphine 10 mg/mL',
        quantityInBoxes: 14,
        lowStock: false,
      },
    ])
  })

  test('discards and logs a heartbeat from an unknown ADC', async ({ client, assert, db }) => {
    cabinetHealth.registered.clear()

    const response = await client.post('/api/v1/heartbeats').json(heartbeat())

    response.assertStatus(404)
    response.assertBodyContains({ error: { code: 'ADC_NOT_REGISTERED' } })
    assert.lengthOf(cabinetHealth.heartbeats, 0)
    await db.assertHas('system_log_entries', { event: 'heartbeat_discarded', adc_id: ADC })
  })

  test('refuses an invalid envelope without counting it as a contact', async ({
    client,
    assert,
  }) => {
    const invalidEnvelopes = [
      heartbeat([], { state: 'sleeping' }),
      heartbeat([], { inventory: undefined }),
      heartbeat([{ ...alarmTransaction(), transactionId: 'not-a-uuid' }]),
      heartbeat([], {
        inventory: [
          { medicationId: MORPHINE, medicationName: 'Morphine', quantityInBoxes: 1 },
          { medicationId: MORPHINE, medicationName: 'Morphine', quantityInBoxes: 2 },
        ],
      }),
    ]

    for (const envelope of invalidEnvelopes) {
      const response = await client.post('/api/v1/heartbeats').json(envelope)
      response.assertStatus(400)
      response.assertBodyContains({ error: { code: 'INVALID_MESSAGE' } })
    }
    assert.lengthOf(cabinetHealth.heartbeats, 0)
  })

  test('a storage failure acknowledges nothing and is not a contact', async ({
    client,
    assert,
  }) => {
    alarms.failing = true

    const response = await client.post('/api/v1/heartbeats').json(heartbeat([alarmTransaction()]))

    response.assertStatus(500)
    response.assertBodyContains({ error: { code: 'INTERNAL_ERROR' } })
    assert.lengthOf(cabinetHealth.heartbeats, 0)
  })
})

test.group('ADC protocol / transactions (SPEC-COM-03)', (group) => {
  setup(group)
  group.each.setup(() => {
    cabinetHealth.registered.set(ADC, {
      adcId: ADC,
      label: 'ADC West 214',
      floor: 2,
      description: '',
    })
  })

  test('records valid transactions and acknowledges them in order', async ({ client, assert }) => {
    const response = await client
      .post('/api/v1/heartbeats')
      .json(heartbeat([alarmTransaction(), dispensingTransaction()]))

    response.assertStatus(200)
    response.assertBodyContains({
      acknowledgements: [
        { transactionId: alarmTransaction().transactionId, status: 'received' },
        { transactionId: dispensingTransaction().transactionId, status: 'received' },
      ],
    })
    assert.deepEqual(alarms.recorded, [
      {
        transactionId: alarmTransaction().transactionId,
        adcId: ADC,
        timestamp: new Date('2026-10-16T14:03:27.100Z'),
        alarmType: 'temperature_out_of_range',
        severity: 'critical',
        description: 'Drawer 3 at 11.2 °C',
      },
    ])
    const history = await app.container.make(HistoryService)
    const dispensed = await history.queryDispensing({ range: { from: new Date(0), to: NOW } })
    assert.deepEqual(
      dispensed.map((d) => [d.transactionId, d.adcId]),
      [[dispensingTransaction().transactionId, ADC]]
    )
  })

  test('acknowledges a resent transaction again without recording it twice', async ({
    client,
    assert,
  }) => {
    await client.post('/api/v1/heartbeats').json(heartbeat([alarmTransaction()]))
    const response = await client.post('/api/v1/heartbeats').json(heartbeat([alarmTransaction()]))

    response.assertBodyContains({
      acknowledgements: [{ transactionId: alarmTransaction().transactionId, status: 'received' }],
    })
    assert.lengthOf(alarms.recorded, 1)
  })

  test('rejects each invalid transaction with its reason', async ({ client, assert, db }) => {
    const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
    const response = await client
      .post('/api/v1/heartbeats')
      .json(
        heartbeat([
          alarmTransaction({ transactionId: id(1), type: 'refill' }),
          alarmTransaction({ transactionId: id(2), severity: undefined }),
          alarmTransaction({ transactionId: id(3), severity: 'urgent' }),
          alarmTransaction({ transactionId: id(4), alarmType: 'communication_loss' }),
          alarmTransaction({ transactionId: id(5), timestamp: '2026-10-16 14:03' }),
          dispensingTransaction({ transactionId: id(6), staffMemberId: '' }),
          dispensingTransaction({ transactionId: id(7), quantityInBoxes: 0 }),
          alarmTransaction({ transactionId: id(8), alarmType: 'brand_new_type' }),
        ])
      )

    response.assertStatus(200)
    assert.deepEqual(response.body().acknowledgements, [
      { transactionId: id(1), status: 'rejected', reason: 'UNKNOWN_TYPE' },
      { transactionId: id(2), status: 'rejected', reason: 'MISSING_FIELD', field: 'severity' },
      { transactionId: id(3), status: 'rejected', reason: 'INVALID_SEVERITY', field: 'severity' },
      { transactionId: id(4), status: 'rejected', reason: 'INVALID_VALUE', field: 'alarmType' },
      { transactionId: id(5), status: 'rejected', reason: 'INVALID_VALUE', field: 'timestamp' },
      { transactionId: id(6), status: 'rejected', reason: 'MISSING_FIELD', field: 'staffMemberId' },
      {
        transactionId: id(7),
        status: 'rejected',
        reason: 'INVALID_VALUE',
        field: 'quantityInBoxes',
      },
      // An unknown alarm type is kept as received (contract §5.2).
      { transactionId: id(8), status: 'received' },
    ])
    assert.deepEqual(
      alarms.recorded.map((a) => a.transactionId),
      [id(8)]
    )
    await db.assertCount('system_log_entries', 7)
  })
})
