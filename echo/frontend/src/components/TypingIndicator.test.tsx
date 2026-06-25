import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderPlain, renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { act } from 'react'
import { TypingIndicator } from './TypingIndicator'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TypingIndicator', () => {
  it('renders nothing when typing=false', () => {
    const { container } = renderPlain(<TypingIndicator typing={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders indicator when typing=true', () => {
    renderPlain(<TypingIndicator typing={true} />)
    expect(screen.getByText(/typing/)).toBeInTheDocument()
  })

  it('has aria-live="polite" for screen readers', () => {
    renderPlain(<TypingIndicator typing={true} />)
    expect(screen.getByText(/typing/)).toHaveAttribute('aria-live', 'polite')
  })

  it('starts with zero dots then cycles', () => {
    renderPlain(<TypingIndicator typing={true} />)
    expect(screen.getByText(/typing$/)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText(/typing\.$/)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText(/typing\.\.$/)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText(/typing\.\.\.$/)).toBeInTheDocument()

    // cycle wraps back to 0 dots
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText(/typing$/)).toBeInTheDocument()
  })

  it('stops the timer when typing becomes false', () => {
    const { rerender } = renderWithProviders(<TypingIndicator typing={true} />)
    expect(screen.getByText(/typing/)).toBeInTheDocument()
    rerender(<TypingIndicator typing={false} />)
    expect(screen.queryByText(/typing/)).not.toBeInTheDocument()
    // advancing time after unmount shouldn't error
    act(() => {
      vi.advanceTimersByTime(2000)
    })
  })
})
