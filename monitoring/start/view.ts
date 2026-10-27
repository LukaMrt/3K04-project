import edge from 'edge.js'
import { addCollection, edgeIconify } from 'edge-iconify'
import { formatTime, labelClass, roleName, severityLabel } from '#modules/dashboard/presentation'
import lucideIcons from '@iconify-json/lucide/icons.json' with { type: 'json' }

edge.use(edgeIconify)
addCollection(lucideIcons)

/**
 * Wording helpers of the Operator Dashboard (app/modules/dashboard/presentation.ts).
 */
edge.global('roleName', roleName)
edge.global('labelClass', labelClass)
edge.global('severityLabel', severityLabel)
edge.global('formatTime', formatTime)
