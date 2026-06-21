# Echo — frontend

A React + TypeScript + Vite scaffold for a terminal-minimal social client.

Built to talk to a Django REST + Channels (WebSocket) backend.
Designed to look like a terminal, not like every other AI-shaped SaaS.

```
$ echo "ready"
[ready]  http://localhost:5173
```

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build | **Vite 8** | Sub-second HMR, ESM-first, easy env handling |
| UI | **React 19** | Current, with `react-jsx` runtime |
| Types | **TypeScript 6** | `bundler` module resolution, strict mode |
| Routing | **react-router-dom v7** | File-free SPA routes with nested layout |
| State | **Zustand 5** | Tiny, persisted auth slice via `persist` |
| Forms | **react-hook-form + zod** | Same schemas validate client + API payloads |
| HTTP | **axios** | Single instance, bearer-token interceptor |
| Realtime | **`useWebSocket` hook** | Reconnect with exponential backoff |
| Mocks | **MSW (browser)** | Run the whole UI without a backend |
| Styles | **CSS Modules + design tokens** | No runtime, no Tailwind, fully tree-shakeable |

No global CSS framework. No design-system-in-a-box. Everything is in
`src/styles/global.css` and `*.module.css` next to components.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Run (mocks are ON by default — no .env needed)
npm run dev
# → http://localhost:5173

# 3. Production build
npm run build
npm run preview
```

### Sign-in (mock)

The dev build comes with seeded data. Use any of these from
`src/shared/api/mocks/handlers.ts`:

```
login:    echo / echo           (returns a session for u_root)
register: anything unique       (creates a new user)
```

Or click **Google** / **GitHub** — both buttons render with a `[stub]`
badge until you set OAuth client IDs in `.env`.

---

## Environment variables

Copy `.env.example` to `.env` and edit:

| Variable | Default | Effect |
| --- | --- | --- |
| `VITE_API_BASE_URL` | _empty_ | Base URL for the Django REST API. Empty → same origin, MSW intercepts. |
| `VITE_WS_URL` | _empty_ | WebSocket origin (e.g. `ws://localhost:8000/ws`). Empty → `useWebSocket` no-ops. |
| `VITE_OAUTH_GOOGLE_CLIENT_ID` | _empty_ | Enables the real Google button. |
| `VITE_OAUTH_GITHUB_CLIENT_ID` | _empty_ | Enables the real GitHub button. |
| `VITE_ENABLE_MOCKS` | `true` | Force-load MSW even in production builds (useful for previews). |
| `VITE_ROUTER_FUTURE` | `true` | Documented; v7 flags are already default behaviour. |

All variables are typed in `src/vite-env.d.ts` and re-exported as a
single `env` object from `src/shared/config/env.ts`.

---

## Project layout

The folder structure follows **FSD-lite**: `app → pages → widgets →
features → shared`. Each layer only imports from layers below it.

```
src/
├── app/                # Composition root: App.tsx, route guards
│   ├── App.tsx              ← BrowserRouter + <Routes>
│   ├── ProtectedRoute.tsx   ← redirects to /login when no token
│   └── PublicOnlyRoute.tsx  ← redirects /login /register away when authed
│
├── pages/              # Route-level screens
│   ├── login/                /login     → LoginForm + OAuthBlock
│   ├── register/             /register  → RegisterForm + OAuthBlock
│   ├── feed/                 /feed      → composer + paginated feed
│   └── profile/              /profile/:id
│
├── widgets/            # Compositions that own chrome
│   ├── app-layout/           AppLayout — navbar + outlet + tabbar
│   ├── navbar/               desktop top bar
│   └── tabbar/               mobile bottom bar (≤ 720px)
│
├── features/           # User-facing capabilities
│   ├── auth-by-email/        Login/Register forms (RHF + zod)
│   ├── oauth-button/         Google / GitHub redirect
│   └── post-card/            Single post (used in feed + profile)
│
├── shared/             # Cross-cutting infra
│   ├── api/
│   │   ├── client.ts         axios instance + bearer header
│   │   ├── endpoints.ts      typed + zod-validated calls
│   │   └── mocks/            MSW handlers + browser worker
│   ├── config/
│   │   └── env.ts            single source of truth for env vars
│   ├── lib/
│   │   ├── time.ts           "5m", "3h", "2d" relative formatter
│   │   └── useWebSocket.ts   resilient WS hook (reconnect + backoff)
│   ├── model/
│   │   └── schemas.ts        zod schemas (mirror /types/domain.ts)
│   └── ui/                   Button, Field, Card, Avatar, EmptyState,
│                              StatusBar + matching .module.css
│
├── store/
│   └── auth.ts          Zustand store, persisted to localStorage
│
├── styles/
│   └── global.css       Design tokens (--bg, --fg, --accent, …) + reset
│
├── types/
│   └── domain.ts        Domain types shared across the app
│
├── main.tsx             Bootstrap: MSW → hydrate auth → render
└── vite-env.d.ts        Typed `import.meta.env`
```

---

## Routing

All routes are declared in `src/app/App.tsx`:

