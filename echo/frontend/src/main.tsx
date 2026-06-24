import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { env } from '@/shared/config/env';
import { App } from './app/App';
import { hydrateAuth } from '@/store/auth';

import './styles/global.css';
import './styles/theme.css';

async function bootstrap() {
  // Initialize mock service worker only in development when enabled
  if (env.isDev && env.enableMocks) {
    const { worker } = await import('@/shared/api/mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
  }

  hydrateAuth();

  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('#root element not found');

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

bootstrap();