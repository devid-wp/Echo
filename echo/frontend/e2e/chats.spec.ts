import { test, expect, TEST_USERS } from './fixtures'

/**
 * chats.spec — exercises the real chat list + composer.
 *
 * Seed gives alice one private chat with bob containing a welcome
 * message. We use that as the E2E target.
 *
 * On mobile (≤700px) the sidebar is hidden behind a `mobileVisible`
 * class that the app does not currently toggle. The user flow is to
 * deep-link directly to /chats/<id>, so mobile specs do that and
 * desktop specs drive the sidebar click.
 */

async function getFirstChatId(page: import('@playwright/test').Page): Promise<string> {
  // Echo's auth is a Bearer JWT stored in localStorage. page.request
  // doesn't inherit the browser's cookies/localStorage, so we have to
  // forward the token explicitly. Read it from localStorage after
  // login (which the spec's beforeEach has already done).
  const token = await page.evaluate(() => {
    const raw = localStorage.getItem('echo.auth')
    return raw ? (JSON.parse(raw) as { state: { token: string } }).state.token : null
  })
  expect(token, 'auth token must be present after beforeEach login').toBeTruthy()
  const res = await page.request.get('/api/chats/', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(res.status(), 'GET /api/chats/ should return 200 for alice').toBe(200)
  const chats = (await res.json()) as Array<{ id: string | number }>
  expect(chats.length, 'seed should give alice at least one chat').toBeGreaterThan(0)
  return String(chats[0].id)
}

test.describe('chats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email or handle/i).fill(TEST_USERS.alice.identifier)
    await page.getByLabel(/password/i).fill(TEST_USERS.alice.password)
    // Form submit button — scoped to <form> so it doesn't collide with
    // the navbar's "sign in" CTA that links unauthenticated users here.
    await page.locator('form button[type="submit"]', { hasText: /sign in/i }).click()
    await page.waitForURL(/\/feed/, { timeout: 15_000 })
  })

  test('lists at least one chat in the sidebar (desktop)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'sidebar hidden on mobile viewport')
    await page.goto('/chats')
    // The seed script guarantees one chat between alice and bob.
    const chatItem = page.getByRole('link', { name: /open chat with/i }).first()
    await expect(chatItem).toBeVisible({ timeout: 15_000 })
  })

  test('opening a chat shows its messages and a working composer', async ({ page }, testInfo) => {
    const chatId = await getFirstChatId(page)
    if (testInfo.project.name === 'desktop-chromium') {
      // Drive the sidebar — covers the click handler + URL sync.
      await page.goto('/chats')
      await page.getByRole('link', { name: /open chat with/i }).first().click()
    } else {
      // Mobile: deep-link directly — the sidebar is `display: none` below
      // 700px and the app has no toggle for it yet, so the only way in
      // is the URL.
      await page.goto(`/chats/${chatId}`)
    }

    // Seed welcome message from bob is visible in the chat thread.
// The <aside> sidebar also renders the preview text, but it's
// `display: none` below 700px — Playwright still sees it in DOM,
// and `.first()` would pick it up. Anchor on the bubble class.
await expect(page.locator('[class*="bubbleText"]', { hasText: /welcome to echo/i }).first()).toBeVisible({ timeout: 15_000 })

    // Type and send a message; the composer should be present and the
    // message should appear in the thread (echoed locally because WS
    // isn't open in test mode).
    const composer = page.getByPlaceholder(/type a message/i)
    const unique = `e2e-msg-${Date.now().toString(36)}`
    await composer.fill(unique)
    await page.getByRole('button', { name: /send/i }).click()

    // Composer clears on send.
    await expect(composer).toHaveValue('')
    // The new message bubble is now in the thread.
    await expect(page.getByText(unique)).toBeVisible()
  })

  test('send button is disabled when composer is empty', async ({ page }, testInfo) => {
    const chatId = await getFirstChatId(page)
    if (testInfo.project.name === 'desktop-chromium') {
      await page.goto('/chats')
      await page.getByRole('link', { name: /open chat with/i }).first().click()
    } else {
      await page.goto(`/chats/${chatId}`)
    }
    await expect(page.locator('[class*="bubbleText"]', { hasText: /welcome to echo/i }).first()).toBeVisible({ timeout: 15_000 })

    const send = page.getByRole('button', { name: /send/i })
    await expect(send).toBeDisabled()
    await page.getByPlaceholder(/type a message/i).fill('hi')
    await expect(send).toBeEnabled()
  })

  test('shows the empty-state when the API returns no chats', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'empty state lives in the desktop sidebar')
    await page.route('**/api/chats*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    )
    await page.goto('/chats')
    await expect(page.getByText(/no conversations yet/i)).toBeVisible()
  })
})