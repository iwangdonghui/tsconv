/**
 * Sentry Server-Side Error Tracking Configuration
 *
 * This module configures Sentry for server-side error tracking,
 * performance monitoring, and API error reporting.
 */

import * as Sentry from '@sentry/node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Environment configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const sentryDsn = process.env.SENTRY_DSN;

// Sentry configuration options
const sentryConfig: Sentry.NodeOptions = {
  dsn: sentryDsn,
  environment: process.env.NODE_ENV || 'development',

  // Performance monitoring
  integrations: [
    // HTTP integration for tracking outbound requests
    Sentry.httpIntegration(),
  ],

  // Performance monitoring sample rates
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.APP_VERSION || 'development',

  // Error filtering
  beforeSend(event, hint) {
    // Filter out development errors in production
    if (isProduction && event.exception) {
      const error = hint.originalException;

      if (error instanceof Error) {
        // Filter out common network timeouts
        if (
          error.message.includes('ECONNRESET') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ENOTFOUND')
        ) {
          return null;
        }

        // Filter out Redis connection errors (they're handled gracefully)
        if (error.message.includes('Redis') && error.message.includes('connection')) {
          return null;
        }
      }
    }

    // Add server context
    if (event.contexts) {
      event.contexts.server = {
        name: 'vercel-serverless',
        version: process.version,
        runtime: 'nodejs',
      };
    }

    return event;
  },

  // Initial scope
  initialScope: {
    tags: {
      component: 'backend',
      runtime: 'nodejs',
      platform: 'vercel',
    },
    contexts: {
      app: {
        name: 'tsconv-api',
        version: process.env.APP_VERSION || 'development',
      },
      runtime: {
        name: 'node',
        version: process.version,
      },
    },
  },

  // Debug mode for development
  debug: isDevelopment,

  // Disable in development if no DSN is provided
  enabled: Boolean(sentryDsn),
};

/**
 * Initialize Sentry for server-side error tracking
 */
export function initializeSentryServer(): void {
  if (!sentryDsn && isProduction) {
    console.warn('Sentry DSN not configured for production environment');
    return;
  }

  try {
    Sentry.init(sentryConfig);

    // Set initial tags
    Sentry.setTags({
      api_version: 'v1',
      timestamp_converter: true,
    });

    console.log('Sentry server-side error tracking initialized');
  } catch (error) {
    console.error('Failed to initialize Sentry server:', error);
  }
}

/**
 * Sentry middleware for Vercel serverless functions
 */
export function withSentry<T extends VercelRequest, U extends VercelResponse>(
  handler: (req: T, res: U) => Promise<void> | void
) {
  return async (req: T, res: U) => {
    try {
      // Set request context
      Sentry.setContext('request', {
        method: req.method,
        url: req.url,
        headers: sanitizeHeaders(req.headers),
        query: req.query,
        user_agent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'],
      });

      // Set user context if available
      const userId = req.headers['x-user-id'] as string;
      if (userId) {
        Sentry.setUser({ id: userId });
      }

      await handler(req, res);
    } catch (error) {
      // Capture the error with additional context
      Sentry.withScope(scope => {
        scope.setContext('error_details', {
          endpoint: req.url,
          method: req.method,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'],
        });

        Sentry.captureException(error);
      });

      // Re-throw the error to be handled by the error handler
      throw error;
    }
  };
}

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized = { ...headers };

  // Remove sensitive headers
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-access-token',
  ];

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Server-side error reporting utilities
 */
export const ServerErrorReporting = {
  /**
   * Report API error with context
   */
  reportApiError(
    error: Error,
    context: {
      endpoint?: string;
      method?: string;
      userId?: string;
      requestId?: string;
      [key: string]: any;
    }
  ): void {
    Sentry.withScope(scope => {
      scope.setContext('api_error', context);
      scope.setLevel('error');
      scope.setTag('error_type', 'api_error');
      Sentry.captureException(error);
    });
  },

  /**
   * Report database error
   */
  reportDatabaseError(
    error: Error,
    context: {
      operation?: string;
      table?: string;
      query?: string;
      [key: string]: any;
    }
  ): void {
    Sentry.withScope(scope => {
      scope.setContext('database_error', {
        ...context,
        // Sanitize query to remove potential sensitive data
        query: context.query ? sanitizeQuery(context.query) : undefined,
      });
      scope.setLevel('error');
      scope.setTag('error_type', 'database_error');
      Sentry.captureException(error);
    });
  },

  /**
   * Report external service error
   */
  reportExternalServiceError(
    error: Error,
    context: {
      service?: string;
      endpoint?: string;
      statusCode?: number;
      [key: string]: any;
    }
  ): void {
    Sentry.withScope(scope => {
      scope.setContext('external_service_error', context);
      scope.setLevel('error');
      scope.setTag('error_type', 'external_service_error');
      Sentry.captureException(error);
    });
  },

  /**
   * Report performance issue
   */
  reportPerformanceIssue(
    message: string,
    context: {
      operation?: string;
      duration?: number;
      threshold?: number;
      [key: string]: any;
    }
  ): void {
    Sentry.withScope(scope => {
      scope.setContext('performance_issue', context);
      scope.setLevel('warning');
      scope.setTag('issue_type', 'performance');
      Sentry.captureMessage(message);
    });
  },

  /**
   * Add breadcrumb for server-side debugging
   */
  addBreadcrumb(message: string, category?: string, level?: Sentry.SeverityLevel): void {
    Sentry.addBreadcrumb({
      message,
      category: category || 'server',
      level: level || 'info',
      timestamp: Date.now() / 1000,
    });
  },
};

/**
 * Sanitize SQL query to remove potential sensitive data
 */
function sanitizeQuery(query: string): string {
  return query
    .replace(/VALUES\s*\([^)]+\)/gi, 'VALUES (...)')
    .replace(/=\s*'[^']*'/gi, "= '[REDACTED]'")
    .replace(/=\s*"[^"]*"/gi, '= "[REDACTED]"');
}

export default Sentry;
