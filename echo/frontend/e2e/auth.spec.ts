import { test, expect, login, logout, clearAuth, TEST_USERS } from './fixtures'

/**
 * auth.spec — exercises the real Django + Vite auth flow through the UI.
 *
 * Covers:
 *   - login form happy path (alice) → redirect to /feed
 *   - login form invalid credentials → inline error, no redirect
 *   - protected route bounces unauthenticated visitors to /login
 *   - register happy path creates a new user
 *   - logout clears the session
 */

test.describe('auth flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page)
  })

  test('renders the login form with email/handle and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /echo login/i })).toBeVisible()
    await expect(page.getByLabel(/email or handle/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    // Form submit button — scoped to <form> so it doesn't collide with
    // the navbar's "sign in" CTA that links unauthenticated users here.
    const submit = page.locator('form button[type="submit"]', { hasText: /sign in/i })
    await expect(submit).toBeVisible()
    // Link to the register page.
    await expect(page.getByRole('link', { name: /register/i }).first()).toHaveAttribute(
      'href',
      '/register',
    )
  })

  test('signs alice in and lands on /feed', async ({ page }) => {
    const alice = TEST_USERS.alice
    await page.goto('/login')
    await page.getByLabel(/email or handle/i).fill(alice.identifier)
    await page.getByLabel(/password/i).fill(alice.password)
    await page.locator('form button[type="submit"]', { hasText: /sign in/i }).click()

    await page.waitForURL(/\/feed/, { timeout: 15_000 })
    // CSS ::before pseudo on the feed h1 prepends "$ tail -f /feed" to
    // the accessible name, so we match loosely.
    await expect(page.locator('h1', { hasText: /^feed$/i })).toBeVisible()
    // localStorage now holds the JWT — proves the session persisted.
    const token = await page.evaluate(() => {
      const raw = localStorage.getItem('echo.auth')
      return raw ? (JSON.parse(raw) as { state: { token: string } }).state.token : null
    })
    expect(token).toBeTruthy()
  })

  test('shows an inline error on bad credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email or handle/i).fill('alice@echo.dev')
    await page.getByLabel(/password/i).fill('this-is-not-the-password')
    await page.locator('form button[type="submit"]', { hasText: /sign in/i }).click()

    // Form's error.alert surfaces the API message.
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirects unauthenticated user to /login from a protected route', async ({ page }) => {
    await page.goto('/feed')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /echo login/i })).toBeVisible()
  })

  test('register creates a new account and lands on /feed', async ({ page }) => {
    const handle = `e2e_${Date.now().toString(36)}`
    const email = `${handle}@echo.dev`
    await page.goto('/register')

    await page.getByLabel(/handle/i).fill(handle)
    await page.getByLabel(/display name/i).fill('E2E Test User')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill('testpass123')
    await page.getByRole('button', { name: /create account/i }).click()

    await page.waitForURL(/\/feed/, { timeout: 15_000 })
    // The feed composer shows "posting as @<handle>". It's always
    // visible (no mobile/desktop branching), so it's the most
    // portable proof that the new account is authed.
    await expect(page.getByText(`posting as`).locator('..').getByText(`@${handle}`)).toBeVisible()
  })

  test('logout returns to /login', async ({ page }) => {
    await login(page, 'alice')
    await expect(page).toHaveURL(/\/feed/)

    await logout(page)
    await page.goto('/feed')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
  })
})