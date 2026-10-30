import { execFile, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { createInterface, type Interface } from 'node:readline'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { FakeAdc } from '#simulator/fake_adc'
import { DEMO_CONTROL_PORT, inventoryFor, loadAdcIds, saveAdcIds } from '#simulator/demo_data'

/** Seconds of silence after which an ADC is offline (state machine 1), plus the 1 s check. */
const OFFLINE_AFTER_S = 76
/** Seconds to wait for the Monitoring System, e.g. while `npm run dev` restarts it. */
const SERVER_WAIT_S = 30
/** Time for the banner to open the dashboard before the alarm of step 4 is raised. */
const ALARM_DELAY_MS = 4000

interface Step {
  title: string
  /** Done when the step starts, before its notes are shown. */
  run?: () => Promise<void>
  /** Page the demo banner opens once the step is done. */
  visit?: string
  /** What to show and say during the step. */
  notes: string[]
}

/** What the demo banner of the application shows (resources/js/app.js, `demoBanner`). */
interface DemoState {
  done: number
  total: number
  /** Title of the last step done; null before the first one. */
  current: string | null
  next: string
  /** A step is running: Next is ignored until it is done. */
  busy: boolean
  /** Seconds left before the paused ADC is offline, during step 5. */
  countdown: number | null
  visit: string | null
}

/**
 * Scripted lab demonstration: empties the database and seeds the demo accounts, plays two
 * ADCs like `adc:simulate --count=2`, and does each step of the scenario when Enter is
 * pressed, or Next in the demo banner of the application (development only). What happens
 * in the browser otherwise stays manual.
 *
 *   node ace adc:demo            (node ace adc:demo --no-reset keeps the database)
 */
export default class AdcDemo extends BaseCommand {
  static commandName = 'adc:demo'
  static description = 'Run the lab demonstration step by step (Enter or Next in the app)'

  static options: CommandOptions = {
    staysAlive: true,
  }

  @flags.string({ description: 'Monitoring System base URL', default: 'http://localhost:3333' })
  declare url: string

  @flags.number({ description: 'Heartbeat period in seconds (contract: 30)', default: 30 })
  declare interval: number

  @flags.boolean({
    description: 'Empty the database and seed the demo accounts first',
    default: true,
    showNegatedVariantInHelp: true,
  })
  declare reset: boolean

  private adcs: FakeAdc[] = []
  private paused = new Set<FakeAdc>()
  private pausedAt = 0
  private timer?: NodeJS.Timeout
  private control?: Server
  private input?: Interface
  private state: DemoState = {
    done: 0,
    total: 0,
    current: null,
    next: '',
    busy: false,
    countdown: null,
    visit: null,
  }
  private wake?: () => void

  async run() {
    if (this.reset && !(await this.resetDatabase())) return this.quit()
    if (!(await this.startAdcs())) return this.quit()

    const [first, second] = this.adcs
    const steps: Step[] = [
      {
        title: 'Sign in',
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
        visit: `/adcs/${first.adcId}`,
        notes: [
          `Dashboard: both ADCs ONLINE, Morphine at 4 boxes in ${first.label} → low stock (< 10).`,
          `Page of ${first.label} (opened): same-floor source of Morphine = ${second.label}.`,
        ],
      },
      {
        title: 'Key scenario: receive alarm → display',
        // Raised once the banner has opened the dashboard, so that it arrives live.
        run: async () => {
          setTimeout(() => {
            void first.raiseAlarm('temperature_out_of_range', 'critical', 'Fridge at 12 °C')
          }, ALARM_DELAY_MS)
        },
        visit: '/dashboard',
        notes: [
          `In ${ALARM_DELAY_MS / 1000} s, critical alarm raised by ${first.label}: shown live (SSE)`,
          'within 2 s (NFR-PRF-01). Acknowledge it from the dashboard.',
        ],
      },
      {
        title: 'Off-normal: communication loss',
        run: () => this.waitUntilOffline(),
        visit: '/dashboard',
        notes: [
          `Dashboard: ${second.label} is OFFLINE, with its communication loss alarm.`,
          `Click the Morphine line: ${second.label} is no longer a source (D-23).`,
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

    await this.startControl(steps.length)
    this.input = createInterface({ input: process.stdin })
    this.input.on('line', () => this.advance())
    await this.open(`${this.url}/login`)

    for (const [index, step] of steps.entries()) {
      await this.nextStep(`${index + 1}/${steps.length} ${step.title}`, step.title)
      this.logger.info(this.colors.bold(`${index + 1}. ${step.title}`))
      this.state.busy = true
      await step.run?.()
      Object.assign(this.state, {
        done: index + 1,
        current: step.title,
        visit: step.visit ?? null,
        busy: false,
      })
      for (const note of step.notes) this.logger.log(`   ${note}`)
    }
    await this.nextStep('End: resume the heartbeats and quit', 'End')
    this.paused.clear()
    await second.sendHeartbeat()
    await this.quit()
  }

  /** Waits for Enter in the terminal or Next in the demo banner. */
  private nextStep(prompt: string, next: string) {
    this.state.next = next
    process.stdout.write(this.colors.dim(`\n[Enter] ${prompt}\n`))
    return new Promise<void>((resolve) => (this.wake = resolve))
  }

  private advance() {
    if (this.state.busy) return
    const wake = this.wake
    this.wake = undefined
    wake?.()
  }

  /**
   * Control server of the demo banner: GET /state, POST /next. The banner is served by the
   * Monitoring System, hence the CORS header for its origin. Without the port, the demo
   * goes on from the terminal only.
   */
  private startControl(total: number) {
    this.state.total = total
    this.control = createServer((request, response) => {
      if (request.method === 'POST' && request.url === '/next') this.advance()
      response
        .writeHead(200, {
          'content-type': 'application/json',
          'access-control-allow-origin': new URL(this.url).origin,
        })
        .end(JSON.stringify(this.state))
    })
    return new Promise<void>((resolve) => {
      this.control!.once('error', () => {
        this.logger.warning(`Port ${DEMO_CONTROL_PORT} in use: no demo banner, use Enter`)
        resolve()
      })
      this.control!.listen(DEMO_CONTROL_PORT, 'localhost', resolve)
    })
  }

  /**
   * Drops every table, migrates and seeds again, in another process since this command does
   * not start the application. The Monitoring System keeps nothing in memory, so it can run.
   * The migration writes database/schema.ts again: it is formatted so that git sees no change.
   */
  private async resetDatabase() {
    this.logger.info('Resetting the database and seeding the demo accounts')
    const done =
      (await this.quietly(process.execPath, ['ace', 'migration:fresh', '--seed'])) &&
      (await this.quietly('node_modules/.bin/prettier', ['--write', 'database/schema.ts']))
    if (!done) this.logger.error('The database could not be reset')
    return done
  }

  /** Runs a program in the application root; its output is shown only if it fails. */
  private quietly(program: string, args: string[]) {
    let output = ''
    return new Promise<boolean>((resolve) => {
      const child = spawn(program, args, { cwd: this.app.makePath() })
      child.stdout.on('data', (chunk) => (output += chunk))
      child.stderr.on('data', (chunk) => (output += chunk))
      child.on('error', () => resolve(false))
      child.on('close', (code) => {
        if (code !== 0) this.logger.log(output)
        resolve(code === 0)
      })
    })
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
      // `npm run dev` restarts the server when the reset rewrites database/schema.ts.
      const started =
        (await this.untilAnswered(() => adc.register())) &&
        (await this.untilAnswered(() => adc.sendHeartbeat()))
      if (!started) {
        this.logger.error(`No Monitoring System at ${this.url}: start it with npm run dev`)
        return false
      }
    }
    await saveAdcIds(this.idsFile, ids)

    this.timer = setInterval(() => {
      for (const adc of this.adcs) if (!this.paused.has(adc)) adc.sendHeartbeat()
    }, this.interval * 1000)
    this.logger.success(`${this.adcs.map((adc) => adc.label).join(' and ')} registered`)
    return true
  }

  /** Sends again, once a second, until the Monitoring System answers 200 or 201. */
  private async untilAnswered(send: () => Promise<{ httpStatus: number | null }>) {
    for (let attempt = 0; attempt < SERVER_WAIT_S; attempt++) {
      const { httpStatus } = await send()
      if (httpStatus === 200 || httpStatus === 201) return true
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    return false
  }

  /** Waits, with a countdown, until the paused ADC must have gone offline. */
  private async waitUntilOffline() {
    let left = OFFLINE_AFTER_S - Math.floor((Date.now() - this.pausedAt) / 1000)
    while (left > 0) {
      this.state.countdown = left
      process.stdout.write(`\r   Offline in ${left} s `)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      left--
    }
    this.state.countdown = null
    process.stdout.write('\r')
  }

  private open(url: string) {
    return new Promise<void>((resolve) => execFile('open', [url], () => resolve()))
  }

  /** Opens a file in Visual Studio Code when it is installed, else prints its path. */
  private edit(path: string) {
    return new Promise<void>((resolve) =>
      execFile('open', ['-a', 'Visual Studio Code', this.app.makePath(path)], (error) => {
        if (error) this.logger.log(`   Open ${path}`)
        resolve()
      })
    )
  }

  private async quit() {
    clearInterval(this.timer)
    this.input?.close()
    this.control?.closeAllConnections()
    this.control?.close()
    await Promise.all(this.adcs.map((adc) => adc.stop()))
    await this.terminate()
  }

  private get idsFile() {
    return this.app.tmpPath('simulated_adcs.json')
  }
}
