import { inject } from '@adonisjs/core'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import { notImplemented } from '#modules/shared/errors'
import type { Actor, Role, UserId } from '#modules/shared/types'
import type { DashboardFunction, NewAccount } from '#modules/users/types'

/** The role → permission matrix of D-14: who may use each dashboard function. */
const PERMISSIONS: Record<DashboardFunction, Role[]> = {
  viewAdcStatuses: ['nurse', 'pharmacist', 'technician', 'administrator'],
  viewAdcInventory: ['nurse', 'pharmacist'],
  viewStockSources: ['pharmacist'],
  viewAlarms: ['nurse', 'pharmacist', 'technician', 'administrator'],
  acknowledgeAlarm: ['nurse', 'pharmacist', 'technician'],
  sendCommand: ['technician', 'administrator'],
  sendConfiguration: ['administrator'],
  viewAdcHistory: ['pharmacist', 'administrator', 'risk_management'],
  consumptionReport: ['pharmacist', 'administrator'],
  consumptionReportByStaff: ['administrator'],
  alarmReport: ['administrator', 'risk_management'],
  openSavedReport: ['pharmacist', 'administrator', 'risk_management'],
  manageAccounts: ['administrator'],
  viewAuditLog: ['administrator', 'risk_management'],
}

/** Roles that may see patient identifiers in reports and event history (D-11). */
const SEE_PATIENT_IDS: Role[] = ['pharmacist', 'administrator']

/**
 * User Management / Auth — module interface.
 *
 * Responsibility: accounts, roles, and permission decisions.
 *
 * Secret (anticipated change): the role → permission mapping (D-14) and how accounts
 * are stored. It is the only module that knows which role may do what (D-31).
 *
 * Authentication itself is provided by the starter kit (app/models/user.ts,
 * session controllers, @adonisjs/auth); permissions will use @adonisjs/bouncer
 * (app/abilities, app/policies).
 */
@inject()
export default class UserService {
  constructor(
    protected history: HistoryService,
    protected clock: ClockService
  ) {}

  /** Whether the role of `actor` gives function `fn`, from the D-14 matrix (SPEC-USR-01). */
  can(actor: Actor, fn: DashboardFunction): boolean {
    return PERMISSIONS[fn].includes(actor.role)
  }

  /** True for pharmacists and administrators only (SPEC-USR-02, D-11). */
  canSeePatientIds(actor: Actor): boolean {
    return SEE_PATIENT_IDS.includes(actor.role)
  }

  /**
   * The actor of an account, with the role read now; null if the account is
   * deactivated (D-25).
   * Throws: UnknownUserError.
   */
  async actorOf(userId: UserId): Promise<Actor | null> {
    return notImplemented('UserService.actorOf', userId)
  }

  /**
   * Pre: `admin` may manage accounts.
   * Effects: account created, active; creation audited (NFR-AUD-04).
   * Throws: EmailAlreadyUsedError.
   */
  async createAccount(admin: Actor, account: NewAccount): Promise<UserId> {
    return notImplemented('UserService.createAccount', admin, account)
  }

  /**
   * Pre: `admin` may manage accounts.
   * Effects: role changed, applies from the next login of that user (FR-USR-04);
   * change audited (NFR-AUD-04).
   * Throws: UnknownUserError.
   */
  async changeRole(admin: Actor, userId: UserId, role: Role): Promise<void> {
    return notImplemented('UserService.changeRole', admin, userId, role)
  }

  /**
   * Pre: `admin` may manage accounts.
   * Effects: account deactivated: refused at login, open sessions closed at their next
   * request (FR-USR-05, D-25); deactivation audited (NFR-AUD-04).
   * Throws: UnknownUserError.
   */
  async deactivate(admin: Actor, userId: UserId): Promise<void> {
    return notImplemented('UserService.deactivate', admin, userId)
  }
}
