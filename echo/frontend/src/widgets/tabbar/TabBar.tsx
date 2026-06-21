import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { ROUTES } from '@/shared/config/env'
import styles from './TabBar.module.css'

const baseItems = [
  { to: ROUTES.feed, label: 'feed', glyph: '~' },
]

export function TabBar() {
  const user = useAuthStore((s) => s.user)
  const items = user
    ? [
        ...baseItems,
        { to: ROUTES.profile(user.id), label: 'me', glyph: '@' },
        { to: ROUTES.feed, label: 'post', glyph: '+' },
        { to: ROUTES.login, label: 'exit', glyph: '×' },
      ]
    : [
        ...baseItems,
        { to: ROUTES.login, label: 'sign in', glyph: '>' },
        { to: ROUTES.register, label: 'join', glyph: '+' },
      ]

  return (
    <nav className={styles.bar} aria-label="primary mobile">
      {items.slice(0, 4).map((item, i) => (
        <NavLink
          key={`${item.label}-${i}`}
          to={item.to}
          end={item.to === ROUTES.feed}
          className={styles.item}
        >
          <span className={styles.glyph} aria-hidden>{item.glyph}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}