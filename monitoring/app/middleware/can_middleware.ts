import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import UserService from '#modules/users/users_service'
import type { DashboardFunction } from '#modules/users/types'

/**
 * SPEC-USR-01: a dashboard function is performed only if the role of the actor allows it
 * (D-14). Otherwise the permission message is shown and nothing is called (D-26, D-31).
 * Runs after the actor middleware: `router.get(...).use(middleware.can('sendCommand'))`.
 */
export default class CanMiddleware {
  async handle(ctx: HttpContext, next: NextFn, fn: DashboardFunction) {
    const users = await ctx.containerResolver.make(UserService)
    if (!users.can(ctx.actor, fn)) {
      const page = await ctx.view.render('pages/errors/forbidden')
      return ctx.response.status(403).send(page)
    }
    return next()
  }
}
