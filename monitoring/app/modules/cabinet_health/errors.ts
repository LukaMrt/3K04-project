import { Exception } from '@adonisjs/core/exceptions'

export class UnknownAdcError extends Exception {
  static status = 404
  static code = 'E_UNKNOWN_ADC'
}
