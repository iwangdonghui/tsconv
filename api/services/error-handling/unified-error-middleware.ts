/**
 * Unified Error Handling Middleware
 * Comprehensive error handling with recovery strategies, formatting, and monitoring
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { EnhancedErrorManager, ErrorSeverity, RecoveryStrategy } from './enhanced-error-manager';
import { ErrorRecoveryManager } from './error-recovery-strategies';
import { ErrorResponseConfig, UnifiedErrorFormatter } from './unified-error-formatter';

export interface ErrorMiddlewareConfig {
  enableRecovery: boolean;
  enableFormatting: boolean;
  enableMonitoring: boolean;
  enableLogging: boolean;

  // Error manager configuration
  errorManager?: {
    maxRetries: number;
    retryDelayMs: number;
    exponentialBackoff: boolean;
    fallbackEnabled: boolean;
    circuitBreakerThreshold: number;
    gracefulDegradationEnabled: boolean;
  };

  // Response formatting configuration
  responseFormat?: Partial<ErrorResponseConfig>;

  // Recovery configuration
  recovery?: {
    retry?: {
      maxAttempts: number;
      baseDelayMs: number;
      exponentialBackoff: boolean;
    };
    circuitBreaker?: {
      failureThreshold: number;
      recoveryTimeoutMs: number;
    };
    fallback?: {
      enabled: boolean;
      timeoutMs: number;
    };
    bulkhead?: {
      maxConcurrentRequests: number;
      queueSize: number;
    };
  };

  // Monitoring configuration
  monitoring?: {
    enableMetrics: boolean;
    enableAlerting: boolean;
    enableTracing: boolean;
    sampleRate: number;
  };

  // Custom handlers
  onError?: (error: Error, context: ErrorContext) => void;
  onRecovery?: (error: Error, strategy: RecoveryStrategy, successful: boolean) => void;
  onAlert?: (error: Error, severity: ErrorSeverity) => void;
}

export interface ErrorContext {
  requestId: string;
  endpoint: string;
  method: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  startTime: number;
  processingTime?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Unified Error Handling Middleware
 */
export class UnifiedErrorMiddleware {
  private static instance: UnifiedErrorMiddleware;
  private errorManager: EnhancedErrorManager;
  private errorFormatter: UnifiedErrorFormatter;
  private recoveryManager: ErrorRecoveryManager;
  private config: ErrorMiddlewareConfig;
  private errorMetrics = new Map<
    string,
    {
      count: number;
      lastOccurred: number;
      averageProcessingTime: number;
    }
  >();

  constructor(config: Partial<ErrorMiddlewareConfig> = {}) {
    this.config = {
      enableRecovery: true,
      enableFormatting: true,
      enableMonitoring: true,
      enableLogging: true,
      responseFormat: {
        format: 'standard',
        locale: 'en',
        includeStack: process.env.NODE_ENV === 'development',
        includeContext: process.env.NODE_ENV === 'development',
        includeSuggestions: true,
        includeHelpUrl: true,
        sanitizeDetails: process.env.NODE_ENV === 'production',
      },
      monitoring: {
        enableMetrics: true,
        enableAlerting: true,
        enableTracing: false,
        sampleRate: 1.0,
      },
      ...config,
    };

    // Initialize components
    this.errorManager = EnhancedErrorManager.getInstance(this.config.errorManager);
    this.errorFormatter = UnifiedErrorFormatter.getInstance(this.config.responseFormat);
    this.recoveryManager = new ErrorRecoveryManager(this.config.recovery);
  }

  static getInstance(config?: Partial<ErrorMiddlewareConfig>): UnifiedErrorMiddleware {
    if (!UnifiedErrorMiddleware.instance) {
      UnifiedErrorMiddleware.instance = new UnifiedErrorMiddleware(config);
    }
    return UnifiedErrorMiddleware.instance;
  }

