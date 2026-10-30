import app from '@adonisjs/core/services/app'
import edge from 'edge.js'
import { addCollection, edgeIconify } from 'edge-iconify'
import { formatTime, labelClass, roleName, severityLabel } from '#modules/dashboard/presentation'
import lucideIcons from '@iconify-json/lucide/icons.json' with { type: 'json' }
import { DEMO_CONTROL_PORT } from '#simulator/demo_data'

edge.use(edgeIconify)
addCollection(lucideIcons)

/**
 * Wording helpers of the Operator Dashboard (app/modules/dashboard/presentation.ts).
 */
edge.global('roleName', roleName)
edge.global('labelClass', labelClass)
edge.global('severityLabel', severityLabel)
edge.global('formatTime', formatTime)

/**
 * Control server of `node ace adc:demo`, polled by the demo banner (partials/demo_banner).
 * Development only: the banner is not even rendered otherwise.
 */
edge.global('demoControlUrl', app.inDev ? `http://localhost:${DEMO_CONTROL_PORT}` : null)
