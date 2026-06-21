import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/widgets/app-layout/AppLayout'
import { LoginPage } from '@/pages/login/LoginPage'
import { RegisterPage } from '@/pages/register/RegisterPage'
import { FeedPage } from '@/pages/feed/FeedPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { ROUTES } from '@/shared/config/env'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={ROUTES.feed} replace />} />

          <Route
            path={ROUTES.login}
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path={ROUTES.register}
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />

          <Route
            path={ROUTES.feed}
            element={
              <ProtectedRoute>
                <FeedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to={ROUTES.feed} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}