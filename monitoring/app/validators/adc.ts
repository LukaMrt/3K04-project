import vine from '@vinejs/vine'

/** FR-COM-04: maintenance mode on or off. */
export const maintenanceValidator = vine.create({
  enabled: vine.boolean(),
})

/**
 * FR-COM-05, interface §4.2: only the settings given change. An empty field arrives as null
 * (convertEmptyStringsToNull) and means "unchanged".
 */
export const configurationValidator = vine.create({
  timeServer: vine
    .string()
    .trim()
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i)
    .nullable()
    .optional(),
  screenLockTimeoutSeconds: vine.number().withoutDecimals().range([15, 600]).nullable().optional(),
})
