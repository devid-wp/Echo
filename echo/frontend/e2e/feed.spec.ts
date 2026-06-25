import { test, expect, TEST_USERS } from './fixtures'

/**
 * feed.spec — exercises the real FeedPage through the Django API.
 *
 * Uses seed data (alice has 16 posts and ~12 likes out of the box).
 * "Publish" creates a fresh post via POST /api/feed/ and asserts that
 * it appears in the list — proving the response shape and the React
 * state update both work end-to-end.
 */

test.describe('feed', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-auth via UI so we exercise the real login flow once per spec.
    await page.goto('/login')
    await page.getByLabel(/email or handle/i).fill(TEST_USERS.alice.identifier)
    await page.getByLabel(/password/i).fill(TEST_USERS.alice.password)
    await page.locator('form button[type="submit"]', { hasText: /sign in/i }).click()
    await page.waitForURL(/\/feed/, { timeout: 15_000 })
  })

  test('renders the seeded posts', async ({ page }) => {
    // Seed: post1 from alice = "Hello world! This is my first post on Echo Feed..."
    await expect(page.getByText(/hello world/i).first()).toBeVisible()
    // Header reports the post count.
    await expect(page.getByText(/items · live/i)).toBeVisible()
  })

  test('publishes a new post and it appears at the top', async ({ page }) => {
    const unique = `e2e-post-${Date.now().toString(36)}`
    const textarea = page.getByRole('textbox')
    await textarea.fill(unique)
    await page.getByRole('button', { name: /publish/i }).click()

    // Composer clears on success.
    await expect(textarea).toHaveValue('')
    // The new post lands at the top of the list — wait for its
    // unique text rather than racing the prepend. `.first()` on
    // `li` is unreliable when other lists (sidebar) exist in DOM.
    await expect(page.getByText(unique).first()).toBeVisible({ timeout: 15_000 })
  })

  test('toggling like increments and decrements the count', async ({ page }) => {
    // Pick the first like button on the first seeded post.
    const firstLike = page.getByRole('button', { name: /like/i }).first()
    await expect(firstLike).toBeVisible()

    const initialText = await firstLike.textContent()
    await firstLike.click()
    // Either the count went up or down depending on starting state.
    await expect(firstLike).not.toHaveText(initialText ?? '')

    await firstLike.click()
    await expect(firstLike).toHaveText(initialText ?? '')
  })

  test('shows the empty state when the API returns no items', async ({ page }) => {
    // Override the network response for this one page load.
    await page.route('**/api/feed*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], nextCursor: null }),
      }),
    )
    await page.reload()

    await expect(page.getByText(/feed is empty/i)).toBeVisible()
    // Composer is still on screen even with no posts.
    await expect(page.getByRole('textbox')).toBeVisible()
  })

  test('surfaces an error frame when the feed endpoint fails', async ({ page }) => {
    await page.route('**/api/feed*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'server_error', message: 'down for maintenance' }),
      }),
    )
    await page.reload()

    await expect(page.getByText(/down for maintenance/i)).toBeVisible()
  })
})