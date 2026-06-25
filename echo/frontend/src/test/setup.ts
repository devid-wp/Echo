import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

/* ----- auto-cleanup: unmounts RTL renders and resets the DOM ----- */
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/* ----- localStorage sanity: ensure a fresh storage for each test ----- */
beforeEach(() => {
  window.localStorage.clear()
})

/* ----- matchMedia shim (used by ThemeToggle + prefers-color-scheme).
   jsdom doesn't implement it, so without this any code that reads
   `window.matchMedia(...)` will throw. */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

/* ----- IntersectionObserver shim — used by FeedPage sentinel and any
   code that lazy-loads. */
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO

/* ----- ResizeObserver shim (some libs check for it on mount). */
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO

/* ----- scrollTo shim (jsdom doesn't implement window.scrollTo). */
if (!window.scrollTo) {
  window.scrollTo = () => {}
}

/* ----- crypto.randomUUID shim for older jsdom. */
if (!globalThis.crypto) {
  // @ts-expect-error -- partial shim
  globalThis.crypto = {}
}
if (!globalThis.crypto.randomUUID) {
  // @ts-expect-error -- partial shim
  globalThis.crypto.randomUUID = () => 'test-uuid-' + Math.random().toString(36).slice(2, 10)
}
