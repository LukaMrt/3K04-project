import transmit from '@adonisjs/transmit/services/main'
import type { HttpContext } from '@adonisjs/core/http'

export default class SystemController {
  /**
   * Broadcasts a test event on the "system/echo" channel, so the home page
   * can check the server → browser live channel (SSE) end to end.
   */
  async echo({ response }: HttpContext) {
    transmit.broadcast('system/echo', { sentAt: new Date().toISOString() })
    return response.noContent()
  }
}
