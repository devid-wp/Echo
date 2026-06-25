import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders a 2-char glyph from the handle', () => {
    render(<Avatar handle="ada" />)
    expect(screen.getByText('ad')).toBeInTheDocument()
  })

  it('pads short handle with underscore', () => {
    render(<Avatar handle="a" />)
    expect(screen.getByText('a_')).toBeInTheDocument()
  })

  it('truncates long handle to first two chars', () => {
    render(<Avatar handle="ada-lovelace" />)
    expect(screen.getByText('ad')).toBeInTheDocument()
  })

  it('renders avatar image when avatar url provided', () => {
    render(<Avatar handle="ada" avatar="/media/x.png" />)
    const img = screen.getByRole('img', { hidden: true })
    expect(img).toHaveAttribute('src', '/media/x.png')
    expect(img).toHaveAttribute('alt', 'ada')
  })

  it('falls back to glyph when avatar is null', () => {
    render(<Avatar handle="bob" avatar={null} />)
    expect(screen.getByText('bo')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('does not render an <img> when no avatar url', () => {
    const { container } = render(<Avatar handle="bob" />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('aria-hidden on the wrapper', () => {
    const { container } = render(<Avatar handle="alice" />)
    expect(container.firstChild).toHaveAttribute('aria-hidden')
  })
})