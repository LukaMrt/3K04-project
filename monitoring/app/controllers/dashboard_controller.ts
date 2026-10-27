import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AlarmService from '#modules/alarms/alarms_service'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import type { DisplayedStatus } from '#modules/cabinet_health/types'
import InventoryService from '#modules/inventory/inventory_service'
import UserService from '#modules/users/users_service'
import { TIME_ZONE } from '#modules/dashboard/presentation'

const STATUSES: DisplayedStatus[] = [
  'ONLINE',
  'MAINTENANCE',
  'FAULT',
  'UNREACHABLE',
  'OFFLINE',
  'PENDING',
]
/** Statuses that need attention on the main view (NFR-USA-01). */
const ATTENTION: DisplayedStatus[] = ['UNREACHABLE', 'OFFLINE', 'FAULT']

/**
 * Main view of the Operator Dashboard: ADC statuses (FR-DSH-01 to 03), what needs
 * attention without further navigation (NFR-USA-01), unacknowledged alarms (FR-ALM-04).
 * Each part is shown only to the roles that may see it (D-14).
 */
@inject()
export default class DashboardController {
  constructor(
    protected users: UserService,
    protected cabinetHealth: CabinetHealthService,
    protected alarms: AlarmService,
    protected inventory: InventoryService
  ) {}

  async index({ view, request, actor }: HttpContext) {
    const canStatuses = this.users.can(actor, 'viewAdcStatuses')
    const canAlarms = this.users.can(actor, 'viewAlarms')
    const filter = STATUSES.find((status) => status === request.qs().status) ?? null

    const allAdcs = canStatuses ? await this.cabinetHealth.listAdcs({}) : []
    const labels = new Map(allAdcs.map((adc) => [adc.adcId, adc.label]))
    const alarms = canAlarms ? await this.alarms.listUnacknowledged() : []
    const lowStock = canStatuses ? await this.inventory.listLowStock() : []

    return view.render('pages/dashboard', {
      statuses: STATUSES,
      initial: {
        canStatuses,
        canAlarms,
        canAcknowledge: this.users.can(actor, 'acknowledgeAlarm'),
        filter,
        timeZone: TIME_ZONE,
        attentionStatuses: ATTENTION,
        adcs: allAdcs.filter((adc) => !filter || adc.displayedStatus === filter),
        attention: allAdcs.filter((adc) => ATTENTION.includes(adc.displayedStatus)),
        lowStock: lowStock.map((flag) => ({ ...flag, adcLabel: labels.get(flag.adcId) })),
        alarms: alarms.map((alarm) => ({ ...alarm, adcLabel: labels.get(alarm.adcId) })),
      },
    })
  }
}
