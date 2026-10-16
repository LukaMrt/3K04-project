import type { AdcId } from '#modules/shared/types'

/** Labels of D-16 (with PENDING, D-21). */
export type DisplayedStatus =
  'ONLINE' | 'MAINTENANCE' | 'FAULT' | 'UNREACHABLE' | 'OFFLINE' | 'PENDING'

/** What an ADC declares about itself at registration, without its contact address (D-32). */
export interface AdcIdentity {
  adcId: AdcId
  label: string
  floor: number
  description: string
}

export interface RegistrationResult {
  firstRegistration: boolean
}

/** SPEC-HLT-01. */
export interface AdcStatus {
  adcId: AdcId
  displayedStatus: DisplayedStatus
  stale: boolean
  lastContact: Date
}

export interface AdcSummary extends AdcStatus {
  label: string
  floor: number
  description: string
}

export interface AdcListFilter {
  status?: DisplayedStatus
}

export interface AdcRef {
  adcId: AdcId
  label: string
}

/** Announced after every change of the displayed status of an ADC (D-22, D-27). */
export interface StatusChangedEvent {
  status: AdcStatus
  previous: DisplayedStatus | null
}
