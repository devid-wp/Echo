import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore, hydrateAuth } from './auth'
import { api, setAuthToken } from '@/shared/api/client'
import type { AuthSession, User } from '@/types/domain'

const alice: User = {
  id: '1',
  handle: 'alice',
  displayName: 'Alice Q.',
  email: 'alice@echo.dev',
  joinedAt: '2024-01-01T00:00:00Z',
  postsCount: 5,
  followersCount: 10,
  followingCount: 3,
}

function resetStore() {
  // Clear store state without losing the persist middleware
  useAuthStore.setState({ token: null, user: null, status: 'idle' })
  window.localStorage.clear()
}

describe('useAuthStore', () => {
  beforeEach(() => {
    resetStore()
    setAuthToken(null)
  })

  it('starts with empty state', () => {
    const s = useAuthStore.getState()
    expect(s.token).toBeNull()
    expect(s.user).toBeNull()
    expect(s.status).toBe('idle')
  })

  it('setSession stores token + user + flips status, and syncs axios header', () => {
    const session: AuthSession = { token: 'jwt-abc', user: alice }
    useAuthStore.getState().setSession(session)

    const s = useAuthStore.getState()
    expect(s.token).toBe('jwt-abc')
    expect(s.user).toEqual(alice)
    expect(s.status).toBe('authed')
    expect(api.defaults.headers.common.Authorization).toBe('Bearer jwt-abc')
  })

  it('setUser updates only user', () => {
    useAuthStore.getState().setSession({ token: 'jwt', user: alice })
    const updated = { ...alice, displayName: 'Alice B.' }
    useAuthStore.getState().setUser(updated)
    expect(useAuthStore.getState().user).toEqual(updated)
    expect(useAuthStore.getState().token).toBe('jwt')
  })

  it('setStatus updates status only', () => {
    useAuthStore.getState().setStatus('loading')
    expect(useAuthStore.getState().status).toBe('loading')
  })

  it('clear wipes state and axios header', () => {
    useAuthStore.getState().setSession({ token: 'jwt', user: alice })
    useAuthStore.getState().clear()
    const s = useAuthStore.getState()
    expect(s.token).toBeNull()
    expect(s.user).toBeNull()
    expect(s.status).toBe('guest')
    expect(api.defaults.headers.common.Authorization).toBeUndefined()
  })

  it('persists token + user to localStorage on setSession', () => {
    useAuthStore.getState().setSession({ token: 'jwt-1', user: alice })
    const raw = window.localStorage.getItem('echo.auth')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!) as { state: { token: string; user: User } }
    expect(parsed.state.token).toBe('jwt-1')
    expect(parsed.state.user.handle).toBe('alice')
  })

  it('partialize excludes status from persisted state', () => {
    useAuthStore.getState().setStatus('loading')
    const raw = window.localStorage.getItem('echo.auth')
    // status is internal, not persisted
    if (raw) {
      const parsed = JSON.parse(raw) as { state: Record<string, unknown> }
      expect(parsed.state.status).toBeUndefined()
    }
  })

  it('hydrateAuth re-applies the bearer token from store', () => {
    useAuthStore.getState().setSession({ token: 'jwt-2', user: alice })
    // simulate a fresh app boot: header was cleared but store still has token
    setAuthToken(null)
    hydrateAuth()
    expect(api.defaults.headers.common.Authorization).toBe('Bearer jwt-2')
  })
})