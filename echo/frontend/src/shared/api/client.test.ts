import { describe, it, expect } from 'vitest'
import {
  ApiError,
  api,
  setAuthToken,
} from './client'

describe('ApiError', () => {
  it('preserves code, status, details, message', () => {
    // 'http' is the fallback code when the backend doesn't tag the
    // response — exercise it to prove ApiError carries through an
    // arbitrary code without filtering on AuthError membership.
    const e = new ApiError('http', 'no token', 401, { extra: 1 })
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(ApiError)
    expect(e.name).toBe('ApiError')
    expect(e.code).toBe('http')
    expect(e.status).toBe(401)
    expect(e.details).toEqual({ extra: 1 })
    expect(e.message).toBe('no token')
  })
})

describe('setAuthToken', () => {
  it('sets Bearer header when token is provided', () => {
    setAuthToken('abc.def.ghi')
    expect(api.defaults.headers.common.Authorization).toBe('Bearer abc.def.ghi')
  })

  it('clears Bearer header when token is null', () => {
    setAuthToken('xyz')
    setAuthToken(null)
    expect(api.defaults.headers.common.Authorization).toBeUndefined()
  })

  it('overwrites previous header', () => {
    setAuthToken('first')
    setAuthToken('second')
    expect(api.defaults.headers.common.Authorization).toBe('Bearer second')
  })
})