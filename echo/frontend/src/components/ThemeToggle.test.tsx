import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from './ThemeToggle'
import { renderPlain } from '@/test/render'

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('ThemeToggle', () => {
  it('defaults to light theme when localStorage is empty', () => {
    renderPlain(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /toggle theme/i })).toHaveTextContent('🌞')
  })

  it('reads persisted theme from localStorage on mount', () => {
    window.localStorage.setItem('theme', 'dark')
    renderPlain(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /toggle theme/i })).toHaveTextContent('🌙')
  })

  it('click toggles between light and dark', async () => {
    const user = userEvent.setup()
    renderPlain(<ThemeToggle />)
    const btn = screen.getByRole('button', { name: /toggle theme/i })

    expect(btn).toHaveTextContent('🌞')
    await user.click(btn)
    expect(btn).toHaveTextContent('🌙')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('theme')).toBe('dark')

    await user.click(btn)
    expect(btn).toHaveTextContent('🌞')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem('theme')).toBe('light')
  })

  it('persists theme to localStorage on every change', async () => {
    const user = userEvent.setup()
    renderPlain(<ThemeToggle />)
    await user.click(screen.getByRole('button', { name: /toggle theme/i }))
    expect(window.localStorage.getItem('theme')).toBe('dark')
  })

  it('applies theme to <html> on mount', () => {
    window.localStorage.setItem('theme', 'dark')
    renderPlain(<ThemeToggle />)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
