import { http, HttpResponse } from 'msw'
import type { User } from '@/types/domain'

const alice: User = {
  id: '1',
  handle: 'alice',
  displayName: 'Alice Q.',
  email: 'alice@echo.dev',
  avatar: null,
  joinedAt: '2024-01-01T00:00:00Z',
  postsCount: 5,
  followersCount: 10,
  followingCount: 3,
}

export const authHandlers = [
  http.post('*/api/auth/login/', () =>
    HttpResponse.json({ token: 'jwt-alice', user: alice }, { status: 200 }),
  ),
  http.post('*/api/auth/login-fail/', () =>
    HttpResponse.json({ code: 'invalid_credentials', message: 'wrong password' }, { status: 401 }),
  ),
  http.post('*/api/auth/register/', () =>
    HttpResponse.json({ token: 'jwt-new', user: alice }, { status: 201 }),
  ),
  http.post('*/api/auth/register-handle-taken/', () =>
    HttpResponse.json({ code: 'handle_taken', message: 'handle in use' }, { status: 409 }),
  ),
  http.post('*/api/auth/register-email-taken/', () =>
    HttpResponse.json({ code: 'email_taken', message: 'email in use' }, { status: 409 }),
  ),
]
