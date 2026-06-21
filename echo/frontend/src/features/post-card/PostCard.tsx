import { Link } from 'react-router-dom'
import { Avatar, Card } from '@/shared/ui'
import { timeAgo } from '@/shared/lib/time'
import { ROUTES } from '@/shared/config/env'
import type { Post } from '@/types/domain'
import styles from './PostCard.module.css'

interface PostCardProps {
  post: Post
  onLike?: (id: string) => void
}

export function PostCard({ post, onLike }: PostCardProps) {
  return (
    <Card
      head={
        <>
          <span className={styles.handle}>
            <Link to={ROUTES.profile(post.author.id)}>
              @{post.author.handle}
            </Link>
            <span style={{ color: 'var(--fg-mute)', marginLeft: 'var(--s-2)' }}>
              · {post.author.displayName}
            </span>
          </span>
          <time className={styles.ts} dateTime={post.createdAt}>
            {timeAgo(post.createdAt)}
          </time>
        </>
      }
      foot={
        <>
          <button
            type="button"
            className={styles.action}
            data-active={post.likedByMe ? 'true' : 'false'}
            onClick={() => onLike?.(post.id)}
            aria-pressed={post.likedByMe}
            aria-label={post.likedByMe ? 'unlike' : 'like'}
          >
            <span aria-hidden>{post.likedByMe ? '♥' : '+'}</span>
            <span>{post.likes}</span>
          </button>
          <span className={styles.action} aria-label="comments">
            <span aria-hidden>{'>'}</span>
            <span>{post.comments}</span>
          </span>
          <span style={{ marginLeft: 'auto', color: 'var(--fg-faint)' }}>
            #{post.id}
          </span>
        </>
      }
    >
      <div className={styles.post}>
        <div className={styles.head}>
          <Avatar handle={post.author.handle} size="sm" />
        </div>
        <div className={styles.body}>{post.body}</div>
      </div>
    </Card>
  )
}