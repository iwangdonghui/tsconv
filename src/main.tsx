import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { serviceWorkerManager } from './utils/service-worker'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register service worker in production
if (process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    serviceWorkerManager.register().then(success => {
      if (success) {
        console.log('✅ Service Worker registered successfully');

        // Preload critical resources
        serviceWorkerManager.preloadCriticalResources([
          '/optimized/favicon-32x32.webp',
          '/optimized/favicon-32x32.avif',
          '/optimized/apple-touch-icon.webp'
        ]);
      } else {
        console.warn('❌ Service Worker registration failed');
      }
    });
  });
}