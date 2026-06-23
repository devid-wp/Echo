async function bootstrap() {
  // Load environment variables
  const { env } = await import('@/shared/config/env');

  // Initialize mock service worker only in development when enabled
  if (env.isDev && env.enableMocks) {
    const { worker } = await import('@/shared/api/mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
  }

  // Import global styles (including theme)
  await import('./styles/global.css');
  await import('./styles/theme.css');



  // 2. Render
  const { StrictMode } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { App } = await import('./app/App')
  const { hydrateAuth } = await import('@/store/auth')


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