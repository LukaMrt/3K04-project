/** Answer to an ADC request, written back as is by the HTTP controller. */
export interface ProtocolResponse {
  httpStatus: number
  body: unknown
}

/** Commands the dashboard can send; protocol names stay inside this module. */
export type AdcCommand = { kind: 'setMaintenanceMode'; enabled: boolean }

/** Configuration settings (interface §4.2); only the listed ones change. */
export interface AdcSettings {
  timeServer?: string
  /** 15 to 600 seconds. */
  screenLockTimeoutSeconds?: number
}

/** SPEC-COM-04 and SPEC-COM-05. */
export type DeliveryOutcome =
  | { kind: 'delivered' }
  | { kind: 'failed'; code: string; message: string }
  | { kind: 'refusedOffline' }