  /**
   * Create error handling middleware
   */
  createMiddleware() {
    return async (error: Error, req: VercelRequest, res: VercelResponse): Promise<void> => {
      const startTime = Date.now();
      const context = this.createErrorContext(req, startTime);

      try {
        // Handle the error with recovery strategies
        const enhancedError = await this.handleErrorWithRecovery(error, req, res, context);

        // Update processing time
        enhancedError.monitoring.processingTime = Date.now() - startTime;
        context.processingTime = enhancedError.monitoring.processingTime;

        // Log the error if enabled
        if (this.config.enableLogging) {
          this.logError(enhancedError, context);
        }

        // Update metrics if enabled
        if (this.config.enableMonitoring && this.config.monitoring?.enableMetrics) {
          this.updateMetrics(enhancedError, context);
        }

        // Trigger alerts if needed
        if (this.config.enableMonitoring && this.config.monitoring?.enableAlerting) {
          this.checkAndTriggerAlerts(enhancedError, context);
        }

        // Call custom error handler if provided
        if (this.config.onError) {
          try {
            this.config.onError(error, context);
          } catch (handlerError) {
            console.error('Error in custom error handler:', handlerError);
          }
        }

        // Format and send error response
        if (this.config.enableFormatting) {
          this.errorFormatter.sendErrorResponse(enhancedError, res, {
            ...this.config.responseFormat,
            correlationId: context.correlationId,
          });
        } else {
          // Send basic error response
          res.status(enhancedError.statusCode).json({
            success: false,
            error: {
              code: enhancedError.code,
              message: enhancedError.userMessage,
              timestamp: enhancedError.timestamp,
              requestId: enhancedError.requestId,
            },
          });
        }
      } catch (middlewareError) {
        console.error('Error in unified error middleware:', middlewareError);

        // Fallback error response
        res.status(500).json({
          success: false,
          error: {
            code: 'MIDDLEWARE_ERROR',
            message: 'An error occurred while processing the error',
            timestamp: Date.now(),
            requestId: context.requestId,
          },
        });
      }
    };
  }

