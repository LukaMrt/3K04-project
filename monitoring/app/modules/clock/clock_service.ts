/**
 * Clock — module interface.
 *
 * Responsibility: give the current time to every module (D-29).
 *
 * Secret (anticipated change): where the time comes from. Tests and demonstrations
 * replace this class with `app.container.swap(ClockService, ...)` to move time forward by hand.
 */
export default class ClockService {
  /**
   * Current time. Two successive calls never go backwards (NAT-07).
   */
  now(): Date {
    return new Date()
  }
}
