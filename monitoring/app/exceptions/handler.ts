import app from '@adonisjs/core/services/app'
import AdcCommunicationService from '#modules/adc_communication/adc_communication_service'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected renderStatusPages = app.inProduction

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (error, { view }) => {
      return view.render('pages/errors/not_found', { error })
    },
    '500..599': (error, { view }) => {
      return view.render('pages/errors/server_error', { error })
    },
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    /**
     * A body that is not JSON is refused by the body parser before reaching the ADC routes;
     * the ADC still gets an answer in the format of the interface contract.
     */
    if (ctx.request.url().startsWith('/api/') && isUnreadableBody(error)) {
      const adcCommunication = await app.container.make(AdcCommunicationService)
      const answer = adcCommunication.answerUnreadableBody()
      return ctx.response.status(answer.httpStatus).json(answer.body)
    }
    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}

function isUnreadableBody(error: unknown) {
  const status = (error as { status?: number }).status
  return status === 400 || status === 422
}
