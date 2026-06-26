# Echo: тесты + мобильная адаптация

## Контекст

В проекте `C:\Users\galas\OneDrive\Desktop\Echo` сейчас **0% покрытия тестами**:
- Фронт (`echo/frontend` — Vite+React 19+TS): ни `vitest`, ни `jest`, ни RTL в `package.json`; ни одного `*.test.*` файла.
- Бэк (`echo/` — Django 6 + DRF + Channels): есть только `users/tests.py` с 3 кейсами на `django.test.TestCase` (не pytest), `chats/feed/ai/core` — пустые `tests.py`. `pytest`/`pytest-django`/`factory_boy` не установлены.
- E2E: ничего нет (Playwright не инициализирован).

Параллельно: фронт **уже адаптивен** (viewport-fit=cover, таб-бар ≤720px, safe-area-inset, split-view чата ломается в 1 колонку ≤700px), но не по классическому mobile-first (нет `min-width` брейкпоинтов для контента, нет touch-оптимизаций). Телефон/SMS, PWA, native-обёртка **отложены** пользователем (сегодня сдача).

Цель этой итерации — за один проход:
1. Поднять **инфраструктуру трёх уровней** тестов (Vitest+RTL, pytest, Playwright).
2. Покрыть **critical path** на бэке (auth + chats + feed), **core+UI+формы** на фронте, **E2E-сценарии** на обоих основных viewport'ах (desktop + mobile 360×640) с CSS-чеками адаптивности.

Принципы:
- Минимум новых зависимостей, всё стандартное.
- Co-located тесты на фронте (`*.test.tsx` рядом с компонентом).
- Backend — pytest с фабриками и фикстурами.
- Не трогаем существующий `users/tests.py` (он остаётся для обратной совместимости), но расширяем через pytest.
- Всё в работе должно быть **зелёным** к концу: `npm test`, `pytest`, `npx playwright test`.

## Зависимости

**Frontend** (`echo/frontend/package.json`):
- dev: `vitest@^2` (совместим с Vite 8), `@vitest/coverage-v8@^2`.
- dev: `@testing-library/react@^16`, `@testing-library/dom@^10`, `@testing-library/jest-dom@^6`, `@testing-library/user-event@^14`.
- dev: `jsdom@^25` (окружение для Vitest).
- dev (позже, для E2E): `@playwright/test@^1.49`.

**Backend** (`echo/requirements.txt`):
- dev/test: `pytest>=8`, `pytest-django>=4.8`, `pytest-asyncio>=0.24` (для Channels consumers).
- dev/test: `factory-boy>=3.3`, `faker>=25`.
- dev/test: `pytest-mock>=3.14`, `pytest-cov>=5` (опционально).

---

## План изменений (по слоям)

### Фаза 1 — Frontend: Vitest + RTL

#### 1.1. Инфраструктура

**`echo/frontend/package.json`** — изменить
- В `devDependencies` добавить пакеты из списка выше.
- В `scripts`:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
  - `"test:coverage": "vitest run --coverage"`
  - `"test:ui": "vitest --ui"`

**`echo/frontend/vitest.config.ts` (новый)**
- Расширяет `vite.config.ts` (через `mergeConfig`), добавляет блок `test:`:
  - `environment: 'jsdom'`
  - `globals: true` (но типы импортируем из `vitest/globals` явно)
  - `setupFiles: ['./src/test/setup.ts']`
  - `css: false` (CSS-модули не нужны в тестах UI; где критично — мокаем className)
  - `coverage: { provider: 'v8', reporter: ['text', 'html'], include: ['src/**/*.{ts,tsx}'], exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/types/**'] }`
  - `resolve.alias` — копия из `vite.config.ts` (`@` → `./src`).

