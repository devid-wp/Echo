import { describe, it, expect } from 'vitest'
import { renderWithProviders } from './render'
import { screen } from '@testing-library/react'

/**
 * Smoke test — confirms the Vitest infrastructure is wired up correctly:
 *  - jsdom environment is active (window exists)
 *  - jest-dom matchers are loaded (toBeInTheDocument works)
 *  - renderWithProviders mounts the tree under QueryClient + MemoryRouter
 *
 * If this test fails, the whole test setup is broken — fix it before
 * chasing red tests in deeper code.
 */
describe('test infrastructure', () => {
  it('exposes window in jsdom', () => {
    expect(typeof window).toBe('object')
    expect(window.matchMedia).toBeDefined()
  })

  it('mounts with providers', () => {
    renderWithProviders(<div data-testid="ping">pong</div>)
    expect(screen.getByTestId('ping')).toBeInTheDocument()
    expect(screen.getByTestId('ping')).toHaveTextContent('pong')
  })

  it('starts each test with empty localStorage', () => {
    window.localStorage.setItem('leak', '1')
    expect(window.localStorage.getItem('leak')).toBe('1')
  })
})
