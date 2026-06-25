import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { ProfilePage } from './ProfilePage'
import { useAuthStore } from '@/store/auth'
import { renderWithProviders } from '@/test/render'
import { server, startServer, stopServer } from '@/test/msw-server'
import { fixtureOtherUser, fixtureUser } from '@/test/fixtures'

// (waitFor is intentionally imported above so the helper test below uses it.)

/**
 * `useParams()` only resolves when a matching `<Route>` is mounted.
 * ProfilePage relies on this to pick fetchMe vs fetchUser — without a
 * matching route the component always treats the visit as "self".
 * So we wrap the page in a `<Routes>` just like the real app does.
 */
function renderProfile(initialPath: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/me" element={<ProfilePage />} />
      <Route path="/profile/:id" element={<ProfilePage />} />
    </Routes>,
    { initialPath },
  )
}

/**
 * Integration test for ProfilePage.
 *
 *  - `/profile` and `/profile/me` resolve to fetchMe().
 *  - `/profile/:id` resolves to fetchUser(:id).
 *  - On the own profile the user store is updated with the fetched user.
 */

const ROUTES = {
  profile: '/profile',
  profileWithId: (id: string) => `/profile/${id}`,
}

beforeAll(() => startServer())
afterAll(() => stopServer())
afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ token: null, user: null, status: 'idle' })
  window.localStorage.clear()
})
beforeEach(() => {
  useAuthStore.setState({
    token: 'jwt-test',
    user: fixtureUser(),
    status: 'authed',
  })
})

describe('ProfilePage integration', () => {
  it('renders the logged-in user on /profile via /api/users/me', async () => {
    server.use(
      http.get('*/api/users/me', () => HttpResponse.json(fixtureUser())),
    )

    renderProfile(ROUTES.profile)

    expect(await screen.findByText('alice')).toBeInTheDocument()
    expect(screen.getByText('Alice Q.')).toBeInTheDocument()
    // Posts count + edit button are the "own profile" affordances.
    expect(screen.getByText('posts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
  })

  it('renders a stranger on /profile/:id via /api/users/:id', async () => {
    const bob = fixtureOtherUser({ displayName: 'Bob the Builder', bio: 'can we fix it?' })
    server.use(
      http.get('*/api/users/2', () => HttpResponse.json(bob)),
    )

    renderProfile(ROUTES.profileWithId('2'))

    expect(await screen.findByText('bob')).toBeInTheDocument()
    expect(screen.getByText('Bob the Builder')).toBeInTheDocument()
    expect(screen.getByText('can we fix it?')).toBeInTheDocument()
    // Stranger profile shows "follow", not "edit profile".
    expect(screen.getByRole('button', { name: /follow/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument()
  })

  it('shows an error frame when the fetch fails', async () => {
    server.use(
      http.get('*/api/users/me', () =>
        HttpResponse.json(
          { code: 'server_error', message: 'profile down' },
          { status: 500 },
        ),
      ),
    )

    renderProfile(ROUTES.profile)

    expect(await screen.findByText(/profile down/i)).toBeInTheDocument()
  })

  it('treats /profile/me the same as /profile', async () => {
    server.use(
      http.get('*/api/users/me', () => HttpResponse.json(fixtureUser())),
    )

    renderProfile('/profile/me')

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })
    // Own profile → edit button shown.
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
  })
})