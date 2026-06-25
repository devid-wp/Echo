import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { api, ApiError, setAuthToken } from './client'
import { server, startServer, stopServer } from '@/test/msw-server'

beforeAll(() => startServer())
afterAll(() => stopServer())
afterEach(() => server.resetHandlers())

describe('axios interceptor → ApiError mapping (end-to-end)', () => {
  it('maps a 401 with backend code to ApiError', async () => {
    server.use(
      http.post('http://localhost/api/test-401', () =>
        HttpResponse.json({ code: 'unauthorized', message: 'no token' }, { status: 401 }),
      ),
    )
    await expect(api.post('http://localhost/api/test-401', {})).rejects.toBeInstanceOf(ApiError)
    try {
      await api.post('http://localhost/api/test-401', {})
    } catch (e) {
      const err = e as ApiError
      expect(err.code).toBe('unauthorized')
      expect(err.status).toBe(401)
      expect(err.message).toBe('no token')
      expect(err.name).toBe('ApiError')
    }
  })

  it('maps a 500 with no code to "http" fallback', async () => {
    server.use(
      http.get('http://localhost/api/test-500', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    )
    try {
      await api.get('http://localhost/api/test-500')
    } catch (e) {
      const err = e as ApiError
      expect(err.code).toBe('http')
      expect(err.status).toBe(500)
    }
  })

  it('maps a 409 conflict', async () => {
    server.use(
      http.post('http://localhost/api/test-409', () =>
        HttpResponse.json({ code: 'handle_taken', message: 'already used' }, { status: 409 }),
      ),
    )
    try {
      await api.post('http://localhost/api/test-409', {})
    } catch (e) {
      const err = e as ApiError
      expect(err.code).toBe('handle_taken')
      expect(err.status).toBe(409)
    }
  })

  it('attaches Bearer header from setAuthToken', async () => {
    setAuthToken('jwt-abc')
    let authHeader: string | null = null
    server.use(
      http.get('http://localhost/api/auth-check', ({ request }) => {
        authHeader = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    await api.get('http://localhost/api/auth-check')
    expect(authHeader).toBe('Bearer jwt-abc')
    setAuthToken(null)
  })
})