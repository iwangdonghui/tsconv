/**
 * Sentry Error Tracking Configuration
 *
 * This module configures Sentry for comprehensive error tracking,
 * performance monitoring, and user session tracking.
 */

import * as Sentry from '@sentry/react';

// Environment configuration
const isDevelopment = import.meta.env?.DEV || false;
const isProduction = import.meta.env?.PROD || false;
const sentryDsn = import.meta.env?.VITE_SENTRY_DSN;

// Sentry configuration options
const sentryConfig: Sentry.BrowserOptions = {
  dsn: sentryDsn,
  environment: import.meta.env?.MODE || 'development',

  // Performance monitoring
  integrations: [
    Sentry.replayIntegration({
      // Mask sensitive data
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  // Performance monitoring sample rates
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  // Release tracking
  release: import.meta.env?.VITE_APP_VERSION || 'development',

  // Error filtering
  beforeSend(event, hint) {
    // Filter out development errors in production
    if (isProduction && event.exception) {
      const error = hint.originalException;

      // Filter out network errors that are not actionable
      if (error instanceof Error) {
        if (
          error.message.includes('Network Error') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('Load failed')
        ) {
          return null;
        }

        // Filter out extension errors
        if (error.stack?.includes('extension://') || error.stack?.includes('moz-extension://')) {
          return null;
        }

        // Filter out script errors from other domains
        if (error.message === 'Script error.' && !error.stack) {
          return null;
        }
      }
    }

    // Add user context if available
    if (event.user && !event.user.id) {
      event.user.id = generateAnonymousUserId();
    }

    return event;
  },

  // Privacy protection
  beforeSendTransaction(event) {
    // Remove sensitive data from transaction names
    if (event.transaction) {
      event.transaction = sanitizeTransactionName(event.transaction);
    }

    return event;
  },

  // Initial user context
  initialScope: {
    tags: {
      component: 'frontend',
      framework: 'react',
      bundler: 'vite',
    },
    contexts: {
      app: {
        name: 'tsconv',
        version: import.meta.env?.VITE_APP_VERSION || 'development',
      },
      browser: {
        name: navigator.userAgent,
      },
    },
  },

  // Debug mode for development
  debug: isDevelopment,

  // Enable if DSN is provided (works in both dev and production)
  enabled: Boolean(sentryDsn),
};

/**
 * Initialize Sentry error tracking
 */
export function initializeSentry(): void {
  console.log('🔍 Sentry 初始化检查:', {
    sentryDsn: sentryDsn ? '已配置' : '未配置',
    isDevelopment,
    isProduction,
    enabled: Boolean(sentryDsn),
  });

  if (!sentryDsn && isProduction) {
    console.warn('Sentry DSN not configured for production environment');
    return;
  }

  if (!sentryDsn) {
    console.warn('⚠️ Sentry DSN 未配置，跳过初始化');
    return;
  }

  try {
    Sentry.init(sentryConfig);

    // Set initial user context
    Sentry.setUser({
      id: generateAnonymousUserId(),
      ip_address: '{{auto}}',
    });

    // Set initial tags
    Sentry.setTags({
      timestamp_converter: true,
      feature_set: 'full',
    });

    // 暴露到全局供调试使用
    if (isDevelopment) {
      (window as any).Sentry = Sentry;
    }

    console.log('✅ Sentry error tracking initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Generate anonymous user ID for tracking
 */
function generateAnonymousUserId(): string {
  let userId = localStorage.getItem('sentry_user_id');

  if (!userId) {
    userId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('sentry_user_id', userId);
  }

  return userId;
}

/**
 * Sanitize transaction names to remove sensitive data
 */
function sanitizeTransactionName(transaction: string): string {
  // Remove potential sensitive data from URLs
  return transaction
    .replace(/\/api\/[^\/]+\/[a-f0-9-]{36}/g, '/api/*/[uuid]')
    .replace(/\?.*$/, '')
    .replace(/\/\d+/g, '/[id]');
}

/**
 * Custom error reporting functions
 */
export const ErrorReporting = {
  /**
   * Report a custom error with context
   */
  reportError(error: Error, context?: Record<string, any>): void {
    Sentry.withScope(scope => {
      if (context) {
        scope.setContext('custom', context);
      }
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  },

  /**
   * Report a warning message
   */
  reportWarning(message: string, context?: Record<string, any>): void {
    Sentry.withScope(scope => {
      if (context) {
        scope.setContext('custom', context);
      }
      scope.setLevel('warning');
      Sentry.captureMessage(message);
    });
  },

  /**
   * Report user feedback
   */
  reportFeedback(feedback: { name?: string; email?: string; message: string; url?: string }): void {
    Sentry.captureFeedback({
      message: feedback.message,
      name: feedback.name || 'Anonymous',
      email: feedback.email || 'anonymous@example.com',
      url: feedback.url || window.location.href,
    });
  },

  /**
   * Set user context
   */
  setUser(user: { id?: string; email?: string; username?: string; [key: string]: any }): void {
    Sentry.setUser(user);
  },

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category?: string, level?: Sentry.SeverityLevel): void {
    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      level: level || 'info',
      timestamp: Date.now() / 1000,
    });
  },

  /**
   * Set custom tags
   */
  setTags(tags: Record<string, string>): void {
    Sentry.setTags(tags);
  },

  /**
   * Set custom context
   */
  setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context);
  },
};

export default Sentry;
