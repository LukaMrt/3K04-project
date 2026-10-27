import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AlarmService from '#modules/alarms/alarms_service'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import HistoryService from '#modules/history/history_service'
import type { DispensingRecord, StoredAlarm } from '#modules/history/types'
import { UnknownReportError } from '#modules/reporting/errors'
import ReportingService from '#modules/reporting/reporting_service'
import UserService from '#modules/users/users_service'
import type { Role } from '#modules/shared/types'
import { ManualClock } from '#tests/helpers/manual_clock'

const ADC_101 = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const ADC_102 = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const MORPHINE = '8c1d5e2a-4f3b-4a9e-b7d6-1e2f3a4b5c6d'
const INSULIN = 'b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b'
const PATIENT = '6b0f3c2e-8d1a-4f7b-9e5c-3a2d1f0e9b8c'
const OTHER_PATIENT = '7c1a4d3f-9e2b-4a8c-8f6d-4b3e2a1f0c9d'
const STAFF = 'e9d8c7b6-a5f4-4e3d-8c2b-1a0f9e8d7c6b'
const NOW = new Date('2026-10-01T09:00:00.000Z')
/** September as days of the hospital (D-43, America/Toronto, UTC−4 in September). */
const SEPTEMBER = { from: new Date('2026-09-01T04:00:00Z'), to: new Date('2026-10-01T03:59:59Z') }

const as = (role: Role, userId = 7) => ({ userId, role })
const PHARMACIST = as('pharmacist')
const ADMINISTRATOR = as('administrator', 1)
const RISK_MANAGEMENT = as('risk_management', 9)

let sequence = 0
function dispensing(overrides: Partial<DispensingRecord> = {}): DispensingRecord {
  sequence++
  return {
    transactionId: `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    adcId: ADC_101,
    timestamp: new Date('2026-09-15T10:00:00.000Z'),
    medicationId: MORPHINE,
    medicationName: 'Morphine 10 mg/mL',
    quantityInBoxes: 10,
    patientId: PATIENT,
    staffMemberId: STAFF,
    staffMemberName: 'Jane Doe, RN',
    ...overrides,
  }
}

function alarm(overrides: Partial<StoredAlarm> = {}): StoredAlarm {
  sequence++
  return {
    alarmId: `10000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    adcId: ADC_101,
    timestamp: new Date('2026-09-20T08:00:00.000Z'),
    alarmType: 'temperature_out_of_range',
    severity: 'critical',
    description: 'Drawer 3 at 11.2 °C, door "B"',
    source: 'adc',
    ...overrides,
  }
}

/** Reporting on the real modules below it, with two registered ADCs (labels). */
async function setup() {
  const clock = new ManualClock(NOW)
  const history = new HistoryService(clock)
  const users = new UserService(history, clock)
  const health = new CabinetHealthService(new AlarmService(history, clock), history, clock)
  await health.register({ adcId: ADC_101, label: 'ADC-101', floor: 1, description: '' }, NOW)
  await health.register({ adcId: ADC_102, label: 'ADC-102', floor: 1, description: '' }, NOW)
  const reporting = new ReportingService(history, users, health, clock)
  const audit = () => history.queryAudit({ range: { from: NOW, to: NOW } })
  return { clock, history, reporting, audit }
}

