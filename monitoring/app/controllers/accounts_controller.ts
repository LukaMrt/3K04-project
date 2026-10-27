import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ROLES } from '#modules/dashboard/presentation'
import { EmailAlreadyUsedError } from '#modules/users/errors'
import UserService from '#modules/users/users_service'
import { changeRoleValidator, createAccountValidator } from '#validators/account'

/** Account management, administrators only (FR-USR-03 to 05, D-14). */
@inject()
export default class AccountsController {
  constructor(protected users: UserService) {}

  async index({ view }: HttpContext) {
    const accounts = await this.users.listAccounts()
    return view.render('pages/accounts/index', { accounts, roles: ROLES })
  }

  async store({ request, actor, session, response }: HttpContext) {
    const account = await request.validateUsing(createAccountValidator)
    try {
      await this.users.createAccount(actor, account)
      session.flash('success', `Account created for ${account.email}.`)
    } catch (error) {
      if (!(error instanceof EmailAlreadyUsedError)) throw error
      session.flash('error', error.message)
    }
    return response.redirect().toRoute('accounts.index')
  }

  async updateRole({ params, request, actor, session, response }: HttpContext) {
    const { role } = await request.validateUsing(changeRoleValidator)
    await this.users.changeRole(actor, Number(params.id), role)
    session.flash('success', 'Role changed. It applies from the next login of that user.')
    return response.redirect().toRoute('accounts.index')
  }

  async deactivate({ params, actor, session, response }: HttpContext) {
    await this.users.deactivate(actor, Number(params.id))
    session.flash('success', 'Account deactivated.')
    return response.redirect().toRoute('accounts.index')
  }
}
