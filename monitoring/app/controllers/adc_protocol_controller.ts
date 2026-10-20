import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AdcCommunicationService from '#modules/adc_communication/adc_communication_service'

/**
 * HTTP side of the ADC Communication Manager: passes the raw body of each ADC request to
 * the module and writes its answer back as is. All protocol rules live in the module.
 */
@inject()
export default class AdcProtocolController {
  constructor(protected adcCommunication: AdcCommunicationService) {}

  async register({ request, response }: HttpContext) {
    const answer = await this.adcCommunication.receiveRegistration(request.body())
    return response.status(answer.httpStatus).json(answer.body)
  }

  async heartbeat({ request, response }: HttpContext) {
    const answer = await this.adcCommunication.receiveHeartbeat(request.body())
    return response.status(answer.httpStatus).json(answer.body)
  }
}