test.group('ReportingService / consumption reports (FR-RPT-01 to 05)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('totals the boxes of the period; an empty period gives 0 (US-RPT-01)', async ({
    assert,
  }) => {
    const { history, reporting } = await setup()
    await history.recordDispensing(dispensing({ quantityInBoxes: 70 }))
    await history.recordDispensing(dispensing({ quantityInBoxes: 50 }))
    await history.recordDispensing(dispensing({ timestamp: new Date('2026-10-02T10:00:00Z') }))

    const report = await reporting.consumptionReport(PHARMACIST, { range: SEPTEMBER })
    assert.equal(report.total, 120)
    assert.lengthOf(report.rows, 2)
    assert.equal(report.kind, 'consumption')
    assert.deepEqual(report.parameters, {
      from: SEPTEMBER.from.toISOString(),
      to: SEPTEMBER.to.toISOString(),
    })

    const christmas = {
      from: new Date('2026-12-25T00:00:00Z'),
      to: new Date('2026-12-25T23:59:59Z'),
    }
    const empty = await reporting.consumptionReport(PHARMACIST, { range: christmas })
    assert.equal(empty.total, 0)
  })

  test('filters by ADC, medication, patient and staff member (US-RPT-02 to 05)', async ({
    assert,
  }) => {
    const { history, reporting } = await setup()
    await history.recordDispensing(dispensing({ quantityInBoxes: 10 }))
    await history.recordDispensing(
      dispensing({ adcId: ADC_102, quantityInBoxes: 20, patientId: OTHER_PATIENT })
    )
    await history.recordDispensing(
      dispensing({ medicationId: INSULIN, medicationName: 'Insulin', quantityInBoxes: 50 })
    )

    const total = async (filters: object) => {
      const report = await reporting.consumptionReport(ADMINISTRATOR, {
        range: SEPTEMBER,
        ...filters,
      })
      return report.total
    }
    assert.equal(await total({ adcId: ADC_101 }), 60)
    assert.equal(await total({ medicationId: MORPHINE }), 30)
    assert.equal(await total({ medicationId: MORPHINE, adcId: ADC_101 }), 10)
    assert.equal(await total({ patientId: OTHER_PATIENT }), 20)
    assert.equal(await total({ staffMemberId: STAFF, medicationId: MORPHINE }), 30)
  })

  test('rows name the ADC by its label and show the patient, audited (NFR-AUD-06)', async ({
    assert,
  }) => {
    const { history, reporting, audit } = await setup()
    await history.recordDispensing(dispensing())

    const report = await reporting.consumptionReport(PHARMACIST, { range: SEPTEMBER })

    assert.containsSubset(report.rows[0], { adcLabel: 'ADC-101', patientId: PATIENT })
    assert.deepEqual(await audit(), [
      {
        userId: PHARMACIST.userId,
        action: 'view_patient_ids',
        target: `report ${report.reportId}`,
        outcome: null,
        at: NOW,
      },
    ])
  })
})

test.group('ReportingService / alarm reports (FR-RPT-06, 07)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lists the alarms of the period with their ADC, type and severity', async ({ assert }) => {
    const { history, reporting } = await setup()
    await history.recordAlarm(alarm())
    await history.recordAlarm(alarm({ adcId: ADC_102, severity: 'warning' }))

    const report = await reporting.alarmReport(RISK_MANAGEMENT, SEPTEMBER)

    assert.equal(report.total, 2)
    assert.deepEqual(
      report.rows.map((row) => [row.adcLabel, row.severity]),
      [
        ['ADC-101', 'critical'],
        ['ADC-102', 'warning'],
      ]
    )
    const empty = await reporting.alarmReport(RISK_MANAGEMENT, {
      from: new Date('2026-10-01T00:00:00Z'),
      to: new Date('2026-10-01T23:59:59Z'),
    })
    assert.equal(empty.total, 0)
  })

  test('exports an alarm report as a CSV file, one line per alarm', async ({ assert }) => {
    const { history, reporting } = await setup()
    const stored = alarm()
    await history.recordAlarm(stored)
    await history.recordAcknowledgement({
      alarmId: stored.alarmId,
      userId: 7,
      at: new Date('2026-09-20T08:01:00Z'),
    })
    const report = await reporting.alarmReport(RISK_MANAGEMENT, SEPTEMBER)

    const file = await reporting.exportReport(report.reportId)

    assert.equal(file.fileName, 'alarm-report-2026-09-01-to-2026-09-30.csv')
    assert.equal(file.contentType, 'text/csv')
    assert.equal(
      file.content,
      'timestamp,adcLabel,alarmType,severity,description,acknowledgedBy,acknowledgedAt\r\n' +
        '2026-09-20T08:00:00.000Z,ADC-101,temperature_out_of_range,critical,' +
        '"Drawer 3 at 11.2 °C, door ""B""",7,2026-09-20T08:01:00.000Z\r\n'
    )
  })

  test('only an alarm report can be exported', async ({ assert }) => {
    const { reporting } = await setup()
    const consumption = await reporting.consumptionReport(PHARMACIST, { range: SEPTEMBER })

    await assert.rejects(() => reporting.exportReport(consumption.reportId), UnknownReportError)
    await assert.rejects(() => reporting.exportReport(999), UnknownReportError)
  })
})

