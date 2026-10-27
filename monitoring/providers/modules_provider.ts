import type { ApplicationService } from '@adonisjs/core/types'
import AlarmService from '#modules/alarms/alarms_service'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'

/**
 * Modules that keep subscribers in memory are created once (D-37): the Operator Dashboard
 * subscribes to the same instance that the other modules call. Every other module is
 * stateless in memory and is created on each injection.
 */
export default class ModulesProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(
      AlarmService,
      async (resolver) =>
        new AlarmService(await resolver.make(HistoryService), await resolver.make(ClockService))
    )
    this.app.container.singleton(
      CabinetHealthService,
      async (resolver) =>
        new CabinetHealthService(
          await resolver.make(AlarmService),
          await resolver.make(HistoryService),
          await resolver.make(ClockService)
        )
    )
  }
}
