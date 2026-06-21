import { z } from 'zod'

/* Zod schemas mirror `types/domain.ts`. The API client parses every response
   through these so malformed payloads become a typed error instead of a
   silent runtime crash. */

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