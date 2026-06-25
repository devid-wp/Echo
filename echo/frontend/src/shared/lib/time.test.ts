import { describe, it, expect } from 'vitest'
import { timeAgo, clamp } from './time'

describe('timeAgo', () => {
  const NOW = new Date('2026-06-25T12:00:00Z')

  function iso(offsetSeconds: number) {
    return new Date(NOW.getTime() - offsetSeconds * 1000).toISOString()
  }

  it('returns "just now" for < 45 seconds', () => {
    expect(timeAgo(iso(0), NOW)).toBe('just now')
    expect(timeAgo(iso(30), NOW)).toBe('just now')
    expect(timeAgo(iso(44), NOW)).toBe('just now')
  })

  it('returns "1m" for 45-89 seconds', () => {
    expect(timeAgo(iso(45), NOW)).toBe('1m')
    expect(timeAgo(iso(89), NOW)).toBe('1m')
  })

  it('returns minutes for 2-59 minutes', () => {
    expect(timeAgo(iso(120), NOW)).toBe('2m')
    expect(timeAgo(iso(60 * 59), NOW)).toBe('59m')
  })

  it('returns hours for 1-23 hours', () => {
    expect(timeAgo(iso(60 * 60), NOW)).toBe('1h')
    expect(timeAgo(iso(60 * 60 * 5), NOW)).toBe('5h')
    expect(timeAgo(iso(60 * 60 * 23), NOW)).toBe('23h')
  })

  it('returns days for 1-6 days', () => {
    expect(timeAgo(iso(60 * 60 * 24), NOW)).toBe('1d')
    expect(timeAgo(iso(60 * 60 * 24 * 3), NOW)).toBe('3d')
    expect(timeAgo(iso(60 * 60 * 24 * 6), NOW)).toBe('6d')
  })

  it('returns weeks for 1-4 weeks', () => {
    expect(timeAgo(iso(60 * 60 * 24 * 7), NOW)).toBe('1w')
    expect(timeAgo(iso(60 * 60 * 24 * 28), NOW)).toBe('4w')
  })

  it('returns months once days exceed 4 weeks', () => {
    // 5 weeks = 35d, 60d → "2mo"
    expect(timeAgo(iso(60 * 60 * 24 * 60), NOW)).toBe('2mo')
    expect(timeAgo(iso(60 * 60 * 24 * 330), NOW)).toBe('11mo')
  })

  it('returns years for >= 1 year', () => {
    expect(timeAgo(iso(60 * 60 * 24 * 365), NOW)).toBe('1y')
    expect(timeAgo(iso(60 * 60 * 24 * 365 * 3), NOW)).toBe('3y')
  })

  it('clamps negative diffs (future dates) to "just now"', () => {
    const future = new Date(NOW.getTime() + 60_000).toISOString()
    expect(timeAgo(future, NOW)).toBe('just now')
  })
})

describe('clamp', () => {
  it('returns the value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps to min', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
  })

  it('clamps to max', () => {
    expect(clamp(99, 0, 10)).toBe(10)
  })

  it('handles min === max', () => {
    expect(clamp(5, 3, 3)).toBe(3)
  })

  it('handles negatives', () => {
    expect(clamp(-10, -5, 5)).toBe(-5)
  })
})