# Echo frontend: 1.1–1.10 + 2.1

## Context

Фронтенд `echo/frontend` сейчас — крепко собранное, но всё ещё «болталoчное» SPA: хардкод-токены только под тёмную тему, нет PWA-манифеста, на `loading` показывается «empty» (`EmptyState`), лайк мутирует массив без сервера, при 401 ничего не происходит, `useAuthStore.status` объявлен но не выставляется, фид игнорирует `nextCursor`, нет горячих клавиш, нет share, нет `<noscript>`-фолбеков. Слой данных — `useState`+`useEffect`+`useRef` в каждой странице, что при росте превратится в боль.

Цель этой итерации — за один проход прокачать пользовательский опыт (темы, PWA, скелетоны, пагинация, лайки, рекавери 401, шорткаты, share, корректный loading) и заложить data-слой, на который ляжет всё остальное (комменты, поиск, нотисы).

Принципы:
- Не трогаем бекенд и MSW-моки (по выбору пользователя).
- Используем уже существующие паттерны: zustand+persist, zod, `useWebSocket`, `ApiError`, design-tokens.
- Сохраняем FSD-layout (`app/widgets/features/shared`).
- Один TanStack Query пакет — и им заменяем всю ручную работу с эффектами на страницах.
- Каждое изменение — маленький, ревью-пригодный шаг. В конце — зелёный `npm run build` + `npm run lint`.

## Зависимости

В `echo/frontend/package.json`:
- prod: `@tanstack/react-query@^5` (текущая стабильная линейка).
- prod: `@tanstack/react-query-devtools@^5` — только в dev (через `import.meta.env.DEV`).

Никаких других новых пакетов.

---

## План изменений (по файлам)

### 1. Bootstrap и data-слой (TanStack Query)

**`echo/frontend/src/app/QueryProvider.tsx` (новый)**
- Создаёт `QueryClient` с `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: true`.
- Оборачивает `<App/>`, подключает `ReactQueryDevtools` под `import.meta.env.DEV`.

**`echo/frontend/src/main.tsx`** — изменить
- После `hydrateAuth()` дополнительно `await import('@/app/QueryProvider')` не нужно — он импортируется синхронно в `App.tsx`.
- Никакой другой логики не меняем.

**`echo/frontend/src/app/App.tsx`** — изменить
- Обернуть `<BrowserRouter>` в `<QueryProvider>`.

### 2. Темы (1.1)

**`echo/frontend/src/styles/global.css`** — изменить
- Сейчас токены заданы жёстко в `:root`. Заменяем на:
  - `:root` — тёмная тема (текущие значения), но `--bg-soft: #101413`, `--bg: #0b0d0c` и т.д.
  - `:root[data-theme="light"]` — светлая (инверсия палитры: `--bg: #f6f8f6`, `--bg-soft: #ffffff`, `--bg-sunk: #ecefee`, `--paper: #0b0d0c`, `--paper-ink: #e8efe9`, `--line: #dbe2dc`, `--line-soft: #e8ede9`, `--fg: #0b0d0c`, `--fg-dim: #46514a`, `--fg-mute: #6f7a72`, `--fg-faint: #c0c8c2`, `--accent: #1f7a3a`, `--accent-2: #16622e`, `--warn: #8a6a17`, `--danger: #b13030`).
  - `body` background-image в светлой теме — уменьшить opacity зерна до 0.
  - Добавить `<meta name="color-scheme" content="dark light">` мы не можем в CSS — это в HTML.

**`echo/frontend/index.html`** — изменить
- `<meta name="color-scheme" content="dark light">` вместо `dark`.
- Подключить `public/manifest.webmanifest` через `<link rel="manifest">` (см. п. 3).
- Добавить `theme-color` под обе темы через `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b0d0c">` + светлый вариант.

**`echo/frontend/src/store/theme.ts` (новый)**
- zustand-стор с `persist` в `localStorage` (`name: 'echo.theme'`).
- Состояние: `theme: 'dark' | 'light'`, методы `set(t)`, `toggle()`, `apply()`.
- На init: если в storage нет — читаем `window.matchMedia('(prefers-color-scheme: light)')` и пишем в стор; подписываемся на изменения системной темы только если пользователь явно не выбирал (отдельный флаг `userOverride`).
- Метод `apply()` проставляет `document.documentElement.dataset.theme`.

**`echo/frontend/src/shared/lib/useTheme.ts` (новый)**
- Удобный хук: `const { theme, toggle } = useTheme()`. Подписывается на стор и возвращает актуальное значение.