**`echo/frontend/src/test/setup.ts` (новый)**
- `import '@testing-library/jest-dom/vitest'`.
- `afterEach(() => cleanup())` — автоматический размонтаж RTL.
- `vi.mock('zustand')` НЕ делаем — у нас стейт тестируется через рендер.
- Мок `matchMedia` (для `prefers-color-scheme`): `Object.defineProperty(window, 'matchMedia', { value: vi.fn().mockImplementation(...) })`.
- Мок `IntersectionObserver` (для sentinel в FeedPage, если дойдёт).
- `vi.stubEnv('VITE_API_BASE_URL', '')` (чтобы api-клиент ходил на same-origin, MSW перехватит).

**`echo/frontend/src/test/msw-server.ts` (новый)**
- Импорт `setupServer` из `msw/node` (входит в `msw@^2`).
- Экспорт `server` — синглтон для всех тестов. Хендлеры прокидываются из тестов индивидуально.

**`echo/frontend/src/test/render.tsx` (новый)**
- `renderWithProviders(ui, options)` — оборачивает в `MemoryRouter` (роутер для страниц) + `QueryClient`-provider с дефолтами (`staleTime: 0`, `retry: false`).
- Для store-тестов — отдельно `renderWithAuth(ui, { user, token })` через `useAuthStore.setState`.

#### 1.2. Co-located unit-тесты

**`src/shared/lib/time.test.ts` (новый)**
- `timeAgo` — граничные кейсы: <60s → "now", <60min → "Nm", <24h → "Nh", ≥24h → дата.
- `clamp` — ниже минимума, в диапазоне, выше максимума.

**`src/shared/api/user.test.ts` (новый)**
- `normalizeApiUser` — все ветки: null avatar/online_status, строковый возраст, числовой birth_date, отсутствующие поля.

**`src/shared/model/schemas.test.ts` (новый)**
- Zod-схемы: позитивные/негативные кейсы `loginPayloadSchema`, `registerPayloadSchema`, `postSchema`, `chatSchema`, `messageSchema`. Проверяем кастомные сообщения об ошибках.

**`src/shared/api/client.test.ts` (новый)**
- `ApiError` конструктор, `mapError` для 401/409/500/network.
- `setAuthToken` — добавляет/чистит `Authorization: Bearer ...`.

**`src/store/auth.test.ts` (новый)**
- `useAuthStore` — `setSession`, `clear`, `setUser`, `setStatus`.
- Persist: `localStorage.getItem('echo.auth')` после `setSession` содержит корректный JSON.
- Axios-синхронизация: после `setSession` — `axios.defaults.headers.common.Authorization` === `Bearer ${token}`; после `clear` — удалён.

**`src/app/ProtectedRoute.test.tsx` + `PublicOnlyRoute.test.tsx` (новые)**
- Protected: `authed=true` → рендерит children; `guest` → редирект на `/login`; `loading` (без user при наличии токена) → спиннер/EmptyState.
- PublicOnly: обратная логика.

**`src/shared/ui/Button.test.tsx` (новый)**
- variants (`primary/secondary/ghost`), sizes (`sm/md/lg`), `loading` показывает спиннер и блокирует клики, `disabled`, `prefix/suffix`, `onClick` callback, `type="submit"` по умолчанию.

**`src/shared/ui/Field.test.tsx` (новый)**
- `label`, `hint`, `error`, `aria-invalid` и `aria-describedby` корректно пробрасываются.

**`src/shared/ui/Card.test.tsx` (новый)**
- `head`, `foot`, `children` — рендерятся, есть дефолтный `as="section"`.

**`src/shared/ui/Avatar.test.tsx` (новый)**
- Глиф из `handle` (первая буква, upper-case), `size` применяется, `online` индикатор.

**`src/features/auth-by-email/AuthForms.test.tsx` (новый)**
- `LoginForm`:
  - рендерит поля email-or-handle + password,
  - submit с пустыми полями → HTML5-валидация / zod-ошибка в `errors.root`,
  - submit с валидными → вызывает `useLoginSubmit` → успех → `useAuthStore.setSession` + `navigate('/chats')`.
  - ошибка 409 → текст в `errors.root`.
