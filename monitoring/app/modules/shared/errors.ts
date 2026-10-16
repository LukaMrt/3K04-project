import { Exception } from '@adonisjs/core/exceptions'

/**
 * Exceptions shared by every module (D-30): they signal a violated pre-condition
 * or an internal failure, never a refusal foreseen by the specification.
 */

/** The storage behind a module cannot be read or written. */
export class StorageUnavailableError extends Exception {
  static status = 503
  static code = 'E_STORAGE_UNAVAILABLE'
}

/**
 * Placeholder body of an exported operation whose implementation is not written yet.
 * The arguments are passed only so that the documented parameters are used.
 */
export class NotImplementedError extends Exception {
  static status = 501
  static code = 'E_NOT_IMPLEMENTED'
}

export function notImplemented(operation: string, ..._args: unknown[]): never {
  throw new NotImplementedError(`${operation} is not implemented yet`)
}
