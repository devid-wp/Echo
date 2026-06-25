import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  apiUserSchema,
  userSchema,
  postSchema,
  chatSchema,
  messageSchema,
  pageCursorSchema,
  authSessionSchema,
  loginPayloadSchema,
  registerPayloadSchema,
} from './schemas'

describe('apiUserSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(() => apiUserSchema.parse({})).not.toThrow()
  })

  it('accepts string id', () => {
    expect(apiUserSchema.parse({ id: '42' }).id).toBe('42')
  })

  it('accepts number id', () => {
    expect(apiUserSchema.parse({ id: 42 }).id).toBe(42)
  })

  it('accepts nullable avatar', () => {
    expect(apiUserSchema.parse({ avatar: null }).avatar).toBeNull()
  })
})

describe('userSchema', () => {
  it('rejects missing id', () => {
    expect(() => userSchema.parse({ handle: 'a', displayName: 'A', joinedAt: '2024-01-01T00:00:00Z', postsCount: 0, followersCount: 0, followingCount: 0 })).toThrow()
  })

  it('rejects empty handle', () => {
    expect(() =>
      userSchema.parse({
        id: '1',
        handle: '',
        displayName: 'A',
        joinedAt: '2024-01-01T00:00:00Z',
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
      }),
    ).toThrow()
  })

  it('rejects negative counts', () => {
    expect(() =>
      userSchema.parse({
        id: '1',
        handle: 'a',
        displayName: 'A',
        joinedAt: '2024-01-01T00:00:00Z',
        postsCount: -1,
        followersCount: 0,
        followingCount: 0,
      }),
    ).toThrow()
  })

  it('accepts a valid user', () => {
    expect(() =>
      userSchema.parse({
        id: '1',
        handle: 'alice',
        displayName: 'Alice',
        joinedAt: '2024-01-01T00:00:00Z',
        postsCount: 5,
        followersCount: 10,
        followingCount: 3,
      }),
    ).not.toThrow()
  })
})

describe('postSchema', () => {
  const base = {
    author: { id: '1', handle: 'alice', displayName: 'Alice' },
    body: 'hello world',
    createdAt: '2026-06-25T12:00:00Z',
    likes: 0,
    comments: 0,
  }

  it('transforms numeric id to string', () => {
    const out = postSchema.parse({ id: 7, ...base })
    expect(out.id).toBe('7')
  })

  it('keeps string id', () => {
    const out = postSchema.parse({ id: 'p1', ...base })
    expect(out.id).toBe('p1')
  })

  it('defaults likedByMe to false', () => {
    const out = postSchema.parse({ id: 1, ...base })
    expect(out.likedByMe).toBe(false)
  })

  it('defaults author.handle to "unknown" when missing', () => {
    const out = postSchema.parse({ id: 1, ...base, author: { id: '1' } })
    expect(out.author.handle).toBe('unknown')
  })

  it('rejects negative likes', () => {
    expect(() => postSchema.parse({ id: 1, ...base, likes: -1 })).toThrow()
  })
})

describe('chatSchema', () => {
  it('accepts a private chat with numeric id', () => {
    const out = chatSchema.parse({
      id: 1,
      type: 'private',
      participants: ['2', '3'],
      updated_at: '2026-06-25T12:00:00Z',
    })
    expect(out.id).toBe('1')
    expect(out.type).toBe('private')
  })

  it('accepts nullable name', () => {
    const out = chatSchema.parse({
      id: 2,
      type: 'private',
      name: null,
      participants: ['2'],
    })
    expect(out.name).toBeNull()
  })

  it('accepts a group chat with last_message', () => {
    const out = chatSchema.parse({
      id: 'g1',
      type: 'group',
      name: 'team',
      participants: ['1', '2'],
      last_message: {
        id: 99,
        text: 'hi',
        sender: '1',
        sender_username: 'alice',
        created_at: '2026-06-25T12:00:00Z',
      },
      unread_count: 2,
    })
    expect(out.last_message?.text).toBe('hi')
    expect(out.unread_count).toBe(2)
  })
})

