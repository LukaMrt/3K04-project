import { inject } from '@adonisjs/core'
import AlarmService from '#modules/alarms/alarms_service'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import { notImplemented } from '#modules/shared/errors'

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
    protected cabinetHealth: CabinetHealthService
  ) {}

  /**
   * Effects: subscribes to the Alarm Manager and the Cabinet Health Monitor, and pushes
   * each of their events to the open dashboards, with the audible cue and its repetition
   * as told by the event (NFR-PRF-01, NFR-SAF-04, NFR-ACC-01, D-22).
   * Called once at start-up.
   */
  start(): void {
    return notImplemented('LiveChannel.start')
  }
}
