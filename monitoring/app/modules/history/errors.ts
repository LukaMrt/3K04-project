import { Exception } from '@adonisjs/core/exceptions'

/** The record an operation refers to is not stored. */
export class UnknownRecordError extends Exception {
  static status = 404
  static code = 'E_UNKNOWN_RECORD'
}
