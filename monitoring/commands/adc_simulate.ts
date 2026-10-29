import { randomUUID } from 'node:crypto'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { FakeAdc, type AdcState, type ReplyMode } from '#simulator/fake_adc'
import { describe, inventoryFor, loadAdcIds, saveAdcIds } from '#simulator/demo_data'

const NURSE = { staffMemberId: 'e9d8c7b6-a5f4-4e3d-8c2b-1a0f9e8d7c6b', name: 'Jane Doe, RN' }
const ALARM_TYPES = [
  'temperature_out_of_range',
  'unauthorized_access',
  'door_left_open',
  'dispensing_failure',
  'power_failure',
  'hardware_fault',
  'other',
]

/**
 * Fake ADC units used to demo and test the Monitoring System without the Part A software.
 * They play the ADC side of the ADC ↔ Monitoring interface (see simulator/fake_adc.ts).
 *
 *   node ace adc:simulate --label="ADC West" --count=2 --floor=2
 */
export default class AdcSimulate extends BaseCommand {
  static commandName = 'adc:simulate'
  static description = 'Simulate ADC units talking to the Monitoring System'

  static options: CommandOptions = {
    staysAlive: true,
  }

  @flags.string({
    description: 'Label of the ADC (numbered when --count > 1)',
    default: 'ADC Demo',
  })
  declare label: string

  @flags.number({ description: 'Number of ADCs to simulate', default: 1 })
  declare count: number

  @flags.number({ description: 'Floor of the simulated ADCs', default: 2 })
  declare floor: number

  @flags.number({ description: 'Heartbeat period in seconds (contract: 30)', default: 30 })
  declare interval: number

  @flags.string({ description: 'Monitoring System base URL', default: 'http://localhost:3333' })
  declare url: string

  private adcs: FakeAdc[] = []
  private paused = new Set<FakeAdc>()
  private timer?: NodeJS.Timeout

  async run() {
    const ids = await loadAdcIds(this.idsFile)
    for (let i = 0; i < this.count; i++) {
      const label = this.count > 1 ? `${this.label} ${i + 1}` : this.label
      ids[label] ??= randomUUID()
      const adc = new FakeAdc({
        adcId: ids[label],
        label,
        floor: this.floor,
        description: `Simulated ADC, floor ${this.floor}`,
        monitoringUrl: this.url,
        inventory: inventoryFor(i),
        log: (message) => this.logger.info(message),
      })
      await adc.start()
      await adc.register()
      await adc.sendHeartbeat()
      this.adcs.push(adc)
    }
    await saveAdcIds(this.idsFile, ids)

    this.timer = setInterval(() => {
      for (const adc of this.adcs) if (!this.paused.has(adc)) adc.sendHeartbeat()
    }, this.interval * 1000)

    await this.menu()
  }

  private async menu() {
    while (true) {
      const action = await this.prompt.choice('Action', [
        { name: 'alarm', message: 'Raise an alarm' },
        { name: 'dispense', message: 'Dispense one box' },
        { name: 'refill', message: 'Refill a medication' },
        { name: 'state', message: 'Change the state (online / maintenance / fault)' },
        { name: 'pause', message: 'Stop / resume heartbeats (communication loss)' },
        { name: 'reply', message: 'Change how commands are answered' },
        { name: 'status', message: 'Show status' },
        { name: 'quit', message: 'Quit' },
      ])
      if (action === 'quit') return this.quit()

      const adc = await this.pickAdc()
      if (action === 'alarm') {
        const type = await this.prompt.choice('Alarm type', ALARM_TYPES)
        const severity = await this.prompt.choice('Severity', [
          'info',
          'warning',
          'error',
          'critical',
        ])
        const description = await this.prompt.ask('Description (optional)', { default: '' })
        await adc.raiseAlarm(type, severity, description || null)
      } else if (action === 'dispense') {
        const medicationId = await this.prompt.choice(
          'Medication',
          adc.inventory.map((e) => ({ name: e.medicationId, message: describe(e) }))
        )
        const done = adc.dispense(medicationId, randomUUID(), NURSE.staffMemberId, NURSE.name)
        this.logger.info(done ? 'Dispensed; sent with the next heartbeat' : 'Out of stock')
      } else if (action === 'refill') {
        const medicationId = await this.prompt.choice(
          'Medication',
          adc.inventory.map((e) => ({ name: e.medicationId, message: describe(e) }))
        )
        const boxes = await this.prompt.ask('Boxes to add', {
          default: '10',
          validate: (value) => /^[1-9]\d*$/.test(value) || 'A whole number of boxes, at least 1',
        })
        await adc.refill(medicationId, Number(boxes))
      } else if (action === 'state') {
        await adc.setState(
          await this.prompt.choice('State', ['online', 'maintenance', 'fault'] as AdcState[])
        )
      } else if (action === 'pause') {
        this.togglePause(adc)
      } else if (action === 'reply') {
        adc.replyMode = await this.prompt.choice('Answer commands with', [
          { name: 'apply', message: 'applied (normal)' },
          { name: 'error', message: '500 error' },
          { name: 'wrongId', message: 'a wrong identifier' },
          { name: 'silent', message: 'no answer (timeout)' },
        ] as Array<{ name: ReplyMode; message: string }>)
      } else {
        this.showStatus(adc)
      }
    }
  }

  private async pickAdc() {
    if (this.adcs.length === 1) return this.adcs[0]
    const label = await this.prompt.choice(
      'ADC',
      this.adcs.map((adc) => adc.label)
    )
    return this.adcs.find((adc) => adc.label === label)!
  }

  private togglePause(adc: FakeAdc) {
    if (this.paused.delete(adc)) {
      this.logger.info(`${adc.label}: heartbeats resumed`)
      adc.sendHeartbeat()
    } else {
      this.paused.add(adc)
      this.logger.info(
        `${adc.label}: heartbeats stopped (unreachable after 45 s, offline after 75 s)`
      )
    }
  }

  private showStatus(adc: FakeAdc) {
    this.logger.info(
      `${adc.label} (${adc.adcId}) at ${adc.contactAddress}: ${adc.state}, ` +
        `${this.paused.has(adc) ? 'heartbeats stopped' : 'heartbeats running'}, ` +
        `${adc.pending.length} pending transaction(s), commands answered: ${adc.replyMode}`
    )
    for (const entry of adc.inventory) this.logger.info(`  ${describe(entry)}`)
  }

  private async quit() {
    clearInterval(this.timer)
    await Promise.all(this.adcs.map((adc) => adc.stop()))
    await this.terminate()
  }

  private get idsFile() {
    return this.app.tmpPath('simulated_adcs.json')
  }
}
