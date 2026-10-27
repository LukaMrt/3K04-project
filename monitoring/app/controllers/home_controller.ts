import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  /** The site root: the dashboard for a signed-in user, the login page otherwise (FR-USR-01). */
  async index({ auth, response }: HttpContext) {
    return response.redirect().toRoute(auth.user ? 'dashboard' : 'session.create')
  }

  /**
   * System check, shows no data: server, database and live channel are working. Used to
   * check the presenting machine before the demonstration.
   */
  async system({ view }: HttpContext) {
    let database = true
    try {
      await db.rawQuery('select 1')
    } catch {
      database = false
    }

    return view.render('pages/home', { database })
  }
}
