/*
|--------------------------------------------------------------------------
| Scheduler
|--------------------------------------------------------------------------
|
| Periodic calls to module operations. Preloaded in the "web" environment only,
| so that tests and ace commands never run them.
|
*/

import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import HistoryService from '#modules/history/history_service'

const DAY_MS = 24 * 60 * 60 * 1000

/** FR-HIS-09: expired records are deleted at least every 24 h. */
async function purgeExpiredRecords() {
  try {
    const history = await app.container.make(HistoryService)
    const deleted = await history.purgeExpired()
    logger.info({ deleted }, 'expired records purged')
  } catch (error) {
    logger.error({ err: error }, 'purge of expired records failed')
  }
}

await purgeExpiredRecords()
const purgeTimer = setInterval(purgeExpiredRecords, DAY_MS)

app.terminating(() => clearInterval(purgeTimer))
