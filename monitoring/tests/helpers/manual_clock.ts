import ClockService from '#modules/clock/clock_service'

/** Clock moved by hand, swapped for the real one in tests (D-29). */
export class ManualClock extends ClockService {
  constructor(private current: Date) {
    super()
  }

  now(): Date {
    return new Date(this.current)
  }

  set(at: Date) {
    this.current = at
  }
}
