import styles from './EmptyState.module.css'

interface EmptyStateProps {
  glyph?: string
  title: string
  body?: string
}

export function EmptyState({ glyph, title, body }: EmptyStateProps) {
  return (
    <div className={styles.empty} role="status">
      <div className={styles.glyph}>{glyph ?? '·   ·   ·'}</div>
      <div className={styles.title}>{title}</div>
      {body && <p className={styles.body}>{body}</p>}
    </div>
  )
}