**`echo/frontend/src/main.tsx`** — изменить
- Перед `bootstrap` (внутри неё) — `import { useThemeStore } from '@/store/theme'; useThemeStore.getState().apply();` — чтобы избежать flash of unstyled content (FOUC) при перезагрузке.

**`echo/frontend/src/widgets/navbar/Navbar.tsx`** — изменить
- В блок `.right` добавить `<Button size="sm" variant="ghost" onClick={toggle} aria-label="toggle theme">` с глифом `◐` (или `[D]`/`[L]` в ASCII-стиле).
- Скрывать кнопку на мобиле через `display: none` в `Navbar.module.css` (если места нет) — но судя по layout, поместится.

### 3. PWA (1.2)

**`echo/frontend/public/manifest.webmanifest` (новый)**
- `name: "Echo"`, `short_name: "echo"`, `start_url: "/feed"`, `scope: "/"`, `display: "standalone"`, `background_color: "#0b0d0c"`, `theme_color: "#0b0d0c"`, `icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }]`.

**`echo/frontend/public/icon-192.png`, `icon-512.png` (новые)**
- Минимальные PNG-плейсхолдеры (квадрат 1×1, или простой моно-глиф на тёмном фоне). Чтобы не плодить ассеты, сделаю base64-инициализацию inline в `vite.config.ts` через `emitFile`, либо сгенерирую минимальный PNG скриптом. Альтернатива — `<link rel="icon" href="data:image/svg+xml,...">` в `index.html` для favicon и `purpose: any` без отдельных иконок (manifest это позволяет, если в `icons` указан только `purpose: any`).

**Решение по иконкам:** создам один SVG-favicon (`public/favicon.svg`) с глифом `~` в цвете `--accent`, пропишу `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` в `index.html`. В `manifest.webmanifest` в `icons` укажу только `src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any"` — этого достаточно для PWA-install (PWA-install примет svg).

**`echo/frontend/index.html`** — изменить
- Добавить `<link rel="manifest" href="/manifest.webmanifest">`, `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`.

**`echo/frontend/public/favicon.svg` (новый)** — глиф `~` 32×32, `fill: #7ee787`, `font-family: monospace`.

### 4. Skeleton и Error/Loading/Empty states (1.3, 4.2, 4.6)

**`echo/frontend/src/shared/ui/Skeleton.tsx` + `Skeleton.module.css` (новые)**
- `<Skeleton width="..." height="..."/>` — блочный плейсхолдер с мигающим фоном (анимация `skeleton-pulse`).
- `width`/`height` — числа (px) или строки.

**`echo/frontend/src/shared/ui/ErrorState.tsx` + `ErrorState.module.css` (новые)**
- API: `{ glyph = "!!", title, body?, onRetry? }`.
- Визуально — `.frame` с `--danger` акцентом, в ASCII-стиле.

**`echo/frontend/src/shared/ui/index.ts`** — изменить
- Экспортировать `Skeleton`, `ErrorState`.

**`echo/frontend/src/pages/feed/FeedPage.tsx`** — изменить
- Заменить inline-блок `<div className="frame">! {error}</div>` на `<ErrorState title="feed load failed" body={error} onRetry={refetch} />`.
- Скелетоны в `loading` (см. п. 5) — будут идти через `useFeed`.

**`echo/frontend/src/pages/profile/ProfilePage.tsx`** — изменить
- Аналогично: `<Skeleton ... />` + `<ErrorState />` + `useUser(id)`.

### 5. Data-слой: hooks на TanStack Query (2.1)

**`echo/frontend/src/shared/api/keys.ts` (новый)**
- Централизованные query-ключи: `keys.feed.list()`, `keys.feed.detail(id)`, `keys.me()`, `keys.user(id)`.

**`echo/frontend/src/shared/api/queries.ts` (новый)**
- `useMe()` — `useQuery({ queryKey: keys.me(), queryFn: fetchMe, enabled: hasToken, retry: false })`.
- `useUser(id)` — `useQuery({ queryKey: keys.user(id), queryFn: () => fetchUser(id), enabled: Boolean(id) })`.
- `useFeed()` — `useInfiniteQuery({ queryKey: keys.feed.list(), queryFn: ({ pageParam }) => fetchFeed(pageParam), initialPageParam: null, getNextPageParam: (last) => last.nextCursor })`.
- `useCreatePost()` — `useMutation({ mutationFn: createPost, onSuccess: (post) => qc.setQueryData(keys.feed.list(), ...) })`. Оптимистично вставляет в начало первой страницы.
- `useToggleLike()` — `useMutation({ mutationFn: (postId) => likePost(postId) })`. Оптимистично апдейтит `keys.feed.list()` и `keys.user(id)`. На ошибке — откат.

