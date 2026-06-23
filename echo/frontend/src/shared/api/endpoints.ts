import { z } from 'zod'
import { api } from './client'
import {
  apiUserSchema,
  authSessionSchema,
  chatSchema,
  chatsListSchema,
  loginPayloadSchema,
  messageListSchema,
  pageCursorSchema,
  postSchema,
  registerPayloadSchema,
} from '@/shared/model/schemas'
import type {
  AuthSession,
  Chat,
  ChatMessage,
  LoginPayload,
  PageCursor,
  Post,
  RegisterPayload,
  User,
} from '@/types/domain'
import { normalizeApiUser } from './user'

/* All request functions:
   - validate the OUTGOING payload with zod (fails loud, not silent)
   - validate the INCOMING response with zod (catches schema drift)
   - return a typed value, never `any`
*/

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const body = loginPayloadSchema.parse(payload)
  const { data } = await api.post('/api/auth/login/', body)
  const raw = authSessionSchema.parse(data)
  // authSessionSchema only checks `token` + `user` exists. Normalise the
  // user to the frontend's User shape.
  return {
    token: raw.token,
    user: normalizeApiUser(raw.user as unknown as Parameters<typeof normalizeApiUser>[0]),
  }
}

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  const body = registerPayloadSchema.parse(payload)
  const { data } = await api.post('/api/auth/register/', body)
  const raw = authSessionSchema.parse(data)
  return {
    token: raw.token,
    user: normalizeApiUser(raw.user as unknown as Parameters<typeof normalizeApiUser>[0]),
  }
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout/')
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get('/api/users/me')
  return normalizeApiUser(apiUserSchema.parse(data))
}

export async function fetchUser(id: string): Promise<User> {
  const { data } = await api.get(`/api/users/${encodeURIComponent(id)}`)
  return normalizeApiUser(apiUserSchema.parse(data))
}

export async function fetchFeed(cursor?: string | null): Promise<PageCursor<Post>> {
  const { data } = await api.get('/api/feed', { params: { cursor: cursor ?? undefined } })
  return pageCursorSchema(postSchema).parse(data)
}

export async function createPost(body: string): Promise<Post> {
  const { data } = await api.post('/api/feed/', { body })
  return postSchema.parse(data)
}

export async function fetchChats(): Promise<Chat[]> {
  const { data } = await api.get('/api/chats')
  return chatsListSchema.parse(data) as unknown as Chat[]
}

export async function fetchChatMessages(chatId: string | number): Promise<ChatMessage[]> {
  const { data } = await api.get(`/api/chats/${chatId}/messages`)
  return messageListSchema.parse(data) as unknown as ChatMessage[]
}

export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get('/api/users')
  const list = z.array(apiUserSchema).parse(data)
  return list.map(normalizeApiUser)
}

export async function updateProfile(payload: Partial<User> & { displayName?: string, handle?: string, email?: string }): Promise<User> {
  const { data } = await api.patch('/api/users/me', payload)
  return normalizeApiUser(apiUserSchema.parse(data))
}

export async function uploadAvatar(file: File): Promise<{ avatar: string }> {
  const formData = new FormData()
  formData.append('avatar', file)
  const { data } = await api.post('/api/users/me/avatar/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}

export async function deleteAvatar(): Promise<void> {
  await api.delete('/api/users/me/avatar/')
}

export async function createGroup(name: string, participants: (string | number)[]): Promise<Chat> {
  const { data } = await api.post('/api/chats/groups/', { name, participants })
  return chatSchema.parse(data) as unknown as Chat
}

export async function uploadChatFile(file: File, chatId?: string | number): Promise<{ url: string; filename: string; size: number; type: string }> {
  const formData = new FormData()
  formData.append('file', file)
  if (chatId != null) {
    formData.append('chat_id', String(chatId))
  }
  const { data } = await api.post('/api/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}