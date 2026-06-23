/**
 * Domain types for the Echo frontend. These are the *contract* the UI
 * understands — the MSW handlers and the real Django backend must both
 * produce these shapes (validated with zod in `model/schemas.ts`).
 */

export interface User {
  id: string
  handle: string              // unique, url-safe, like "ada"
  displayName: string
  email?: string
  avatar?: string | null
  bio?: string
  joinedAt: string            // ISO-8601
  postsCount: number
  followersCount: number
  followingCount: number
  isFollowing?: boolean       // present only when viewing as the authed user
}

export interface Post {
  id: string
  author: Pick<User, 'id' | 'handle' | 'displayName'>
  body: string
  createdAt: string
  likes: number
  comments: number
  likedByMe?: boolean
}

export interface AuthSession {
  token: string
  user: User
}

export interface PageCursor<T> {
  items: T[]
  nextCursor: string | null
}

/* Chat shape as returned by `GET /api/chats`.
   We only model the fields the UI reads; the rest comes through as `unknown`
   in the schema until the user-shape refactor lands. */
export interface Chat {
  id: string
  type: string
  name: string | null
  participants: (string | number)[]
  participants_data?: any[]
  last_message?: {
    id: string | number
    text: string
    sender?: string | number
    sender_username?: string
    created_at: string
  } | null
  unread_count?: number
  updated_at?: string
  created_at?: string
}

export interface ChatMessage {
  id: string | number
  text: string
  sender?: string | number
  sender_username?: string
  created_at: string
  is_encrypted?: boolean
  is_read?: boolean
  attachments?: string[]
  file_type?: string | null
}

/* ----- auth payloads ----- */

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  handle: string
  displayName: string
  email: string
  password: string
}

export type AuthError =
  | 'invalid_credentials'
  | 'email_taken'
  | 'handle_taken'
  | 'validation'
  | 'network'
  | 'unknown'