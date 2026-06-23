import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Avatar, Button } from '@/shared/ui'
import { useAuthStore } from '@/store/auth'
import { ROUTES } from '@/shared/config/env'
import styles from './Navbar.module.css'

export function Navbar() {
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const navigate = useNavigate()

  const onSignOut = () => {
    clear()
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <header className={styles.bar} role="banner">
      <Link to={ROUTES.feed} className={styles.brand} aria-label="Echo home">
        <span className={styles.brandGlyph}>~</span>
        <span>echo</span>
      </Link>

      <nav className={styles.nav} aria-label="primary">
        <NavLink to={ROUTES.chats}>/chats</NavLink>
        <NavLink to={ROUTES.feed}>/feed</NavLink>
        {user && <NavLink to={ROUTES.profile(user.id)}>/profile</NavLink>}
      </nav>

      <div className={styles.right}>
        {user ? (
          <>
            <span className={styles.session}>
              <Avatar handle={user.handle} size="sm" />
              <span className={styles.handle}>@{user.handle}</span>
            </span>
            <Button size="sm" variant="ghost" onClick={onSignOut}>
              sign out
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="primary" onClick={() => navigate(ROUTES.login)}>
              sign in
            </Button>
          </>
        )}
      </div>
    </header>
  )
}