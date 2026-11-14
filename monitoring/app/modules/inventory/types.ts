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

/**
 * Announced to subscribers when the medications flagged low stock in an ADC, or their
 * quantities, change; `lowStock` is the new list for that ADC (D3-D-05).
 */
export interface LowStockChangedEvent {
  adcId: AdcId
  lowStock: LowStockFlag[]
}

/** SPEC-INV-01. */
export type StockSources = { kind: 'sources'; adcs: AdcRef[] } | { kind: 'noStockAvailable' }
