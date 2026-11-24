import { test } from '@japa/runner'
import { readDeliveryAnswer } from '#modules/adc_communication/protocol'

const COMMAND = '5d6e7f80-91a2-4b3c-8d4e-5f6a7b8c9d0e'
const ADC = 'c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47'
const OTHER = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const expected = { idField: 'commandId', id: COMMAND, adcId: ADC }

/**
 * MC/DC on the guard `answer id ≠ k ∨ answer ADC ≠ a` of SPEC-COM-05 (testing plan,
 * section 3.4): the baseline with both conditions false, then each condition made true on
 * its own, which alone turns the outcome from delivered to failed.
 */
test.group('readDeliveryAnswer / MC/DC on the identifiers (SPEC-COM-05, INV-CMD-2)', () => {
  test('T-MON-10 both identifiers match: delivered', ({ assert }) => {
    const answer = { status: 200, body: { commandId: COMMAND, adcId: ADC, status: 'applied' } }

    assert.deepEqual(readDeliveryAnswer(answer, expected), { kind: 'delivered' })
  })

  test('T-MON-11 only the command identifier differs: failed, ID_MISMATCH', ({ assert }) => {
    const answer = { status: 200, body: { commandId: OTHER, adcId: ADC, status: 'applied' } }

    assert.containsSubset(readDeliveryAnswer(answer, expected), {
      kind: 'failed',
      code: 'ID_MISMATCH',
    })
  })

  test('T-MON-12 only the ADC identifier differs: failed, ID_MISMATCH', ({ assert }) => {
    const answer = { status: 200, body: { commandId: COMMAND, adcId: OTHER, status: 'applied' } }

    assert.containsSubset(readDeliveryAnswer(answer, expected), {
      kind: 'failed',
      code: 'ID_MISMATCH',
    })
  })
})

test.group('readDeliveryAnswer / no answer or an error (SPEC-COM-05, FR-COM-06)', () => {
  test('T-MON-13 no answer within 10 s: failed, TIMEOUT', ({ assert }) => {
    assert.containsSubset(readDeliveryAnswer(null, expected), { kind: 'failed', code: 'TIMEOUT' })
  })

  test('T-MON-13 an error answer: failed with the code and message of the ADC', ({ assert }) => {
    const answer = {
      status: 409,
      body: { error: { code: 'COMMAND_NOT_APPLICABLE', message: 'The ADC is in fault.' } },
    }

    assert.deepEqual(readDeliveryAnswer(answer, expected), {
      kind: 'failed',
      code: 'COMMAND_NOT_APPLICABLE',
      message: 'The ADC is in fault.',
    })
  })

  test('T-MON-13 an error answer without error body: failed with the HTTP status', ({ assert }) => {
    assert.containsSubset(readDeliveryAnswer({ status: 500, body: null }, expected), {
      kind: 'failed',
      code: 'HTTP_500',
    })
  })
})
