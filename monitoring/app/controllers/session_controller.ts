import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import { DEMO_ACCOUNTS } from '#database/demo_accounts'
import { roleName } from '#modules/dashboard/presentation'
import User from '#models/user'
import UserService from '#modules/users/users_service'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * SessionController handles user authentication and session management.
 * It provides methods for displaying the login page, authenticating users,
 * and logging out.
 */
export default class SessionController {
  /**
   * Display the login page; in development, with one-click fills of the demo accounts.
   */
  async create({ view }: HttpContext) {
    const demoAccounts = app.inDev
      ? DEMO_ACCOUNTS.map(({ role, email, password }) => ({
          name: roleName(role),
          email,
          password,
        }))
      : []
    return view.render('pages/auth/login', { demoAccounts })
  }

  /**
   * Authenticate user credentials and create a new session. A deactivated account is
   * refused (FR-USR-05); the role is read now and kept for the session (FR-USR-04).
   */
  @inject()
  async store({ request, auth, response, session }: HttpContext, users: UserService) {
    const { email, password } = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(email, password)
    const actor = await users.actorOf(user.id)
    if (!actor) {
      session.flash('error', 'This account has been deactivated.')
      return response.redirect().toRoute('session.create')
    }

    await auth.use('web').login(user)
    session.put('role', actor.role)
    response.redirect().toRoute('dashboard')
  }

  /**
   * Log out the current user and destroy their session
   */
  async destroy({ auth, response, session }: HttpContext) {
    await auth.use('web').logout()
    session.forget('role')
    response.redirect().toRoute('session.create')
  }
}
