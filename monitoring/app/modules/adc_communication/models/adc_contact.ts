import { AdcContactSchema } from '#database/schema'

/** Internal to the ADC Communication Manager: where to send commands to an ADC (D-32). */
export default class AdcContactModel extends AdcContactSchema {
  static table = 'adc_contacts'
  static selfAssignPrimaryKey = true
}
