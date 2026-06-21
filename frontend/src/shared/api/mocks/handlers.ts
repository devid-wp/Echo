import { http, HttpResponse, delay } from 'msw'
import type { AuthSession, Post, User } from '@/types/domain'

/* In-memory mock data. We keep it small but real-shaped: handles look
   like shell users, posts look like shell output, timestamps are
   generated relative to "now" so the UI always feels alive. */

const now = () => new Date().toISOString()
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

const users: User[] = [
  { id: 'u_ada', handle: 'ada', displayName: 'Ada L.', joinedAt: daysAgo(420), bio: 'counting on things', postsCount: 12, followersCount: 128, followingCount: 41 },
  { id: 'u_alan', handle: 'alan', displayName: 'Alan T.', joinedAt: daysAgo(180), bio: 'machines that think', postsCount: 4, followersCount: 60, followingCount: 23 },
  { id: 'u_grace', handle: 'grace', displayName: 'Grace H.', joinedAt: daysAgo(900), bio: 'compiler era', postsCount: 31, followersCount: 412, followingCount: 8 },
  { id: 'u_root', handle: 'root', displayName: 'You', joinedAt: daysAgo(1), bio: '', postsCount: 0, followersCount: 0, followingCount: 0 },
]

const posts: Post[] = [
  { id: 'p_1', author: { id: 'u_ada', handle: 'ada', displayName: 'Ada L.' }, body: 'shipped a small linter for the team. three rules, zero deps.\n    > no unhandled promises\n    > no console.log in /src\n    > no TODO without a date', createdAt: minutesAgo(7), likes: 24, comments: 5 },
  { id: 'p_2', author: { id: 'u_grace', handle: 'grace', displayName: 'Grace H.' }, body: 'reading "the mythical man-month" again. the surgery metaphor still holds: a late change is a much larger change.', createdAt: minutesAgo(34), likes: 88, comments: 12 },
  { id: 'p_3', author: { id: 'u_alan', handle: 'alan', displayName: 'Alan T.' }, body: 'sometimes the right answer to a feature request is a smaller feature, not a faster one.', createdAt: minutesAgo(121), likes: 41, comments: 3 },
  { id: 'p_4', author: { id: 'u_ada', handle: 'ada', displayName: 'Ada L.' }, body: 'unpopular opinion: PR descriptions matter more than the diff itself.', createdAt: hoursAgo(5), likes: 17, comments: 9 },
  { id: 'p_5', author: { id: 'u_grace', handle: 'grace', displayName: 'Grace H.' }, body: 'old terminal, new tricks. mapped caps lock to ctrl, life improved 12%.', createdAt: hoursAgo(20), likes: 5, comments: 0 },
]

function hoursAgo(h: number) { return new Date(Date.now() - h * 3_600_000).toISOString() }

const sessions = new Map<string, AuthSession>()

function makeToken(handle: string) {
  return `mock.${handle}.${Math.random().toString(36).slice(2, 10)}`
}

function getAuth(req: Request): User | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice('Bearer '.length)
  const session = sessions.get(token)
  return session?.user ?? null
}

export const handlers = [
  /* ---------- AUTH ---------- */

  http.post('/api/auth/register', async ({ request }) => {
    await delay(450)
    const body = (await request.json()) as Record<string, string>
    if (!body.email || !body.password || !body.handle) {
      return HttpResponse.json(
        { code: 'validation', message: 'handle, email, password are required' },
        { status: 400 },
      )
    }
    if (body.password.length < 8) {
      return HttpResponse.json(
        { code: 'validation', message: 'password must be at least 8 characters' },
        { status: 400 },
      )
    }
    if (users.some((u) => u.handle === body.handle)) {
      return HttpResponse.json(
        { code: 'handle_taken', message: 'handle is already in use' },
        { status: 409 },
      )
    }
    if (users.some((u) => u.handle === body.email)) {
      return HttpResponse.json(
        { code: 'email_taken', message: 'email is already in use' },
        { status: 409 },
      )
    }
    const user: User = {
      id: `u_${body.handle}`,
      handle: body.handle,
      displayName: body.displayName || body.handle,
      joinedAt: now(),
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
    }
    users.push(user)
    const token = makeToken(body.handle)
    const session: AuthSession = { token, user }
    sessions.set(token, session)
    return HttpResponse.json(session, { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    await delay(450)
    const body = (await request.json()) as Record<string, string>
    // mock: any handle from our seed list + password "password" works.
    const user = users.find((u) => u.handle === body.email || (body.email && u.handle === body.email.split('@')[0]))
    if (!user || body.password !== 'password') {
      return HttpResponse.json(
        { code: 'invalid_credentials', message: 'wrong handle or password' },
        { status: 401 },
      )
    }
    const token = makeToken(user.handle)
    const session: AuthSession = { token, user }
    sessions.set(token, session)
    return HttpResponse.json(session)
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (auth?.startsWith('Bearer ')) sessions.delete(auth.slice(7))
    return new HttpResponse(null, { status: 204 })
  }),

  /* ---------- USERS ---------- */

  http.get('/api/users/me', async ({ request }) => {
    const me = getAuth(request)
    if (!me) return HttpResponse.json({ code: 'unauthorized', message: 'sign in' }, { status: 401 })
    return HttpResponse.json(me)
  }),

  http.get('/api/users/:id', async ({ params, request }) => {
    const me = getAuth(request)
    const user = users.find((u) => u.id === params.id)
    if (!user) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json({ ...user, isFollowing: me?.id !== user.id ? false : undefined })
  }),

  /* ---------- FEED ---------- */

  http.get('/api/feed', async () => {
    await delay(250)
    return HttpResponse.json({ items: posts, nextCursor: null })
  }),

  http.post('/api/feed', async ({ request }) => {
    const me = getAuth(request)
    if (!me) return HttpResponse.json({ code: 'unauthorized', message: 'sign in' }, { status: 401 })
    const body = (await request.json()) as { body?: string }
    if (!body.body || body.body.trim().length === 0) {
      return HttpResponse.json({ code: 'validation', message: 'body is required' }, { status: 400 })
    }
    const post: Post = {
      id: `p_${Math.random().toString(36).slice(2, 8)}`,
      author: { id: me.id, handle: me.handle, displayName: me.displayName },
      body: body.body,
      createdAt: now(),
      likes: 0,
      comments: 0,
      likedByMe: false,
    }
    posts.unshift(post)
    return HttpResponse.json(post, { status: 201 })
  }),
]