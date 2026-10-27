import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AlarmService from '#modules/alarms/alarms_service'
import { UnknownAlarmError } from '#modules/alarms/errors'
import { formatTime } from '#modules/dashboard/presentation'
import UserService from '#modules/users/users_service'

/** Alarm acknowledgement (FR-ALM-05, FR-ALM-06, SPEC-ALM-01). */
@inject()
export default class AlarmsController {
  constructor(
    protected alarms: AlarmService,
    protected users: UserService
  ) {}

  async acknowledge({ params, actor, session, response }: HttpContext) {
    try {
      const result = await this.alarms.acknowledge(actor, params.id)
      if (result.kind === 'acknowledged') {
        session.flash('success', 'Alarm acknowledged.')
      } else {
        const name = await this.users.nameOf(result.by)
        session.flash('error', `Already acknowledged by ${name} at ${formatTime(result.at)}.`)
      }
    } catch (error) {
      if (!(error instanceof UnknownAlarmError)) throw error
      session.flash('error', 'This alarm does not exist.')
    }
    return response.redirect().toRoute('dashboard')
  }
}
