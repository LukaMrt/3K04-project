/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'

/**
 * Live channel (Server-Sent Events) used to push updates to the dashboard
 */
transmit.registerRoutes()

router.get('/', [controllers.Home, 'index']).as('home')
router.get('system', [controllers.Home, 'system']).as('system.check')
router.post('/system/echo', [controllers.System, 'echo']).as('system.echo')

/**
 * ADC ↔ Monitoring interface contract (docs/part-b/interface-adc-monitoring.md §3)
 */
router
  .group(() => {
    router.post('adcs/register', [controllers.AdcProtocol, 'register'])
    router.post('heartbeats', [controllers.AdcProtocol, 'heartbeat'])
  })
  .prefix('/api/v1')

router
  .group(() => {
    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router.post('logout', [controllers.Session, 'destroy']).use(middleware.auth())

/**
 * Operator Dashboard: every page needs an authenticated, active account (FR-USR-01,
 * D-25), then the permission of its function (SPEC-USR-01, D-14).
 */
router
  .group(() => {
    router.get('dashboard', [controllers.Dashboard, 'index']).as('dashboard')
    router
      .post('alarms/:id/acknowledge', [controllers.Alarms, 'acknowledge'])
      .as('alarms.acknowledge')
      .use(middleware.can('acknowledgeAlarm'))

    router
      .get('adcs/:id', [controllers.Adcs, 'show'])
      .as('adcs.show')
      .use(middleware.can('viewAdcStatuses'))
    router
      .post('adcs/:id/maintenance', [controllers.Adcs, 'maintenance'])
      .as('adcs.maintenance')
      .use(middleware.can('sendCommand'))
    router
      .post('adcs/:id/configuration', [controllers.Adcs, 'configure'])
      .as('adcs.configure')
      .use(middleware.can('sendConfiguration'))

    router
      .get('history', [controllers.History, 'index'])
      .as('history.index')
      .use(middleware.can('viewAdcHistory'))
    router
      .get('adcs/:id/history', [controllers.History, 'adc'])
      .as('adcs.history')
      .use(middleware.can('viewAdcHistory'))
    router
      .get('audit', [controllers.History, 'audit'])
      .as('audit.index')
      .use(middleware.can('viewAuditLog'))

    router
      .get('reports', [controllers.Reports, 'index'])
      .as('reports.index')
      .use(middleware.can('openSavedReport'))
    router
      .post('reports/consumption', [controllers.Reports, 'consumption'])
      .as('reports.consumption')
      .use(middleware.can('consumptionReport'))
    router
      .post('reports/alarms', [controllers.Reports, 'alarms'])
      .as('reports.alarms')
      .use(middleware.can('alarmReport'))
    router
      .get('reports/:id', [controllers.Reports, 'show'])
      .as('reports.show')
      .use(middleware.can('openSavedReport'))
    router
      .get('reports/:id/export', [controllers.Reports, 'export'])
      .as('reports.export')
      .use(middleware.can('alarmReport'))

    router
      .group(() => {
        router.get('accounts', [controllers.Accounts, 'index']).as('accounts.index')
        router.post('accounts', [controllers.Accounts, 'store']).as('accounts.store')
        router.post('accounts/:id/role', [controllers.Accounts, 'updateRole']).as('accounts.role')
        router
          .post('accounts/:id/deactivate', [controllers.Accounts, 'deactivate'])
          .as('accounts.deactivate')
      })
      .use(middleware.can('manageAccounts'))
  })
  .use([middleware.auth(), middleware.actor()])
