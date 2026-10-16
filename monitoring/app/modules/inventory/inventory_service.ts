import { inject } from '@adonisjs/core'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import { notImplemented } from '#modules/shared/errors'
import type { AdcId, MedicationId } from '#modules/shared/types'
import type {
  AdcInventory,
  InventoryLine,
  LowStockFlag,
  StockSources,
} from '#modules/inventory/types'

/**
 * Inventory Supervisor — module interface.
 *
 * Responsibility: keep the latest inventory of each ADC (FR-INV-01) and flag low stock.
 *
 * Secret (anticipated change): low-stock thresholds and how alternative sources
 * (e.g. same-floor cabinets) are computed.
 */
@inject()
export default class InventoryService {
  constructor(protected cabinetHealth: CabinetHealthService) {}

  /**
   * Pre: the ADC is registered; at most one line per medication (NAT-02).
   * Effects: the inventory of `adcId` becomes exactly `items`, dated `at` (NFR-REL-03).
   * Throws: StorageUnavailableError.
   */
  async replaceInventory(adcId: AdcId, items: InventoryLine[], at: Date): Promise<void> {
    return notImplemented('InventoryService.replaceInventory', adcId, items, at)
  }

  /** Latest inventory with low-stock flags (FR-INV-02); null before the first heartbeat. */
  async getInventory(adcId: AdcId): Promise<AdcInventory | null> {
    return notImplemented('InventoryService.getInventory', adcId)
  }

  /** Every medication flagged low stock, in every ADC (NFR-USA-01). */
  async listLowStock(): Promise<LowStockFlag[]> {
    return notImplemented('InventoryService.listLowStock')
  }

  /**
   * Pre: `medicationId` is flagged low stock in `adcId`.
   * Same-floor sources of the medication (SPEC-INV-01, D-05, D-23).
   * Throws: UnknownAdcError.
   */
  async findSources(adcId: AdcId, medicationId: MedicationId): Promise<StockSources> {
    return notImplemented('InventoryService.findSources', adcId, medicationId)
  }

  /** Sum of the quantities of `medicationId` over all registered ADCs (FR-INV-06). */
  async aggregatedQuantity(medicationId: MedicationId): Promise<number> {
    return notImplemented('InventoryService.aggregatedQuantity', medicationId)
  }
}
