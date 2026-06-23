import clsx from 'clsx'
import styles from './Avatar.module.css'

interface AvatarProps {
  handle: string
  avatar?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ handle, avatar, size = 'md', className }: AvatarProps) {
  // Take the first two chars of handle for the glyph — looks like a unix prompt suffix
  const glyph = handle.slice(0, 2).padEnd(2, '_')
  return (
    <span
      className={clsx(styles.avatar, styles[size], className)}
      aria-hidden
    >
      {avatar ? (
        <img src={avatar} alt={handle} className={styles.img} />
      ) : (
        glyph
      )}
    </span>
  )
}