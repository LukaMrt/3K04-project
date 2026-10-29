import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { FakeAdc } from '#simulator/fake_adc'
import { inventoryFor, loadAdcIds, saveAdcIds } from '#simulator/demo_data'

/** Seconds of silence after which an ADC is offline (state machine 1), plus the 1 s check. */
const OFFLINE_AFTER_S = 76

interface Step {
  title: string
  /** Done when the step starts, before its notes are shown. */
  run?: () => Promise<void>
  /** What to show and say during the step. */
  notes: string[]
}

/**
 * Scripted lab demonstration: plays two ADCs like `adc:simulate --count=2`, and does each
 * step of the scenario when Enter is pressed. What happens in the browser stays manual.
 *
 *   node ace adc:demo
 */
export default class AdcDemo extends BaseCommand {
  static commandName = 'adc:demo'
  static description = 'Run the lab demonstration step by step (Enter for the next step)'

  static options: CommandOptions = {
    staysAlive: true,
  }

  @flags.string({ description: 'Monitoring System base URL', default: 'http://localhost:3333' })
  declare url: string

  @flags.number({ description: 'Heartbeat period in seconds (contract: 30)', default: 30 })
  declare interval: number

  private adcs: FakeAdc[] = []
  private paused = new Set<FakeAdc>()
  private pausedAt = 0
  private timer?: NodeJS.Timeout

  async run() {
    if (!(await this.startAdcs())) return this.quit()

    const [first, second] = this.adcs
    const steps: Step[] = [
      {
        title: 'Sign in',
        run: () => this.open(`${this.url}/login`),
        notes: ['Sign in as the pharmacist (one-click fill on the login page).'],
      },
      {
        title: 'Communication loss starts now',
        run: async () => {
          this.paused.add(second)
          this.pausedAt = Date.now()
        },
        notes: [
          `${second.label} stops its heartbeats: UNREACHABLE after 45 s, OFFLINE after 75 s.`,
          'We come back to it at step 5, on the real clock.',
        ],
      },
      {
        title: 'Dashboard and low stock',
        notes: [
          `Both ADCs on the dashboard. ${first.label}: Morphine at 4 boxes → low stock (< 10).`,
          `Alternative source proposed: ${second.label}, same floor.`,
        ],
      },
      {
        title: 'Key scenario: receive alarm → display',
        run: async () => {
          await first.raiseAlarm('temperature_out_of_range', 'critical', 'Fridge at 12 °C')
        },
        notes: [
          `Critical alarm raised by ${first.label}: shown live (SSE) within 2 s (NFR-PRF-01).`,
          'Acknowledge it from the dashboard.',
        ],
      },
      {
        title: 'Off-normal: communication loss',
        run: () => this.waitUntilOffline(),
        notes: [
          `${second.label} is OFFLINE, with its communication loss alarm.`,
          'Its stock is stale: it is no longer proposed as a source for Morphine (D-23).',
        ],
      },
      {
        title: 'Module boundaries in the code',
        run: async () => {
          await this.edit('app/modules/inventory/inventory_service.ts')
          await this.edit('app/modules/users/users_service.ts')
        },
        notes: [
          'inventory_service.ts: its secret is the low-stock threshold and the choice of sources.',
          'users_service.ts: the only copy of the role matrix (D-31).',
        ],
      },
      {
        title: 'Roles',
        notes: [
          'Sign out, sign in as risk management: no acknowledgement of alarms,',
          'refused on the server before any module is called.',
        ],
      },
      {
        title: 'If time is left: live change',
        notes: ['Set LOW_STOCK_BELOW to 5 in inventory_service.ts, reload the dashboard.'],
      },
    ]

    const input = createInterface({ input: process.stdin, output: process.stdout })
    for (const [index, step] of steps.entries()) {
      await input.question(this.colors.dim(`\n[Enter] ${index + 1}/${steps.length} ${step.title}`))
      this.logger.info(this.colors.bold(`${index + 1}. ${step.title}`))
      await step.run?.()
      for (const note of step.notes) this.logger.log(`   ${note}`)
    }
    await input.question(this.colors.dim('\n[Enter] End: resume the heartbeats and quit'))
    input.close()
    this.paused.clear()
    await second.sendHeartbeat()
    await this.quit()
  }

  /** Registers the two demo ADCs with their initial stock, as `adc:simulate --count=2` does. */
  private async startAdcs() {
    const ids = await loadAdcIds(this.idsFile)
    for (let i = 0; i < 2; i++) {
      const label = `ADC Demo ${i + 1}`
      ids[label] ??= randomUUID()
      const adc = new FakeAdc({
        adcId: ids[label],
        label,
        floor: 2,
        description: 'Simulated ADC, floor 2',
        monitoringUrl: this.url,
        inventory: inventoryFor(i),
      })
      await adc.start()
      this.adcs.push(adc)
      const { httpStatus } = await adc.register()
      if (httpStatus === null) {
        this.logger.error(`No Monitoring System at ${this.url}: start it with npm run dev`)
        return false
      }
      await adc.sendHeartbeat()
    }
    await saveAdcIds(this.idsFile, ids)

    this.timer = setInterval(() => {
      for (const adc of this.adcs) if (!this.paused.has(adc)) adc.sendHeartbeat()
    }, this.interval * 1000)
    this.logger.success(`${this.adcs.map((adc) => adc.label).join(' and ')} registered`)
    return true
  }

  /** Waits, with a countdown, until the paused ADC must have gone offline. */
  private async waitUntilOffline() {
    let left = OFFLINE_AFTER_S - Math.floor((Date.now() - this.pausedAt) / 1000)
    while (left > 0) {
      process.stdout.write(`\r   Offline in ${left} s `)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      left--
    }
    process.stdout.write('\r')
  }

  private open(url: string) {
    return new Promise<void>((resolve) => execFile('open', [url], () => resolve()))
  }

  /** Opens a file in IntelliJ IDEA when its launcher is installed, else prints its path. */
  private edit(path: string) {
    return new Promise<void>((resolve) =>
      execFile('idea', [this.app.makePath(path)], (error) => {
        if (error) this.logger.log(`   Open ${path}`)
        resolve()
      })
    )
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
