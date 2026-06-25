import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

/**
 * Vitest config layered on top of vite.config.ts.
 *
 *  - jsdom for DOM globals (window, document, matchMedia, etc.)
 *  - setup file loads @testing-library/jest-dom matchers + cleans up RTL
 *  - MSW server is started/stopped in src/test/msw-server.ts and
 *    opt-in per test (startServer / stopServer / resetHandlers)
 *  - CSS modules are stubbed so component tests don't depend on real CSS
 *    shape (only className strings matter for assertions)
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: {
        modules: { classNameStrategy: 'non-scoped' },
      },
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/**/*.spec.{ts,tsx}',
          'src/test/**',
          'src/main.tsx',
          'src/types/**',
          'src/**/*.module.css',
        ],
      },
    },
  }),
)
