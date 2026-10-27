import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import AlarmService from '#modules/alarms/alarms_service'
import type { AlarmEvent } from '#modules/alarms/types'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import type { StatusChangedEvent } from '#modules/cabinet_health/types'
import type { Role } from '#modules/shared/types'
import type { DashboardFunction } from '#modules/users/types'
import UserService from '#modules/users/users_service'

/** Channel of the alarm events: raised and acknowledged alarms. */
export const ALARMS_CHANNEL = 'alarms'
/** Channel of the status changes of the ADCs. */
export const ADCS_CHANNEL = 'adcs'

/**
 * Operator Dashboard — live channel.
 *
 * The Operator Dashboard module is made of this file, the controllers of
 * app/controllers/ and the views of resources/views/. It is the top of the USES
 * hierarchy: no other module calls it.
 *
 * Secret (anticipated change): page layout and wording, and how information reaches
 * the browser (Server-Sent Events through Transmit today, D-27). It is the only module
 * that imports Transmit.
 */
@inject()
export default class LiveChannel {
  constructor(
    protected alarms: AlarmService,
    protected cabinetHealth: CabinetHealthService,
    protected users: UserService
  ) {}

  /**
   * Effects: subscribes to the Alarm Manager and the Cabinet Health Monitor, and pushes
   * each of their events to the open dashboards, with the audible cue and its repetition
   * as told by the event (NFR-PRF-01, NFR-SAF-04, NFR-ACC-01, D-22). A browser receives a
   * channel only if the role of its session may see it (SPEC-USR-01).
   * Called once at start-up.
   */
  start(): void {
    transmit.authorize(ALARMS_CHANNEL, (ctx) => this.allows(ctx, 'viewAlarms'))
    transmit.authorize(ADCS_CHANNEL, (ctx) => this.allows(ctx, 'viewAdcStatuses'))
    this.alarms.subscribe((event) => this.push(ALARMS_CHANNEL, () => this.alarmPayload(event)))
    this.cabinetHealth.subscribe((event) => this.push(ADCS_CHANNEL, () => this.adcPayload(event)))
  }

  private allows(ctx: HttpContext, fn: DashboardFunction): boolean {
    const user = ctx.auth.user
    const role = ctx.session.get('role') as Role | undefined
    return Boolean(user && role && this.users.can({ userId: user.id, role }, fn))
  }

  /**
   * Builds the payload, then broadcasts it as plain JSON. A failure is logged: it must
   * never reach the module that announced the event (D-36).
   */
  private push(channel: string, payload: () => Promise<object>) {
    payload()
      .then((data) => transmit.broadcast(channel, JSON.parse(JSON.stringify(data))))
      .catch((error) => logger.error({ err: error, channel }, 'Live push failed'))
  }

  /** The alarm with the label of its ADC, or who acknowledged it (FR-ALM-04, FR-ALM-06). */
  async alarmPayload(event: AlarmEvent): Promise<object> {
    if (event.kind === 'acknowledged') {
      return { ...event, byName: await this.users.nameOf(event.by) }
    }
    return { ...event, adcLabel: await this.labelOf(event.alarm.adcId) }
  }

  /** The new status with the label of the ADC (FR-DSH-01). */
  async adcPayload(event: StatusChangedEvent): Promise<object> {
    return { ...event, label: await this.labelOf(event.status.adcId) }
  }

  private async labelOf(adcId: string): Promise<string> {
    const adcs = await this.cabinetHealth.listAdcs({})
    return adcs.find((adc) => adc.adcId === adcId)?.label ?? adcId
  }
}
