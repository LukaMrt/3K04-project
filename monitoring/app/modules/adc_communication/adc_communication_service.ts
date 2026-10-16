/**
 * ADC Communication Manager — module interface.
 *
 * Responsibility: receive and validate everything sent by ADC units (heartbeats,
 * inventory, alarms, dispensing activity) and send commands / configuration to them.
 *
 * Secret (anticipated change): the communication protocol and message format agreed
 * with the Part A sub-team. No other module knows about HTTP payloads or ADC addresses.
 */
export default class AdcCommunicationService {}
