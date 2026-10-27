import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AdcCommunicationService from '#modules/adc_communication/adc_communication_service'
import type { DeliveryOutcome } from '#modules/adc_communication/types'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import { UnknownAdcError } from '#modules/cabinet_health/errors'
import InventoryService from '#modules/inventory/inventory_service'
import UserService from '#modules/users/users_service'
import { configurationValidator, maintenanceValidator } from '#validators/adc'

/**
 * One ADC: status (SPEC-HLT-01), inventory with low-stock flags, sources and aggregated
 * stock (FR-INV-02 to 06), commands and configuration (FR-COM-04, 05). Each part only for
 * the roles of D-14.
 */
@inject()
export default class AdcsController {
  constructor(
    protected users: UserService,
    protected cabinetHealth: CabinetHealthService,
    protected inventory: InventoryService,
    protected communication: AdcCommunicationService
  ) {}

  async show({ params, view, actor, response }: HttpContext) {
    const adcs = await this.cabinetHealth.listAdcs({})
    const adc = adcs.find((one) => one.adcId === params.id)
    if (!adc) return response.notFound('No such ADC')

    const inventory = this.users.can(actor, 'viewAdcInventory')
      ? await this.inventory.getInventory(adc.adcId)
      : null
    const withSources = this.users.can(actor, 'viewStockSources')
    const lines = []
    for (const line of inventory?.lines ?? []) {
      lines.push({
        ...line,
        aggregated: withSources ? await this.inventory.aggregatedQuantity(line.medicationId) : null,
        sources:
          withSources && line.lowStock
            ? await this.inventory.findSources(adc.adcId, line.medicationId)
            : null,
      })
    }

    return view.render('pages/adcs/show', {
      adc,
      inventory: inventory && { heartbeatAt: inventory.heartbeatAt, lines },
      canInventory: this.users.can(actor, 'viewAdcInventory'),
      canCommand: this.users.can(actor, 'sendCommand'),
      canConfigure: this.users.can(actor, 'sendConfiguration'),
      canHistory: this.users.can(actor, 'viewAdcHistory'),
    })
  }

  async maintenance({ params, request, actor, session, response }: HttpContext) {
    const { enabled } = await request.validateUsing(maintenanceValidator)
    const outcome = await this.deliver(() =>
      this.communication.sendCommand(actor, params.id, { kind: 'setMaintenanceMode', enabled })
    )
    this.flashOutcome(session, outcome, enabled ? 'Maintenance mode on' : 'Maintenance mode off')
    return response.redirect().toRoute('adcs.show', { id: params.id })
  }

  async configure({ params, request, actor, session, response }: HttpContext) {
    const { timeServer, screenLockTimeoutSeconds } =
      await request.validateUsing(configurationValidator)
    const settings = {
      ...(timeServer && { timeServer }),
      ...(screenLockTimeoutSeconds && { screenLockTimeoutSeconds }),
    }
    if (Object.keys(settings).length === 0) {
      session.flash('error', 'Give at least one setting to change.')
      return response.redirect().toRoute('adcs.show', { id: params.id })
    }
    const outcome = await this.deliver(() =>
      this.communication.sendConfiguration(actor, params.id, settings)
    )
    this.flashOutcome(session, outcome, 'Configuration')
    return response.redirect().toRoute('adcs.show', { id: params.id })
  }

  /** An unknown ADC is reported like a refusal, not as a server error. */
  private async deliver(send: () => Promise<DeliveryOutcome>): Promise<DeliveryOutcome | null> {
    try {
      return await send()
    } catch (error) {
      if (error instanceof UnknownAdcError) return null
      throw error
    }
  }

  /** SPEC-COM-05: the outcome is shown to the sender. */
  private flashOutcome(
    session: HttpContext['session'],
    outcome: DeliveryOutcome | null,
    what: string
  ) {
    if (!outcome) return session.flash('error', 'This ADC is not registered.')
    if (outcome.kind === 'delivered') return session.flash('success', `${what}: delivered.`)
    if (outcome.kind === 'refusedOffline') {
      return session.flash('error', `${what}: refused, the ADC is offline.`)
    }
    session.flash('error', `${what}: failed (${outcome.code}). ${outcome.message}`)
  }
}
