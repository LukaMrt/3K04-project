import env from '#start/env'

/**
 * Times are stored in UTC and shown, or cut into days, in the time zone of the hospital
 * (D-43). Shared vocabulary: a setting, with no behaviour of its own.
 */
export const HOSPITAL_TIME_ZONE = env.get('DISPLAY_TIME_ZONE') ?? 'America/Toronto'
