/**
 * Cabinet Health Monitor — module interface.
 *
 * Responsibility: maintain the state of each ADC (online, offline, stale...)
 * from heartbeat reception times and reported status.
 *
 * Secret (anticipated change): the ADC state machine and the timeouts used to
 * declare a cabinet offline.
 */
export default class CabinetHealthService {}