- `RegisterForm`: аналогично, проверяем все 4 поля, успех → `setSession` + `navigate`.
- Используем MSW server для мока `/api/auth/login` и `/api/auth/register`.

**`src/features/post-card/PostCard.test.tsx` (новый)**
- Рендер автора, времени, `body`.
- `onLike` callback, `aria-pressed` тогглится.
- Кнопка share: `navigator.share` mock, fallback на `navigator.clipboard.writeText`.

**`src/components/ThemeToggle.test.tsx` (новый)**
- Клик меняет `document.documentElement.dataset.theme` (light ↔ dark), `localStorage` обновляется.

**`src/components/TypingIndicator.test.tsx` (новый)**
- При `typing=false` — `null`. При `typing=true` — три дотса.

**`src/shared/lib/useWebSocket.test.ts` (новый)**
- `vi.stubGlobal('WebSocket', MockWS)` — `MockWS` с эмуляцией open/message/close.
- `VITE_WS_URL=''` → status всегда `'idle'`, send no-op.
- С `VITE_WS_URL=...` → `'connecting'` → `'open'` → message handler вызывается → close → `'closed'` → reconnect с backoff.
- При `document.hidden=true` — пауза (через `Object.defineProperty(document, 'hidden', { value: true })`).

#### 1.3. Page-интеграции (минимум, чтобы покрыть основные экраны)

**`src/pages/login/LoginPage.test.tsx` (новый)**
- Полный flow: ввести email+пароль → клик submit → POST `/api/auth/login` (MSW) → редирект на `/chats`.
- Рендерится в `MemoryRouter(['/login'])`.

**`src/pages/feed/FeedPage.test.tsx` (новый)**
- Mock `/api/feed` → 3 поста. Проверить рендер заголовков, кнопку like (оптимистично +1), индикатор loading→success.

**`src/pages/profile/ProfilePage.test.tsx` (новый)**
- Mock `/api/users/<id>` → отрендерить displayName, handle, bio.

---

### Фаза 2 — Backend: pytest + factory_boy

#### 2.1. Инфраструктура

**`echo/requirements-dev.txt` (новый)**
- Содержит пакеты для тестов: `pytest`, `pytest-django`, `pytest-asyncio`, `factory-boy`, `faker`, `pytest-mock`, `pytest-cov`.

**`echo/pytest.ini` (новый)** или секция в `pyproject.toml`:
```
[pytest]
DJANGO_SETTINGS_MODULE = echo.settings
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -ra --strict-markers --reuse-db
asyncio_mode = auto
markers =
    slow: marks tests as slow
    websocket: tests for channels consumers
```

**`echo/conftest.py` (новый)**
- `pytest_plugins = ['pytest_django']` (если конфиг в `pytest.ini` не подхватывает).
- `api_client` — fixture, возвращает `rest_framework.test.APIClient`.
- `auth_client` — fixture, создаёт пользователя через фабрику, логинит, возвращает `APIClient` с JWT-токеном.
- `make_user` — factory_boy `UserFactory` (`django_get_or_create` не нужен, у нас username).
- `make_chat`, `make_message`, `make_post` — фабрики для других моделей.

**`echo/users/factories.py` (новый)**
- `UserFactory` (factory_boy) с реалистичными дефолтами через `Faker`: `handle`, `displayName`, `email`, `password` (post-generation).

**`echo/chats/factories.py` (новый)**
- `ChatFactory` (private/group), `MessageFactory` с `chat`, `sender`, `text`.

**`echo/feed/factories.py` (новый)**
- `PostFactory`, `PostLikeFactory`.

#### 2.2. Critical path tests (минимум)

