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
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import HistoryService from '#modules/history/history_service'

const DAY_MS = 24 * 60 * 60 * 1000
const SECOND_MS = 1000

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

/**
 * SPEC-HLT-02: unreachable and offline ADCs are detected within one second. A check still
 * running when the next one is due makes it skip, so that two checks never raise two
 * alarms for the same loss of communication.
 */
let checking = false
async function checkTimeouts() {
  if (checking) return
  checking = true
  try {
    const cabinetHealth = await app.container.make(CabinetHealthService)
    await cabinetHealth.checkTimeouts()
  } catch (error) {
    logger.error({ err: error }, 'check of ADC timeouts failed')
  } finally {
    checking = false
  }
}

/**
 * The timers start once the application is ready, never while it is only warmed up
 * (`node ace codegen`): otherwise they would keep that command running forever.
 */
app.ready(async () => {
  await purgeExpiredRecords()
  const purgeTimer = setInterval(purgeExpiredRecords, DAY_MS)
  const timeoutsTimer = setInterval(checkTimeouts, SECOND_MS)

  app.terminating(() => {
    clearInterval(purgeTimer)
    clearInterval(timeoutsTimer)
  })
})
