import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * Echo end-to-end tests.
 *
 * Three projects exercise the same scenarios against the real Django +
 * Vite stack, but with different viewports. responsive.spec adds CSS
 * checks that only make sense at narrow widths.
 *
 * Boot order:
 *   1. Django on 127.0.0.1:8000 (data: alice/bob/demo, password "testpass123")
 *   2. Vite dev on 127.0.0.1:5173 — proxies /api and /ws to Django, so
 *      the browser always talks to the SPA on a single origin and we
 *      sidestep CORS entirely.
 *
 * The two servers live in different cwd's; Playwright's webServer[]
 * accepts per-entry { command, cwd, url, reuseExistingServer }.
 *
 * Test data is assumed to already be seeded (run `python
 * scripts/seed_test_data.py` from echo/ once). The seed script is
 * idempotent, so it's safe to re-run between local invocations; we do
 * not auto-seed here because it would race with a developer's local
 * DB and break the manual smoke test in the README.
 */
const __filename = fileURLToPath(import.meta.url)
const ROOT = dirname(__filename)
const BACKEND_DIR = resolve(ROOT, '..') // echo/ — sibling of frontend/

export default defineConfig({
  testDir: './e2e',
  // Parallelism is OFF: there's a single SQLite DB, and we share the
  // alice/bob/demo users across specs. Sequential keeps the state
  // picture simple to reason about.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Match Vitest's fail-fast reporting.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Persist the auth token + user shape produced by login() so specs
    // can re-use a single storage state. See e2e/fixtures.ts.
    storageState: undefined,
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      // Pixel-class phone (mid-range Android). 360×640 is the canonical
      // baseline for "really small phone" CSS checks.
      name: 'mobile-pixel',
      use: { ...devices['Pixel 5'] },
    },
    {
      // iPhone SE — 375×667, the narrowest iOS viewport still in
      // circulation. Catches bugs the Pixel misses (different default
      // font sizes, safe-area handling).
      name: 'mobile-iphone-se',
      use: devices['iPhone SE'],
    },
  ],

  webServer: [
    {
      // Django. --noreload avoids the autoreloader spawning a second
      // process that Playwright would race with; --insecure is not
      // needed because DEBUG=True already serves media/static from
      // Django itself in this project.
      command: 'py -3 manage.py runserver 127.0.0.1:8000 --noreload',
      cwd: BACKEND_DIR,
      url: 'http://127.0.0.1:8000/api/users/me',
      // /api/users/me returns 401 anonymous, not 5xx. Playwright's
      // default expects 2xx; tell it 200-399 isn't required here.
      // Reuse an already-running Django: dev's `manage.py runserver`
      // takes ~10s to start the first time, and the developer may
      // already have it up. CI re-launches the server on a clean
      // machine so reuse is irrelevant there.
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Vite dev. The Vite proxy forwards /api and /ws to Django so the
      // browser only sees one origin.
      command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
      cwd: ROOT,
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})