**`echo/users/tests/test_auth.py` (новый)**
- `test_register_success` — port из существующего `users/tests.py`, но на pytest + APIClient.
- `test_register_duplicate_handle` → 409 + `code='handle_taken'`.
- `test_register_duplicate_email` → 409 + `code='email_taken'`.
- `test_register_missing_displayName` → 400 + `code='validation'`.
- `test_login_with_email` → 200 + access token.
- `test_login_with_username` → 200 + access token.
- `test_login_wrong_password` → 401 + `code='unauthorized'`.
- `test_login_nonexistent_user` → 401.
- `test_me_unauthenticated` → 401.
- `test_me_authenticated` → 200 + полный профиль.
- `test_logout` → 200.
- `test_avatar_upload` — multipart с Pillow-генерированным PNG.
- `test_avatar_invalid_file` → 400.

**`echo/users/tests/test_serializers.py` (новый)**
- `UserSerializer` — все поля + `age` вычисляется из `birth_date`.
- `UserPublicKeySerializer` — принимает/отдаёт PEM.
- `UserUpdateSerializer` — `handle` / `email` taken, валидация `birth_date` (не в будущем).

**`echo/chats/tests/test_chats.py` (новый)**
- `test_create_private_chat` — POST `/api/chats` с `participants=[other_user.id]` → 201, type='private'.
- `test_create_group_chat` — POST `/api/chats/groups` с `name` + `participants` → 201.
- `test_list_user_chats` — только чаты, где пользователь участник.
- `test_get_chat_detail` — проверка `participants`, `last_message`.
- `test_unauthorized_user_cannot_access_chat` → 403.
- `test_send_message` — POST `/api/chats/<id>/messages` → 201, проверка `sender=current_user`.
- `test_send_message_to_unauthorized_chat` → 403.
- `test_mark_messages_read` — POST `/api/chats/<id>/messages/read` → обновляет `is_read`/`read_at`.
- `test_upload_file` — multipart с Pillow PNG.
- `test_upload_file_too_large` → 400.

**`echo/feed/tests/test_feed.py` (новый)**
- `test_list_posts` — GET `/api/feed` → посты в обратном хронологическом порядке.
- `test_create_post` — POST `/api/feed` → 201, автор = current user.
- `test_like_post` — POST `/api/feed/<id>/like` → `likedByMe=true`, `likes+1`.
- `test_unlike_post` — повторный POST → `likedByMe=false`, `likes` обратно.
- `test_cannot_like_nonexistent_post` → 404.
- `test_post_serializer_camelCase` — проверка ключей `createdAt`, `likedByMe`, `author`.

**`echo/ai/tests/test_views.py` (новый)**
- `test_smart_reply_unauthenticated` → 401.
- `test_smart_reply_no_api_key` (DEEPSEEK_API_KEY='') → 503.
- `test_smart_reply_success` — мок `requests.post` через `pytest-mock` → 200 + проверка payload.
- `test_moderate_toxic` — мок ответа DeepSeek с `toxic=true` → возвращается `isToxic=true`.
- `test_translate` — мок + проверка переданного `target_lang`.
- `test_summary_chat_not_found` → 404.

**`echo/chats/tests/test_websocket.py` (новый)** (с маркером `websocket`)
- `test_connect_unauthenticated` — `WebsocketCommunicator` без токена → close.
- `test_connect_authenticated` — `WebsocketCommunicator` с JWT → accept.
- `test_send_message_broadcasts` — `chat:send` → `chat:message` event другим участникам.
- `test_send_message_not_a_participant` → close с error code.
- Использовать `pytest-asyncio` (auto mode).

#### 2.3. Модели (smoke)

**`echo/users/tests/test_models.py` (новый)**
- `User.age` корректно из `birth_date`.
- `User.age` без `birth_date` → `None`.
- `User.short_bio` — обрезка до 80 символов.

**`echo/chats/tests/test_models.py` (новый)**
- `Chat.get_last_message` — последнее по дате.
- `Message.mark_as_read` → `is_read=True`, `read_at` не None.
- `Chat.get_unread_count(user)` — корректно считает.