| Path | Guard | Page |
| --- | --- | --- |
| `/` | — | redirects to `/feed` |
| `/login` | `PublicOnlyRoute` | `LoginPage` |
| `/register` | `PublicOnlyRoute` | `RegisterPage` |
| `/feed` | `ProtectedRoute` | `FeedPage` |
| `/profile/:id` | `ProtectedRoute` | `ProfilePage` |
| `*` | — | redirects to `/feed` |

Add a route:

1. Add the path to `ROUTES` in `src/shared/config/env.ts`
2. Create the page under `src/pages/<name>/`
3. Register it inside `<AppLayout>` in `App.tsx`

---

## Talking to the Django backend

The backend contract lives in `src/shared/api/endpoints.ts` and the
zod schemas in `src/shared/model/schemas.ts`. To wire a real Django API:

1. Set `VITE_API_BASE_URL` (e.g. `http://localhost:8000`).
2. Make sure the Django side exposes the following endpoints with the
   same JSON shapes:

   ```
   POST   /api/auth/register       { handle, email, password, displayName? } → AuthSession
   POST   /api/auth/login          { handle, password }                       → AuthSession
   POST   /api/auth/logout         —                                           → 204
   GET    /api/users/me            Authorization: Bearer …                   → User
   GET    /api/users/:id           —                                           → User
   GET    /api/feed?cursor=…       —                                           → { items: Post[], nextCursor: string|null }
   POST   /api/feed                { body }                                    → Post
   ```

3. Set `VITE_ENABLE_MOCKS=false` (or leave it true — MSW only loads in
   dev unless explicitly forced).
4. CORS: Vite dev server proxies `/api` to Django, or Django serves
   CORS headers — pick one. The scaffold assumes the former.

The AuthSession shape:

```ts
type AuthSession = {
  token: string        // opaque bearer token, persisted to localStorage
  user:  User          // see src/types/domain.ts
}
```

Token storage: `localStorage` under key `echo.auth` via
`zustand/middleware`'s `persist`. Replaced with httpOnly cookies is a
backend-side change; the client reads `token` from the same place.

### WebSockets

`useWebSocket(path, opts)` is a generic resilient hook:

```ts
const { status, send, reconnectNow, disconnect } = useWebSocket<In, Out>(
  '/feed/live',
  {
    onMessage: (msg) => console.log(msg),
    reconnect: true,
    baseBackoffMs: 800,
    maxBackoffMs: 15_000,
  },
)
```

Features:

- No-op if `VITE_WS_URL` is empty (so the same code runs without a backend).
- Exponential backoff, capped at `maxBackoffMs`.
- Pauses reconnect while the tab is hidden; resumes on visibilitychange.
- Stable `send` that JSON-encodes and no-ops when not `OPEN`.

The Django side should expose `ws://<host>/ws<path>` (Channels default
routing) — point `VITE_WS_URL` at the origin without the `/ws` prefix.

---

## Design system — "terminal minimalism"

Tokens live in `src/styles/global.css`:

```
--bg:        #0b0d0c    near-black with a green undertone
--bg-soft:   #101413    raised surfaces
--fg:        #d7e0d6    primary text
--fg-mute:   #6b7770    secondary text
--accent:    #7ee787    terminal mint
--warn:      #d9a55a    amber
--error:     #d9655a    muted crimson
--line:      #1c2220    borders
```

Type:

- `--font-mono`: JetBrains Mono (with system mono fallbacks)
- `--font-ui`:   the same — body text is mono too, that's the point

Conventions:

- No gradients. No blurs. No drop shadows. Borders, not boxes.
- Inputs render with a `›` prompt prefix; status messages use `·`.
- Loading is a blinking block cursor, not a spinner.
- Empty states use ASCII art, not illustrations.

---

## Conventions

- **Aliases**: `@/*` resolves to `src/*`. Use it everywhere instead of
  long relative paths.
- **CSS Modules**: one `*.module.css` next to every component. Class
  names are camelCase.
- **Imports**: ESM, no default React import (JSX runtime is auto).
- **Types**: prefer `import type` for type-only imports. Domain types
  live in `src/types/domain.ts`, validated by zod in
  `src/shared/model/schemas.ts`.
- **Forms**: every form is RHF + zod; the same zod schema ships to the
  server (when you wire `endpoints.ts`).

---

## Useful scripts

```bash
npm run dev       # vite dev (port 5173)
npm run build     # tsc -b && vite build
npm run preview   # serve dist/ on :4173
npm run lint      # eslint .
```

---

## What's intentionally NOT here

This is a **scaffold**, not a finished product. Out of scope:

- Real OAuth round-trips — buttons are wired to provider URLs but the
  `/oauth/callback` route is not implemented. Until you set OAuth client
  IDs they render in stub mode.
- Server-side rendering. Single-page app only.
- Tests. Add Vitest + React Testing Library when you start adding
  features.
- i18n. Copy is hard-coded English.
- Push notifications. WebSocket is one-way (server → client) only at
  the moment.

---

## License

Private project. All rights reserved.
