import type { ApiErrorBody } from '@/types/api'

export const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1'

export class ApiError extends Error {
  status: number
  code: string
  requestId?: string
  details?: unknown
  retryAfter?: number

  constructor(status: number, body: Partial<ApiErrorBody>, retryAfter?: number) {
    super(body.message || 'Terjadi kesalahan')
    this.status = status
    this.code = body.code || (status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR')
    this.requestId = body.request_id
    this.details = body.details
    this.retryAfter = retryAfter
  }

  /** Field-level messages from FastAPI VALIDATION_ERROR details. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {}
    if (!Array.isArray(this.details)) return out
    for (const d of this.details as { loc?: unknown[]; msg?: string }[]) {
      const field = d.loc?.filter((p) => p !== 'body').join('.')
      if (field && d.msg && !out[field]) out[field] = d.msg
    }
    return out
  }
}

// CSRF token lives in memory only (docs: never persist admin session material).
let csrfToken: string | null = null
export const setCsrfToken = (token: string | null) => (csrfToken = token)

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn)

const SESSION_CODES = new Set(['ADMIN_SESSION_REQUIRED', 'ADMIN_SESSION_INVALID'])

type Query = Record<string, string | number | boolean | null | undefined>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  query?: Query
  headers?: Record<string, string>
  /** Skip the global 401 handler (login, checkout). */
  silent401?: boolean
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(API_PREFIX + path, window.location.origin)
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  return url.pathname + url.search
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && csrfToken && path.startsWith('/admin'))
    headers['X-CSRF-Token'] = csrfToken

  let res: Response
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(0, { message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' })
  }

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!res.ok) {
    const body = ((json as { error?: ApiErrorBody })?.error ?? {}) as Partial<ApiErrorBody>
    const retry = Number(res.headers.get('Retry-After')) || undefined
    const err = new ApiError(res.status, body, retry)
    if (
      res.status === 401 &&
      !opts.silent401 &&
      (SESSION_CODES.has(err.code) || path.startsWith('/admin'))
    ) {
      onUnauthorized?.()
    }
    throw err
  }
  return json as T
}

export const api = {
  get: <T>(path: string, query?: Query, opts?: RequestOptions) =>
    request<T>(path, { ...opts, query }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body: body ?? {} }),
  patch: <T>(path: string, body: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
}
