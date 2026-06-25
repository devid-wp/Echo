import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>click me</Button>)
    expect(screen.getByRole('button', { name: 'click me' })).toBeInTheDocument()
  })

  it('defaults to type="button" (not submit, to avoid accidental form submits)', () => {
    render(<Button>x</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('respects explicit type prop', () => {
    render(<Button type="submit">x</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>x</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>x</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not fire onClick while loading and shows aria-hidden spinner', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} loading>
        submit
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn.querySelector('[aria-hidden]')).toBeInTheDocument()
    btn.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders prefix glyph when provided', () => {
    render(<Button prefix=">">go</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('>')
  })

  it('renders suffix glyph when provided', () => {
    render(<Button suffix="→">next</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('→')
  })

  it('prefers spinner over prefix when loading (prefix hidden)', () => {
    render(
      <Button loading prefix=">">
        send
      </Button>,
    )
    const btn = screen.getByRole('button')
    // spinner is aria-hidden, prefix is suppressed while loading
    expect(btn.querySelector('[aria-hidden]')).toBeInTheDocument()
    expect(btn).not.toHaveTextContent('>')
  })

  it('forwards ref to the button element', () => {
    let captured: HTMLButtonElement | null = null
    render(<Button ref={(el) => { captured = el }}>x</Button>)
    expect(captured).toBeInstanceOf(HTMLButtonElement)
  })

  it('passes through extra className', () => {
    render(<Button className="my-extra">x</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('my-extra')
  })
})