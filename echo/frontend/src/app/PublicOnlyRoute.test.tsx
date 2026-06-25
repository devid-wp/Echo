import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { useAuthStore } from '@/store/auth'
import { renderWithProviders } from '@/test/render'

function resetStore() {
  useAuthStore.setState({ token: null, user: null, status: 'idle' })
  window.localStorage.clear()
}

beforeEach(resetStore)

describe('PublicOnlyRoute', () => {
  it('renders children when no token (guest on /login)', () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <p>login form</p>
            </PublicOnlyRoute>
          }
        />
        <Route path="/feed" element={<p>feed page</p>} />
      </Routes>,
      { initialPath: '/login' },
    )
    expect(screen.getByText('login form')).toBeInTheDocument()
  })

  it('redirects authed user to /feed', () => {
    useAuthStore.getState().setSession({
      token: 'jwt',
      user: { id: '1', handle: 'a', displayName: 'A', joinedAt: '2024-01-01T00:00:00Z', postsCount: 0, followersCount: 0, followingCount: 0 },
    })

    renderWithProviders(
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <p>login form</p>
            </PublicOnlyRoute>
          }
        />
        <Route path="/feed" element={<p>feed page</p>} />
      </Routes>,
      { initialPath: '/login' },
    )

    expect(screen.getByText('feed page')).toBeInTheDocument()
    expect(screen.queryByText('login form')).not.toBeInTheDocument()
  })

  it('also redirects when accessing /register while authed', () => {
    useAuthStore.getState().setSession({
      token: 'jwt',
      user: { id: '1', handle: 'a', displayName: 'A', joinedAt: '2024-01-01T00:00:00Z', postsCount: 0, followersCount: 0, followingCount: 0 },
    })

    renderWithProviders(
      <Routes>
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <p>register form</p>
            </PublicOnlyRoute>
          }
        />
        <Route path="/feed" element={<p>feed page</p>} />
      </Routes>,
      { initialPath: '/register' },
    )

    expect(screen.getByText('feed page')).toBeInTheDocument()
  })
})
