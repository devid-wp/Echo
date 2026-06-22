import { z } from 'zod'

/* Zod schemas mirror `types/domain.ts`. The API client parses every response
   through these so malformed payloads become a typed error instead of a
   silent runtime crash.

   For endpoints whose shape comes from Django (which uses `username` +
   `displayName` + various optional fields) we use the loose `apiUserSchema`
   below, then normalise via `normalizeApiUser` in `shared/api/user.ts`. */

export const apiUserSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  username: z.string().optional(),
  email: z.string().optional(),
  displayName: z.string().optional(),
  first_name: z.string().optional(),
  avatar: z.string().nullable().optional(),
  bio: z.string().optional(),
  joinedAt: z.string().optional(),
  postsCount: z.number().optional(),
  followersCount: z.number().optional(),
  followingCount: z.number().optional(),
  isFollowing: z.boolean().optional(),
})
export type ApiUser = z.infer<typeof apiUserSchema>

export const userSchema = z.object({
  id: z.string(),
  handle: z.string().min(1),
  displayName: z.string().min(1),
  bio: z.string().optional(),
  joinedAt: z.string(),
  postsCount: z.number().int().nonnegative(),
  followersCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  isFollowing: z.boolean().optional(),
})

export const postSchema = z.object({
  id: z.string(),
  author: userSchema.pick({ id: true, handle: true, displayName: true }),
  body: z.string(),
  createdAt: z.string(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  likedByMe: z.boolean().optional(),
})

export const authSessionSchema = z.object({
  token: z.string().min(1),
  user: userSchema,
})

export const pageCursorSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  })

export const loginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const registerPayloadSchema = z.object({
  handle: z
    .string()
    .min(3, 'min 3 chars')
    .max(24, 'max 24 chars')
    .regex(/^[a-z0-9_]+$/, 'lowercase letters, digits and underscore only'),
  displayName: z.string().min(1).max(48),
  email: z.string().email(),
  password: z.string().min(8, 'min 8 chars'),
})

/* ----- chat (response shapes from /api/chats) -----
   Note: backend uses `username` + `email` on the user; we keep these as
   `unknown` here because the user-shape refactor (handle/displayName) is
   a separate task. The list page only needs the IDs and a preview string. */

export const chatSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  type: z.string(),                              // 'private' | 'group' | ...
  name: z.string().nullable().optional(),
  participants: z.array(z.union([z.string(), z.number()])),
  participants_data: z.array(z.unknown()).optional(),
  participants_count: z.number().int().nonnegative().optional(),
  last_message: z
    .object({
      id: z.union([z.string(), z.number()]),
      text: z.string(),
      sender: z.union([z.string(), z.number()]).optional(),
      sender_username: z.string().optional(),
      created_at: z.string(),
    })
    .nullable()
    .optional(),
  unread_count: z.number().int().nonnegative().optional(),
  updated_at: z.string().optional(),
  created_at: z.string().optional(),
})

export const chatsListSchema = z.array(chatSchema)

/* ----- message (response from /api/chats/:id/messages) ----- */
export const messageSchema = z.object({
  id: z.union([z.string(), z.number()]),
  chat: z.union([z.string(), z.number()]).optional(),
  sender: z.union([z.string(), z.number()]).optional(),
  sender_username: z.string().optional(),
  sender_data: z.unknown().optional(),
  text: z.string(),
  is_encrypted: z.boolean().optional(),
  is_read: z.boolean().optional(),
  read_at: z.string().nullable().optional(),
  reply_to: z.union([z.string(), z.number()]).nullable().optional(),
  attachments: z.array(z.unknown()).optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
})
export const messageListSchema = z.array(messageSchema)