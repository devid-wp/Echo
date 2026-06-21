import { useEffect, useRef, useState, useCallback } from 'react'
import { env } from '@/shared/config/env'

export type WsStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

interface UseWebSocketOptions<TInbound> {
  /** Auto-reconnect on close. Defaults to true. */
  reconnect?: boolean
  /** Initial backoff in ms. Doubles on each retry up to `maxBackoffMs`. */
  baseBackoffMs?: number
  maxBackoffMs?: number
  /** Optional: invoked for every parsed JSON message from the server. */
  onMessage?: (data: TInbound) => void
}

interface UseWebSocketReturn<TOutbound> {
  status: WsStatus
  send: (data: TOutbound) => void
  reconnectNow: () => void
  disconnect: () => void
}

/**
 * useWebSocket — minimal resilient WebSocket hook.
 *
 *  - opens a connection to env.wsUrl; if that's empty the hook is a no-op
 *    (so the same code works in dev without a backend)
 *  - auto-reconnects with exponential backoff (capped)
 *  - exposes a stable `send` that JSON-encodes payloads and no-ops if the
 *    socket isn't open
 *  - pauses reconnection while the tab is hidden to avoid noisy logs
 */
export function useWebSocket<TInbound = unknown, TOutbound = unknown>(
  path: string,
  { reconnect = true, baseBackoffMs = 800, maxBackoffMs = 15_000, onMessage }: UseWebSocketOptions<TInbound> = {},
): UseWebSocketReturn<TOutbound> {
  const [status, setStatus] = useState<WsStatus>('idle')
  const wsRef = useRef<WebSocket | null>(null)
  const attemptRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const buildUrl = useCallback(() => {
    if (!env.wsUrl) return ''
    const base = env.wsUrl.replace(/\/+$/, '')
    const p = path.startsWith('/') ? path : `/${path}`
    return `${base}${p}`
  }, [path])

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const connect = useCallback(() => {
    if (!env.wsUrl) return
    if (cancelledRef.current) return
    setStatus('connecting')
    let socket: WebSocket
    try {
      socket = new WebSocket(buildUrl())
    } catch {
      setStatus('error')
      scheduleReconnect()
      return
    }
    wsRef.current = socket

    socket.addEventListener('open', () => {
      attemptRef.current = 0
      setStatus('open')
    })
    socket.addEventListener('message', (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as TInbound
        onMessageRef.current?.(parsed)
      } catch {
        // ignore non-JSON frames
      }
    })
    socket.addEventListener('error', () => setStatus('error'))
    socket.addEventListener('close', () => {
      setStatus('closed')
      wsRef.current = null
      if (reconnect && !cancelledRef.current) scheduleReconnect()
    })
  }, [buildUrl, reconnect])

  const scheduleReconnect = useCallback(() => {
    if (!reconnect || cancelledRef.current) return
    if (document.hidden) {
      // hold off while tab is hidden; resume on visibility
      const resume = () => {
        document.removeEventListener('visibilitychange', resume)
        if (!cancelledRef.current) connect()
      }
      document.addEventListener('visibilitychange', resume, { once: true })
      return
    }
    const delay = Math.min(maxBackoffMs, baseBackoffMs * 2 ** attemptRef.current)
    attemptRef.current += 1
    clearTimer()
    timerRef.current = window.setTimeout(connect, delay)
  }, [baseBackoffMs, connect, maxBackoffMs, reconnect])

  const send = useCallback((data: TOutbound) => {
    const socket = wsRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(typeof data === 'string' ? data : JSON.stringify(data))
    }
  }, [])

  const disconnect = useCallback(() => {
    cancelledRef.current = true
    clearTimer()
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const reconnectNow = useCallback(() => {
    cancelledRef.current = false
    clearTimer()
    attemptRef.current = 0
    wsRef.current?.close()
    connect()
  }, [connect])

  useEffect(() => {
    cancelledRef.current = false
    connect()
    return () => {
      cancelledRef.current = true
      clearTimer()
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  return { status, send, reconnectNow, disconnect }
}