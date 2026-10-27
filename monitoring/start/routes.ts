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
    router.on('/dashboard').render('pages/dashboard').as('dashboard')

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
