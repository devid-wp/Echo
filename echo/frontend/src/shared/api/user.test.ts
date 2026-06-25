import { describe, it, expect } from 'vitest'
import { normalizeApiUser } from './user'

describe('normalizeApiUser', () => {
  it('handles null input', () => {
    const out = normalizeApiUser(null)
    expect(out).toEqual({
      id: '',
      handle: 'unknown',
      displayName: 'Unknown',
      joinedAt: new Date(0).toISOString(),
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
    })
  })

  it('handles undefined input', () => {
    expect(normalizeApiUser(undefined).handle).toBe('unknown')
  })

  it('handles bare string ID', () => {
    const out = normalizeApiUser('42')
    expect(out.id).toBe('42')
    expect(out.handle).toBe('42')
    expect(out.displayName).toBe('42')
  })

  it('handles bare number ID', () => {
    const out = normalizeApiUser(7)
    expect(out.id).toBe('7')
    expect(out.handle).toBe('7')
  })

  it('normalizes a full backend payload', () => {
    const out = normalizeApiUser({
      id: 12,
      username: 'alice',
      email: 'alice@example.com',
      displayName: 'Alice Q.',
      bio: 'engineer',
      joinedAt: '2024-01-01T00:00:00Z',
      postsCount: 10,
      followersCount: 20,
      followingCount: 30,
      isFollowing: true,
    })
    expect(out.id).toBe('12')
    expect(out.handle).toBe('alice')
    expect(out.displayName).toBe('Alice Q.')
    expect(out.bio).toBe('engineer')
    expect(out.joinedAt).toBe('2024-01-01T00:00:00Z')
    expect(out.postsCount).toBe(10)
    expect(out.followersCount).toBe(20)
    expect(out.followingCount).toBe(30)
    expect(out.isFollowing).toBe(true)
  })

  it('falls back handle from email when username missing', () => {
    const out = normalizeApiUser({ id: 1, email: 'bob@example.com' })
    expect(out.handle).toBe('bob')
  })

  it('falls back handle to user_<id> when no username/email', () => {
    const out = normalizeApiUser({ id: 99 })
    expect(out.handle).toBe('user_99')
  })

  it('falls back displayName to handle', () => {
    const out = normalizeApiUser({ id: 1, username: 'carol' })
    expect(out.displayName).toBe('carol')
  })

  it('uses first_name when displayName is empty', () => {
    const out = normalizeApiUser({ id: 1, username: 'dave', displayName: '   ', first_name: 'Dave S.' })
    expect(out.displayName).toBe('Dave S.')
  })

  it('defaults counts to 0 when missing', () => {
    const out = normalizeApiUser({ id: 1, username: 'eve' })
    expect(out.postsCount).toBe(0)
    expect(out.followersCount).toBe(0)
    expect(out.followingCount).toBe(0)
  })

  it('omits isFollowing when undefined', () => {
    const out = normalizeApiUser({ id: 1, username: 'faye' })
    expect('isFollowing' in out).toBe(false)
  })

  it('keeps avatar as null when explicitly null', () => {
    const out = normalizeApiUser({ id: 1, username: 'gina', avatar: null })
    expect(out.avatar).toBeNull()
  })

  it('keeps avatar as string when provided', () => {
    const out = normalizeApiUser({ id: 1, username: 'hugo', avatar: '/media/x.png' })
    expect(out.avatar).toBe('/media/x.png')
  })

  it('uses Unix epoch when joinedAt missing', () => {
    const out = normalizeApiUser({ id: 1, username: 'iris' })
    expect(out.joinedAt).toBe(new Date(0).toISOString())
  })
})