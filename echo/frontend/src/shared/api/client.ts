import axios, { AxiosError, type AxiosInstance } from 'axios'
import { env } from '@/shared/config/env'
import type { AuthError } from '@/types/domain'

/**
 * The single axios instance for the app.
 *
 *  - baseURL falls back to '' so requests resolve to same-origin (which
 *    means MSW intercepts them) when VITE_API_BASE_URL is empty.
 *  - The auth store mutates `instance.defaults.headers.Authorization`
 *    directly (see useAuthStore.hydrate()) so we don't need request
 *    interceptors that re-read state on every call.
 *  - Errors are normalised into a tiny `ApiError` shape so UI code
 *    doesn't have to know about axios' error class.
 */

export class ApiError extends Error {
  readonly code: AuthError | 'http'
  readonly status: number
  readonly details?: unknown

  constructor(code: ApiError['code'], message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function mapError(err: AxiosError<{ code?: string; message?: string; detail?: string }>): ApiError {
  // Network / no-response
  if (!err.response) {
    return new ApiError('network', err.message || 'network error', 0)
  }
  const { status, data } = err.response
  const code = (data?.code as AuthError | undefined) ?? 'http'
  const message = data?.message || data?.detail || err.message || 'request failed'
  return new ApiError(code, message, status, data)
}

export const api: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl || '',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

api.interceptors.response.use(
  (r) => r,
  (err) => Promise.reject(err instanceof AxiosError ? mapError(err) : err),
)

/** Set / clear the bearer token used by every subsequent request. */
export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}