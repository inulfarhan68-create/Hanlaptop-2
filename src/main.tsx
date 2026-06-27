import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// @ts-ignore
import { registerSW } from 'virtual:pwa-register'

// Global fetch override to inject store ID and credentials into all requests automatically
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const storeId = localStorage.getItem('selectedStoreId') || 'all';
  const newInit = { ...init };
  newInit.credentials = 'include';
  newInit.headers = {
    ...newInit.headers,
    'x-store-id': storeId
  };
  return originalFetch(input, newInit);
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
