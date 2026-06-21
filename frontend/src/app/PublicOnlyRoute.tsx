import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { ROUTES } from '@/shared/config/env'

/**
 * PublicOnlyRoute — used for /login and /register. If the user is already
 * signed in, redirect them to the feed.
 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to={ROUTES.feed} replace />
  return <>{children}</>
}