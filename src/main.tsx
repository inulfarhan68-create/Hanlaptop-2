import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// @ts-ignore
import { registerSW } from 'virtual:pwa-register'

// Scoped fetch interceptor — ONLY injects auth headers for our own API endpoints.
// Third-party requests (CDN, analytics, etc.) pass through untouched.
const originalFetch = window.fetch;
const API_BASE = import.meta.env.VITE_API_URL || '';
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
  const isOwnApi = url.startsWith('/api/') || url.startsWith('/api') || (API_BASE && url.startsWith(API_BASE));

  if (isOwnApi) {
    const storeId = localStorage.getItem('selectedStoreId') || 'all';
    const newInit = { ...init };
    newInit.credentials = 'include';
    newInit.headers = {
      ...newInit.headers,
      'x-store-id': storeId
    };
    return originalFetch(input, newInit);
  }
  return originalFetch(input, init);
};

// Register PWA service worker with auto-update triggers
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Force update and activate immediately
      updateSW(true);
    },
    onOfflineReady() {
      console.log('PWA is ready to work offline');
    }
  });

  // Force checking for updates when page loads
  navigator.serviceWorker.ready.then((registration) => {
    registration.update().catch(err => console.warn('SW update check failed on load:', err));
  });

  // Force checking for updates when returning to the app (visibility change)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update().catch(err => console.warn('SW update check failed on focus:', err));
      });
    }
  });

  // Reload the page once the new service worker active version takes over control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
