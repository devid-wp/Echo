/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Module-level mock for env so we can flip wsUrl per test.
// vi.mock is hoisted by Vitest, so this runs before any module that imports env.
let mockWsUrl = 'wss://echo.test'
vi.mock('@/shared/config/env', () => ({
  get env() {
    return {
      apiBaseUrl: '',
      wsUrl: mockWsUrl,
      oauthGoogleClientId: '',
      oauthGithubClientId: '',
      enableMocks: true,
      routerFuture: true,
      isDev: false,
    }
  },
  ROUTES: {
    chats: '/chats',
    chatDetail: (id: string | number) => `/chats/${id}`,
    feed: '/feed',
    profile: (id: string | number) => `/profile/${id}`,
    profileEdit: '/profile/edit',
    login: '/login',
    register: '/register',
    root: '/',
  },
}))

// now safe to import after the mock is registered
import { useWebSocket } from './useWebSocket'
import { MockWebSocket } from '@/test/mock-websocket'

beforeEach(() => {
  mockWsUrl = 'wss://echo.test'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).WebSocket = MockWebSocket
  MockWebSocket.instances = []
  MockWebSocket.lastInstance = null
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useWebSocket', () => {
  it('starts with status="connecting" then "open" after open event', async () => {
    const { result } = renderHook(() => useWebSocket('/chat/1'))

    // After mount the socket is created and status flips to "connecting"
    expect(result.current.status).toBe('connecting')
    expect(MockWebSocket.lastInstance).not.toBeNull()

    await act(async () => {
      MockWebSocket.lastInstance!.open()
    })

    expect(result.current.status).toBe('open')
  })

  it('invokes onMessage when a JSON message arrives', async () => {
    const onMessage = vi.fn()
    renderHook(() =>
      useWebSocket<{ text: string }>('/chat/1', { onMessage }),
    )

    await act(async () => {
      MockWebSocket.lastInstance!.open()
    })
    await act(async () => {
      MockWebSocket.lastInstance!.receive({ text: 'hello' })
    })

    expect(onMessage).toHaveBeenCalledWith({ text: 'hello' })
  })

  it('ignores non-JSON messages silently', async () => {
    const onMessage = vi.fn()
    renderHook(() =>
      useWebSocket('/chat/1', { onMessage }),
    )

    await act(async () => {
      MockWebSocket.lastInstance!.open()
    })
    await act(async () => {
      // raw string that isn't valid JSON
      const ev = new MessageEvent('message', { data: 'not-json' })
      MockWebSocket.lastInstance!.onmessage?.(ev)
    })

    expect(onMessage).not.toHaveBeenCalled()
  })

  it('send() no-ops when socket is not OPEN', async () => {
    const { result } = renderHook(() => useWebSocket('/chat/1'))

    // before open
    act(() => {
      result.current.send({ type: 'message', text: 'hi' })
    })
    expect(MockWebSocket.lastInstance!.sent).toHaveLength(0)

    await act(async () => {
      MockWebSocket.lastInstance!.open()
    })

    act(() => {
      result.current.send({ type: 'message', text: 'hi' })
    })
    expect(MockWebSocket.lastInstance!.sent).toEqual(['{"type":"message","text":"hi"}'])
  })

  it('sends strings as-is, objects as JSON', async () => {
    const { result } = renderHook(() => useWebSocket('/chat/1'))
    await act(async () => {
      MockWebSocket.lastInstance!.open()
    })

    act(() => {
      result.current.send('raw-string')
      result.current.send({ a: 1 })
    })

    expect(MockWebSocket.lastInstance!.sent).toEqual(['raw-string', '{"a":1}'])
  })

  it('closes cleanly on unmount', async () => {
    const { unmount } = renderHook(() => useWebSocket('/chat/1'))
    await act(async () => {
      MockWebSocket.lastInstance!.open()
    })

    const inst = MockWebSocket.lastInstance!
    unmount()
    expect(inst.readyState).toBe(MockWebSocket.CLOSED)
  })

  it('reconnects on close with backoff (reconnect=true by default)', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useWebSocket('/chat/1', { baseBackoffMs: 100, maxBackoffMs: 1000 }),
    )

    // first socket opens
    await act(async () => {
      MockWebSocket.lastInstance!.open()
    })
    const first = MockWebSocket.lastInstance!

    // close it
    await act(async () => {
      first.close()
    })
    expect(result.current.status).toBe('closed')

    // first reconnect: ~100ms
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(MockWebSocket.instances).toHaveLength(2)

    // close the second one
    await act(async () => {
      MockWebSocket.lastInstance!.close()
    })
    // second reconnect: ~200ms (backoff doubles)
    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(MockWebSocket.instances).toHaveLength(3)
  })

  it('does not reconnect when reconnect=false', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useWebSocket('/chat/1', { reconnect: false }),
    )
    await act(async () => {
      MockWebSocket.lastInstance!.open()
    })
    await act(async () => {
      MockWebSocket.lastInstance!.close()
    })
    expect(result.current.status).toBe('closed')
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    // only the original socket ever created
    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('disconnect() stops further reconnect attempts', async () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useWebSocket('/chat/1', { baseBackoffMs: 50 }))
    await act(async () => {
      MockWebSocket.lastInstance!.open()
    })

    act(() => {
      result.current.disconnect()
    })
    unmount()

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('reconnectNow() resets backoff and reconnects immediately', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useWebSocket('/chat/1', { baseBackoffMs: 10_000 }),
    )
    await act(async () => {
      MockWebSocket.lastInstance!.open()
    })
    await act(async () => {
      MockWebSocket.lastInstance!.close()
    })

    act(() => {
      result.current.reconnectNow()
    })
    await act(async () => {
      // new socket should be created without waiting for backoff
      vi.advanceTimersByTime(0)
    })
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('pauses reconnect while document.hidden, resumes on visibilitychange', async () => {
    vi.useFakeTimers()
    // make document hidden
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })

    renderHook(() => useWebSocket('/chat/1', { baseBackoffMs: 100 }))
    await act(async () => {
      MockWebSocket.lastInstance!.open()
    })
    await act(async () => {
      MockWebSocket.lastInstance!.close()
    })

    // advance — reconnect should NOT happen while hidden
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(MockWebSocket.instances).toHaveLength(1)

    // re-show tab — fires visibilitychange listener and reconnects
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      // connect() runs in microtask + scheduleReconnect chain
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(2)

    // cleanup
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
  })

  it('reports "error" status when socket errors', async () => {
    const { result } = renderHook(() => useWebSocket('/chat/1'))
    expect(result.current.status).toBe('connecting')

    await act(async () => {
      MockWebSocket.lastInstance!.fail()
    })

    expect(['error', 'closed']).toContain(result.current.status)
  })

  it('builds URL by joining base + path', () => {
    mockWsUrl = 'wss://echo.test/' // trailing slash
    renderHook(() => useWebSocket('chat/1'))
    expect(MockWebSocket.lastInstance!.url).toBe('wss://echo.test/chat/1')

    // path with leading slash
    mockWsUrl = 'wss://echo.test'
    MockWebSocket.instances = []
    renderHook(() => useWebSocket('/chat/2'))
    expect(MockWebSocket.lastInstance!.url).toBe('wss://echo.test/chat/2')
  })
})
