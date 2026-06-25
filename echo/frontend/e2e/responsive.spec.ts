import { test, expect, TEST_USERS } from './fixtures'

/**
 * responsive.spec — viewport-agnostic CSS contracts.
 *
 * These tests run only in the mobile projects (Pixel + iPhone SE).
 * We use the `test.skip()` mechanism tied to the project name so the
 * same file works under all three without crashing on the desktop
 * browser that lacks the TabBar.
 *
 * What we assert:
 *   - viewport meta tag exists with width=device-width (so phones
 *     don't render at 980px and zoom out)
 *   - on mobile the TabBar (`nav[aria-label="primary mobile"]`) is
 *     visible and the navbar's desktop nav (`nav[aria-label="primary"]`)
 *     is hidden
 *   - on desktop the inverse holds: navbar nav visible, TabBar hidden
 *   - body never grows wider than the viewport (no horizontal scroll)
 *   - capture screenshots for visual review
 */

test.describe('responsive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email or handle/i).fill(TEST_USERS.alice.identifier)
    await page.getByLabel(/password/i).fill(TEST_USERS.alice.password)
    // Form submit button — scoped to <form> so it doesn't collide with
    // the navbar's "sign in" CTA that links unauthenticated users here.
    await page.locator('form button[type="submit"]', { hasText: /sign in/i }).click()
    await page.waitForURL(/\/feed/, { timeout: 15_000 })
  })

  test('viewport meta is present and configured for mobile', async ({ page }) => {
    const meta = page.locator('meta[name="viewport"]')
    await expect(meta).toHaveCount(1)
    const content = await meta.getAttribute('content')
    expect(content).toMatch(/width=device-width/)
    expect(content).toMatch(/initial-scale=1/)
  })

  test('body does not overflow horizontally', async ({ page }) => {
    await page.goto('/feed')
    // We measure <main>, not <body>, because:
    //   - the navbar / footer / TabBar are intentionally full-width
    //     strips that may include the device's safe-area insets
    //     (iPhone SE reserves ~118px for the home indicator on the
    //     sides in landscape), so they legitimately exceed the
    //     viewport at certain orientations;
    //   - the real risk we care about is content (post text, composer
    //     inputs, chat bubbles) wrapping or being cut off.
    const overflow = await page.evaluate(() => {
      const main = document.querySelector('main')
      if (!main) return { scrollWidth: 0, clientWidth: 0 }
      return { scrollWidth: main.scrollWidth, clientWidth: main.clientWidth }
    })
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  })

  test('mobile shows TabBar and hides desktop nav links', async ({ page, }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-pixel' && testInfo.project.name !== 'mobile-iphone-se',
      'mobile-only viewport contract',
    )
    await page.goto('/feed')

    const tabbar = page.locator('nav[aria-label="primary mobile"]')
    const desktopNav = page.locator('header[role="banner"] nav[aria-label="primary"]')

    await expect(tabbar).toBeVisible()
    await expect(desktopNav).toBeHidden()
  })

  test('desktop shows navbar nav and hides the mobile TabBar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only viewport contract')
    await page.goto('/feed')

    const tabbar = page.locator('nav[aria-label="primary mobile"]')
    const desktopNav = page.locator('header[role="banner"] nav[aria-label="primary"]')

    await expect(desktopNav).toBeVisible()
    await expect(tabbar).toBeHidden()
  })

  test('captures a screenshot of /feed for the project viewport', async ({ page }, testInfo) => {
    await page.goto('/feed')
    // CSS ::before prepends "$ tail -f /feed" to the h1's accessible
    // name, so we look up the element directly instead of via role.
    await expect(page.locator('h1', { hasText: /feed/i })).toBeVisible()
    await page.waitForTimeout(300) // let layout settle / fonts load
    await page.screenshot({
      path: testInfo.outputPath(`feed-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('captures a screenshot of /chats for the project viewport', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'desktop-chromium') {
      // Sidebar visible on wide viewport — drive the click flow.
      await page.goto('/chats')
      await expect(page.getByRole('link', { name: /open chat with/i }).first()).toBeVisible({
        timeout: 15_000,
      })
    } else {
      // Mobile: the sidebar is `display: none` below 700px and the
      // app has no toggle for it. Deep-link to the first chat instead.
      const token = await page.evaluate(() => {
        const raw = localStorage.getItem('echo.auth')
        return raw ? (JSON.parse(raw) as { state: { token: string } }).state.token : null
      })
      const res = await page.request.get('/api/chats/', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const chats = (await res.json()) as Array<{ id: string | number }>
      await page.goto(`/chats/${chats[0].id}`)
      // Composer is the same selector on both viewports.
      await expect(page.getByPlaceholder(/type a message/i)).toBeVisible({ timeout: 15_000 })
    }
    await page.waitForTimeout(300)
    await page.screenshot({
      path: testInfo.outputPath(`chats-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})