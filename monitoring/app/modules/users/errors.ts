import { Exception } from '@adonisjs/core/exceptions'

export class UnknownUserError extends Exception {
  static status = 404
  static code = 'E_UNKNOWN_USER'
}

export class EmailAlreadyUsedError extends Exception {
  static status = 409
  static code = 'E_EMAIL_ALREADY_USED'
}
