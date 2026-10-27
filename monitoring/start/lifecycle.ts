/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
|
| Records the start-ups and shutdowns of the server in the system log, so that
| its availability and uptime can be verified (NFR-AVL-05). Preloaded in the
| "web" environment only: tests and ace commands are not start-ups of the system.
|
*/

import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'

export const START_UP_EVENT = 'system_start_up'
export const SHUTDOWN_EVENT = 'system_shutdown'

/**
 * Writes one lifecycle entry to the system log (FR-HIS-08). A failure is logged and
 * never stops the server from starting or stopping.
 */
export async function recordLifecycleEvent(event: string): Promise<void> {
  try {
    const history = await app.container.make(HistoryService)
    const clock = await app.container.make(ClockService)
    await history.appendSystemLog({ event, adcId: null, details: null, at: clock.now() })
  } catch (error) {
    logger.error({ err: error, event }, 'lifecycle event not recorded')
  }
}

/**
 * The start-up is recorded once the application is ready, never while it is only warmed
 * up (`node ace codegen`). The shutdown is recorded on a graceful stop (SIGTERM, SIGINT),
 * before the database connection is closed; a crash leaves no entry, and shows in the log
 * as a start-up that follows another start-up.
 */
if (app.getEnvironment() === 'web') {
  app.ready(async () => {
    await recordLifecycleEvent(START_UP_EVENT)
    app.terminating(() => recordLifecycleEvent(SHUTDOWN_EVENT))
  })
}