**`echo/feed/tests/test_models.py` (новый)**
- `PostLike` unique_together защищает от дублей (повторный like → IntegrityError).

---

### Фаза 3 — E2E: Playwright + мобильная адаптация

#### 3.1. Инфраструктура

**`echo/frontend/package.json`** — изменить
- dev: `@playwright/test@^1.49`.
- scripts: `"e2e": "playwright test"`, `"e2e:ui": "playwright test --ui"`.

**`echo/frontend/playwright.config.ts` (новый)**
- `testDir: './e2e'`.
- `timeout: 30_000`.
- `use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry', screenshot: 'only-on-failure' }`.
- `webServer` — два процесса: backend (Django runserver :8000) + frontend (vite preview :4173 после build). **Лучше: одиночный `npm run preview` + ручной запуск Django** (быстрее для локальной разработки). Параметризуем через `BASE_URL` env.
- `projects`:
  - `{ name: 'desktop-chromium', use: devices['Desktop Chrome'] }`
  - `{ name: 'mobile-pixel', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 640 } } }` (явно mobile-viewport)
  - `{ name: 'mobile-iphone-se', use: devices['iPhone SE'] }` (узкий 375×667)
- `expect: { toMatchSnapshot: { maxDiffPixels: 50 } }` (для CSS-чеков).

#### 3.2. E2E-сценарии

**`echo/frontend/e2e/auth.spec.ts` (новый)**
- Desktop: открыть `/login`, заполнить `seed_alice / testpass123` (используем `alice` из `scripts/seed_test_data.py`), submit → ожидаем редирект на `/chats` → видим сайдбар с чатами.
- Mobile (Pixel 7): тот же сценарий — после логина ожидаем видимость `<nav class="tabbar">` (нижний таб-бар), отсутствие десктопного `<nav class="navbar">`.

**`echo/frontend/e2e/feed.spec.ts` (новый)**
- Логин как `alice` → переход на `/feed` → видим посты (минимум 1).
- Создание поста: ввод в `<textarea>`, submit → новый пост в начале списка.
- Лайк: клик по сердцу → счётчик `+1` (DOM-state).
- Mobile: тот же flow + проверка, что композер в нижней части, не перекрывается таб-баром (визуально через скриншот-сравнение).

**`echo/frontend/e2e/chats.spec.ts` (новый)**
- Логин → переход на `/chats` → видим список чатов.
- Клик по чату → справа (desktop) или на отдельном экране (mobile) появляется `ChatPanel`.
- Отправка сообщения: ввести текст, Enter → сообщение в ленте.
- Mobile split-view: на 360×640 — после клика по чату URL меняется на `/chats/<id>`, видим `ChatPanel` (sidebar скрыт — `display: none`).

**`echo/frontend/e2e/responsive.spec.ts` (новый)** — **CSS-чеки адаптивности**
- На `mobile-pixel` (`width: 360`):
  - `expect(page.locator('nav.tabbar')).toBeVisible()`.
  - `expect(page.locator('nav.navbar')).toBeHidden()`.
  - `getComputedStyle(document.documentElement).getPropertyValue('--tabbar-h')` не пустая.
  - В `<head>` есть `<meta name="viewport" ... viewport-fit=cover>`.
  - Скриншот главной страницы (`/chats`) — сравниваем с базой (`e2e/snapshots/mobile-chats.png`).
- На `desktop-chromium`:
  - `expect(page.locator('nav.navbar')).toBeVisible()`.
  - `expect(page.locator('nav.tabbar')).toBeHidden()`.
  - Скриншот `/chats` — сравниваем с `e2e/snapshots/desktop-chats.png`.
- На `mobile-iphone-se` (узкий viewport): проверить, что `LoginPage` (max-width: 420px) не вылезает за пределы, нет горизонтального скролла: `expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)`.

**`echo/frontend/e2e/snapshots/` (новая папка)**
- Базовые скриншоты: `mobile-chats.png`, `desktop-chats.png`, `mobile-login.png`.

