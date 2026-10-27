import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import AlarmService from '#modules/alarms/alarms_service'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import { StorageUnavailableError } from '#modules/shared/errors'
import type { AdcId, Connectivity, ReportedState, Unsubscribe } from '#modules/shared/types'
import { UnknownAdcError } from '#modules/cabinet_health/errors'
import type {
  AdcIdentity,
  AdcListFilter,
  AdcRef,
  AdcStatus,
  AdcSummary,
  DisplayedStatus,
  RegistrationResult,
  StatusChangedEvent,
} from '#modules/cabinet_health/types'
import AdcModel from '#modules/cabinet_health/models/adc'

/** Silence after which an ADC is unreachable (D-01, FR-HLT-02). */
const UNREACHABLE_AFTER_SECONDS = 45
/** Silence after which an ADC is offline (D-01, FR-HLT-03). */
const OFFLINE_AFTER_SECONDS = 75

/** How long an ADC has been silent, compared with the two delays above. */
type SilenceBand = 'recent' | 'pastUnreachableDelay' | 'pastOfflineDelay'

/**
 * Connectivity state machine (SPEC-HLT-02, D1 state machine, "Connectivity" region):
 * where an ADC goes when its silence reaches a band, `null` when it stays. A heartbeat
 * always brings it back to 'reachable' (recordHeartbeat).
 */
const ON_SILENCE: Record<Connectivity, Record<SilenceBand, Connectivity | null>> = {
  reachable: { recent: null, pastUnreachableDelay: 'unreachable', pastOfflineDelay: 'offline' },
  unreachable: { recent: null, pastUnreachableDelay: null, pastOfflineDelay: 'offline' },
  offline: { recent: null, pastUnreachableDelay: null, pastOfflineDelay: null },
}

/**
 * Cabinet Health Monitor — module interface.
 *
 * Responsibility: keep the registry of ADCs (label, location, registration time,
 * last contact, reported state) and their connectivity, and announce every change of
 * their displayed status.
 *
 * Secret (anticipated change): the ADC state machine (SPEC-HLT-02) and the timeouts
 * used to declare a cabinet unreachable (45 s) or offline (75 s).
 *
 * Invariant: the connectivity of each ADC is the one SPEC-HLT-02 gives for
 * silence = now − lastContact, as of the last call to checkTimeouts().
 *
 * Every operation that reads or writes the registry throws StorageUnavailableError when
 * the storage cannot be used.
 */
@inject()
export default class CabinetHealthService {
  private listeners = new Set<(event: StatusChangedEvent) => void>()

  constructor(
    protected alarms: AlarmService,
    protected history: HistoryService,
    protected clock: ClockService
  ) {}

  /**
   * Pre: identity validated against the interface contract (§3.1).
   * Effects (SPEC-COM-01): a new ADC is stored with last contact = `at` and no reported
   * state (FR-HLT-06), its first status recorded (D-40) and announced; a known ADC has its
   * label and location replaced and the re-registration logged, nothing else changes (D-20).
   * Throws: StorageUnavailableError.
   */
  async register(identity: AdcIdentity, at: Date): Promise<RegistrationResult> {
    const { adcId, label, floor, description } = identity
    const existing = await this.store(() => AdcModel.find(adcId))

    if (existing) {
      await this.store(() => existing.merge({ label, floor, description }).save())
      await this.history.appendSystemLog({ event: 're_registration', adcId, details: null, at })
      return { firstRegistration: false }
    }

    const adc = await this.store(() =>
      AdcModel.create({
        adcId,
        label,
        floor,
        description,
        registeredAt: DateTime.fromJSDate(at),
        lastContact: DateTime.fromJSDate(at),
        reportedState: null,
        connectivity: 'reachable',
      })
    )
    await this.history.recordStatusChange({
      adcId,
      reportedState: null,
      connectivity: 'reachable',
      at,
    })
    this.announce({ status: toStatus(adc), previous: null })
    return { firstRegistration: true }
  }

  async isRegistered(adcId: AdcId): Promise<boolean> {
    return (await this.store(() => AdcModel.find(adcId))) !== null
  }

  /**
   * Pre: the ADC is registered.
   * Effects (SPEC-HLT-02): last contact = `at`, connectivity reachable; a status change
   * is recorded if the reported state or the connectivity changed (FR-HIS-03); then a
   * status change is announced if the displayed status changed. A communication loss
   * alarm stays as it is (FR-HLT-07).
   * Throws: UnknownAdcError.
   */
  async recordHeartbeat(adcId: AdcId, state: ReportedState, at: Date): Promise<void> {
    const adc = await this.find(adcId)
    const previous = displayedStatus(adc)
    const changed = adc.reportedState !== state || adc.connectivity !== 'reachable'

    adc.merge({
      lastContact: DateTime.fromJSDate(at),
      reportedState: state,
      connectivity: 'reachable',
    })
    await this.store(() => adc.save())

    if (changed) {
      await this.history.recordStatusChange({
        adcId,
        reportedState: state,
        connectivity: 'reachable',
        at,
      })
    }
    if (displayedStatus(adc) !== previous) this.announce({ status: toStatus(adc), previous })
  }

