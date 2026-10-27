import { inject } from '@adonisjs/core'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import User from '#models/user'
import type { Actor, Role, UserId } from '#modules/shared/types'
import { EmailAlreadyUsedError, UnknownUserError } from '#modules/users/errors'
import type { AccountSummary, DashboardFunction, NewAccount } from '#modules/users/types'

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
    const user = await this.find(userId)
    return user.active ? { userId, role: user.role as Role } : null
  }

  /** The name shown for an account: its full name, or its email (FR-ALM-06). */
  async nameOf(userId: UserId): Promise<string> {
    const user = await this.find(userId)
    return user.fullName ?? user.email
  }

  /** Every account, sorted by email (FR-USR-03 to 05). */
  async listAccounts(): Promise<AccountSummary[]> {
    const users = await User.query().orderBy('email')
    return users.map((user) => ({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role as Role,
      active: user.active,
    }))
  }

  /**
   * Pre: `admin` may manage accounts.
   * Effects: account created, active; creation audited (NFR-AUD-04).
   * Throws: EmailAlreadyUsedError.
   */
  async createAccount(admin: Actor, account: NewAccount): Promise<UserId> {
    if (await User.findBy('email', account.email)) {
      throw new EmailAlreadyUsedError(`An account already uses ${account.email}`)
    }
    const user = await User.create({ ...account, active: true })
    await this.audit(admin, 'create_account', user.id, account.role)
    return user.id
  }

  /**
   * Pre: `admin` may manage accounts.
   * Effects: role changed, applies from the next login of that user (FR-USR-04);
   * change audited (NFR-AUD-04).
   * Throws: UnknownUserError.
   */
  async changeRole(admin: Actor, userId: UserId, role: Role): Promise<void> {
    const user = await this.find(userId)
    const previous = user.role
    await user.merge({ role }).save()
    await this.audit(admin, 'change_role', userId, `${previous} -> ${role}`)
  }

  /**
   * Pre: `admin` may manage accounts.
   * Effects: account deactivated: refused at login, open sessions closed at their next
   * request (FR-USR-05, D-25); deactivation audited (NFR-AUD-04).
   * Throws: UnknownUserError.
   */
  async deactivate(admin: Actor, userId: UserId): Promise<void> {
    const user = await this.find(userId)
    await user.merge({ active: false }).save()
    await this.audit(admin, 'deactivate_account', userId, null)
  }

  private async find(userId: UserId): Promise<User> {
    const user = await User.find(userId)
    if (!user) throw new UnknownUserError(`No account ${userId}`)
    return user
  }

  /** NFR-AUD-04: account changes are audited with the administrator and the account. */
  private async audit(admin: Actor, action: string, userId: UserId, outcome: string | null) {
    await this.history.appendAudit({
      userId: admin.userId,
      action,
      target: `user ${userId}`,
      outcome,
      at: this.clock.now(),
    })
  }
}
