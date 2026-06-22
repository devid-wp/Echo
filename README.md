# Echo

Терминально-минималистичная соцсеть-мессенджер: короткие посты в ленте + приватные чаты 1-на-1. Frontend на React 19, backend на Django 6 + DRF + JWT.

---

## Содержание

1. [Стек](#стек)
2. [Структура репозитория](#структура-репозитория)
3. [Быстрый старт](#быстрый-старт)
4. [Переменные окружения](#переменные-окружения)
5. [Архитектура](#архитектура)
   - [Backend](#backend)
   - [Frontend](#frontend)
   - [Контракт API](#контракт-api)
   - [Auth и слои защиты](#auth-и-слои-защиты)
6. [Скрипты и команды](#скрипты-и-команды)
7. [Стиль кода и решения](#стиль-кода-и-решения)

---

## Стек

**Backend**
- Django 6 + Django REST Framework
- `djangorestframework-simplejwt` — JWT-аутентификация
- `django-cors-headers` — CORS для dev-сервера Vite
- `python-dotenv` — загрузка `.env`
- SQLite для разработки (файл `echo/db.sqlite3`)

**Frontend**
- React 19 + TypeScript (strict)
- Vite 8 — dev-сервер и сборка
- React Router 7 — клиентский роутинг
- TanStack Query 5 — кэш запросов, ретраи, инвалидация
- Zustand 5 — auth-store с persist в `localStorage`
- Axios — единый HTTP-клиент с нормализованными ошибками
- Zod 3 — валидация и outgoing-payload, и incoming-response
- React Hook Form + `@hookform/resolvers` — формы
- MSW 2 — моки API для UI-разработки без поднятого бэкенда

---

## Структура репозитория

```
.
├── echo/                          # Django project root
│   ├── manage.py
│   ├── db.sqlite3                 # локальная БД (не в git)
│   ├── .env                       # секреты (не в git)
│   ├── requirements.txt
│   ├── echo/                      # настройки проекта
│   │   ├── settings.py
│   │   └── urls.py                # корневой router, /admin/, /api/*
│   ├── users/                     # кастомный User + auth views
│   │   ├── models.py              # AUTH_USER_MODEL = users.User
│   │   ├── views.py               # Register / Login / Logout / Me / UserDetail
│   │   ├── serializers.py
│   │   └── urls.py                # /api/auth/* и /api/users/*
│   ├── chats/                     # мессенджер
│   │   ├── models.py              # Chat, Message
│   │   ├── views.py               # ChatViewSet, MessageViewSet
│   │   ├── serializers.py
│   │   └── urls.py                # /api/chats, /api/chats/<id>/messages
│   ├── core/                      # общие исключения, базовые классы
│   ├── ai/                        # заготовка под AI-фичи
│   └── scripts/
│       └── seed_test_data.py      # сид тестовых пользователей
│
├── frontend/                      # React-приложение
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/                    # статические ассеты + MSW worker
│   └── src/
│       ├── main.tsx               # bootstrap (MSW → render)
│       ├── app/                   # App.tsx, роутер, провайдеры
│       │   ├── App.tsx
│       │   ├── ProtectedRoute.tsx
│       │   ├── PublicOnlyRoute.tsx
│       │   └── QueryProvider.tsx
│       ├── pages/                 # роут-страницы (по фиче)
│       │   ├── chats/             # список чатов + детальная
│       │   ├── feed/              # лента постов
│       │   ├── login/  register/
│       │   └── profile/<id>/
│       ├── widgets/               # композиция UI-блоков
│       │   ├── app-layout/        # shell: Navbar + Outlet + Footer + TabBar
│       │   ├── navbar/            # верхняя навигация (≥720px)
│       │   └── tabbar/            # нижние табы (≤720px)
│       ├── features/              # фичевая логика
│       ├── shared/
│       │   ├── api/               # axios client, endpoints, MSW handlers
│       │   ├── config/env.ts      # env + ROUTES helpers
│       │   ├── lib/               # хелперы (классы, даты)
│       │   ├── model/schemas.ts   # zod-схемы запросов/ответов
│       │   └── ui/                # Avatar, Button, EmptyState и т.д.
│       ├── store/                 # zustand-сторы (auth)
│       ├── types/domain.ts        # домен-контракт фронта
│       └── styles/global.css      # дизайн-токены, терминальная тема
│
├── package-lock.json
├── .gitignore
└── README.md
```

---

## Быстрый старт

> TL;DR: два терминала. В одном — Django на `:8000`, в другом — Vite на `:5173`.

Требования: **Python 3.12+**, **Node.js 20+**, npm 10+.

### Backend (терминал №1)

```bash
# 1. Клонируем и переходим в репо
git clone <repo-url> echo
cd echo

# 2. Виртуальное окружение + зависимости
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

pip install -r echo/requirements.txt

# 3. Переменные окружения
# Windows PowerShell:
copy echo\.env.example echo\.env
# Linux/macOS:
# cp echo/.env.example echo/.env
# (если .env.example нет — создай echo/.env вручную, см. раздел ниже)

# 4. Миграции + сид тестовых пользователей
cd echo
python manage.py migrate
python scripts/seed_test_data.py

# 5. Запуск API
python manage.py runserver
# → http://127.0.0.1:8000
# GET / — JSON со списком эндпоинтов
# /admin/ — Django admin (логин: создай через createsuperuser)
```

### Frontend (терминал №2)

```bash
# 1. Переходим в папку фронта
cd echo/frontend

# 2. Зависимости
npm install

# 3. Переменные окружения фронта
# Создай файл echo/frontend/.env вручную со следующим содержимым:
#
#   VITE_API_BASE_URL=http://127.0.0.1:8000
#   VITE_ENABLE_MOCKS=false
#
# Если бэк ещё не поднят — оставь VITE_API_BASE_URL пустым и поставь
# VITE_ENABLE_MOCKS=true: фронт будет работать на встроенных MSW-моках.

# 4. Запуск dev-сервера
npm run dev
# → http://localhost:5173
```

### Production-сборка фронта

```bash
cd echo/frontend
npm run build      # tsc -b && vite build → dist/
npm run preview    # локальный просмотр собранной версии
```

### Всё в одном скрипте (Linux/macOS)

```bash
# backend
git clone <repo-url> echo && cd echo
python -m venv .venv && source .venv/bin/activate
pip install -r echo/requirements.txt
(cd echo && python manage.py migrate && python scripts/seed_test_data.py)
(cd echo && python manage.py runserver) &

# frontend (в том же или новом терминале)
(cd echo/frontend && npm install && echo "VITE_API_BASE_URL=http://127.0.0.1:8000" > .env && echo "VITE_ENABLE_MOCKS=false" >> .env && npm run dev)
```

### Сид-аккаунты (после `seed_test_data.py`)

| handle | пароль       | роль      |
|--------|--------------|-----------|
| alice  | testpass123  | тестовый  |
| bob    | testpass123  | тестовый  |
| demo   | testpass123  | тестовый  |

У `demo` уже есть чат с `bob` и приветственное сообщение — открывается по `/chats`.

---

## Переменные окружения

### Backend (`echo/.env`)

| Переменная                  | Дефолт                       | Назначение                                |
|----------------------------|------------------------------|-------------------------------------------|
| `DJANGO_SECRET_KEY`        | `django-insecure-...`        | Секрет для подписей/сессий                |
| `DJANGO_DEBUG`             | `True`                       | Django debug mode (`True` / `False`)      |
| `DJANGO_ALLOWED_HOSTS`     | `localhost,127.0.0.1,0.0.0.0` | CSV                                       |
| `CORS_ALLOWED_ORIGINS`     | `http://localhost:5173,...`  | CSV origins для браузерных запросов       |

### Frontend (`frontend/.env`)

| Переменная                 | Дефолт | Назначение                                                              |
|---------------------------|--------|-------------------------------------------------------------------------|
| `VITE_API_BASE_URL`       | `""`   | Если пусто — запросы идут на same-origin (Vite proxy / MSW перехватит)  |
| `VITE_WS_URL`             | `""`   | Базовый URL для WebSocket (заготовка)                                   |
| `VITE_ENABLE_MOCKS`       | `true` | Включает MSW (`true`/`false`, `1`/`0`, `yes`/`on`)                       |
| `VITE_OAUTH_GOOGLE_CLIENT_ID` | `""` | Stub для Google OAuth                                                    |
| `VITE_OAUTH_GITHUB_CLIENT_ID` | `""` | Stub для GitHub OAuth                                                    |
| `VITE_ROUTER_FUTURE`      | `true` | Включает react-router v7 future flags                                    |

---

## Архитектура

### Backend

**Django 6 + DRF**, локальная SQLite. Аутентификация — JWT (simplejwt), access-токен живёт 1 день, refresh — 7 дней. Кастомная модель `users.User` (`AUTH_USER_MODEL = 'users.User'`) расширяет `AbstractUser`.

```
HTTP → urls.py (echo.urls)
  → /api/auth/{register,login,logout}    (users.views)
  → /api/users/{me, me/avatar, <id>}    (users.views)
  → /api/chats{,/<id>{,/messages, /read}}  (chats.views)
       ↓
  DRF ViewSets / APIViews
       ↓
  Сериализаторы (валидация входа/выхода)
       ↓
  ORM → SQLite
       ↓
  Кастомный EXCEPTION_HANDLER (core.exceptions)
  → единый JSON: { code, message, detail? }
```

**Принципы:**
- Никакой бизнес-логики в ViewSet'ах сверх оркестрации — вся валидация/маппинг в сериализаторах.
- URL'ы **без trailing slash** — это часть контракта с фронтом (см. `chats/urls.py`). DRF-роутер не используется, маршруты руками.
- `core.exceptions.api_exception_handler` маппит `ValidationError`/`NotFound`/прочее в плоский JSON, который фронтовая нормализация ошибок умеет читать (`ApiError.code`).

**Доменные модели (`chats/models.py`):**
- `Chat` — `private` / `group`, `participants` (M2M на `users.User`), `name`, `created_at`, `updated_at`.
- `Message` — FK на `Chat`, FK на `sender`, `text`, `created_at`, `is_read`, `is_encrypted` (флаг под E2E, контент шифруется на стороне клиента).

**Эндпоинты:** см. JSON с `GET /` (там же в `echo/urls.py`) — выводит человеко-читаемый список. Полный список ниже в разделе «Контракт API».

### Frontend

**Feature-sliced, не строго FSD, но с тем же разделением слоёв:** `app` (роутинг/провайдеры) → `pages` (роут) → `widgets` (композиция) → `features` (действия) → `shared` (переиспользуемое).

```
main.tsx
  ├─ MSW worker.start()       (если VITE_ENABLE_MOCKS=true)
  └─ createRoot(#root)
       └─ <QueryProvider>     ← TanStack Query
            └─ <BrowserRouter>
                 └─ <AppLayout>  ← Navbar + Outlet + TabBar
                      └─ <Routes>
                           ├─ /            → redirect /chats
                           ├─ /login, /register (PublicOnlyRoute)
                           └─ /chats, /chats/:id, /feed, /profile/:id (ProtectedRoute)
```

**Слои:**

| Слой      | Назначение                                                                                     |
|----------|-------------------------------------------------------------------------------------------------|
| `app/`   | Глобальные провайдеры (Query, Router), защита роутов (`ProtectedRoute`, `PublicOnlyRoute`).       |
| `pages/` | Экраны — один компонент на роут. Не содержат переиспользуемой логики, только композиция виджетов/фич. |
| `widgets/`| Композиция UI-блоков с собственным стилем. `AppLayout`, `Navbar`, `TabBar`.                   |
| `features/`| Действия пользователя (логин, отправка сообщения, лайк). Подключают API + UI.                 |
| `shared/`| Переиспользуемое: API-клиент, zod-схемы, UI-кит, env-конфиг, либы.                              |
| `store/` | Глобальные сторы (auth). Zustand с `persist` в localStorage.                                    |
| `types/` | Доменный контракт фронта (`User`, `Chat`, `ChatMessage`, …).                                   |

**Сетевой слой (`shared/api/`):**

```
endpoints.ts (login, register, fetchMe, fetchChats, fetchChatMessages, …)
     │
     ▼
client.ts (axios instance + ApiError нормализация)
     │
     ▼
model/schemas.ts (zod — вход и выход валидируются)
     │
     ▼
types/domain.ts (типизированный результат)
```

- **Все** исходящие payload-ы валидируются zod'ом (ловим регрессии в форме до запроса).
- **Все** входящие ответы валидируются zod'ом (ловим drift бэкенда).
- `user.ts` — `normalizeApiUser()` адаптирует бэкенд-форму (`username`, `email`, …) в доменную (`handle`, `joinedAt`, `postsCount`, …). Счётчики дефолтятся в 0.

**Auth flow:**

1. `useAuthStore` хранит `{ token, user, status }`. Persist в `localStorage` под ключом `echo.auth`.
2. `hydrateAuth()` на boot берёт токен из стора и прописывает `Authorization: Bearer <token>` в axios defaults.
3. `setAuthToken(t)` вызывается из `setSession`/`clear` — стор сам синхронизирует HTTP-слой.
4. `ProtectedRoute` пускает только при `status === 'authed'`, иначе `Navigate /login replace`.
5. `PublicOnlyRoute` — обратное: если уже залогинен, кидает на `/chats`.

**Mobile-first layout:**

- `<720px`: `TabBar` снизу, `Navbar` скрыт. Порядок: **chats → feed → me → exit** (выход — настоящая кнопка `clear()` + редирект, не ссылка).
- `≥720px`: `Navbar` сверху, `TabBar` скрыт.

**MSW моки:** при `VITE_ENABLE_MOCKS=true` в `main.tsx` стартует `mockServiceWorker.js` из `public/`. Хендлеры живут в `shared/api/mocks/`. Если бэкенд не настроен, страницы чатов/детали чата подменяют данные на демо-объекты (`DEMO_CHAT`, `DEMO_MESSAGES`), чтобы UI был виден в любом режиме.

### Контракт API

Базовый URL: `VITE_API_BASE_URL` (или same-origin через Vite proxy).

| Метод | Путь                              | Назначение              | Auth |
|-------|-----------------------------------|--------------------------|------|
| POST  | `/api/auth/register`              | Регистрация              | —    |
| POST  | `/api/auth/login`                 | Логин (JWT)              | —    |
| POST  | `/api/auth/logout`                | Инвалидация refresh      | ✅   |
| GET   | `/api/users/me`                   | Текущий пользователь     | ✅   |
| GET   | `/api/users/<id>`                 | Профиль пользователя     | ✅   |
| POST  | `/api/users/me/avatar`            | Загрузка аватара         | ✅   |
| GET   | `/api/chats`                      | Список чатов             | ✅   |
| POST  | `/api/chats`                      | Создать чат              | ✅   |
| GET   | `/api/chats/<id>`                 | Детали чата              | ✅   |
| PATCH | `/api/chats/<id>`                 | Переименовать/изменить   | ✅   |
| DELETE| `/api/chats/<id>`                 | Удалить                  | ✅   |
| GET   | `/api/chats/<id>/messages`        | Список сообщений         | ✅   |
| POST  | `/api/chats/<id>/messages`        | Отправить сообщение      | ✅   |
| POST  | `/api/chats/<id>/read`            | Пометить прочитанным     | ✅   |
| GET   | `/api/feed?cursor=`               | Лента постов (курсор)    | ✅   |
| POST  | `/api/feed`                       | Создать пост             | ✅   |

**Формат ошибок (единый):**
```json
{ "code": "invalid_credentials", "message": "wrong email or password", "detail": "..." }
```
На фронте `ApiError` разворачивает это в `{ code, message, status, details? }`.

### Auth и слои защиты

```
┌────────────────────────────────────────────────────────────┐
│  PublicOnlyRoute    (если залогинен → /chats)              │
│    /login, /register                                       │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  ProtectedRoute      (если не залогинен → /login replace)  │
│    /chats, /chats/:id, /feed, /profile/:id                 │
└────────────────────────────────────────────────────────────┘
```

- Токен: `localStorage["echo.auth"].token`, 1 день.
- Refresh-токен хранится в HttpOnly-куке (бэкенд simplejwt) — автоматом не подкладывается в axios, нужен отдельный refresh-flow (заготовка).
- Истёкший 401 → сейчас `ApiError('http', 'unauthorized', 401)`. UI можно расширить: глобальный interceptor → `clear()` + редирект.

---

## Скрипты и команды

### Backend

| Команда                                                | Что делает                                |
|--------------------------------------------------------|-------------------------------------------|
| `python manage.py runserver`                           | Dev-сервер на `:8000`                     |
| `python manage.py migrate`                             | Применить миграции                        |
| `python manage.py makemigrations`                      | Сгенерировать миграции                    |
| `python manage.py createsuperuser`                     | Создать админа для `/admin/`              |
| `python manage.py check`                               | Django-чек конфигурации                   |
| `python scripts/seed_test_data.py`                     | Сид alice/bob/demo + демо-чат             |

### Frontend

| Команда            | Что делает                                  |
|--------------------|---------------------------------------------|
| `npm run dev`      | Vite dev-сервер (HMR) на `:5173`            |
| `npm run build`    | `tsc -b && vite build` → `dist/`            |
| `npm run preview`  | Локальный просмотр production-бандла        |
| `npm run lint`     | ESLint по `eslint.config.js`               |

---

## Стиль кода и решения

- **TypeScript strict.** Все публичные API типизированы; `any` запрещён.
- **Zod на границах.** Не доверяем ни форме (перед POST), ни ответу (после GET).
- **Tailwind отсутствует.** Стили — CSS Modules + дизайн-токены в `styles/global.css` (CSS-переменные, терминальная тема).
- **Нормализация доменной модели на границе.** Бэкенд может называть поле `username`, фронт ждёт `handle` — конвертация в `shared/api/user.ts`, в компоненты уходит уже доменный тип.
- **Демо-фоллбэк.** Если `VITE_API_BASE_URL` пуст и MSW не сконфигурирован, `ChatsPage`/`ChatDetailPage` показывают по одной демо-карточке/сообщениям — UI остаётся видимым.
- **Без trailing slash на API.** Это сознательное решение, зафиксировано в `chats/urls.py` и в axios-клиенте.
- **MSW-воркер** стартует только при явном `VITE_ENABLE_MOCKS=true` — иначе прод-сборка не тянет его.

---

## Лицензия

Private.
