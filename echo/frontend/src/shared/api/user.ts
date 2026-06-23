/**
 * User shape normalisation.
 *
 * The Django backend returns users as:
 *   { id, username, email, first_name(?), displayName, avatar, bio, ... }
 * The frontend's `userSchema` expects:
 *   { id, handle, displayName, bio?, joinedAt, postsCount, followersCount,
 *     followingCount, isFollowing? }
 *
 * `normalizeApiUser` adapts one into the other. Counts default to 0 when
 * the backend omits them — the UI treats 0 as "no data" rather than crash.
 */

interface ApiUser {
  id?: string | number
  username?: string
  email?: string
  displayName?: string
  first_name?: string
  avatar?: string | null
  bio?: string
  joinedAt?: string
  // Optional counts the backend may grow to expose.
  postsCount?: number
  followersCount?: number
  followingCount?: number
  isFollowing?: boolean
}

export interface NormalizedUser {
  id: string
  handle: string
  displayName: string
  avatar?: string | null
  bio?: string
  joinedAt: string
  postsCount: number
  followersCount: number
  followingCount: number
  isFollowing?: boolean
}

export function normalizeApiUser(raw: ApiUser | string | number | null | undefined): NormalizedUser {
  if (raw == null) {
    return {
      id: '',
      handle: 'unknown',
      displayName: 'Unknown',
      joinedAt: new Date(0).toISOString(),
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
    }
  }
  // Some endpoints (e.g. last_message.sender) hand back just an ID.
  if (typeof raw === 'string' || typeof raw === 'number') {
    return {
      id: String(raw),
      handle: String(raw),
      displayName: String(raw),
      joinedAt: new Date(0).toISOString(),
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
    }
  }
  const id = raw.id != null ? String(raw.id) : ''
  const handle = raw.username ?? raw.email?.split('@')[0] ?? `user_${id}`
  const displayName =
    raw.displayName?.trim() ||
    raw.first_name?.trim() ||
    (typeof handle === 'string' ? handle : 'user')
  return {
    id,
    handle,
    displayName,
    avatar: raw.avatar,
    bio: raw.bio,
    joinedAt: raw.joinedAt ?? new Date(0).toISOString(),
    postsCount: raw.postsCount ?? 0,
    followersCount: raw.followersCount ?? 0,
    followingCount: raw.followingCount ?? 0,
    ...(raw.isFollowing != null ? { isFollowing: raw.isFollowing } : {}),
  }
}
