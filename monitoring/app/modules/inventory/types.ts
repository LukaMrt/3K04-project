import type { AdcId, MedicationId } from '#modules/shared/types'
import type { AdcRef } from '#modules/cabinet_health/types'

export interface InventoryLine {
  medicationId: MedicationId
  medicationName: string
  quantityInBoxes: number
}

export interface AdcInventory {
  adcId: AdcId
  /** Time of the heartbeat this inventory comes from (FR-INV-02). */
  heartbeatAt: Date
  lines: Array<InventoryLine & { lowStock: boolean }>
}

export interface LowStockFlag {
  adcId: AdcId
  medicationId: MedicationId
  medicationName: string
  quantityInBoxes: number
}

/** SPEC-INV-01. */
export type StockSources = { kind: 'sources'; adcs: AdcRef[] } | { kind: 'noStockAvailable' }