describe('messageSchema', () => {
  it('accepts a basic message', () => {
    const out = messageSchema.parse({
      id: 1,
      text: 'hello',
      created_at: '2026-06-25T12:00:00Z',
    })
    expect(out.text).toBe('hello')
  })

  it('accepts nullable reply_to', () => {
    const out = messageSchema.parse({
      id: 1,
      text: 'reply',
      created_at: '2026-06-25T12:00:00Z',
      reply_to: null,
    })
    expect(out.reply_to).toBeNull()
  })

  it('accepts attachments array of unknowns', () => {
    const out = messageSchema.parse({
      id: 1,
      text: 'see attached',
      created_at: '2026-06-25T12:00:00Z',
      attachments: [{ url: '/x.png' }, 'weird-thing'],
    })
    expect(out.attachments).toHaveLength(2)
  })
})

describe('pageCursorSchema', () => {
  const schema = pageCursorSchema(z.object({ id: z.string() }))

  it('parses items + nextCursor', () => {
    const out = schema.parse({ items: [{ id: 'a' }, { id: 'b' }], nextCursor: 'next' })
    expect(out.items).toHaveLength(2)
    expect(out.nextCursor).toBe('next')
  })

  it('accepts null nextCursor (end of feed)', () => {
    const out = schema.parse({ items: [], nextCursor: null })
    expect(out.items).toEqual([])
    expect(out.nextCursor).toBeNull()
  })
})

describe('authSessionSchema', () => {
  it('requires a non-empty token', () => {
    expect(() => authSessionSchema.parse({ token: '', user: {} })).toThrow()
  })

  it('accepts a minimal session', () => {
    expect(() => authSessionSchema.parse({ token: 'abc', user: {} })).not.toThrow()
  })
})

describe('loginPayloadSchema', () => {
  it('requires both fields', () => {
    expect(() => loginPayloadSchema.parse({ email: '', password: '' })).toThrow()
    expect(() => loginPayloadSchema.parse({ email: 'a', password: 'short' })).toThrow()
  })

  it('accepts email + 8+ char password', () => {
    expect(() =>
      loginPayloadSchema.parse({ email: 'alice@echo.dev', password: 'password' }),
    ).not.toThrow()
  })

  it('uses custom error messages', () => {
    const r = loginPayloadSchema.safeParse({ email: '', password: '' })
    expect(r.success).toBe(false)
  })
})

describe('registerPayloadSchema', () => {
  const valid = {
    handle: 'ada',
    displayName: 'Ada',
    email: 'ada@echo.dev',
    password: 'password',
  }

  it('accepts a valid payload', () => {
    expect(() => registerPayloadSchema.parse(valid)).not.toThrow()
  })

  it('rejects handle with uppercase', () => {
    expect(() => registerPayloadSchema.parse({ ...valid, handle: 'Ada' })).toThrow()
  })

  it('rejects handle shorter than 3 chars', () => {
    expect(() => registerPayloadSchema.parse({ ...valid, handle: 'ad' })).toThrow()
  })

  it('rejects handle longer than 24 chars', () => {
    expect(() => registerPayloadSchema.parse({ ...valid, handle: 'a'.repeat(25) })).toThrow()
  })

  it('rejects handle with hyphen', () => {
    expect(() => registerPayloadSchema.parse({ ...valid, handle: 'ada-lovelace' })).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() => registerPayloadSchema.parse({ ...valid, email: 'no-at-sign' })).toThrow()
  })

  it('rejects password < 8 chars', () => {
    expect(() => registerPayloadSchema.parse({ ...valid, password: 'short' })).toThrow()
  })

  it('rejects empty displayName', () => {
    expect(() => registerPayloadSchema.parse({ ...valid, displayName: '' })).toThrow()
  })
})