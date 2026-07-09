import { computeSignature, verifyWebhookSignature } from '../src/webhooks.js'
import { LetopisError } from '../src/errors.js'

describe('webhook signature verification', () => {
  const secret = 'whsec_test1234'
  const body = '{"entity_id":"d-1","version":17}'

  test('valid signature passes', () => {
    const signature = computeSignature(secret, body)
    expect(() => verifyWebhookSignature(secret, body, signature)).not.toThrow()
  })

  test('wrong secret throws', () => {
    const signature = computeSignature('wrong-secret', body)
    expect(() => verifyWebhookSignature(secret, body, signature)).toThrow(LetopisError)
  })

  test('tampered body throws', () => {
    const signature = computeSignature(secret, body)
    expect(() => verifyWebhookSignature(secret, body + ' ', signature)).toThrow(LetopisError)
  })

  test('invalid format throws', () => {
    expect(() => verifyWebhookSignature(secret, body, 'not-a-valid-signature')).toThrow(LetopisError)
  })

  test('compute returns sha256 prefix', () => {
    const signature = computeSignature(secret, body)
    expect(signature.startsWith('sha256=')).toBe(true)
  })

  test('accepts a Buffer body identically to the equivalent string', () => {
    const signature = computeSignature(secret, Buffer.from(body))
    expect(() => verifyWebhookSignature(secret, body, signature)).not.toThrow()
  })
})
