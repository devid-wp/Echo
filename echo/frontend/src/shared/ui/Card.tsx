import clsx from 'clsx'
import styles from './Card.module.css'

interface CardProps {
  head?: React.ReactNode
  foot?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function Card({ head, foot, className, children }: CardProps) {
  return (
    <article className={clsx(styles.card, className)}>
      {head && <header className={styles.cardHead}>{head}</header>}
      <div className={styles.cardBody}>{children}</div>
      {foot && <footer className={styles.cardFoot}>{foot}</footer>}
    </article>
  )
}