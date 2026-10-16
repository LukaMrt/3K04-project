import { inject } from '@adonisjs/core'
import AlarmService from '#modules/alarms/alarms_service'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import { notImplemented } from '#modules/shared/errors'
import type { AdcId, ReportedState, Unsubscribe } from '#modules/shared/types'
import type {
  AdcIdentity,
  AdcListFilter,
  AdcRef,
  AdcStatus,
  AdcSummary,
  RegistrationResult,
  StatusChangedEvent,
} from '#modules/cabinet_health/types'

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
 */
@inject()
export default class CabinetHealthService {
  constructor(
    protected alarms: AlarmService,
    protected history: HistoryService,
    protected clock: ClockService
  ) {}

  /**
   * Pre: identity validated against the interface contract (§3.1).
   * Effects (SPEC-COM-01): a new ADC is stored with last contact = `at` and no reported
   * state (FR-HLT-06); a known ADC has its label and location replaced and the
   * re-registration logged, nothing else changes (D-20).
   * Throws: StorageUnavailableError.
   */
  async register(identity: AdcIdentity, at: Date): Promise<RegistrationResult> {
    return notImplemented('CabinetHealthService.register', identity, at)
  }

  async isRegistered(adcId: AdcId): Promise<boolean> {
    return notImplemented('CabinetHealthService.isRegistered', adcId)
  }

  /**
   * Pre: the ADC is registered.
   * Effects (SPEC-HLT-02): last contact = `at`, connectivity reachable; a status change
   * is recorded if the reported state or the connectivity changed (FR-HIS-03); then a
   * status change is announced if the displayed status changed.
   * Throws: UnknownAdcError.
   */
  async recordHeartbeat(adcId: AdcId, state: ReportedState, at: Date): Promise<void> {
    return notImplemented('CabinetHealthService.recordHeartbeat', adcId, state, at)
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
    return notImplemented('CabinetHealthService.checkTimeouts')
  }

  /**
   * Displayed status, stale label and last contact of an ADC (SPEC-HLT-01).
   * Throws: UnknownAdcError.
   */
  async getStatus(adcId: AdcId): Promise<AdcStatus> {
    return notImplemented('CabinetHealthService.getStatus', adcId)
  }

  /** Registered ADCs matching `filter`, sorted by label (FR-DSH-01 to 03). */
  async listAdcs(filter: AdcListFilter): Promise<AdcSummary[]> {
    return notImplemented('CabinetHealthService.listAdcs', filter)
  }

  /**
   * The other ADCs on the floor of `adcId` whose silence is below 45 s (D-23).
   * Throws: UnknownAdcError.
   */
  async reachableOnSameFloor(adcId: AdcId): Promise<AdcRef[]> {
    return notImplemented('CabinetHealthService.reachableOnSameFloor', adcId)
  }

  /** `listener` is called after every change of the displayed status of an ADC (D-22). */
  subscribe(listener: (event: StatusChangedEvent) => void): Unsubscribe {
    return notImplemented('CabinetHealthService.subscribe', listener)
  }
}
