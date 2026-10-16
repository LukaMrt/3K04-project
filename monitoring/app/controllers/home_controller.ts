import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Home page: a small system check proving the stack is wired correctly
 * (server rendering, database, live channel).
 */
export default class HomeController {
  async index({ view }: HttpContext) {
    let database = true
    try {
      await db.rawQuery('select 1')
    } catch {
      database = false
    }

    return view.render('pages/home', { database })
  }
}
