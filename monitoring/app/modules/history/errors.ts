import { Exception } from '@adonisjs/core/exceptions'

/** The record an operation refers to is not stored. */
export class UnknownRecordError extends Exception {
  static status = 404
  static code = 'E_UNKNOWN_RECORD'
}

/**
 * recordAcknowledgement was called for an alarm that already has one. The Alarm Manager
 * checks this first; the exception only reveals two acknowledgements racing each other,
 * and the caller treats it as "nothing to do".
 */
export class AlarmAlreadyAcknowledgedError extends Exception {
  static status = 409
  static code = 'E_ALARM_ALREADY_ACKNOWLEDGED'
}
