import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuthStore } from '@/store/auth'
import { renderWithProviders } from '@/test/render'

function resetStore() {
  useAuthStore.setState({ token: null, user: null, status: 'idle' })
  window.localStorage.clear()
}

beforeEach(resetStore)

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc" data-pathname={loc.pathname} data-state-from={(loc.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? ''} />
}

describe('ProtectedRoute', () => {
  it('renders children when token is present', () => {
    useAuthStore.getState().setSession({
      token: 'jwt',
      user: { id: '1', handle: 'a', displayName: 'A', joinedAt: '2024-01-01T00:00:00Z', postsCount: 0, followersCount: 0, followingCount: 0 },
    })

    renderWithProviders(
      <Routes>
        <Route
          path="/secret"
          element={
            <ProtectedRoute>
              <p>inside</p>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialPath: '/secret' },
    )

    expect(screen.getByText('inside')).toBeInTheDocument()
  })

  it('redirects to /login when no token, preserving the original path in state', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute>
              <p>inside</p>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialPath: '/secret' },
    )

    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('inside')).not.toBeInTheDocument()
  })

  it('redirect from a nested path keeps that path in state.from', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LocationProbe />} />
        <Route
          path="/chats/42"
          element={
            <ProtectedRoute>
              <p>inside</p>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialPath: '/chats/42' },
    )

    const probe = screen.getByTestId('loc')
    expect(probe).toHaveAttribute('data-pathname', '/login')
    expect(probe).toHaveAttribute('data-state-from', '/chats/42')
  })
})
