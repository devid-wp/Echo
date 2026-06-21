import { useEffect, useState } from 'react'
import { Button, EmptyState, FieldShell, TextArea } from '@/shared/ui'
import { PostCard } from '@/features/post-card'
import { fetchFeed, createPost } from '@/shared/api/endpoints'
import { ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/store/auth'
import { useWebSocket } from '@/shared/lib/useWebSocket'
import type { Post } from '@/types/domain'
import styles from './FeedPage.module.css'

interface FeedMessage {
  type: 'post.created' | 'feed.snapshot'
  post?: Post
  items?: Post[]
}

export function FeedPage() {
  const user = useAuthStore((s) => s.user)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  // Real-time hook. Sits idle if VITE_WS_URL is empty.
  const { status: wsStatus } = useWebSocket<FeedMessage>('/ws/feed', {
    onMessage: (msg) => {
      if (msg.type === 'post.created' && msg.post) {
        setPosts((prev) =>
          prev.some((p) => p.id === msg.post!.id) ? prev : [msg.post!, ...prev],
        )
      } else if (msg.type === 'feed.snapshot' && msg.items) {
        setPosts(msg.items)
      }
    },
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchFeed()
      .then(({ items }) => {
        if (cancelled) return
        setPosts(items)
        setError(null)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof ApiError ? e.message : 'failed to load feed')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const submit = async () => {
    const body = draft.trim()
    if (!body) return
    setPosting(true)
    try {
      const post = await createPost(body)
      setPosts((prev) => [post, ...prev])
      setDraft('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'failed to post')
    } finally {
      setPosting(false)
    }
  }

  const toggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) }
          : p,
      ),
    )
  }

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>feed</h1>
        <p className={styles.subtitle}>// {posts.length} items · live</p>
      </header>

      {user && (
        <div className={styles.composer}>
          <div className={styles.composerRow}>
            <span>posting as</span>
            <b>@{user.handle}</b>
          </div>
          <FieldShell prompt=">">
            <TextArea
              label="new post"
              textareaProps={{
                placeholder: 'what is on your mind?',
                value: draft,
                onChange: (e) => setDraft(e.target.value),
                rows: 3,
              }}
            />
          </FieldShell>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              onClick={submit}
              loading={posting}
              disabled={!draft.trim()}
              prefix=">"
            >
              publish
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="frame" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          ! {error}
        </div>
      )}

      {loading ? (
        <EmptyState glyph="· · ·" title="loading" body="fetching latest posts" />
      ) : posts.length === 0 ? (
        <EmptyState
          glyph="·   ·   ·"
          title="feed is empty"
          body="be the first to publish something"
        />
      ) : (
        <ul className={styles.list}>
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard post={p} onLike={toggleLike} />
            </li>
          ))}
        </ul>
      )}

      <span className={styles.ws} aria-live="polite">
        <span className={styles.dot} data-state={wsStatus} />
        ws: {wsStatus}
      </span>
    </div>
  )
}