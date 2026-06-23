import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Avatar, Button, EmptyState } from '@/shared/ui'
import { fetchUser } from '@/shared/api/endpoints'
import { ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/store/auth'
import { ROUTES } from '@/shared/config/env'
import type { User } from '@/types/domain'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const me = useAuthStore((s) => s.user)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    fetchUser(id)
      .then((u) => {
        if (cancelled) return
        setUser(u)
        setError(null)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof ApiError ? e.message : 'failed to load profile')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return <EmptyState glyph="· · ·" title="loading profile" />
  }

  if (error || !user) {
    return (
      <div className="frame" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
        ! {error || 'user not found'}
      </div>
    )
  }

  const isMe = me?.id === user.id

  return (
    <div>
      <header className={styles.head}>
        <Avatar handle={user.handle} avatar={user.avatar} size="xl" />
        <div className={styles.identity}>
          <div className={styles.handle}>{user.handle}</div>
          <div className={styles.name}>{user.displayName}</div>
          {user.bio && <div className={styles.bio}>{user.bio}</div>}
          <div className={styles.meta}>
            <span><b>{user.postsCount}</b>posts</span>
            <span><b>{user.followersCount}</b>followers</span>
            <span><b>{user.followingCount}</b>following</span>
            <span>joined <b>{new Date(user.joinedAt).toLocaleDateString()}</b></span>
          </div>
        </div>
        <div className={styles.actions}>
          {isMe ? (
            <Button variant="ghost" onClick={() => window.location.assign(ROUTES.profileEdit)}>
              edit profile
            </Button>
          ) : (
            <Button variant="primary" prefix="+">
              follow
            </Button>
          )}
        </div>
      </header>

      <div className={styles.body}>
        <EmptyState
          glyph="·   ·   ·"
          title="no posts yet"
          body="when this user publishes, posts will appear here"
        />
      </div>
    </div>
  )
}