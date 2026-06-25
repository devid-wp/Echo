import type { Post, User } from '@/types/domain'

/**
 * Reusable test fixtures for MSW handlers and store seeding.
 * Handlers across page-level tests should build responses off these so
 * the test fixtures and the production zod schemas stay in sync (any
 * missing required field trips the endpoint's runtime zod parse).
 */

export const fixtureUser = (overrides: Partial<User> = {}): User => ({
  id: '1',
  handle: 'alice',
  displayName: 'Alice Q.',
  email: 'alice@echo.dev',
  avatar: null,
  joinedAt: '2024-01-01T00:00:00Z',
  postsCount: 5,
  followersCount: 10,
  followingCount: 3,
  ...overrides,
})

export const fixtureOtherUser = (overrides: Partial<User> = {}): User =>
  fixtureUser({
    id: '2',
    handle: 'bob',
    displayName: 'Bob R.',
    email: 'bob@echo.dev',
    ...overrides,
  })

export const fixturePost = (overrides: Partial<Post> = {}): Post => ({
  id: 'p-1',
  author: fixtureUser(),
  body: 'hello world',
  createdAt: '2024-06-01T12:00:00Z',
  likes: 0,
  comments: 0,
  likedByMe: false,
  ...overrides,
})