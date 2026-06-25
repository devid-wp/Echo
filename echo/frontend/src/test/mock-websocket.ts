/**
 * Mock WebSocket for Vitest.
 *
 * Each instance is a fake socket with a controllable open/close/error lifecycle.
 * The latest instance is exposed via `lastInstance` so tests can drive it.
 */
export class MockWebSocket {
  static lastInstance: MockWebSocket | null = null
  static instances: MockWebSocket[] = []

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState: number = MockWebSocket.CONNECTING
  sent: string[] = []

  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.lastInstance = this
    MockWebSocket.instances.push(this)
  }

  /* test helpers — synchronously advance the lifecycle */

  open() {
    this.readyState = MockWebSocket.OPEN
    queueMicrotask(() => {
      this.onopen?.(new Event('open'))
    })
  }

  receive(data: unknown) {
    const ev = new MessageEvent('message', { data: typeof data === 'string' ? data : JSON.stringify(data) })
    this.onmessage?.(ev)
  }

  fail() {
    this.readyState = MockWebSocket.CLOSED
    queueMicrotask(() => {
      this.onerror?.(new Event('error'))
      this.onclose?.(new CloseEvent('close'))
    })
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    queueMicrotask(() => this.onclose?.(new CloseEvent('close')))
  }

  /* spec */

  send(data: string) {
    this.sent.push(data)
  }

  addEventListener(type: 'open' | 'message' | 'error' | 'close', listener: (ev: Event) => void) {
    if (type === 'open') this.onopen = listener as (ev: Event) => void
    if (type === 'message') this.onmessage = listener as (ev: MessageEvent) => void
    if (type === 'error') this.onerror = listener as (ev: Event) => void
    if (type === 'close') this.onclose = listener as (ev: CloseEvent) => void
  }

  removeEventListener() {
    /* no-op for tests */
  }
}