---

## Сводка по файлам

**Новые (frontend):**
- `vitest.config.ts`
- `playwright.config.ts`
- `src/test/setup.ts`
- `src/test/msw-server.ts`
- `src/test/render.tsx`
- `src/shared/lib/time.test.ts`
- `src/shared/api/user.test.ts`
- `src/shared/api/client.test.ts`
- `src/shared/model/schemas.test.ts`
- `src/store/auth.test.ts`
- `src/app/ProtectedRoute.test.tsx`
- `src/app/PublicOnlyRoute.test.tsx`
- `src/shared/ui/Button.test.tsx`
- `src/shared/ui/Field.test.tsx`
- `src/shared/ui/Card.test.tsx`
- `src/shared/ui/Avatar.test.tsx`
- `src/features/auth-by-email/AuthForms.test.tsx`
- `src/features/post-card/PostCard.test.tsx`
- `src/components/ThemeToggle.test.tsx`
- `src/components/TypingIndicator.test.tsx`
- `src/shared/lib/useWebSocket.test.ts`
- `src/pages/login/LoginPage.test.tsx`
- `src/pages/feed/FeedPage.test.tsx`
- `src/pages/profile/ProfilePage.test.tsx`
- `e2e/auth.spec.ts`
- `e2e/feed.spec.ts`
- `e2e/chats.spec.ts`
- `e2e/responsive.spec.ts`
- `e2e/snapshots/`

**Изменяемые (frontend):**
- `package.json` (зависимости + scripts)
- `vite.config.ts` (если vitest.config.ts не отдельный — расширить блок `test:`; ниже пойдём через отдельный файл)

**Новые (backend):**
- `pytest.ini`
- `conftest.py`
- `requirements-dev.txt`
- `users/factories.py`
- `users/tests/__init__.py` (пакет)
- `users/tests/test_auth.py`
- `users/tests/test_serializers.py`
- `users/tests/test_models.py`
- `chats/factories.py`
- `chats/tests/__init__.py`
- `chats/tests/test_chats.py`
- `chats/tests/test_models.py`
- `chats/tests/test_websocket.py`
- `feed/factories.py`
- `feed/tests/__init__.py`
- `feed/tests/test_feed.py`
- `feed/tests/test_models.py`
- `ai/tests/__init__.py`
- `ai/tests/test_views.py`

**Без изменений:**
- `users/tests.py` (оставляем как есть, для обратной совместимости с `python manage.py test`).

---

## Ключевые принципы реализации