**`echo/frontend/src/shared/api/endpoints.ts`** — изменить
- Добавить `likePost(id)`, `unlikePost(id)` (вызывают `POST/DELETE /api/feed/:id/like` — бек может ответить 404 на DELETE, окей, мы ловим в моке позже). Для совместимости с текущим MSW-контрактом (мок сейчас не обрабатывает эти роуты) — `likePost` падает в catch с `ApiError`, а наш `useToggleLike` это нормально обработает. Документируем: моки не покрывают лайк, в prod — ок.
- Импортируем `useQueryClient` из `@tanstack/react-query` локально внутри `useCreatePost`/`useToggleLike` — НЕ top-level.

**`echo/frontend/src/pages/feed/FeedPage.tsx`** — переписать
- Полностью на хуки: `const me = useMe(); const feed = useFeed(); const create = useCreatePost(); const like = useToggleLike();`.
- WS-инжекции: `useEffect` слушает `feed.snapshot`/`post.created` и через `qc.setQueryData` обновляет `keys.feed.list()`. Это правильный путь — query остаётся source of truth, WS его дополняет.
- `IntersectionObserver` на «sentinel» `<li>` внизу списка, вызывает `feed.fetchNextPage()`. Loader-строка во время `isFetchingNextPage`.
- `<ErrorState onRetry={() => feed.refetch()} />` на `isError`.
- Скелетоны 4 штуки на `isLoading && !feed.data`.

**`echo/frontend/src/pages/profile/ProfilePage.tsx`** — переписать
- На `useUser(id)`.
- `<ErrorState/>` / `<Skeleton/>` / данные.
- Кнопка follow остаётся stub (см. план 3.7) — но иконка/состояние «pending» уже через `useMutation`.

**`echo/frontend/src/app/ProtectedRoute.tsx`** — изменить
- Использовать `useMe()`: пока `isLoading` — рендерим `<EmptyState title="..." />`; `isError` — редирект на login; success — children.

### 6. Оптимистичный лайк (1.5) + 401-обработка (1.6) + useAuthStatus (1.7)

**`echo/frontend/src/shared/api/client.ts`** — изменить
- В `api.interceptors.response`:
  - На 401 (кроме `/api/auth/login`, `/api/auth/register`) → импортировать `useAuthStore`, вызвать `clear()`, пробросить ошибку дальше. (Делаем lazy-import чтобы избежать цикла.)
  - Возвращать `Promise.reject` как сейчас.

**`echo/frontend/src/store/auth.ts`** — изменить
- Добавить хелпер `getStatus()`: `'authed'` если `token && user`, `'guest'` если `!token`, `'loading'` если `token && !user`.
- Не вводим отдельный side-effect в `setSession` — статус считается на лету.

**`echo/frontend/src/shared/lib/useAuthStatus.ts` (новый)**
- `useAuthStatus()` — возвращает `{ status: 'loading' | 'authed' | 'guest', user, isHydrated }`. `isHydrated` нужен, потому что `persist` rehydrates асинхронно, и на первом рендере мы ещё не знаем, что в storage.
- Реализация: внутри хука подписываемся на `useAuthStore.persist.onFinishHydration` (zustand v5 API), и до того как hydration завершена — `status: 'loading'`.

**`echo/frontend/src/main.tsx`** — изменить
- Дождаться hydration auth перед `createRoot.render()`. С `persist` это `await useAuthStore.persist.rehydrate()`. Если token есть — дёргаем `useMe()` сразу (через `qc.prefetchQuery(keys.me(), fetchMe)`), но не блокируем UI.

**`echo/frontend/src/app/ProtectedRoute.tsx`** — изменить
- Использовать `useMe()` + `useAuthStatus()`. Пока `!isHydrated || isLoading` — спиннер/`<EmptyState title="booting…">`. На 401 — `clear()` уже сработал в интерсепторе, редирект.

### 7. Share (1.8) + шорткаты (1.9) + aria-live для WS (1.10)

**`echo/frontend/src/features/post-card/PostCard.tsx`** — изменить
- В `foot` добавить кнопку `<button onClick={onShare}>`. `onShare` принимает `Post`, делает `navigator.share({ title, text, url }) ?? navigator.clipboard.writeText(url)`. Внутри карточки — простой try/catch.

