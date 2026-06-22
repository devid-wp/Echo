/**
 * Strongly-typed access to `import.meta.env` with sensible defaults.
 * Defaults are picked so a fresh `git clone && npm run dev` works with no
 * .env file: mocks on, no remote URL, OAuth buttons in stub mode.
 */
function bool(v: string | undefined, fallback: boolean): boolean {
  if (v == null) return fallback
  return /^(1|true|yes|on)$/i.test(v)
}

export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, ''),
  wsUrl: import.meta.env.VITE_WS_URL ?? '',
  oauthGoogleClientId: import.meta.env.VITE_OAUTH_GOOGLE_CLIENT_ID ?? '',
  oauthGithubClientId: import.meta.env.VITE_OAUTH_GITHUB_CLIENT_ID ?? '',
  enableMocks: bool(import.meta.env.VITE_ENABLE_MOCKS, true),
  routerFuture: bool(import.meta.env.VITE_ROUTER_FUTURE, true),
  isDev: import.meta.env.DEV,
} as const

export const ROUTES = {
  chats: '/chats',
  chatDetail: (id: string | number) => `/chats/${id}`,
  feed: '/feed',
  profile: (id: string | number) => `/profile/${id}`,
  login: '/login',
  register: '/register',
  root: '/',
} as const