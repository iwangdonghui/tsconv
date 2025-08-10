/**
 * Global Error Tracking and Monitoring
 * 
 * This module provides comprehensive error tracking for the application,
 * including unhandled errors, promise rejections, and custom error reporting.
 */

import * as Sentry from '@sentry/react';

// Error tracking configuration
interface ErrorTrackingConfig {
  enableConsoleLogging: boolean;
  enableSentryReporting: boolean;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
}

const defaultConfig: ErrorTrackingConfig = {
  enableConsoleLogging: true,
  enableSentryReporting: true,
  enableLocalStorage: true,
  maxStoredErrors: 50,
};

let config = { ...defaultConfig };
let isInitialized = false;

/**
 * Initialize global error tracking
 */
export function initializeErrorTracking(customConfig?: Partial<ErrorTrackingConfig>): void {
  if (isInitialized) {
    console.warn('Error tracking already initialized');
    return;
  }

  // Merge custom config
  config = { ...defaultConfig, ...customConfig };

  // Set up global error handlers
  setupGlobalErrorHandlers();
  
  // Set up performance monitoring
  setupPerformanceMonitoring();
  
  // Set up user interaction tracking
  setupUserInteractionTracking();

  isInitialized = true;
  console.log('Global error tracking initialized');
}

/**
 * Set up global error handlers
 */
function setupGlobalErrorHandlers(): void {
  // Handle unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    
    reportError(error, {
      type: 'unhandled_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    reportError(error, {
      type: 'unhandled_promise_rejection',
      reason: event.reason,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target && event.target !== window) {
      const target = event.target as HTMLElement;
      
      reportError(new Error(`Resource loading failed: ${target.tagName}`), {
        type: 'resource_error',
        tagName: target.tagName,
        src: (target as any).src || (target as any).href,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    }
  }, true);
}

/**
 * Set up performance monitoring
 */
function setupPerformanceMonitoring(): void {
  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            reportPerformanceIssue('Long Task Detected', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
              url: window.location.href,
            });
          }
        }
      });
      
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long task monitoring not supported');
    }

    // Monitor layout shifts
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).value > 0.1) { // CLS threshold
            reportPerformanceIssue('Layout Shift Detected', {
              value: (entry as any).value,
              sources: (entry as any).sources,
              url: window.location.href,
            });
          }
        }
      });
      
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Layout shift monitoring not supported');
    }
  }
}

/**
 * Set up user interaction tracking
 */
function setupUserInteractionTracking(): void {
  // Track clicks that might lead to errors
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    
    Sentry.addBreadcrumb({
      message: 'User clicked element',
      category: 'ui.click',
      data: {
        tagName: target.tagName,
        className: target.className,
        id: target.id,
        text: target.textContent?.slice(0, 100),
      },
      level: 'info',
    });
  });

  // Track form submissions
  document.addEventListener('submit', (event) => {
    const target = event.target as HTMLFormElement;
    
    Sentry.addBreadcrumb({
      message: 'Form submitted',
      category: 'ui.form',
      data: {
        action: target.action,
        method: target.method,
        id: target.id,
        className: target.className,
      },
      level: 'info',
    });
  });

  // Track navigation
  window.addEventListener('popstate', () => {
    Sentry.addBreadcrumb({
      message: 'Navigation occurred',
      category: 'navigation',
      data: {
        from: document.referrer,
        to: window.location.href,
      },
      level: 'info',
    });
  });
}

/**
 * Report an error with context
 */
export function reportError(error: Error, context?: Record<string, any>): void {
  // Console logging
  if (config.enableConsoleLogging) {
    console.error('Error reported:', error, context);
  }

  // Sentry reporting
  if (config.enableSentryReporting) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('error_context', context);
      }
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }

  // Local storage for debugging
  if (config.enableLocalStorage) {
    storeErrorLocally(error, context);
  }
}

/**
 * Report a performance issue
 */
export function reportPerformanceIssue(message: string, context?: Record<string, any>): void {
  if (config.enableSentryReporting) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('performance_context', context);
      }
      scope.setLevel('warning');
      scope.setTag('issue_type', 'performance');
      Sentry.captureMessage(message);
    });
  }

  if (config.enableConsoleLogging) {
    console.warn('Performance issue:', message, context);
  }
}

/**
 * Store error locally for debugging
 */
function storeErrorLocally(error: Error, context?: Record<string, any>): void {
  try {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    const stored = JSON.parse(localStorage.getItem('error_log') || '[]');
    stored.push(errorData);

    // Keep only the most recent errors
    if (stored.length > config.maxStoredErrors) {
      stored.splice(0, stored.length - config.maxStoredErrors);
    }

    localStorage.setItem('error_log', JSON.stringify(stored));
  } catch (storageError) {
    console.warn('Failed to store error locally:', storageError);
  }
}

/**
 * Get stored errors for debugging
 */
export function getStoredErrors(): any[] {
  try {
    return JSON.parse(localStorage.getItem('error_log') || '[]');
  } catch (error) {
    console.warn('Failed to retrieve stored errors:', error);
    return [];
  }
}

/**
 * Clear stored errors
 */
export function clearStoredErrors(): void {
  try {
    localStorage.removeItem('error_log');
  } catch (error) {
    console.warn('Failed to clear stored errors:', error);
  }
}

/**
 * Get error tracking statistics
 */
export function getErrorStats(): {
  totalErrors: number;
  recentErrors: number;
  errorTypes: Record<string, number>;
} {
  const errors = getStoredErrors();
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);

  const recentErrors = errors.filter(error => 
    new Date(error.timestamp).getTime() > oneHourAgo
  );

  const errorTypes: Record<string, number> = {};
  errors.forEach(error => {
    const type = error.context?.type || 'unknown';
    errorTypes[type] = (errorTypes[type] || 0) + 1;
  });

  return {
    totalErrors: errors.length,
    recentErrors: recentErrors.length,
    errorTypes,
  };
}

/**
 * Export error tracking utilities
 */
export const ErrorTracking = {
  initialize: initializeErrorTracking,
  reportError,
  reportPerformanceIssue,
  getStoredErrors,
  clearStoredErrors,
  getErrorStats,
};
