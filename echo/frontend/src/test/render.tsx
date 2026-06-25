import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement, ReactNode } from 'react'

/**
 * Test render helpers.
 *
 * The production app mounts the tree inside:
 *   QueryProvider  >  BrowserRouter  >  AppLayout
 *
 * For component / hook / page tests we usually only need the providers
 * the unit depends on. The defaults below give you:
 *   - MemoryRouter (so <Link> / <Navigate> work without a real history)
 *   - QueryClient with retry:false (so test failures don't hang)
 */

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface ProviderOptions {
  /** Initial URL for MemoryRouter. Default: '/'. */
  initialPath?: string
  /** Skip MemoryRouter entirely (e.g. for unit tests that don't route). */
  withoutRouter?: boolean
  /** Custom QueryClient — defaults to a fresh one. */
  queryClient?: QueryClient
  /** Extra children to wrap (e.g. <AuthProvider/>). */
  wrapper?: ReactNode
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialPath = '/',
    withoutRouter = false,
    queryClient = makeQueryClient(),
    wrapper,
  }: ProviderOptions & RenderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const inner = (
    <QueryClientProvider client={queryClient}>
      {withoutRouter ? ui : <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>}
    </QueryClientProvider>
  )
  const tree = wrapper ? <>{wrapper}{inner}</> : inner
  const result = render(tree)
  return Object.assign(result, { queryClient })
}

/** Render without any providers — for pure unit / class component tests. */
export function renderPlain(ui: ReactElement): RenderResult {
  return render(ui)
}
