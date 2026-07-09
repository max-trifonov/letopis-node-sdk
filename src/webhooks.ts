import { createHmac, timingSafeEqual } from 'node:crypto'
import { LetopisError } from './errors.js'

/**
 * Verify the HMAC-SHA256 signature sent by Letopis on incoming webhooks.
 *
 * @param secret    Plain-text secret configured in the rule's secret_ref.
 * @param rawBody   Raw request body string or Buffer (do NOT parse JSON first).
 * @param header    Value of the X-HM-Signature header, e.g. "sha256=abcdef…".
 * @throws LetopisError if the signature does not match.
 */
export function verifyWebhookSignature(secret: string, rawBody: string | Buffer, header: string): void {
  if (!header.startsWith('sha256=')) {
    throw new LetopisError('Invalid signature format — expected "sha256=<hex>".', 'invalid_signature', 0)
  }

  const expected = computeSignature(secret, rawBody)

  const expectedBuf = Buffer.from(expected)
  const receivedBuf = Buffer.from(header)

  // Pad to equal length before timingSafeEqual to avoid length leaks.
  const maxLen = Math.max(expectedBuf.length, receivedBuf.length)
  const a = Buffer.alloc(maxLen).fill(0)
  const b = Buffer.alloc(maxLen).fill(0)
  expectedBuf.copy(a)
  receivedBuf.copy(b)

  if (!timingSafeEqual(a, b)) {
    throw new LetopisError('Webhook signature mismatch.', 'invalid_signature', 0)
  }
}

/** Compute the expected signature for a payload (useful for testing). */
export function computeSignature(secret: string, rawBody: string | Buffer): string {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
}
