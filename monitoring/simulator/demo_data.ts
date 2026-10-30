import { readFile, writeFile } from 'node:fs/promises'
import type { InventoryEntry } from '#simulator/fake_adc'

/**
 * Data shared by the `adc:simulate` and `adc:demo` commands, so that both play the same
 * ADCs with the same stock.
 */

/** Medications shared by every simulated ADC, so that same-floor sources can be shown. */
const MEDICATIONS = [
  { medicationId: '8c1d5e2a-4f3b-4a9e-b7d6-1e2f3a4b5c6d', medicationName: 'Morphine 10 mg/mL' },
  { medicationId: 'b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', medicationName: 'Insulin glargine' },
  { medicationId: '4d5e6f70-8192-4a3b-9c4d-5e6f7a8b9c0d', medicationName: 'Paracetamol 500 mg' },
]
/** Quantities of the first ADCs: low morphine in the first one, enough in the second. */
const QUANTITIES = [
  [4, 12, 30],
  [20, 6, 25],
]

export function inventoryFor(index: number): InventoryEntry[] {
  const quantities = QUANTITIES[index] ?? [15, 15, 15]
  return MEDICATIONS.map((m, i) => ({ ...m, quantityInBoxes: quantities[i] }))
}

export function describe(entry: InventoryEntry) {
  return `${entry.medicationName}: ${entry.quantityInBoxes} box(es)`
}

/** Each label keeps its identifier across runs, like a real ADC (contract §2). */
export async function loadAdcIds(file: string): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return {}
  }
}

export async function saveAdcIds(file: string, ids: Record<string, string>) {
  await writeFile(file, JSON.stringify(ids, null, 2))
}

/** Port of the control server of `adc:demo`, polled by the demo banner of the application. */
export const DEMO_CONTROL_PORT = 3334
