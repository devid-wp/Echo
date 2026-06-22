async function bootstrap() {
  // 1. Boot the mock service worker (only when explicitly enabled).
  // Reuse the same string→bool coercion as `shared/config/env` so the
  // dev / prod behaviour matches what the rest of the app sees.
  const { env } = await import('@/shared/config/env')
  if (env.enableMocks) {
    const { worker } = await import('@/shared/api/mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    })
  }

  // 2. Render
  const { StrictMode } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { App } = await import('./app/App')
  const { hydrateAuth } = await import('@/store/auth')
  await import('./styles/global.css')

  hydrateAuth()

  const rootEl = document.getElementById('root')
  if (!rootEl) throw new Error('#root element not found')

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()