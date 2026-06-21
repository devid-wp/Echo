import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { ROUTES } from '@/shared/config/env'

/**
 * ProtectedRoute — render `children` only when an auth token is present.
 * Otherwise, redirect to /login while preserving the intended destination.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (!token) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }
  return <>{children}</>
}