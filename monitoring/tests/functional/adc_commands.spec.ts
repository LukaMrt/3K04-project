import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import AdcCommunicationService from '#modules/adc_communication/adc_communication_service'
import { UnknownAdcError } from '#modules/cabinet_health/errors'
import HistoryService from '#modules/history/history_service'
import type { Actor } from '#modules/shared/types'
import { FakeAdc } from '#simulator/fake_adc'
import { useFakeModules } from '#tests/helpers/fake_modules'

const NOW = new Date('2026-10-16T14:10:00.000Z')
const TECHNICIAN: Actor = { userId: 3, role: 'technician' }

test.group('ADC commands and configuration (SPEC-COM-04, SPEC-COM-05)', (group) => {
  const fakes = useFakeModules(group, NOW)

  /** A fake ADC registered through the real route, so its contact address is stored. */
  async function registeredAdc(cleanup: (fn: () => Promise<void>) => void) {
    const adc = new FakeAdc({
      adcId: 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47',
      label: 'ADC Test',
      floor: 2,
      description: 'Test bench',
      monitoringUrl: `http://${env.get('HOST')}:${env.get('PORT')}`,
    })
    await adc.start()
    cleanup(() => adc.stop())
    await adc.register()
    return adc
  }

  async function service() {
    const adcCommunication = await app.container.make(AdcCommunicationService)
    adcCommunication.answerTimeoutMs = 300
    return adcCommunication
  }

  async function auditOutcomes() {
    const history = await app.container.make(HistoryService)
    const entries = await history.queryAudit({ range: { from: new Date(0), to: NOW } })
    return entries.map((e) => [e.userId, e.action, e.outcome?.split(' ')[0]])
  }

  test('delivers a maintenance command, then audits its sending and outcome', async ({
    assert,
    cleanup,
  }) => {
    const adc = await registeredAdc(cleanup)

    const adcCommunication = await service()
    const outcome = await adcCommunication.sendCommand(TECHNICIAN, adc.adcId, {
      kind: 'setMaintenanceMode',
      enabled: true,
    })

    assert.deepEqual(outcome, { kind: 'delivered' })
    assert.equal(adc.state, 'maintenance')
    assert.deepInclude(adc.received[0].body, {
      adcId: adc.adcId,
      command: 'set_maintenance_mode',
      parameters: { enabled: true },
      issuedAt: NOW.toISOString(),
    })
    assert.deepEqual(await auditOutcomes(), [
      [3, 'send_command', 'sent'],
      [3, 'send_command', 'delivered'],
    ])
  })

  test('delivers a configuration', async ({ assert, cleanup }) => {
    const adc = await registeredAdc(cleanup)

    const adcCommunication = await service()
    const outcome = await adcCommunication.sendConfiguration(TECHNICIAN, adc.adcId, {
      screenLockTimeoutSeconds: 60,
    })

    assert.deepEqual(outcome, { kind: 'delivered' })
    assert.deepEqual(adc.settings, { screenLockTimeoutSeconds: 60 })
  })

  test('sends nothing to an offline ADC', async ({ assert, cleanup }) => {
    const adc = await registeredAdc(cleanup)
    fakes.cabinetHealth.offline.add(adc.adcId)

    const adcCommunication = await service()
    const outcome = await adcCommunication.sendCommand(TECHNICIAN, adc.adcId, {
      kind: 'setMaintenanceMode',
      enabled: true,
    })

    assert.deepEqual(outcome, { kind: 'refusedOffline' })
    assert.lengthOf(adc.received, 0)
    assert.deepEqual(await auditOutcomes(), [[3, 'send_command', 'refused:']])
  })

  test('reports each failure of SPEC-COM-05', async ({ assert, cleanup }) => {
    const adc = await registeredAdc(cleanup)
    const adcCommunication = await service()
    const send = () =>
      adcCommunication.sendCommand(TECHNICIAN, adc.adcId, {
        kind: 'setMaintenanceMode',
        enabled: true,
      })

    adc.replyMode = 'wrongId'
    assert.include(await send(), { kind: 'failed', code: 'ID_MISMATCH' })

    adc.replyMode = 'error'
    assert.include(await send(), { kind: 'failed', code: 'INTERNAL_ERROR' })

    adc.replyMode = 'apply'
    adc.state = 'fault'
    assert.include(await send(), { kind: 'failed', code: 'COMMAND_NOT_APPLICABLE' })

    adc.replyMode = 'silent'
    assert.include(await send(), { kind: 'failed', code: 'TIMEOUT' })

    await adc.stop()
    assert.include(await send(), { kind: 'failed', code: 'TIMEOUT' })
  })

  test('throws for an unknown ADC', async ({ assert }) => {
    const adcCommunication = await service()

    await assert.rejects(
      () =>
        adcCommunication.sendCommand(TECHNICIAN, '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', {
          kind: 'setMaintenanceMode',
          enabled: false,
        }),
      UnknownAdcError
    )
  })
})
