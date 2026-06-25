import { test as base, expect, type Page } from '@playwright/test'

/**
 * Shared fixtures + helpers for Echo E2E tests.
 *
 * The "alice" user is the canonical seed identity — she has posts, likes,
 * and one chat with bob. The seed script is the source of truth for
 * these credentials, so if it changes, update them here too.
 */

export const TEST_USERS = {
  // LoginView accepts both email and username as identifier. We use
  // the username here because (a) it's stable across re-seeds and
  // (b) alice/bob/demo sometimes have stale email values in the
  // dev DB. The password is the canonical seed password.
  alice: { identifier: 'alice', password: 'testpass123', handle: 'alice' },
  bob: { identifier: 'bob', password: 'testpass123', handle: 'bob' },
  demo: { identifier: 'demo', password: 'testpass123', handle: 'demo' },
} as const

/**
 * Sign in via the real UI. Exercises the LoginForm + useLoginSubmit +
 * Django auth view end-to-end, which is the point of an E2E test.
 *
 * Falls back gracefully if the user is already authenticated (e.g.
 * when storage state is restored between specs).
 */
export async function login(page: Page, who: keyof typeof TEST_USERS = 'alice') {
  const creds = TEST_USERS[who]
  await page.goto('/login')
  // If we're already authed, PublicOnlyRoute will redirect us off /login.
  if (!page.url().endsWith('/login')) return

  // Submit button: the form's <button type="submit">. We can't use
  // getByRole('button', { name: /sign in/i }) because the navbar also
  // renders a "sign in" CTA when the user is unauthenticated.
  const submit = page.locator('form button[type="submit"]', { hasText: /sign in/i })
  await page.getByLabel(/email or handle/i).fill(creds.identifier)
  await page.getByLabel(/password/i).fill(creds.password)
  await submit.click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 })
}

export async function logout(page: Page) {
  // The UI exposes sign-out via the navbar (wide viewport) or the
  // TabBar's danger button (mobile). Both have aria-label="sign out".
  const button = page.getByRole('button', { name: /sign out/i }).first()
  if (await button.isVisible().catch(() => false)) {
    await button.click()
  } else {
    // Fallback: clear localStorage so ProtectedRoute bounces us to /login.
    await page.evaluate(() => {
      localStorage.removeItem('echo.auth')
    })
  }
  await page.goto('/login')
}

/** Wipe any persisted auth + reload — used by specs that need a clean slate. */
export async function clearAuth(page: Page) {
  await page.goto('/login').catch(() => {})
  await page.evaluate(() => {
    localStorage.removeItem('echo.auth')
    sessionStorage.clear()
  })
}

/**
 * Test fixture: a fresh page that auto-logs-in as alice. Use for specs
 * that need auth state but don't care about the login flow itself
 * (feed, chats). The auth.spec still drives the form manually.
 */
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await login(page, 'alice')
    await use(page)
  },
})

export { expect }