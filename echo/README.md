# Echo — terminal-minimal social

A real-time messaging platform built with Django (backend) + React + TypeScript + Vite (frontend).  
Designed to look like a terminal, not like every other AI-shaped SaaS.

```
$ echo "ready"
[ready]  http://localhost:5173
```

---

## 🧪 Test Accounts (ready to use)

All three users are already seeded into the dev database. Just run the backend and log in.

| Username | Email | Password | Notes |
|----------|-------|----------|-------|
| `alice` | alice@echo.dev | `testpass123` | Has a chat with bob |
| `bob` | bob@echo.dev | `testpass123` | Has a chat with alice |
| `demo` | demo@echo.dev | `testpass123` | Solo demo account |

> **Re-seed anytime**: `python -m scripts.seed_test_data` from the `echo/` directory.  
> The script is idempotent — it wipes and re-creates these three accounts cleanly.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Backend | **Django 4 + Channels** | REST + WebSocket in one project |
| Database | **SQLite** (dev) / PostgreSQL (prod) | Zero-config locally |
| Build | **Vite 8** | Sub-second HMR, ESM-first |
| UI | **React 19** | Current, with `react-jsx` runtime |
| Types | **TypeScript 6** | `bundler` module resolution, strict mode |
| Routing | **react-router-dom v7** | File-free SPA routes with nested layout |
| State | **Zustand 5** | Tiny, persisted auth slice via `persist` |
| Forms | **react-hook-form + zod** | Same schemas validate client + API payloads |
| HTTP | **axios** | Single instance, bearer-token interceptor |
| Realtime | **`useWebSocket` hook** | Reconnect with exponential backoff |
| Styles | **CSS Modules + design tokens** | No runtime, no Tailwind, fully tree-shakeable |

---

## Quick Start

### Backend

```bash
# From Echo/echo/
pip install -r requirements.txt
python manage.py migrate
python -m scripts.seed_test_data   # creates alice, bob, demo
python manage.py runserver         # → http://localhost:8000
```

### Frontend

```bash
# From Echo/echo/frontend/
npm install
npm run dev                        # → http://localhost:5173
```

### Sign in

Use any of the test accounts above, e.g.:
```
Username: alice
Password: testpass123
```

---

## Project Layout

```
echo/
├── echo/           # Django project settings, urls, wsgi/asgi
├── users/          # Custom User model (AbstractUser + bio, avatar, public_key)
├── chats/          # Chat + Message models, WebSocket consumers
├── ai/             # AI integration layer
├── core/           # Shared utilities
├── scripts/
│   └── seed_test_data.py   ← re-runnable seeder
├── manage.py
├── requirements.txt
└── frontend/       # React + Vite app (see frontend/README.md for details)
    ├── src/
    ├── index.html
    └── package.json
```

---

## Environment Variables

Copy `echo/.env.example` to `echo/.env`:

| Variable | Default | Effect |
| --- | --- | --- |
| `VITE_API_BASE_URL` | _empty_ | Base URL for the Django REST API |
| `VITE_WS_URL` | _empty_ | WebSocket origin (e.g. `ws://localhost:8000/ws`) |
| `VITE_ENABLE_MOCKS` | `true` | Force-load MSW (useful for frontend-only previews) |

---

## API Endpoints

```
POST   /api/auth/register       { username, email, password } → AuthSession
POST   /api/auth/login          { username, password }        → AuthSession
POST   /api/auth/logout         —                             → 204
GET    /api/users/me            Bearer token                  → User
GET    /api/users/:id           —                             → User
GET    /api/chats/              —                             → [Chat]
POST   /api/chats/              { participant_id }            → Chat
WS     /ws/chat/<chat_id>/      —                             → messages stream
```

---

## Design System — "Terminal Minimalism"

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

- No gradients. No blurs. No drop shadows. Borders, not boxes.
- Inputs render with a `›` prompt prefix; status messages use `·`.
- Loading is a blinking block cursor, not a spinner.

---

## Useful Scripts

```bash
python manage.py runserver             # Start Django dev server
python manage.py migrate               # Apply migrations
python -m scripts.seed_test_data       # Re-seed test users
npm run dev          # (in frontend/) Start Vite dev server
npm run build        # (in frontend/) Production build
npm run lint         # (in frontend/) ESLint
```

---

## License

Private project. All rights reserved.
