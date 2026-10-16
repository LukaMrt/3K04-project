import { inject } from '@adonisjs/core'
import AlarmService from '#modules/alarms/alarms_service'
import CabinetHealthService from '#modules/cabinet_health/cabinet_health_service'
import ClockService from '#modules/clock/clock_service'
import HistoryService from '#modules/history/history_service'
import InventoryService from '#modules/inventory/inventory_service'
import { notImplemented } from '#modules/shared/errors'
import type { Actor, AdcId } from '#modules/shared/types'
import type {
  AdcCommand,
  AdcSettings,
  DeliveryOutcome,
  ProtocolResponse,
} from '#modules/adc_communication/types'

/**
 * ADC Communication Manager — module interface.
 *
 * Responsibility: receive and validate everything sent by ADC units (heartbeats,
 * inventory, alarms, dispensing activity) and send commands / configuration to them.
 *
 * Secret (anticipated change): the communication protocol and message format agreed
 * with the Part A sub-team, and the contact address of each ADC (D-32). No other module
 * knows about HTTP payloads or ADC addresses.
 */
@inject()
export default class AdcCommunicationService {
  constructor(
    protected cabinetHealth: CabinetHealthService,
    protected inventory: InventoryService,
    protected alarms: AlarmService,
    protected history: HistoryService,
    protected clock: ClockService
  ) {}

  /**
   * Handles POST /api/v1/adcs/register (SPEC-COM-01).
   * Effects: invalid request → 400 and rejection logged; valid → contact address kept,
   * cabinetHealth.register(), 200. An internal failure answers 500.
   */
  async receiveRegistration(payload: unknown): Promise<ProtocolResponse> {
    return notImplemented('AdcCommunicationService.receiveRegistration', payload)
  }

  /**
   * Handles POST /api/v1/heartbeats (SPEC-COM-02, SPEC-COM-03).
   * Effects: invalid envelope → 400; unknown ADC → 404 and discard logged; otherwise
   * cabinetHealth.recordHeartbeat(), inventory.replaceInventory(), then each transaction
   * recorded (alarms.recordFromAdc, history.recordDispensing) or rejected and logged,
   * and only then 200 with one acknowledgement per transaction (FR-REQ-01).
   * A storage failure answers 500 and acknowledges nothing.
   */
  async receiveHeartbeat(payload: unknown): Promise<ProtocolResponse> {
    return notImplemented('AdcCommunicationService.receiveHeartbeat', payload)
  }

  /**
   * Pre: `actor` may send commands (D-10, checked by the caller, D-31).
   * Effects (SPEC-COM-04, SPEC-COM-05): offline ADC → nothing sent; otherwise sent, and
   * the answer awaited for 10 s at most. Sending and outcome audited (NFR-AUD-01, 05).
   * No automatic retry (D-04).
   * Throws: UnknownAdcError.
   */
  async sendCommand(actor: Actor, adcId: AdcId, command: AdcCommand): Promise<DeliveryOutcome> {
    return notImplemented('AdcCommunicationService.sendCommand', actor, adcId, command)
  }

  /**
   * Pre: `actor` may send configuration (D-10, D-31); settings within their rules
   * (interface §4.2).
   * Effects: same as sendCommand.
   * Throws: UnknownAdcError.
   */
  async sendConfiguration(
    actor: Actor,
    adcId: AdcId,
    settings: AdcSettings
  ): Promise<DeliveryOutcome> {
    return notImplemented('AdcCommunicationService.sendConfiguration', actor, adcId, settings)
  }
}
