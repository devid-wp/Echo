import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { ROUTES } from '@/shared/config/env'
import styles from './TabBar.module.css'

/**
 * Mobile bottom tab bar. Visible only on viewports <= 720px.
 *
 * Layout when signed in: chats → feed → me → exit
 *  - chats / feed / me are real navigation (NavLink)
 *  - exit is destructive: it clears the auth session and bounces to /login
 *    on the same tick, so it can't be a regular link to /login (that would
 *    leave the session intact).
 *
 * Layout when signed out: chats → feed → sign in → join
 *  - mirroring the slot count keeps the grid from reflowing.
 */
export function TabBar() {
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const navigate = useNavigate()

  const onExit = () => {
    clear()
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <nav className={styles.bar} aria-label="primary mobile">
      <NavLink
        to={ROUTES.chats}
        className={styles.item}
      >
        <span className={styles.glyph} aria-hidden>#</span>
        <span>chats</span>
      </NavLink>

      <NavLink
        to={ROUTES.feed}
        className={styles.item}
      >
        <span className={styles.glyph} aria-hidden>~</span>
        <span>feed</span>
      </NavLink>

      {user ? (
        <NavLink
          to={ROUTES.profile(user.id)}
          className={styles.item}
        >
          <span className={styles.glyph} aria-hidden>@</span>
          <span>me</span>
        </NavLink>
      ) : (
        <NavLink
          to={ROUTES.login}
          className={styles.item}
        >
          <span className={styles.glyph} aria-hidden>&gt;</span>
          <span>sign in</span>
        </NavLink>
      )}

      {user ? (
        <button
          type="button"
          onClick={onExit}
          className={`${styles.item} ${styles.danger}`}
          aria-label="sign out"
        >
          <span className={styles.glyph} aria-hidden>×</span>
          <span>exit</span>
        </button>
      ) : (
        <NavLink
          to={ROUTES.register}
          className={styles.item}
        >
          <span className={styles.glyph} aria-hidden>+</span>
          <span>join</span>
        </NavLink>
      )}
    </nav>
  )
}
