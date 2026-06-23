# План задач — Echo (статус групп + проверка чата)

> Дата создания: 2026-06-23
> Проект: `C:\Users\galas\OneDrive\Desktop\Echo`

## Контекст

Проверка проекта Echo выявила следующие проблемы:

- **Backend**: `MessageSerializer` имеет дубликат поля `sender_data` — упадёт при запросе чатов.
- **WebSocket**: фронт не подключается к WS, так как `VITE_WS_URL` пустой.
- **AI**: `DEEPSEEK_API_KEY` не задан в `.env`; в `SmartReplyView` возвращается несуществующая модель `"deepseek-v4"`.
- **Контракт API**: фронт ожидает camelCase (`createdAt`, `senderUsername`, `isEncrypted`), backend отдаёт snake_case (`created_at`, `sender_username`, `is_encrypted`).
- **Серверы**: не запущены (порты 8000 и 5173 свободны).

Backend поддерживает группы (`Chat.type == "group"`, `name`, M2M `participants`, `group_key_encrypted`).
Группы каналов в `ChatConsumer` настроены корректно (`chat_{chat_id}` через `channels.layers.InMemoryChannelLayer`).

## Задачи

### #1 — Настроить WebSocket URL во фронтенде

- **Файл**: `echo/frontend/.env`
- **Проблема**: `VITE_WS_URL=` пустое → `useWebSocket` хук работает как no-op.
- **Действие**: установить `VITE_WS_URL=ws://localhost:8000` (без trailing slash).
- **Зависимости**: нет.

### #2 — Добавить DEEPSEEK_API_KEY в backend .env

- **Файл**: `echo/.env`
- **Проблема**: ключ отсутствует → все AI-вызовы возвращают `None` → HTTP 503.
- **Действие**: добавить реальный ключ, либо оставить заглушку если AI-фичи пока не тестируем (чат и WS работают без AI).
- **Зависимости**: нет.

### #3 — Исправить модель в ответе SmartReply

- **Файл**: `echo/ai/views.py:42`
- **Проблема**: возвращается `"model": "deepseek-v4"` — такой модели не существует.
- **Действие**: заменить на корректный идентификатор (`deepseek-chat` или `deepseek-reasoner`), согласовать с `settings.DEEPSEEK_MODEL`.
- **Зависимости**: нет.

### #4 — Адаптировать фронт к snake_case ответам backend

- **Файлы**: `echo/frontend/src/shared/model/schemas.ts`, `echo/frontend/src/types/domain.ts`
- **Проблема**: фронт ожидает camelCase (`createdAt`, `senderUsername`, `isEncrypted`), backend отдаёт snake_case (`created_at`, `sender_username`, `is_encrypted`).
- **Действие**: обновить zod-схемы и TypeScript-типы чтобы принимать фактический формат DRF. Backend API не трогаем.
- **Зависимости**: нет.

### #5 — Поднять backend (daphne) и frontend (vite), проверить эндпоинты

- **Действие**:
  1. Запустить daphne на порту 8000 из `echo/` в фоне.
  2. Запустить `npm run dev` из `echo/frontend/`.
  3. Проверить через `curl` / PowerShell:
     - `GET http://localhost:8000/` — `home_view` (JSON со списком эндпоинтов).
     - `GET http://localhost:8000/api/chats` (с JWT-токеном).
     - `GET http://localhost:8000/api/chats/<id>/messages` (с JWT).
     - WebSocket connect: `ws://localhost:8000/ws/chat/1/` (с токеном авторизации).
  4. Убедиться что нет HTTP 500.
  5. Зафиксировать результаты.
- **Зависимости**: #1, #3, #4, #6.

### #6 — Убрать дубликат `sender_data` в `MessageSerializer`

- **Файл**: `echo/chats/serializers.py:30-46`
- **Проблема**: поле `sender_data` объявлено дважды (строки 9 и 22), в `Meta.fields` тоже фигурирует дважды. DRF выбросит `AssertionError` при попытке сериализации.
- **Действие**: оставить одно объявление `sender_data` в классе и одно в `Meta.fields`, убрать лишнее.
- **Зависимости**: нет.

## Рекомендуемый порядок

```
#6 → #1 → #3 → #4 → [#2 опционально] → #5
```

## Граф зависимостей

```
#1 ─┐
#3 ─┤
#4 ─┼──► #5
#6 ─┘
#2 ───► (независимая, AI-фичи)
```