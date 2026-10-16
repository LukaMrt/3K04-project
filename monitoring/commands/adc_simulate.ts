import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Fake ADC unit used to demo and test the Monitoring System without the Part A
 * software. It plays the ADC side of the ADC ↔ Monitoring interface.
 *
 *   node ace adc:simulate --id=ADC-01 --interval=15
 */
export default class AdcSimulate extends BaseCommand {
  static commandName = 'adc:simulate'
  static description = 'Simulate an ADC unit sending heartbeats to the Monitoring System'

  static options: CommandOptions = {
    staysAlive: true,
  }

  @flags.string({ description: 'ADC identifier', default: 'ADC-01' })
  declare id: string

  @flags.number({ description: 'Heartbeat interval in seconds', default: 15 })
  declare interval: number

  @flags.string({ description: 'Monitoring System base URL', default: 'http://localhost:3333' })
  declare url: string

  async run() {
    this.logger.info(`Simulating ${this.id} → ${this.url} (heartbeat every ${this.interval}s)`)
    this.logger.info('Press Ctrl+C to stop (simulates a communication loss)')

    await this.sendHeartbeat()
    setInterval(() => this.sendHeartbeat(), this.interval * 1000)
  }

  /**
   * TODO: send the heartbeat once the message format is agreed with Part A
   * (endpoint, payload, expected response) — see the ADC ↔ Monitoring interface.
   */
  async sendHeartbeat() {
    this.logger.info(`[${new Date().toLocaleTimeString()}] heartbeat ${this.id} (not sent yet)`)
  }
}
