import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import type { AdcRef } from '#modules/cabinet_health/types'
import InventoryService from '#modules/inventory/inventory_service'
import type { AdcId } from '#modules/shared/types'

const WEST = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const EAST = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const NORTH = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e'
const MORPHINE = '8c1d5e2a-4f3b-4a9e-b7d6-1e2f3a4b5c6d'
const INSULIN = 'b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b'

function line(medicationId: string, quantityInBoxes: number) {
  const medicationName = medicationId === MORPHINE ? 'Morphine 10 mg/mL' : 'Insulin glargine'
  return { medicationId, medicationName, quantityInBoxes }
}

/**
 * Stands in for the Cabinet Health Monitor (#39): answers reachableOnSameFloor from a
 * fixed table, as if the 45 s rule (D-23) had already been applied.
 */
class FakeCabinetHealth extends CabinetHealthService {
  reachable: Record<AdcId, AdcRef[]> = {}

  async reachableOnSameFloor(adcId: AdcId): Promise<AdcRef[]> {
    return this.reachable[adcId] ?? []
  }
}

async function setup(reachable: Record<AdcId, AdcRef[]> = {}) {
  const fake = new FakeCabinetHealth(null as any, null as any, null as any)
  fake.reachable = reachable
  app.container.swap(CabinetHealthService, () => fake)
  return app.container.make(InventoryService)
}

test.group('InventoryService / latest inventory (FR-INV-01, NFR-REL-03)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => app.container.restore(CabinetHealthService))

  test('has no inventory before the first heartbeat', async ({ assert }) => {
    const inventory = await setup()

    assert.isNull(await inventory.getInventory(WEST))
  })

  test('a new inventory replaces the previous one completely', async ({ assert }) => {
    const inventory = await setup()
    await inventory.replaceInventory(WEST, [line(MORPHINE, 14), line(INSULIN, 6)], new Date(1000))
    await inventory.replaceInventory(WEST, [line(INSULIN, 5)], new Date(2000))

    assert.deepEqual(await inventory.getInventory(WEST), {
      adcId: WEST,
      heartbeatAt: new Date(2000),
      lines: [{ ...line(INSULIN, 5), lowStock: true }],
    })
  })

  test('an empty inventory is kept as empty, not as missing', async ({ assert }) => {
    const inventory = await setup()
    await inventory.replaceInventory(WEST, [line(MORPHINE, 14)], new Date(1000))
    await inventory.replaceInventory(WEST, [], new Date(2000))

    assert.deepEqual(await inventory.getInventory(WEST), {
      adcId: WEST,
      heartbeatAt: new Date(2000),
      lines: [],
    })
  })
})

test.group('InventoryService / low stock (SPEC-INV-01)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => app.container.restore(CabinetHealthService))

  test('flags a medication below 10 boxes, not at 10', async ({ assert }) => {
    const inventory = await setup()
    await inventory.replaceInventory(WEST, [line(MORPHINE, 10), line(INSULIN, 9)], new Date())

    const flags = (await inventory.getInventory(WEST))!.lines.map((l) => [
      l.medicationId,
      l.lowStock,
    ])
    assert.deepEqual(flags, [
      [INSULIN, true],
      [MORPHINE, false],
    ])
    assert.deepEqual(await inventory.listLowStock(), [{ adcId: WEST, ...line(INSULIN, 9) }])
  })

  test('proposes the reachable same-floor ADCs holding more than 10 boxes', async ({ assert }) => {
    const east = { adcId: EAST, label: 'ADC East 210' }
    const north = { adcId: NORTH, label: 'ADC North 201' }
    const inventory = await setup({ [WEST]: [east, north] })
    await inventory.replaceInventory(WEST, [line(MORPHINE, 2)], new Date())
    await inventory.replaceInventory(EAST, [line(MORPHINE, 11)], new Date())
    await inventory.replaceInventory(NORTH, [line(MORPHINE, 10)], new Date())

    assert.deepEqual(await inventory.findSources(WEST, MORPHINE), { kind: 'sources', adcs: [east] })
  })

  test('answers no stock available when no ADC qualifies', async ({ assert }) => {
    const inventory = await setup({ [WEST]: [] })
    await inventory.replaceInventory(WEST, [line(MORPHINE, 2)], new Date())
    // Plenty of stock, but not reachable on the same floor (D-23): not proposed.
    await inventory.replaceInventory(EAST, [line(MORPHINE, 50)], new Date())

    assert.deepEqual(await inventory.findSources(WEST, MORPHINE), { kind: 'noStockAvailable' })
  })
})

test.group('InventoryService / aggregated quantity (FR-INV-06)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => app.container.restore(CabinetHealthService))

  test('sums the latest quantities over every ADC', async ({ assert }) => {
    const inventory = await setup()
    await inventory.replaceInventory(WEST, [line(MORPHINE, 14), line(INSULIN, 6)], new Date())
    await inventory.replaceInventory(EAST, [line(MORPHINE, 3)], new Date())

    assert.equal(await inventory.aggregatedQuantity(MORPHINE), 17)
    assert.equal(await inventory.aggregatedQuantity('00000000-0000-4000-8000-000000000000'), 0)
  })
})