- **Co-located на фронте** — `*.test.tsx` рядом с компонентом, импорты короткие, удаление = удаление теста.
- **MSW в node-окружении** — `msw/node` уже входит в `msw@^2`. Хендлеры переиспользуем из `src/shared/api/mocks/handlers.ts` (если они там), иначе — пишем test-specific handlers в `e2e/*.spec.ts` через `page.route()`.
- **Backend — pytest-django** + `--reuse-db` для скорости, фикстуры через factory_boy. Throttling в тестах отключаем (`@override_settings(REST_FRAMEWORK={...DEFAULT_THROTTLE_CLASSES: ()})`) — иначе 1000/day быстро кончится.
- **Не трогаем бэк-логику** — только добавляем тесты, никаких фиксов, кроме случаев когда `users/tests.py` дублируется с новыми (его не удаляем, новые — в `users/tests/test_auth.py`).
- **WebSocket** — `channels.testing.WebsocketCommunicator`, JWT-токен передаётся через `scope['query_string'] = b'token=...'` (как на фронте в `useWebSocket`).
- **Playwright** — три проекта (desktop + два mobile-viewport'а), `responsive.spec.ts` снимает скриншоты и сравнивает с базой — это наш «CSS-чек адаптивности». Без рефакторинга mobile-first (по решению пользователя).
- **Snapshot'ы Playwright** — только на главных страницах, `maxDiffPixels: 50` (допуск на антиалиасинг). Если сильно разъезжаются — это сигнал на регрессию вёрстки.
- **Lint/build** фронта должны остаться зелёными; новые ESLint-правила не вводим.

---

## Верификация (как проверять)

1. **Backend:**
   - `cd echo && pip install -r requirements-dev.txt`
   - `pytest -v` — все тесты зелёные, выход 0.
   - `pytest --cov=users --cov=chats --cov=feed --cov=ai` — coverage critical path.
   - `python manage.py test users` — старый `users/tests.py` тоже зелёный.
2. **Frontend (unit):**
   - `cd echo/frontend && npm install`
   - `npm test` — все Vitest-тесты зелёные.
   - `npm run test:coverage` — coverage ≥ 60% по `src/shared/**`, `src/store/**`, `src/features/**`.
   - `npm run build` и `npm run lint` — без ошибок.
3. **E2E:**
   - Поднять Django (`python manage.py runserver`) и засеять данные (`python scripts/seed_test_data.py`).
   - `npm run e2e` — все три проекта (desktop, mobile-pixel, mobile-iphone-se) зелёные.
   - Скриншоты в `e2e/snapshots/` совпадают с базой.
4. **Mobile-чек:** на mobile-pixel-project — Playwright `responsive.spec.ts` явно проверяет видимость `tabbar`/скрытие `navbar` и отсутствие горизонтального скролла на LoginPage.

---

## Что НЕ делаем в этой итерации (отложено)

- Телефон/SMS-аутентификация (отдельная фича, требует SMS-провайдера).
- PWA: manifest, service worker, push-уведомления, офлайн.
- Native-обёртка (Capacitor / React Native).
- Рефакторинг mobile-first (`min-width` брейкпоинты для контента, touch-оптимизации, адаптация LoginPage под 360px).
- AI integration-тесты с реальным DeepSeek (только мок).
- Stress/perf-тесты.
- Visual regression на ВСЕ страницы (только главные: `/chats`, `/feed`, `/login`).
- Тесты для `core/upload.py` (валидация файлов) — не critical path.
- Тесты для `useTheme` (ThemeToggle покрывает достаточно).
- Тесты для `useHotkeys`/`Cheatsheet` (это UI из старого плана, не в фокусе).

---

## Порядок коммитов (для review-пригодности)

1. **chore(frontend): add vitest + RTL infrastructure** — только конфиги и setup. Один smoke-тест, чтобы доказать, что `npm test` зелёный.
2. **test(frontend): unit-тесты для shared/lib, shared/api, shared/model, store** — чистые функции, схемы, стор.
3. **test(frontend): unit-тесты для shared/ui** — Button, Field, Card, Avatar.
4. **test(frontend): тесты для ProtectedRoute, PublicOnlyRoute, ThemeToggle, TypingIndicator, useWebSocket**.
5. **test(frontend): тесты для features (auth-by-email, post-card)** — с MSW.
6. **test(frontend): интеграционные тесты для LoginPage, FeedPage, ProfilePage**.
7. **chore(backend): add pytest + factory_boy infrastructure** — `requirements-dev.txt`, `pytest.ini`, `conftest.py`, фабрики. Один smoke-тест.
8. **test(backend): users tests** — auth + serializers + models.
9. **test(backend): chats tests** — REST + models + websocket.
10. **test(backend): feed tests** — REST + models.
11. **test(backend): ai tests** — мок DeepSeek.
12. **chore(frontend): add Playwright infrastructure** — конфиг, scripts, браузеры через `npx playwright install`.
13. **e2e(frontend): auth + feed + chats flows** — базовые сценарии на desktop + mobile.
14. **e2e(frontend): responsive CSS checks + snapshots** — финальный коммит с визуальной верификацией.

Каждый коммит — все три уровня тестов остаются зелёными (`npm test && pytest && npm run e2e` в dry-run).