test.group('ReportingService / saved reports (FR-RPT-08, FR-HIS-06)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a saved report keeps the figures it had when generated (US-RPT-07)', async ({ assert }) => {
    const { history, reporting, clock } = await setup()
    await history.recordDispensing(dispensing({ quantityInBoxes: 30 }))
    const generated = await reporting.consumptionReport(ADMINISTRATOR, {
      range: SEPTEMBER,
      medicationId: MORPHINE,
    })
    clock.set(new Date('2026-10-15T09:00:00Z'))
    await history.recordDispensing(dispensing({ quantityInBoxes: 5 }))

    const reopened = await reporting.openSavedReport(ADMINISTRATOR, generated.reportId)

    assert.equal(reopened.total, 30)
    assert.deepEqual(reopened.generatedAt, NOW)
    assert.equal(reopened.parameters.medicationId, MORPHINE)
  })

  test('each role lists only the kinds of reports it may generate (D-14)', async ({ assert }) => {
    const { reporting } = await setup()
    const consumption = await reporting.consumptionReport(PHARMACIST, { range: SEPTEMBER })
    const alarms = await reporting.alarmReport(ADMINISTRATOR, SEPTEMBER)

    const listed = async (actor: ReturnType<typeof as>) => {
      const summaries = await reporting.listSavedReports(actor)
      return summaries.map((summary) => summary.reportId).sort()
    }
    assert.deepEqual(await listed(PHARMACIST), [consumption.reportId])
    assert.deepEqual(await listed(RISK_MANAGEMENT), [alarms.reportId])
    assert.deepEqual(await listed(ADMINISTRATOR), [consumption.reportId, alarms.reportId].sort())
    assert.deepEqual(await listed(as('nurse')), [])
  })

  test('opening an unknown report throws UnknownReportError', async ({ assert }) => {
    const { reporting } = await setup()

    await assert.rejects(() => reporting.openSavedReport(ADMINISTRATOR, 42), UnknownReportError)
  })
})

test.group('ReportingService / event history and audit log (FR-HIS-04, 07)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('risk management sees the history without patient identifiers (D-11)', async ({
    assert,
  }) => {
    const { history, reporting, audit } = await setup()
    await history.recordDispensing(dispensing())

    const seen = await reporting.adcHistory(RISK_MANAGEMENT, ADC_101, SEPTEMBER)

    assert.lengthOf(seen.dispensing, 1)
    assert.notProperty(seen.dispensing[0], 'patientId')
    assert.deepEqual(await audit(), [])
  })

  test('an administrator sees them, and the display is audited (NFR-AUD-06)', async ({
    assert,
  }) => {
    const { history, reporting, audit } = await setup()
    await history.recordDispensing(dispensing())

    const seen = await reporting.adcHistory(ADMINISTRATOR, ADC_101, SEPTEMBER)

    assert.equal(seen.dispensing[0].patientId, PATIENT)
    assert.containsSubset(await audit(), [
      { userId: ADMINISTRATOR.userId, action: 'view_patient_ids', target: ADC_101 },
    ])
  })

  test('the audit log is filtered by date range and user', async ({ assert }) => {
    const { history, reporting } = await setup()
    await history.appendAudit({
      userId: 3,
      action: 'acknowledge_alarm',
      target: ADC_101,
      outcome: 'acknowledged',
      at: new Date('2026-09-10T00:00:00Z'),
    })
    await history.appendAudit({
      userId: 4,
      action: 'send_command',
      target: ADC_102,
      outcome: 'delivered',
      at: new Date('2026-09-11T00:00:00Z'),
    })

    const entries = await reporting.auditLog(RISK_MANAGEMENT, { range: SEPTEMBER, userId: 3 })

    assert.deepEqual(
      entries.map((entry) => entry.action),
      ['acknowledge_alarm']
    )
  })
})
