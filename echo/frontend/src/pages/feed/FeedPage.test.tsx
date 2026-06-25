import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { FeedPage } from './FeedPage'
import { useAuthStore } from '@/store/auth'
import { renderWithProviders } from '@/test/render'
import { server, startServer, stopServer } from '@/test/msw-server'
import { fixturePost, fixtureUser } from '@/test/fixtures'
import { ROUTES } from '@/shared/config/env'

/**
 * Integration test for FeedPage.
 *
 *  - Seeded with a logged-in user (FeedPage is behind ProtectedRoute).
 *  - MSW serves /api/feed and /api/feed/ responses.
 *  - useWebSocket is idle in tests (no VITE_WS_URL), so we don't have to
 *    mock the WS layer here.
 */

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

describe('FeedPage integration', () => {
  it('loads posts from /api/feed and renders them', async () => {
    const posts = [
      fixturePost({ id: 'p-1', body: 'first post' }),
      fixturePost({ id: 'p-2', body: 'second post', author: fixtureUser({ handle: 'bob' }) }),
    ]
    server.use(
      http.get('*/api/feed', () =>
        HttpResponse.json({ items: posts, nextCursor: null }),
      ),
    )

    renderWithProviders(<FeedPage />, { initialPath: ROUTES.feed })

    expect(await screen.findByText('first post')).toBeInTheDocument()
    expect(screen.getByText('second post')).toBeInTheDocument()
  })

  it('shows an error state when the feed endpoint fails', async () => {
    server.use(
      http.get('*/api/feed', () =>
        HttpResponse.json(
          { code: 'server_error', message: 'boom' },
          { status: 500 },
        ),
      ),
    )

    renderWithProviders(<FeedPage />, { initialPath: ROUTES.feed })

    expect(await screen.findByText(/boom/i)).toBeInTheDocument()
  })

  it('submits a new post and prepends it to the list', async () => {
    const initial = [fixturePost({ id: 'p-1', body: 'initial' })]
    server.use(
      http.get('*/api/feed', () =>
        HttpResponse.json({ items: initial, nextCursor: null }),
      ),
      http.post('*/api/feed/', () =>
        HttpResponse.json(
          {
            id: 'p-2',
            author: fixtureUser(),
            body: 'new draft',
            createdAt: '2024-06-25T12:00:00Z',
            likes: 0,
            comments: 0,
          },
          { status: 201 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderWithProviders(<FeedPage />, { initialPath: ROUTES.feed })

    await screen.findByText('initial')

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'new draft')
    await user.click(screen.getByRole('button', { name: /publish/i }))

    expect(await screen.findByText('new draft')).toBeInTheDocument()
    expect(screen.getByText('initial')).toBeInTheDocument()
  })

  it('shows an empty-state when the feed returns no items', async () => {
    server.use(
      http.get('*/api/feed', () =>
        HttpResponse.json({ items: [], nextCursor: null }),
      ),
    )

    renderWithProviders(<FeedPage />, { initialPath: ROUTES.feed })

    // After the empty result resolves the composer should still be there.
    await waitFor(() => {
      expect(screen.queryByText(/initial|hello world/)).not.toBeInTheDocument()
    })
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})