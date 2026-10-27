import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import ReportingService from '#modules/reporting/reporting_service'
import UserService from '#modules/users/users_service'
import { auditValidator, lastDays, periodValidator, toRange } from '#validators/report'

/** Event history of an ADC (FR-HIS-04) and audit log (FR-HIS-07), read through Reporting (D-33). */
@inject()
export default class HistoryController {
  constructor(
    protected reporting: ReportingService,
    protected cabinetHealth: CabinetHealthService,
    protected users: UserService
  ) {}

  /** The ADCs whose event history can be opened. */
  async index({ view }: HttpContext) {
    return view.render('pages/history/index', { adcs: await this.cabinetHealth.listAdcs({}) })
  }

  async adc({ params, request, actor, view, response, session }: HttpContext) {
    const adcs = await this.cabinetHealth.listAdcs({})
    const adc = adcs.find((one) => one.adcId === params.id)
    if (!adc) return response.notFound('No such ADC')

    const period = request.input('from')
      ? await request.validateUsing(periodValidator, { data: request.qs() })
      : lastDays(7)
    const range = toRange(period.from, period.to)
    if (!range) {
      session.flash('error', 'Invalid date range: the end comes before the start.')
      return response.redirect().toPath(`/adcs/${adc.adcId}/history`)
    }
    const history = await this.reporting.adcHistory(actor, adc.adcId, range)
    return view.render('pages/history/adc', { adc, period, history })
  }

  async audit({ request, actor, view, response, session }: HttpContext) {
    const filters = request.input('from')
      ? await request.validateUsing(auditValidator, { data: request.qs() })
      : { ...lastDays(7), adcId: null, userId: null }
    const range = toRange(filters.from, filters.to)
    if (!range) {
      session.flash('error', 'Invalid date range: the end comes before the start.')
      return response.redirect().toRoute('audit.index')
    }
    const entries = await this.reporting.auditLog(actor, {
      range,
      ...(filters.adcId && { adcId: filters.adcId }),
      ...(typeof filters.userId === 'number' && { userId: filters.userId }),
    })
    const accounts = await this.users.listAccounts()
    const adcs = await this.cabinetHealth.listAdcs({})
    return view.render('pages/history/audit', {
      filters,
      entries,
      accounts,
      adcs,
      names: Object.fromEntries(accounts.map((one) => [one.userId, one.fullName ?? one.email])),
      labels: Object.fromEntries(adcs.map((one) => [one.adcId, one.label])),
    })
  }
}