**`echo/frontend/src/shared/lib/useHotkeys.ts` (новый)**
- `useHotkeys(map: Record<string, (e: KeyboardEvent) => void>, options?: { enabled?: boolean })`. Слушает `keydown` на `document`, игнорирует если `e.target` в `<input>/<textarea>/[contenteditable]`, уважает `prefers-reduced-motion` (опционально), корректно снимается в cleanup.

**`echo/frontend/src/widgets/app-layout/AppLayout.tsx`** — изменить
- Подключить `useHotkeys` с маппингом:
  - `j`/`k` — листать список постов в `FeedPage` (через custom event `feed:next` / `feed:prev`).
  - `n` — фокус на `<textarea>` композера (через `document.querySelector('textarea')`).
  - `/` — фокус на search-input (пока нет — noop).
  - `?` — открыть `<dialog>` с шорткат-чит-шитом.

**`echo/frontend/src/features/hotkeys-cheatsheet/Cheatsheet.tsx` + `.module.css` (новые)**
- `<dialog>` с таблицей шорткатов. Открывается по `?`, закрывается по `Esc` или клику вне. Без `react-router` — используем `showModal()`/`close()`.

**`echo/frontend/src/pages/feed/FeedPage.tsx`** — изменить
- На `post.created` через WS показывать тонкий `<aside role="status" aria-live="polite">` с текстом `~ new post: @handle` на 2 секунды (CSS-анимация, без react-transition).

---

## Сводка по файлам

Новые:
- `src/app/QueryProvider.tsx`
- `src/store/theme.ts`
- `src/shared/lib/useTheme.ts`
- `src/shared/lib/useAuthStatus.ts`
- `src/shared/lib/useHotkeys.ts`
- `src/shared/api/keys.ts`
- `src/shared/api/queries.ts`
- `src/shared/ui/Skeleton.tsx` + `.module.css`
- `src/shared/ui/ErrorState.tsx` + `.module.css`
- `src/features/hotkeys-cheatsheet/Cheatsheet.tsx` + `.module.css`
- `public/manifest.webmanifest`
- `public/favicon.svg`

Изменяемые:
- `package.json` (+ `@tanstack/react-query`, + `@tanstack/react-query-devtools`)
- `index.html` (color-scheme, manifest, favicon, theme-color)
- `src/main.tsx` (await hydration, theme.apply)
- `src/app/App.tsx` (обернуть в QueryProvider)
- `src/app/ProtectedRoute.tsx` (useAuthStatus + useMe)
- `src/styles/global.css` (темы)
- `src/widgets/app-layout/AppLayout.tsx` (useHotkeys)
- `src/widgets/navbar/Navbar.tsx` (кнопка темы)
- `src/widgets/navbar/Navbar.module.css` (стиль кнопки)
- `src/pages/feed/FeedPage.tsx` (TanStack + скелетоны + пагинация + лайк + WS aria-live)
- `src/pages/feed/FeedPage.module.css` (sentinel, new-post flash)
- `src/pages/profile/ProfilePage.tsx` (TanStack + ErrorState + Skeleton)
- `src/store/auth.ts` (helpers)
- `src/shared/api/client.ts` (401 handler)
- `src/shared/api/endpoints.ts` (likePost/unlikePost)
- `src/shared/ui/index.ts` (экспорты)
- `src/features/post-card/PostCard.tsx` (share button)

---

## Ключевые принципы реализации

- **Не вводить новые state-контейнеры поверх zustand-стора** — для data-кеша это TanStack Query, для UI-стейта — локальный `useState` в фиче, для auth/theme — zustand как есть.
- **MSW не трогаем.** `useToggleLike` будет вызывать 404 в моках — обработаем через `retry: false` и `onError` с rollback оптимистичной мутации. В prod-режиме бекенд будет.
- **WS и Query-cache**: `useEffect` слушает `useWebSocket` и через `queryClient.setQueryData(keys.feed.list(), ...)` мерджит новое. Source of truth остаётся query-cache, а не локальный `useState`.
- **Шорткаты не должны ломать формы** — `useHotkeys` фильтрует `<input>/<textarea>/[contenteditable]`.
- **Тема применяется до рендера** — `useThemeStore.getState().apply()` в начале `bootstrap` (до `createRoot.render`), плюс подписка на стор в `useEffect` для runtime-переключений.
- **Hydration flash**: zustand `persist.rehydrate()` возвращает Promise; в `main.tsx` await'им перед `createRoot.render`. Это убирает «flash of guest» при reload страницы с активной сессией.
- **Lint/build должны быть зелёными** — `noUnusedLocals/Parameters`, `verbatimModuleSyntax` (используем `import type` где нужно), `erasableSyntaxOnly` (никаких enum/namespace).

