import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { LoginPage } from './LoginPage'
import { useAuthStore } from '@/store/auth'
import { renderWithProviders } from '@/test/render'
import { server, startServer, stopServer } from '@/test/msw-server'
import { fixtureUser } from '@/test/fixtures'
import { ROUTES } from '@/shared/config/env'

/**
 * Integration test for the LoginPage wiring:
 *   form -> useLoginSubmit -> api.login -> auth store + redirect
 *
 * MSW stands in for the Django backend; MemoryRouter stands in for the
 * BrowserRouter shell. ProtectedRoute is NOT mounted here (this is a
 * public route) so we don't need to seed the store before render.
 */

beforeAll(() => startServer())
afterAll(() => stopServer())
afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ token: null, user: null, status: 'idle' })
  window.localStorage.clear()
})
beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, status: 'idle' })
})

describe('LoginPage integration', () => {
  it('renders title, demo block, and the LoginForm', () => {
    renderWithProviders(<LoginPage />, { initialPath: ROUTES.login })
    expect(screen.getByRole('heading', { name: /echo login/i })).toBeInTheDocument()
    // Demo helper text — proves the page (not just the form) mounted.
    expect(screen.getByText(/demo:/i)).toBeInTheDocument()
    expect(screen.getByText('ada')).toBeInTheDocument()
    // The LoginForm itself.
    expect(screen.getByLabelText(/email or handle/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('successfully logs in via MSW and updates the auth store', async () => {
    const alice = fixtureUser()
    server.use(
      http.post('*/api/auth/login/', () =>
        HttpResponse.json({ token: 'jwt-alice', user: alice }, { status: 200 }),
      ),
    )

    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { initialPath: ROUTES.login })

    await user.type(screen.getByLabelText(/email or handle/i), 'alice')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.token).toBe('jwt-alice')
      expect(state.user?.handle).toBe('alice')
      expect(state.status).toBe('authed')
    })
  })

  it('surfaces a 401 server error without redirecting', async () => {
    server.use(
      http.post('*/api/auth/login/', () =>
        HttpResponse.json(
          { code: 'invalid_credentials', message: 'wrong password' },
          { status: 401 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { initialPath: ROUTES.login })

    await user.type(screen.getByLabelText(/email or handle/i), 'alice')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/wrong password/i)
    // Store must remain unauthenticated.
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('exposes a link to /register', () => {
    renderWithProviders(<LoginPage />, { initialPath: ROUTES.login })
    // Two register links are expected: the LoginForm's "no account?" link
    // and the page footer's "don't have a handle?" link. Both must point
    // to /register, so we assert on the collection, not a single element.
    const links = screen.getAllByRole('link', { name: /register/i })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/register')
    }
  })
})