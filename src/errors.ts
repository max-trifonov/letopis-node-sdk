export class LetopisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number,
  ) {
    super(message)
    this.name = 'LetopisError'
  }
}

export class AuthenticationError extends LetopisError {
  constructor(message = 'Unauthenticated — check your API key.') {
    super(message, 'unauthenticated', 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends LetopisError {
  constructor(message = 'Forbidden — insufficient scope or collection access.', code = 'forbidden') {
    super(message, code, 403)
    this.name = 'AuthorizationError'
  }
}

export class ValidationError extends LetopisError {
  constructor(message: string, code = 'validation_failed', public readonly details: unknown[] = []) {
    super(message, code, 400)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends LetopisError {
  constructor(message = 'Resource not found.') {
    super(message, 'not_found', 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends LetopisError {
  constructor(message: string, code = 'conflict') {
    super(message, code, 409)
    this.name = 'ConflictError'
  }
}

export class PayloadTooLargeError extends LetopisError {
  constructor(message = 'Payload exceeds the maximum allowed size.') {
    super(message, 'too_large', 413)
    this.name = 'PayloadTooLargeError'
  }
}

export class PluginRejectionError extends LetopisError {
  constructor(message = 'Event rejected by a fail-closed plugin (e.g. hash-chain).') {
    super(message, 'plugin_rejected', 422)
    this.name = 'PluginRejectionError'
  }
}

export class RateLimitError extends LetopisError {
  constructor(message = 'Rate limit or backpressure exceeded.', public readonly retryAfter = 0) {
    super(message, 'rate_limited', 429)
    this.name = 'RateLimitError'
  }
}

export class ServerError extends LetopisError {
  constructor(message = 'Server unavailable or internal error.', status = 503) {
    super(message, 'server_error', status)
    this.name = 'ServerError'
  }
}
