import { api } from './client'
import {
  authSessionSchema,
  loginPayloadSchema,
  pageCursorSchema,
  postSchema,
  registerPayloadSchema,
  userSchema,
} from '@/shared/model/schemas'
import type {
  AuthSession,
  LoginPayload,
  PageCursor,
  Post,
  RegisterPayload,
  User,
} from '@/types/domain'

/* All request functions:
   - validate the OUTGOING payload with zod (fails loud, not silent)
   - validate the INCOMING response with zod (catches schema drift)
   - return a typed value, never `any`
*/

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const body = loginPayloadSchema.parse(payload)
  const { data } = await api.post('/api/auth/login', body)
  return authSessionSchema.parse(data)
}

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  const body = registerPayloadSchema.parse(payload)
  const { data } = await api.post('/api/auth/register', body)
  return authSessionSchema.parse(data)
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout')
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get('/api/users/me')
  return userSchema.parse(data)
}

export async function fetchUser(id: string): Promise<User> {
  const { data } = await api.get(`/api/users/${encodeURIComponent(id)}`)
  return userSchema.parse(data)
}

export async function fetchFeed(cursor?: string | null): Promise<PageCursor<Post>> {
  const { data } = await api.get('/api/feed', { params: { cursor: cursor ?? undefined } })
  return pageCursorSchema(postSchema).parse(data)
}

export async function createPost(body: string): Promise<Post> {
  const { data } = await api.post('/api/feed', { body })
  return postSchema.parse(data)
}