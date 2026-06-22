import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

/**
 * QueryProvider — single source of truth for server-state caching.
 *
 *  - staleTime 30s: feed/profile are not real-time-critical; saves refetch thrash
 *    on tab focus. WebSocket still pushes fresh data into the cache.
 *  - retry 1: enough to ride out a flaky network, doesn't loop on 4xx.
 *  - refetchOnWindowFocus: a returning user sees fresh data without us
 *    having to wire explicit invalidations everywhere.
 *
 * The devtools only attach in DEV builds — no production footprint.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={client}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />}
    </QueryClientProvider>
  )
}
