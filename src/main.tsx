import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorMonitoringDashboard } from './components/ErrorMonitoringDashboard';
import { ErrorTestComponent } from './components/ErrorTestComponent';
import { PerformanceMonitoringDashboard } from './components/PerformanceMonitoringDashboard';
import './index.css';
import { ErrorTracking } from './lib/error-tracking';
import { initializePerformanceMonitoring } from './lib/performance-monitoring';
import { initializeSentry } from './lib/sentry';
import { serviceWorkerManager } from './utils/service-worker';

// Initialize error tracking systems
initializeSentry();
ErrorTracking.initialize({
  enableConsoleLogging: import.meta.env?.DEV || false,
  enableSentryReporting: true,
  enableLocalStorage: import.meta.env?.DEV || false,
  maxStoredErrors: 100,
});

// Initialize performance monitoring
initializePerformanceMonitoring({
  enableWebVitals: true,
  enableCustomMetrics: true,
  enableResourceTiming: true,
  enableNavigationTiming: true,
  enableMemoryMonitoring: true,
  reportToSentry: true,
  reportToConsole: import.meta.env?.DEV || false,
  sampleRate: import.meta.env?.PROD ? 0.1 : 1.0,
}).catch(error => {
  console.error('Failed to initialize performance monitoring:', error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <ErrorMonitoringDashboard />
      <PerformanceMonitoringDashboard />
      <ErrorTestComponent />
    </ErrorBoundary>
  </React.StrictMode>
);

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
          '/optimized/apple-touch-icon.webp',
        ]);
      } else {
        console.warn('❌ Service Worker registration failed');
      }
    });
  });
}
