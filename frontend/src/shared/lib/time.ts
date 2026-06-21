/** Helper: derive a friendly relative time string. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime()
  const diff = Math.max(0, Math.floor((now.getTime() - t) / 1000))
  if (diff < 45) return 'just now'
  if (diff < 90) return '1m'
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo`
  return `${Math.floor(d / 365)}y`
}

/** Helper: clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}