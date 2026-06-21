import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { setAuthToken } from '@/shared/api/client'
import type { AuthSession, User } from '@/types/domain'

interface AuthState {
  token: string | null
  user: User | null
  status: 'idle' | 'loading' | 'authed' | 'guest'
  setSession: (session: AuthSession) => void
  setUser: (user: User) => void
  setStatus: (status: AuthState['status']) => void
  clear: () => void
}

/**
 * Auth store. Token is persisted to localStorage so a refresh keeps the
 * user signed in; MSW mocks (or a real backend) validate the token on
 * every /api/users/me call before it can be trusted.
 *
 * `hydrate()` should be called once on app boot — it re-applies the
 * bearer header from whatever was in storage.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      status: 'idle',
      setSession: ({ token, user }) => {
        setAuthToken(token)
        set({ token, user, status: 'authed' })
      },
      setUser: (user) => set({ user }),
      setStatus: (status) => set({ status }),
      clear: () => {
        setAuthToken(null)
        set({ token: null, user: null, status: 'guest' })
      },
    }),
    {
      name: 'echo.auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token)
      },
    },
  ),
)

export function hydrateAuth() {
  // zustand's persist middleware already rehydrates synchronously from
  // localStorage on first import. We just need to make sure the axios
  // default header is in sync.
  const { token } = useAuthStore.getState()
  setAuthToken(token)
}