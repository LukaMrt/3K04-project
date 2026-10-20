import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { InventorySnapshotSchema } from '#database/schema'
import InventoryLineModel from '#modules/inventory/models/inventory_line'

/** Internal to the Inventory Supervisor: the latest inventory of one ADC and its date. */
export default class InventorySnapshotModel extends InventorySnapshotSchema {
  static table = 'inventory_snapshots'
  static selfAssignPrimaryKey = true

  @hasMany(() => InventoryLineModel, { foreignKey: 'adcId', localKey: 'adcId' })
  declare lines: HasMany<typeof InventoryLineModel>
}
