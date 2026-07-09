import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  LetopisError,
  NotFoundError,
  PayloadTooLargeError,
  PluginRejectionError,
  RateLimitError,
  ServerError,
  ValidationError,
} from '../src/errors.js'

describe('error hierarchy', () => {
  test.each([
    [new AuthenticationError(), 401, 'unauthenticated'],
    [new AuthorizationError(), 403, 'forbidden'],
    [new ValidationError('bad request'), 400, 'validation_failed'],
    [new NotFoundError(), 404, 'not_found'],
    [new ConflictError('conflict'), 409, 'conflict'],
    [new PayloadTooLargeError(), 413, 'too_large'],
    [new PluginRejectionError(), 422, 'plugin_rejected'],
    [new RateLimitError(), 429, 'rate_limited'],
    [new ServerError(), 503, 'server_error'],
  ] as const)('%p maps to status %i and code %s', (error, status, code) => {
    expect(error).toBeInstanceOf(LetopisError)
    expect(error).toBeInstanceOf(Error)
    expect(error.httpStatus).toBe(status)
    expect(error.code).toBe(code)
    expect(error.name).not.toBe('Error')
  })

  test('RateLimitError carries retryAfter', () => {
    const error = new RateLimitError('slow down', 30)
    expect(error.retryAfter).toBe(30)
  })

  test('ValidationError carries details', () => {
    const details = [{ field: 'title', message: 'required' }]
    const error = new ValidationError('invalid', 'validation_failed', details)
    expect(error.details).toEqual(details)
  })
})
