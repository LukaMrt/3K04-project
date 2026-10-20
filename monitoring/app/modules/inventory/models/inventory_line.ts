import { InventoryLineSchema } from '#database/schema'

/** Internal to the Inventory Supervisor: one medication of the latest inventory of an ADC. */
export default class InventoryLineModel extends InventoryLineSchema {
  static table = 'inventory_lines'
}
