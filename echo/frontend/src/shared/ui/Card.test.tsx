import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders children inside an <article>', () => {
    render(<Card>body text</Card>)
    expect(screen.getByText('body text')).toBeInTheDocument()
    expect(screen.getByText('body text').closest('article')).toBeInTheDocument()
  })

  it('renders head when provided', () => {
    render(<Card head={<h2>title</h2>}>body</Card>)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('title')
  })

  it('renders foot when provided', () => {
    render(<Card foot={<button>action</button>}>body</Card>)
    expect(screen.getByRole('button', { name: 'action' })).toBeInTheDocument()
  })

  it('omits head and foot when not provided', () => {
    const { container } = render(<Card>body</Card>)
    const article = container.querySelector('article')!
    expect(article.querySelector('header')).toBeNull()
    expect(article.querySelector('footer')).toBeNull()
  })

  it('passes extra className to the article', () => {
    const { container } = render(<Card className="my-extra">body</Card>)
    const article = container.querySelector('article')!
    expect(article.className).toContain('my-extra')
  })
})