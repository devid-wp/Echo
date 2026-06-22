async function bootstrap() {
  // 1. Boot the mock service worker (only when explicitly enabled)
  const mocksEnabled =
    import.meta.env.VITE_ENABLE_MOCKS === 'true' ||
    import.meta.env.VITE_ENABLE_MOCKS === true
  if (mocksEnabled) {
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