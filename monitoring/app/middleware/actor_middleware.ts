import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import UserService from '#modules/users/users_service'
import type { Actor, Role } from '#modules/shared/types'
import type { DashboardFunction } from '#modules/users/types'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    /** The user on whose behalf this request calls the other modules (D-31). */
    actor: Actor
  }
}

/**
 * Runs after the auth middleware. Closes the session of a deactivated account (D-25);
 * otherwise sets `ctx.actor` with the role read at login, kept in the session, so that a
 * role change applies from the next login only (FR-USR-04).
 */
export default class ActorMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const users = await ctx.containerResolver.make(UserService)
    const user = ctx.auth.getUserOrFail()
    const current = await users.actorOf(user.id)

    if (!current) {
      await ctx.auth.use('web').logout()
      ctx.session.clear()
      ctx.session.flash('error', 'This account has been deactivated.')
      return ctx.response.redirect().toRoute('session.create')
    }

    let role = ctx.session.get('role') as Role | undefined
    if (!role) {
      role = current.role
      ctx.session.put('role', role)
    }
    ctx.actor = { userId: user.id, role }
    ctx.view.share({
      actor: ctx.actor,
      can: (fn: DashboardFunction) => users.can(ctx.actor, fn),
    })
    return next()
  }
}
