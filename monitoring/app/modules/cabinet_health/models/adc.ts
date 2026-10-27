import { AdcSchema } from '#database/schema'

/** Internal to the Cabinet Health Monitor: one registered ADC and its connectivity. */
export default class AdcModel extends AdcSchema {
  static table = 'adcs'
  static selfAssignPrimaryKey = true
}