  /**
   * Called every second by the scheduler.
   *
   * Effects (SPEC-HLT-02), for each ADC, with silence = clock.now() − lastContact:
   * - reachable ∧ 45 s ≤ silence < 75 s → unreachable; status change recorded
   *   (FR-HIS-03); status change announced.
   * - not offline ∧ silence ≥ 75 s → offline; status change recorded;
   *   alarms.raiseCommunicationLoss() called (FR-HLT-04); status change announced.
   * - otherwise nothing.
   * The communication loss alarm is raised only when the ADC enters offline, never again
   * while it stays offline. The second rule also covers a missed call that lets silence
   * jump past 75 s while the ADC was still reachable.
   *
   * Throws: StorageUnavailableError.
   */
  async checkTimeouts(): Promise<void> {
    const now = this.clock.now()
    const adcs = await this.store(() => AdcModel.all())

    for (const adc of adcs) {
      const target = ON_SILENCE[connectivityOf(adc)][silenceBand(adc, now)]
      if (target) await this.moveTo(adc, target, now)
    }
  }

  /**
   * Displayed status, stale label and last contact of an ADC (SPEC-HLT-01).
   * Throws: UnknownAdcError.
   */
  async getStatus(adcId: AdcId): Promise<AdcStatus> {
    return toStatus(await this.find(adcId))
  }

  /** Registered ADCs matching `filter`, sorted by label (FR-DSH-01 to 03). */
  async listAdcs(filter: AdcListFilter): Promise<AdcSummary[]> {
    const adcs = await this.store(() => AdcModel.query().orderBy('label'))
    return adcs
      .map((adc) => ({
        ...toStatus(adc),
        label: adc.label,
        floor: adc.floor,
        description: adc.description,
      }))
      .filter((adc) => !filter.status || adc.displayedStatus === filter.status)
  }

  /**
   * The other ADCs on the floor of `adcId` whose silence is below 45 s (D-23).
   * Throws: UnknownAdcError.
   */
  async reachableOnSameFloor(adcId: AdcId): Promise<AdcRef[]> {
    const adc = await this.find(adcId)
    const now = this.clock.now()
    const neighbours = await this.store(() =>
      AdcModel.query().where('floor', adc.floor).whereNot('adc_id', adcId).orderBy('label')
    )
    return neighbours
      .filter((neighbour) => silenceBand(neighbour, now) === 'recent')
      .map((neighbour) => ({ adcId: neighbour.adcId, label: neighbour.label }))
  }

  /** `listener` is called after every change of the displayed status of an ADC (D-22). */
  subscribe(listener: (event: StatusChangedEvent) => void): Unsubscribe {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Applies a timeout transition. Going offline, the alarm is stored first (D-38).
   * Only the connectivity column is written: a heartbeat received meanwhile keeps its last
   * contact, and the next heartbeat (at most 30 s later, NAT-03) brings the ADC back to
   * reachable. The error is on the safe side: never online while silent (NFR-SAF-03).
   */
  private async moveTo(adc: AdcModel, target: Connectivity, now: Date) {
    const previous = displayedStatus(adc)
    if (target === 'offline') await this.alarms.raiseCommunicationLoss(adc.adcId)

    adc.connectivity = target
    await this.store(() => adc.save())
    await this.history.recordStatusChange({
      adcId: adc.adcId,
      reportedState: adc.reportedState as ReportedState | null,
      connectivity: target,
      at: now,
    })
    this.announce({ status: toStatus(adc), previous })
  }

  private async find(adcId: AdcId): Promise<AdcModel> {
    const adc = await this.store(() => AdcModel.find(adcId))
    if (!adc) throw new UnknownAdcError(`ADC ${adcId} is not registered`)
    return adc
  }

  /**
   * Calls every listener once the change is stored (D-27). A failing listener is logged
   * and does not stop the others nor undo the change (D-36).
   */
  private announce(event: StatusChangedEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        logger.error({ err: error, adcId: event.status.adcId }, 'Status listener failed')
      }
    }
  }

  /**
   * Runs a storage operation: module exceptions go through, any other failure becomes
   * StorageUnavailableError.
   */
  private async store<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof Exception) throw error
      throw new StorageUnavailableError('The ADC registry cannot be used', { cause: error })
    }
  }
}

function connectivityOf(adc: AdcModel): Connectivity {
  return adc.connectivity as Connectivity
}

function silenceBand(adc: AdcModel, now: Date): SilenceBand {
  const silenceSeconds = (now.getTime() - adc.lastContact.toMillis()) / 1000
  if (silenceSeconds >= OFFLINE_AFTER_SECONDS) return 'pastOfflineDelay'
  if (silenceSeconds >= UNREACHABLE_AFTER_SECONDS) return 'pastUnreachableDelay'
  return 'recent'
}

/** SPEC-HLT-01: the connectivity overrides the reported state (D-02). */
function displayedStatus(adc: AdcModel): DisplayedStatus {
  switch (connectivityOf(adc)) {
    case 'offline':
      return 'OFFLINE'
    case 'unreachable':
      return 'UNREACHABLE'
    case 'reachable':
      if (adc.reportedState === null) return 'PENDING' // D-21
      return adc.reportedState.toUpperCase() as DisplayedStatus // D-16 labels
  }
}

function toStatus(adc: AdcModel): AdcStatus {
  return {
    adcId: adc.adcId,
    displayedStatus: displayedStatus(adc),
    stale: connectivityOf(adc) !== 'reachable',
    lastContact: adc.lastContact.toJSDate(),
  }
}