---

## Верификация (как проверять)

1. **Билд**: `cd echo/frontend && npm run build` — должен пройти без TS-ошибок.
2. **Линт**: `npm run lint` — без warning'ов.
3. **Dev-сервер**: `npm run dev` — открыть `http://localhost:5173`:
   - **Темы**: тоггл в Navbar меняет `data-theme` на `<html>`, светлая тема — палитра инвертирована, контраст читаем, все компоненты (кнопки, поля, посты, композер) выглядят консистентно.
   - **PWA**: DevTools → Application → Manifest — Echo, иконка, start_url, theme_color; Lighthouse → PWA — installable.
   - **Skeleton**: при первой загрузке фида — 4 плейсхолдера, потом реальные посты.
   - **Error/Loading/Empty**: выключить сеть → перезагрузить → `ErrorState` с retry; залогиниться как `ada/password` — фид наполняется.
   - **Пагинация**: пока в моках `nextCursor: null` — UI не показывает «load more». После того как мы добавим ещё 30 фиктивных постов в мок (отдельным коммитом, не в этой итерации) — `useInfiniteQuery` подхватит.
   - **Лайк**: клик по сердцу → счётчик меняется мгновенно, через 200–500 мс мок ответит 404 (т.к. мы не трогали хендлер), query откатит. В консоли — `ApiError`, оптимистичный UI не «залипает».
   - **401**: очистить `localStorage` token в DevTools, дёрнуть `api.get('/api/users/me')` через консоль — store очистится, редирект на `/login`.
   - **WS aria-live**: в DevTools Network — мок WS-но нет, поэтому нового поста не будет. Чтобы проверить визуально — добавить временный `setInterval` в `handlers.ts`, отправляющий `post.created` (только для локальной проверки; в этом PR мок не меняем).
   - **Шорткаты**: `j`/`k` листают посты, фокус-индикатор виден; `n` ставит курсор в `<textarea>`; `?` открывает диалог с подсказками; `Esc` закрывает. В полях ввода шорткаты не работают.
   - **Share**: кнопка в PostCard → `navigator.share()` (если поддерживается) или копирование в буфер (в консоли — `[Clipboard] ✓`).
4. **a11y smoke-test**:
   - DevTools → Lighthouse → Accessibility — оценка не падает ниже предыдущей.
   - VoiceOver/NVDA (если доступен) — `aria-live="polite"` на новом посте, `aria-label` на кнопке темы и share.
5. **Smoke на навигацию**: refresh на `/feed` — нет «flash of guest» (если токен есть, композер появляется без мигания).

---

## Что НЕ делаем в этой итерации (отложено)

- Светлая тема для `Avatar` глифов и неоновых акцентов — если что-то выглядит не идеально, чиним в следующей итерации.
- Markdown/линкификация в `post.body` (п. 3.4).
- Edit/Delete постов (п. 3.6).
- Follow/unfollow (п. 3.7).
- Сторибук, vitest (п. 2.4, 2.5).
- A11y deep-аудит (п. 2.7).
- Виртуализация (п. 2.8) — `useInfiniteQuery` сначала, виртуализация когда постов станет >200.

---

## Порядок коммитов (для review-пригодности)

1. **chore: add @tanstack/react-query and provider** — только зависимости + `QueryProvider` + подключение в `App.tsx`. Билд зелёный.
2. **feat(theme): dark/light theme with system preference + toggle in navbar** — store, хук, токены, кнопка, apply до рендера.
3. **feat(pwa): manifest + favicon + theme-color** — html, manifest, svg.
4. **feat(ui): Skeleton + ErrorState components, export from shared/ui** — без потребителей.
5. **feat(api): likePost/unlikePost endpoints + useMe/useUser/useFeed/useCreatePost/useToggleLike queries** — без потребителей страниц.
6. **refactor(feed): migrate FeedPage to TanStack Query, add pagination + optimistic like + ws aria-live + sentinel** — самая большая замена. Билд + ручная проверка.
7. **refactor(profile): migrate ProfilePage to TanStack Query + ErrorState + Skeleton**.
8. **feat(auth): useAuthStatus + 401 handler in client + await hydration in main**.
9. **feat(ux): share button in PostCard, useHotkeys hook, j/k/n/? cheatsheet**.
10. **chore: fix lint warnings, verify build**.

Каждый коммит — `npm run lint && npm run build` зелёные, `git status` чистый только в пределах темы коммита.
