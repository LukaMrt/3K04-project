import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import { StorageUnavailableError } from '#modules/shared/errors'
import type { AdcId, MedicationId, Unsubscribe } from '#modules/shared/types'
import type {
  AdcInventory,
  InventoryLine,
  LowStockChangedEvent,
  LowStockFlag,
  StockSources,
} from '#modules/inventory/types'
import InventoryLineModel from '#modules/inventory/models/inventory_line'
import InventorySnapshotModel from '#modules/inventory/models/inventory_snapshot'

/** A medication is low in stock below this quantity (SPEC-INV-01, A-10). */
const LOW_STOCK_BELOW = 10
/** An ADC is a source of a medication above this quantity (SPEC-INV-01, D-05). */
const SOURCE_ABOVE = 10

/**
 * Inventory Supervisor — module interface.
 *
 * Responsibility: keep the latest inventory of each ADC (FR-INV-01), flag low stock, and
 * announce the changes of low stock to subscribers (the Operator Dashboard, D3-D-05).
 *
 * Secret (anticipated change): low-stock thresholds and how alternative sources
 * (e.g. same-floor cabinets) are computed.
 *
 * Every operation throws StorageUnavailableError when the storage cannot be used.
 */
@inject()
export default class InventoryService {
  private listeners = new Set<(event: LowStockChangedEvent) => void>()

  constructor(protected cabinetHealth: CabinetHealthService) {}

  /**
   * Pre: the ADC is registered; at most one line per medication (NAT-02).
   * Effects: the inventory of `adcId` becomes exactly `items`, dated `at` (NFR-REL-03);
   * then, if its low-stock medications or their quantities changed, a LowStockChangedEvent
   * is announced (D3-D-05).
   * Throws: StorageUnavailableError.
   */
  async replaceInventory(adcId: AdcId, items: InventoryLine[], at: Date): Promise<void> {
    const before = await this.lowStockOf(adcId)
    await this.store(() =>
      db.transaction(async (client) => {
        await InventoryLineModel.query({ client }).where('adc_id', adcId).delete()
        await InventorySnapshotModel.updateOrCreate(
          { adcId },
          { heartbeatAt: DateTime.fromJSDate(at) },
          { client }
        )
        await InventoryLineModel.createMany(
          items.map((item) => ({ adcId, ...item })),
          { client }
        )
      })
    )
    const after = await this.lowStockOf(adcId)
    if (JSON.stringify(after) !== JSON.stringify(before)) this.announce({ adcId, lowStock: after })
  }

  /** `listener` is called for every later change of the low stock of an ADC. */
  subscribe(listener: (event: LowStockChangedEvent) => void): Unsubscribe {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Latest inventory with low-stock flags (FR-INV-02); null before the first heartbeat. */
  async getInventory(adcId: AdcId): Promise<AdcInventory | null> {
    return this.store(async () => {
      const snapshot = await InventorySnapshotModel.query()
        .where('adc_id', adcId)
        .preload('lines', (lines) => lines.orderBy('medication_name'))
        .first()
      if (!snapshot) return null

      return {
        adcId,
        heartbeatAt: snapshot.heartbeatAt.toJSDate(),
        lines: snapshot.lines.map((line) => ({
          medicationId: line.medicationId,
          medicationName: line.medicationName,
          quantityInBoxes: line.quantityInBoxes,
          lowStock: line.quantityInBoxes < LOW_STOCK_BELOW,
        })),
      }
    })
  }

  /**
   * Every medication flagged low stock, in every ADC (NFR-USA-01). A medication absent
   * from an inventory is not flagged (D-24).
   */
  async listLowStock(): Promise<LowStockFlag[]> {
    return this.lowStockOf()
  }

  /** Medications flagged low stock in `adcId`, or in every ADC, sorted by ADC then name. */
  private async lowStockOf(adcId?: AdcId): Promise<LowStockFlag[]> {
    return this.store(async () => {
      const query = InventoryLineModel.query().where('quantity_in_boxes', '<', LOW_STOCK_BELOW)
      if (adcId) query.where('adc_id', adcId)
      const lines = await query.orderBy('adc_id').orderBy('medication_name')
      return lines.map((line) => ({
        adcId: line.adcId,
        medicationId: line.medicationId,
        medicationName: line.medicationName,
        quantityInBoxes: line.quantityInBoxes,
      }))
    })
  }

  /**
   * Pre: `medicationId` is flagged low stock in `adcId`.
   * Same-floor sources of the medication (SPEC-INV-01, D-05, D-23): the other ADCs of the
   * floor that are reachable and hold more than 10 boxes of it.
   * Throws: UnknownAdcError.
   */
  async findSources(adcId: AdcId, medicationId: MedicationId): Promise<StockSources> {
    const candidates = await this.cabinetHealth.reachableOnSameFloor(adcId)
    if (candidates.length === 0) return { kind: 'noStockAvailable' }

    return this.store(async () => {
      const holders = await InventoryLineModel.query()
        .where('medication_id', medicationId)
        .where('quantity_in_boxes', '>', SOURCE_ABOVE)
        .whereIn(
          'adc_id',
          candidates.map((candidate) => candidate.adcId)
        )
      const holderIds = new Set(holders.map((line) => line.adcId))
      const adcs = candidates.filter((candidate) => holderIds.has(candidate.adcId))
      return adcs.length > 0 ? { kind: 'sources', adcs } : { kind: 'noStockAvailable' }
    })
  }

  /** Sum of the quantities of `medicationId` over all registered ADCs (FR-INV-06). */
  async aggregatedQuantity(medicationId: MedicationId): Promise<number> {
    return this.store(async () => {
      const lines = await InventoryLineModel.query().where('medication_id', medicationId)
      return lines.reduce((sum, line) => sum + line.quantityInBoxes, 0)
    })
  }

  /**
   * Runs a storage operation: module exceptions go through, any other failure becomes
   * StorageUnavailableError.
   */
  private async store<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof Exception) throw error
      throw new StorageUnavailableError('The inventory storage cannot be used', { cause: error })
    }
  }

  /**
   * Calls every listener once the change is stored (D-27). A failing listener is logged
   * and does not stop the others nor undo the change (D-36).
   */
  private announce(event: LowStockChangedEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        logger.error({ err: error, adcId: event.adcId }, 'Low stock listener failed')
      }
    }
  }
}
