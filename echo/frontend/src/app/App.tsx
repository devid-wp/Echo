import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/widgets/app-layout/AppLayout'
import { LoginPage } from '@/pages/login/LoginPage'
import { RegisterPage } from '@/pages/register/RegisterPage'
import { FeedPage } from '@/pages/feed/FeedPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { ChatsPage } from '@/pages/chats/ChatsPage'
import { ChatDetailPage } from '@/pages/chats/ChatDetailPage'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { QueryProvider } from './QueryProvider'
import { ROUTES } from '@/shared/config/env'

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={ROUTES.chats} replace />} />

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
            path={ROUTES.chats}
            element={
              <ProtectedRoute>
                <ChatsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats/:id"
            element={
              <ProtectedRoute>
                <ChatDetailPage />
              </ProtectedRoute>
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

          <Route path="*" element={<Navigate to={ROUTES.chats} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </QueryProvider>
  )
}