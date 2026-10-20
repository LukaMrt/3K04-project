import type { Group } from '@japa/runner/core'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import AlarmService from '#modules/alarms/alarms_service'
import type { NewAdcAlarm } from '#modules/alarms/types'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import { UnknownAdcError } from '#modules/cabinet_health/errors'
import type { AdcIdentity, AdcStatus, RegistrationResult } from '#modules/cabinet_health/types'
import ClockService from '#modules/clock/clock_service'
import type { AdcId, RecordOutcome, ReportedState } from '#modules/shared/types'
import { ManualClock } from '#tests/helpers/manual_clock'

/** Stands in for the Cabinet Health Monitor (#39): a set of registered ADCs. */
export class FakeCabinetHealth extends CabinetHealthService {
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

  /** ONLINE, or OFFLINE for the ADCs listed in `offline`. */
  offline = new Set<AdcId>()

  async getStatus(adcId: AdcId): Promise<AdcStatus> {
    if (!this.registered.has(adcId)) throw new UnknownAdcError(`Unknown ADC ${adcId}`)
    return {
      adcId,
      displayedStatus: this.offline.has(adcId) ? 'OFFLINE' : 'ONLINE',
      stale: false,
      lastContact: new Date(),
    }
  }
}

/** Stands in for the Alarm Manager (#38): keeps alarms in memory, once each (D-28). */
export class FakeAlarms extends AlarmService {
  recorded: NewAdcAlarm[] = []
  failing = false

  async recordFromAdc(alarm: NewAdcAlarm): Promise<RecordOutcome> {
    if (this.failing) throw new Error('storage down')
    if (this.recorded.some((a) => a.transactionId === alarm.transactionId)) return 'duplicate'
    this.recorded.push(alarm)
    return 'recorded'
  }
}

/**
 * Before each test of `group`: fresh fakes for the modules not written yet, a clock stopped
 * at `now`, and a database transaction rolled back afterwards.
 */
export function useFakeModules(group: Group, now: Date) {
  const fakes = {} as { cabinetHealth: FakeCabinetHealth; alarms: FakeAlarms }

  group.each.setup(async () => {
    fakes.cabinetHealth = new FakeCabinetHealth(null as any, null as any, null as any)
    fakes.alarms = new FakeAlarms(null as any, null as any)
    app.container.swap(CabinetHealthService, () => fakes.cabinetHealth)
    app.container.swap(AlarmService, () => fakes.alarms)
    app.container.swap(ClockService, () => new ManualClock(now))
    const rollback = await testUtils.db().withGlobalTransaction()
    return () => {
      app.container.restoreAll([CabinetHealthService, AlarmService, ClockService])
      return rollback()
    }
  })

  return fakes
}
