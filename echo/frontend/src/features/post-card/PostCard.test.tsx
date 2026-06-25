import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostCard } from './PostCard'
import { MemoryRouter } from 'react-router-dom'
import type { Post } from '@/types/domain'

const basePost: Post = {
  id: 'p_42',
  author: { id: 'u_ada', handle: 'ada', displayName: 'Ada L.' },
  body: 'shipped a small linter for the team',
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(), // 5 min ago
  likes: 24,
  comments: 5,
  likedByMe: false,
}

function renderCard(post: Post, onLike?: (id: string) => void) {
  return render(
    <MemoryRouter>
      <PostCard post={post} onLike={onLike} />
    </MemoryRouter>,
  )
}

describe('PostCard', () => {
  it('renders author handle and displayName', () => {
    renderCard(basePost)
    expect(screen.getByText(/@ada/)).toBeInTheDocument()
    expect(screen.getByText(/Ada L\./)).toBeInTheDocument()
  })

  it('renders post body', () => {
    renderCard(basePost)
    expect(screen.getByText(/shipped a small linter/)).toBeInTheDocument()
  })

  it('renders likes and comments counts', () => {
    renderCard(basePost)
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders post id', () => {
    renderCard(basePost)
    expect(screen.getByText('#p_42')).toBeInTheDocument()
  })

  it('renders relative time via timeAgo', () => {
    renderCard(basePost)
    // 5 min ago → "5m"
    expect(screen.getByText('5m')).toBeInTheDocument()
  })

  it('like button starts as aria-pressed=false when likedByMe=false', () => {
    renderCard(basePost)
    const likeBtn = screen.getByRole('button', { name: /like/i })
    expect(likeBtn).toHaveAttribute('aria-pressed', 'false')
    expect(likeBtn).toHaveAttribute('aria-label', 'like')
    expect(likeBtn).toHaveAttribute('data-active', 'false')
  })

  it('like button starts as aria-pressed=true when likedByMe=true', () => {
    renderCard({ ...basePost, likedByMe: true })
    const likeBtn = screen.getByRole('button', { name: /unlike/i })
    expect(likeBtn).toHaveAttribute('aria-pressed', 'true')
    expect(likeBtn).toHaveAttribute('aria-label', 'unlike')
    expect(likeBtn).toHaveAttribute('data-active', 'true')
  })

  it('calls onLike with post id when like button clicked', async () => {
    const onLike = vi.fn()
    const user = userEvent.setup()
    renderCard(basePost, onLike)
    await user.click(screen.getByRole('button', { name: /like/i }))
    expect(onLike).toHaveBeenCalledWith('p_42')
  })

  it('does not throw when like clicked without onLike prop', async () => {
    const user = userEvent.setup()
    renderCard(basePost)
    await user.click(screen.getByRole('button', { name: /like/i }))
    // no throw = pass
  })

  it('links author handle to profile', () => {
    renderCard(basePost)
    const authorLink = screen.getByRole('link', { name: /@ada/ })
    expect(authorLink).toHaveAttribute('href', '/profile/u_ada')
  })

  it('renders avatar with handle glyph', () => {
    const { container } = renderCard(basePost)
    // Avatar's first two chars of handle
    expect(container.textContent).toContain('ad')
  })
})