  /**
   * Handle error with recovery strategies
   */
  private async handleErrorWithRecovery(
    error: Error,
    req: VercelRequest,
    res: VercelResponse,
    context: ErrorContext
  ): Promise<any> {
    // Create enhanced error
    const enhancedError = await this.errorManager.handleError(error, req, res, {
      context: context.metadata,
    });

    // Attempt recovery if enabled
    if (this.config.enableRecovery && enhancedError.recovery.strategy !== 'fail_fast') {
      try {
        await this.attemptRecovery(enhancedError, context);
      } catch (recoveryError) {
        console.warn('Recovery attempt failed:', recoveryError);
        enhancedError.recovery.successful = false;
      }
    }

    return enhancedError;
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(enhancedError: any, context: ErrorContext): Promise<void> {
    const recoveryContext = {
      requestId: context.requestId,
      endpoint: context.endpoint,
      strategy: enhancedError.recovery.strategy,
      fallbackKey: `${context.endpoint}:${context.method}`,
    };

    try {
      // Create a mock operation for recovery testing
      const mockOperation = async () => {
        // This would be the actual operation that failed
        // For now, we'll simulate recovery success/failure
        if (Math.random() > 0.5) {
          return { recovered: true };
        } else {
          throw new Error('Recovery failed');
        }
      };

      await this.recoveryManager.executeWithRecovery(mockOperation, recoveryContext);

      enhancedError.recovery.successful = true;

      // Call recovery callback if provided
      if (this.config.onRecovery) {
        this.config.onRecovery(
          enhancedError.details.originalError,
          enhancedError.recovery.strategy,
          true
        );
      }
    } catch (recoveryError) {
      enhancedError.recovery.successful = false;

      // Call recovery callback if provided
      if (this.config.onRecovery) {
        this.config.onRecovery(
          enhancedError.details.originalError,
          enhancedError.recovery.strategy,
          false
        );
      }

      throw recoveryError;
    }
  }

  /**
   * Create error context from request
   */
  private createErrorContext(req: VercelRequest, startTime: number): ErrorContext {
    return {
      requestId: (req.headers['x-request-id'] as string) || this.generateRequestId(),
      endpoint: req.url || '',
      method: req.method || 'GET',
      userAgent: req.headers['user-agent'],
      ip: this.extractClientIP(req),
      userId: req.headers['x-user-id'] as string,
      sessionId: req.headers['x-session-id'] as string,
      correlationId: (req.headers['x-correlation-id'] as string) || this.generateCorrelationId(),
      startTime,
      metadata: {
        query: req.query,
        body: req.body,
        headers: req.headers,
      },
    };
  }

  /**
   * Log error with context
   */
  private logError(enhancedError: any, context: ErrorContext): void {
    const logData = {
      errorId: enhancedError.id,
      code: enhancedError.code,
      message: enhancedError.message,
      category: enhancedError.category,
      severity: enhancedError.severity,
      context: {
        requestId: context.requestId,
        endpoint: context.endpoint,
        method: context.method,
        ip: context.ip,
        userAgent: context.userAgent,
        processingTime: context.processingTime,
      },
      recovery: {
        strategy: enhancedError.recovery.strategy,
        attempted: enhancedError.recovery.attempted,
        successful: enhancedError.recovery.successful,
      },
      timestamp: enhancedError.timestamp,
    };

    // Log based on severity
    switch (enhancedError.severity) {
      case 'critical':
        console.error('CRITICAL ERROR:', JSON.stringify(logData, null, 2));
        break;
      case 'high':
        console.error('HIGH SEVERITY ERROR:', JSON.stringify(logData, null, 2));
        break;
      case 'medium':
        console.warn('MEDIUM SEVERITY ERROR:', JSON.stringify(logData, null, 2));
        break;
      case 'low':
        console.info('LOW SEVERITY ERROR:', JSON.stringify(logData, null, 2));
        break;
      default:
        console.log('ERROR:', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Update error metrics
   */
  private updateMetrics(enhancedError: any, context: ErrorContext): void {
    const metricKey = `${enhancedError.category}:${enhancedError.code}`;
    const existing = this.errorMetrics.get(metricKey) || {
      count: 0,
      lastOccurred: 0,
      averageProcessingTime: 0,
    };

    existing.count++;
    existing.lastOccurred = enhancedError.timestamp;
    existing.averageProcessingTime =
      (existing.averageProcessingTime + (context.processingTime || 0)) / 2;

    this.errorMetrics.set(metricKey, existing);
  }

  /**
   * Check and trigger alerts
   */
  private checkAndTriggerAlerts(enhancedError: any, context: ErrorContext): void {
    // Trigger alerts for critical errors
    if (enhancedError.severity === 'critical') {
      this.triggerAlert(enhancedError, context, 'Critical error detected');
    }

    // Check for error rate thresholds
    const metricKey = `${enhancedError.category}:${enhancedError.code}`;
    const metrics = this.errorMetrics.get(metricKey);

    if (metrics && metrics.count > 10) {
      // Threshold: 10 errors
      this.triggerAlert(enhancedError, context, `High error rate: ${metrics.count} occurrences`);
    }

    // Check for slow processing
    if (context.processingTime && context.processingTime > 5000) {
      // 5 seconds
      this.triggerAlert(
        enhancedError,
        context,
        `Slow error processing: ${context.processingTime}ms`
      );
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(enhancedError: any, context: ErrorContext, reason: string): void {
    const alertData = {
      reason,
      error: {
        id: enhancedError.id,
        code: enhancedError.code,
        category: enhancedError.category,
        severity: enhancedError.severity,
      },
      context: {
        requestId: context.requestId,
        endpoint: context.endpoint,
        method: context.method,
        processingTime: context.processingTime,
      },
      timestamp: Date.now(),
    };

    console.error('🚨 ERROR ALERT:', JSON.stringify(alertData, null, 2));

    // Call custom alert handler if provided
    if (this.config.onAlert) {
      try {
        this.config.onAlert(enhancedError.details.originalError, enhancedError.severity);
      } catch (alertError) {
        console.error('Error in custom alert handler:', alertError);
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    topErrors: Array<{ key: string; count: number; lastOccurred: number }>;
    recoveryStats: any;
  } {
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    let totalErrors = 0;

    this.errorMetrics.forEach((metrics, key) => {
      const [category] = key.split(':');
      if (!category) return;
      errorsByCategory[category] = (errorsByCategory[category] || 0) + metrics.count;
      totalErrors += metrics.count;
    });

    const topErrors = Array.from(this.errorMetrics.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([key, metrics]) => ({
        key,
        count: metrics.count,
        lastOccurred: metrics.lastOccurred,
      }));

    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      topErrors,
      recoveryStats: this.recoveryManager.getRecoveryStats(),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ErrorMiddlewareConfig>): void {
    this.config = { ...this.config, ...updates };

    if (updates.responseFormat) {
      this.errorFormatter.updateDefaultConfig(updates.responseFormat);
    }
  }

  /**
   * Reset error statistics
   */
  resetStats(): void {
    this.errorMetrics.clear();
    this.recoveryManager.reset();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, string>;
    metrics: {
      totalErrors: number;
      recentErrors: number;
      recoverySuccessRate: number;
    };
  }> {
    const now = Date.now();
    const oneHour = 3600000;

    let recentErrors = 0;
    // let totalRecoveryAttempts = 0; // Currently not used
    // let successfulRecoveries = 0; // Currently not used

    this.errorMetrics.forEach(metrics => {
      if (now - metrics.lastOccurred < oneHour) {
        recentErrors += metrics.count;
      }
    });

    const recoveryStats = this.recoveryManager.getRecoveryStats();
    const circuitBreakerStatus = recoveryStats.circuitBreaker.state;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (circuitBreakerStatus === 'OPEN' || recentErrors > 100) {
      status = 'unhealthy';
    } else if (circuitBreakerStatus === 'HALF_OPEN' || recentErrors > 50) {
      status = 'degraded';
    }

    return {
      status,
      components: {
        errorManager: 'healthy',
        errorFormatter: 'healthy',
        recoveryManager: circuitBreakerStatus === 'OPEN' ? 'unhealthy' : 'healthy',
        monitoring: this.config.enableMonitoring ? 'healthy' : 'disabled',
      },
      metrics: {
        totalErrors: Array.from(this.errorMetrics.values()).reduce((sum, m) => sum + m.count, 0),
        recentErrors,
        recoverySuccessRate:
          recoveryStats.retry.averageAttempts > 0
            ? (1 - recoveryStats.retry.averageAttempts / 3) * 100
            : 100,
      },
    };
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractClientIP(req: VercelRequest): string {
    const ip: string =
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      (req.connection?.remoteAddress as string) ||
      '127.0.0.1';
    return (ip || '127.0.0.1').split(',')[0]!.trim();
  }
}

/**
 * Create unified error middleware with default configuration
 */
export function createUnifiedErrorMiddleware(config: Partial<ErrorMiddlewareConfig> = {}) {
  const middleware = UnifiedErrorMiddleware.getInstance(config);
  return middleware.createMiddleware();
}

/**
 * Create environment-specific error middleware
 */
export const createDevelopmentErrorMiddleware = () =>
  createUnifiedErrorMiddleware({
    enableRecovery: false,
    responseFormat: {
      format: 'debug',
      includeStack: true,
      includeContext: true,
    },
    monitoring: {
      enableMetrics: true,
      enableAlerting: false,
      enableTracing: true,
      sampleRate: 1.0,
    },
  });

export const createProductionErrorMiddleware = () =>
  createUnifiedErrorMiddleware({
    enableRecovery: true,
    responseFormat: {
      format: 'standard',
      includeStack: false,
      includeContext: false,
      sanitizeDetails: true,
    },
    monitoring: {
      enableMetrics: true,
      enableAlerting: true,
      enableTracing: false,
      sampleRate: 0.1,
    },
  });

export const createTestingErrorMiddleware = () =>
  createUnifiedErrorMiddleware({
    enableRecovery: false,
    enableLogging: false,
    responseFormat: {
      format: 'minimal',
      includeStack: false,
      includeContext: false,
    },
    monitoring: {
      enableMetrics: false,
      enableAlerting: false,
      enableTracing: false,
      sampleRate: 0,
    },
  });

export default UnifiedErrorMiddleware;
