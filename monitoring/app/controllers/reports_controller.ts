import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import InventoryService from '#modules/inventory/inventory_service'
import { UnknownReportError } from '#modules/reporting/errors'
import ReportingService from '#modules/reporting/reporting_service'
import UserService from '#modules/users/users_service'
import { consumptionValidator, lastDays, periodValidator, toRange } from '#validators/report'

/** Reports: generate, reopen, export (FR-RPT-01 to 08, FR-HIS-06). */
@inject()
export default class ReportsController {
  constructor(
    protected reporting: ReportingService,
    protected users: UserService,
    protected cabinetHealth: CabinetHealthService,
    protected inventory: InventoryService
  ) {}

  async index({ view, actor }: HttpContext) {
    const adcs = await this.cabinetHealth.listAdcs({})
    return view.render('pages/reports/index', {
      period: lastDays(30),
      adcs,
      medications: await this.knownMedications(adcs.map((adc) => adc.adcId)),
      saved: await this.reporting.listSavedReports(actor),
      canConsumption: this.users.can(actor, 'consumptionReport'),
      canByStaff: this.users.can(actor, 'consumptionReportByStaff'),
      canAlarms: this.users.can(actor, 'alarmReport'),
    })
  }

  async consumption({ request, actor, session, response, view }: HttpContext) {
    const { from, to, ...filters } = await request.validateUsing(consumptionValidator)
    if (filters.staffMemberId && !this.users.can(actor, 'consumptionReportByStaff')) {
      return response.status(403).send(await view.render('pages/errors/forbidden'))
    }
    const range = toRange(from, to)
    if (!range) {
      session.flash('error', 'Invalid date range: the end comes before the start.')
      return response.redirect().toRoute('reports.index')
    }
    const report = await this.reporting.consumptionReport(actor, {
      range,
      ...withoutEmpty(filters),
    })
    return response.redirect().toRoute('reports.show', { id: report.reportId })
  }

  async alarms({ request, actor, session, response }: HttpContext) {
    const { from, to } = await request.validateUsing(periodValidator)
    const range = toRange(from, to)
    if (!range) {
      session.flash('error', 'Invalid date range: the end comes before the start.')
      return response.redirect().toRoute('reports.index')
    }
    const report = await this.reporting.alarmReport(actor, range)
    return response.redirect().toRoute('reports.show', { id: report.reportId })
  }

  /** US-RPT-07: only a report of a kind the role may generate is opened. */
  async show({ params, actor, view, response }: HttpContext) {
    const reportId = Number(params.id)
    const saved = await this.reporting.listSavedReports(actor)
    if (!saved.some((report) => report.reportId === reportId)) {
      return response.status(403).send(await view.render('pages/errors/forbidden'))
    }
    const report = await this.reporting.openSavedReport(actor, reportId)
    return view.render('pages/reports/show', {
      report,
      canExport: report.kind === 'alarms' && this.users.can(actor, 'alarmReport'),
    })
  }

  /** FR-RPT-07: the alarm report as a downloadable file. */
  async export({ params, response }: HttpContext) {
    try {
      const file = await this.reporting.exportReport(Number(params.id))
      response.header('content-type', file.contentType)
      response.attachment(file.fileName)
      return response.send(file.content)
    } catch (error) {
      if (!(error instanceof UnknownReportError)) throw error
      return response.notFound('No such alarm report')
    }
  }

  /** The medications found in the inventory of any ADC, to choose a filter by name. */
  private async knownMedications(adcIds: string[]) {
    const medications = new Map<string, string>()
    for (const adcId of adcIds) {
      const inventory = await this.inventory.getInventory(adcId)
      for (const line of inventory?.lines ?? []) {
        medications.set(line.medicationId, line.medicationName)
      }
    }
    return [...medications]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
}

/** Filters left empty in the form arrive as null: they mean "no filter". */
function withoutEmpty<T extends Record<string, unknown>>(filters: T) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== null && value !== undefined)
  ) as { [K in keyof T]?: NonNullable<T[K]> }
}
