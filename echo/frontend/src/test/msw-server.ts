import { setupServer } from 'msw/node'
import type { RequestHandler } from 'msw'

/**
 * MSW server singleton for Vitest (Node) environment.
 *
 *  - start/stop is opt-in per test file via `server.listen()` / `close()`
 *  - tests reset handlers with `server.resetHandlers()` in `afterEach` if
 *    they call `server.use(...)` for one-off overrides
 *
 * Use `import { http, HttpResponse } from 'msw'` in individual tests
 * to define handlers.
 */
export const server = setupServer()

export function startServer(...initialHandlers: RequestHandler[]) {
  if (initialHandlers.length) server.use(...initialHandlers)
  server.listen({ onUnhandledRequest: 'error' })
}

export function stopServer() {
  server.close()
}
