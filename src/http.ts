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
} from './errors.js'
import type { LetopisConfig, ReliabilityMode } from './types.js'

// Optional fields explicitly admit undefined: callers pass through values
// that may be unset, and apiRequest treats undefined the same as absent.
interface RequestOptions {
  method: string
  path: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined> | undefined
  mode?: ReliabilityMode | undefined
}

export async function apiRequest<T>(
  config: LetopisConfig,
  opts: RequestOptions,
): Promise<T> {
  const url = buildUrl(config.baseUrl, opts.path, opts.query)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    Accept: 'application/json',
  }

  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const effectiveMode = opts.mode ?? config.defaultMode
  if (effectiveMode) {
    headers['X-Letopis-Mode'] = effectiveMode
  }

  const timeoutMs = config.timeout ?? 30_000
  const retries   = config.retries ?? 3

  const response = await fetchWithRetry(
    url,
    {
      method: opts.method,
      headers,
      ...(opts.body !== undefined && { body: JSON.stringify(opts.body) }),
    },
    timeoutMs,
    retries,
  )

  if (!response.ok) {
    await throwFromResponse(response)
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(`/api/v1${path}`, baseUrl)

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  retriesLeft: number,
  attempt = 0,
): Promise<Response> {
  try {
    const signal = AbortSignal.timeout(timeoutMs)
    return await fetch(url, { ...init, signal })
  } catch (err) {
    const isNetworkError = err instanceof TypeError || (err instanceof DOMException && err.name === 'TimeoutError')
    if (!isNetworkError || retriesLeft <= 0) {
      throw err
    }
    await sleep(200 * 2 ** attempt)
    return fetchWithRetry(url, init, timeoutMs, retriesLeft - 1, attempt + 1)
  }
}

async function throwFromResponse(response: Response): Promise<never> {
  let body: { error?: { code?: string; message?: string; details?: unknown[] } } = {}
  try {
    body = (await response.json()) as typeof body
  } catch {
    // response body is not JSON — use status text
  }

  const message = body.error?.message ?? response.statusText
  const code    = body.error?.code    ?? 'unknown'
  const details = body.error?.details ?? []

  switch (response.status) {
    case 400: throw new ValidationError(message, code, details)
    case 401: throw new AuthenticationError(message)
    case 403: throw new AuthorizationError(message, code)
    case 404: throw new NotFoundError(message)
    case 409: throw new ConflictError(message, code)
    case 413: throw new PayloadTooLargeError(message)
    case 422: throw new PluginRejectionError(message)
    case 429: throw new RateLimitError(message, Number(response.headers.get('Retry-After') ?? 0))
    case 503: throw new ServerError(message, 503)
    default:  throw new LetopisError(message, code, response.status)
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
