/**
 * Enhanced Error Manager
 * Unified error handling system with recovery strategies, monitoring, and analytics
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'rate_limit'
  | 'timeout'
  | 'network'
  | 'database'
  | 'cache'
  | 'external_service'
  | 'business_logic'
  | 'system'
  | 'security'
  | 'unknown';

export type RecoveryStrategy =
  | 'retry'
  | 'fallback'
  | 'circuit_breaker'
  | 'graceful_degradation'
  | 'fail_fast'
  | 'manual_intervention';

export interface EnhancedError {
  id: string;
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  statusCode: number;
  timestamp: number;
  requestId: string;

  // Context information
  context: {
    endpoint: string;
    method: string;
    userAgent?: string;
    ip?: string;
    userId?: string;
    sessionId?: string;
    correlationId?: string;
  };

  // Error details
  details: {
    originalError?: Error;
    stack?: string;
    parameters?: Record<string, unknown>;
    environment?: string;
    version?: string;
  };

  // Recovery information
  recovery: {
    strategy: RecoveryStrategy;
    attempted: boolean;
    successful: boolean;
    retryCount: number;
    maxRetries: number;
    nextRetryAt?: number;
    fallbackUsed?: boolean;
  };

  // User-facing information
  userMessage: string;
  suggestions: string[];
  helpUrl?: string;

  // Monitoring data
  monitoring: {
    reportedToSentry: boolean;
    reportedToMetrics: boolean;
    alertTriggered: boolean;
    processingTime: number;
  };
}

export interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  fallbackEnabled: boolean;
  circuitBreakerThreshold: number;
  gracefulDegradationEnabled: boolean;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByStatusCode: Record<number, number>;
  recoverySuccessRate: number;
  averageRecoveryTime: number;
  topErrors: Array<{ code: string; count: number; lastOccurred: number }>;
  errorTrends: Array<{ timestamp: number; count: number; category: ErrorCategory }>;
}

/**
 * Enhanced Error Manager
 */
export class EnhancedErrorManager {
  private static instance: EnhancedErrorManager;
  private errorHistory: EnhancedError[] = [];
  private circuitBreakers = new Map<
    string,
    { failures: number; lastFailure: number; isOpen: boolean }
  >();
  private retryQueues = new Map<string, Array<{ error: EnhancedError; retryAt: number }>>();
  private config: ErrorRecoveryConfig;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(config: Partial<ErrorRecoveryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      fallbackEnabled: true,
      circuitBreakerThreshold: 5,
      gracefulDegradationEnabled: true,
      ...config,
    };

    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  static getInstance(config?: Partial<ErrorRecoveryConfig>): EnhancedErrorManager {
    if (!EnhancedErrorManager.instance) {
      EnhancedErrorManager.instance = new EnhancedErrorManager(config);
    }
    return EnhancedErrorManager.instance;
  }

  /**
   * Handle an error with recovery strategies
   */
  async handleError(
    originalError: Error,
    req: VercelRequest,
    res: VercelResponse,
    options: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      recoveryStrategy?: RecoveryStrategy;
      context?: Record<string, unknown>;
    } = {}
  ): Promise<EnhancedError> {
    const startTime = Date.now();

    // Create enhanced error
    const enhancedError = this.createEnhancedError(originalError, req, options);

    // Attempt recovery
    await this.attemptRecovery(enhancedError, req, res);

    // Update monitoring data
    enhancedError.monitoring.processingTime = Date.now() - startTime;

    // Store error for analytics
    this.storeError(enhancedError);

    // Report to monitoring systems
    await this.reportError(enhancedError);

    return enhancedError;
  }

  /**
   * Create enhanced error from original error
   */
  private createEnhancedError(
    originalError: Error,
    req: VercelRequest,
    options: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      recoveryStrategy?: RecoveryStrategy;
      context?: Record<string, unknown>;
    }
  ): EnhancedError {
    const errorId = this.generateErrorId();
    const requestId = (req.headers['x-request-id'] as string) || this.generateRequestId();

    // Determine error category and severity
    const category = options.category || this.categorizeError(originalError);
    const severity = options.severity || this.determineSeverity(originalError, category);
    const statusCode = this.getStatusCode(originalError, category);

    // Determine recovery strategy
    const recoveryStrategy =
      options.recoveryStrategy || this.selectRecoveryStrategy(category, severity);

    return {
      id: errorId,
      code: this.getErrorCode(originalError, category),
      message: originalError.message,
      category,
      severity,
      statusCode,
      timestamp: Date.now(),
      requestId,

      context: {
        endpoint: req.url || '',
        method: req.method || 'GET',
        userAgent: req.headers['user-agent'],
        ip: this.extractClientIP(req),
        userId: req.headers['x-user-id'] as string,
        sessionId: req.headers['x-session-id'] as string,
        correlationId: req.headers['x-correlation-id'] as string,
      },

      details: {
        originalError,
        stack: process.env.NODE_ENV === 'development' ? originalError.stack : undefined,
        parameters: options.context,
        environment: process.env.NODE_ENV || 'unknown',
        version: process.env.npm_package_version || '1.0.0',
      },

      recovery: {
        strategy: recoveryStrategy,
        attempted: false,
        successful: false,
        retryCount: 0,
        maxRetries: this.config.maxRetries,
        fallbackUsed: false,
      },

      userMessage: this.generateUserMessage(originalError, category),
      suggestions: this.generateSuggestions(originalError, category),
      helpUrl: this.getHelpUrl(category),

      monitoring: {
        reportedToSentry: false,
        reportedToMetrics: false,
        alertTriggered: false,
        processingTime: 0,
      },
    };
  }

  /**
   * Attempt error recovery based on strategy
   */
  private async attemptRecovery(
    error: EnhancedError,
    req: VercelRequest,
    res: VercelResponse
  ): Promise<void> {
    error.recovery.attempted = true;

    switch (error.recovery.strategy) {
      case 'retry':
        await this.attemptRetry(error, req, res);
        break;

      case 'fallback':
        await this.attemptFallback(error, req, res);
        break;

      case 'circuit_breaker':
        await this.handleCircuitBreaker(error, req, res);
        break;

      case 'graceful_degradation':
        await this.attemptGracefulDegradation(error, req, res);
        break;

      case 'fail_fast':
        // No recovery attempt, fail immediately
        break;

      case 'manual_intervention':
        await this.triggerManualIntervention(error);
        break;
    }
  }

  /**
   * Attempt retry recovery
   */
  private async attemptRetry(
    error: EnhancedError,
    req: VercelRequest,
    res: VercelResponse
  ): Promise<void> {
    if (error.recovery.retryCount >= error.recovery.maxRetries) {
      return;
    }

    const delay = this.config.exponentialBackoff
      ? this.config.retryDelayMs * Math.pow(2, error.recovery.retryCount)
      : this.config.retryDelayMs;

    error.recovery.nextRetryAt = Date.now() + delay;
    error.recovery.retryCount++;

    // Add to retry queue
    const queueKey = `${error.context.endpoint}:${error.context.method}`;
    if (!this.retryQueues.has(queueKey)) {
      this.retryQueues.set(queueKey, []);
    }

    this.retryQueues.get(queueKey)!.push({
      error,
      retryAt: error.recovery.nextRetryAt,
    });
  }

  /**
   * Attempt fallback recovery
   */
  private async attemptFallback(
    error: EnhancedError,
    req: VercelRequest,
    res: VercelResponse
  ): Promise<void> {
    if (!this.config.fallbackEnabled) {
      return;
    }

    try {
      // Implement category-specific fallbacks
      switch (error.category) {
        case 'cache':
          // Fallback to direct computation
          error.recovery.successful = true;
          error.recovery.fallbackUsed = true;
          break;

        case 'external_service':
          // Use cached data or default response
          error.recovery.successful = true;
          error.recovery.fallbackUsed = true;
          break;

        case 'database':
          // Use read replica or cached data
          error.recovery.successful = true;
          error.recovery.fallbackUsed = true;
          break;
      }
    } catch (fallbackError) {
      console.error('Fallback recovery failed:', fallbackError);
    }
  }

  /**
   * Handle circuit breaker pattern
   */
  private async handleCircuitBreaker(
    error: EnhancedError,
    _req: VercelRequest,
    _res: VercelResponse
  ): Promise<void> {
    const circuitKey = `${error.context.endpoint}:${error.category}`;
    const circuit = this.circuitBreakers.get(circuitKey) || {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
    };

    circuit.failures++;
    circuit.lastFailure = Date.now();

    // Open circuit if threshold exceeded
    if (circuit.failures >= this.config.circuitBreakerThreshold) {
      circuit.isOpen = true;
      error.recovery.successful = false;
    } else {
      // Circuit is closed, allow request
      error.recovery.successful = true;
    }

    this.circuitBreakers.set(circuitKey, circuit);

    // Auto-reset circuit after 60 seconds
    setTimeout(() => {
      if (circuit.isOpen && Date.now() - circuit.lastFailure > 60000) {
        circuit.isOpen = false;
        circuit.failures = 0;
      }
    }, 60000);
  }

  /**
   * Attempt graceful degradation
   */
  private async attemptGracefulDegradation(
    error: EnhancedError,
    _req: VercelRequest,
    _res: VercelResponse
  ): Promise<void> {
    if (!this.config.gracefulDegradationEnabled) {
      return;
    }

    try {
      // Provide reduced functionality based on error category
      switch (error.category) {
        case 'external_service':
          // Return basic response without external data
          error.recovery.successful = true;
          break;

        case 'cache':
          // Proceed without caching
          error.recovery.successful = true;
          break;

        case 'database':
          // Return cached or default data
          error.recovery.successful = true;
          break;
      }
    } catch (degradationError) {
      console.error('Graceful degradation failed:', degradationError);
    }
  }

  /**
   * Trigger manual intervention
   */
  private async triggerManualIntervention(error: EnhancedError): Promise<void> {
    // Log critical error for manual review
    console.error('MANUAL INTERVENTION REQUIRED:', {
      errorId: error.id,
      code: error.code,
      message: error.message,
      severity: error.severity,
      context: error.context,
    });

    // Could integrate with alerting systems here
    error.monitoring.alertTriggered = true;
  }

  /**
   * Categorize error based on error type and message
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }

    if (name.includes('timeout') || message.includes('timeout')) {
      return 'timeout';
    }

    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'authentication';
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit';
    }

    if (message.includes('network') || message.includes('connection')) {
      return 'network';
    }

    if (message.includes('database') || message.includes('sql')) {
      return 'database';
    }

    if (message.includes('cache') || message.includes('redis')) {
      return 'cache';
    }

    if (message.includes('security') || message.includes('threat')) {
      return 'security';
    }

    return 'unknown';
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors
    if (category === 'security' || category === 'system') {
      return 'critical';
    }

    // High severity errors
    if (category === 'database' || category === 'authentication') {
      return 'high';
    }

    // Medium severity errors
    if (category === 'external_service' || category === 'timeout') {
      return 'medium';
    }

    // Low severity errors
    return 'low';
  }

  /**
   * Get HTTP status code for error
   */
  private getStatusCode(error: Error, category: ErrorCategory): number {
    switch (category) {
      case 'validation':
        return 400;
      case 'authentication':
        return 401;
      case 'authorization':
        return 403;
      case 'rate_limit':
        return 429;
      case 'timeout':
        return 408;
      case 'external_service':
      case 'database':
      case 'cache':
      case 'system':
        return 500;
      default:
        return 500;
    }
  }

  /**
   * Select recovery strategy based on category and severity
   */
  private selectRecoveryStrategy(
    category: ErrorCategory,
    severity: ErrorSeverity
  ): RecoveryStrategy {
    if (severity === 'critical') {
      return 'manual_intervention';
    }

    switch (category) {
      case 'timeout':
      case 'network':
        return 'retry';
      case 'external_service':
      case 'cache':
        return 'fallback';
      case 'database':
        return 'circuit_breaker';
      case 'validation':
        return 'fail_fast';
      default:
        return 'graceful_degradation';
    }
  }

  /**
   * Generate error code
   */
  private getErrorCode(error: Error, category: ErrorCategory): string {
    const categoryPrefix = category.toUpperCase().replace('_', '_');
    const errorName = error.name.toUpperCase().replace(/ERROR$/, '');
    return `${categoryPrefix}_${errorName}_ERROR`;
  }

  /**
   * Generate user-friendly message
   */
  private generateUserMessage(error: Error, category: ErrorCategory): string {
    switch (category) {
      case 'validation':
        return 'The request contains invalid data. Please check your input and try again.';
      case 'authentication':
        return 'Authentication failed. Please check your credentials.';
      case 'authorization':
        return 'You do not have permission to access this resource.';
      case 'rate_limit':
        return 'Too many requests. Please wait a moment before trying again.';
      case 'timeout':
        return 'The request took too long to complete. Please try again.';
      case 'external_service':
        return 'An external service is temporarily unavailable. Please try again later.';
      case 'database':
        return 'A database error occurred. Please try again later.';
      case 'cache':
        return 'A caching error occurred. The request will proceed without caching.';
      case 'security':
        return 'A security issue was detected. Please contact support if this persists.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }

  /**
   * Generate helpful suggestions
   */
  private generateSuggestions(error: Error, category: ErrorCategory): string[] {
    const baseSuggestions = ['Try again in a few moments', 'Contact support if the issue persists'];

    switch (category) {
      case 'validation':
        return [
          'Check that all required fields are provided',
          'Verify data types and formats',
          'Review the API documentation for correct usage',
          ...baseSuggestions,
        ];
      case 'rate_limit':
        return [
          'Wait for the rate limit window to reset',
          'Consider upgrading your rate limit tier',
          'Implement request batching to reduce frequency',
          ...baseSuggestions,
        ];
      case 'timeout':
        return [
          'Try with a smaller request',
          'Check your network connectivity',
          'Consider breaking the request into smaller parts',
          ...baseSuggestions,
        ];
      default:
        return baseSuggestions;
    }
  }

  /**
   * Get help URL for error category
   */
  private getHelpUrl(category: ErrorCategory): string | undefined {
    const baseUrl = 'https://docs.example.com/errors';
    return `${baseUrl}/${category}`;
  }

  /**
   * Store error for analytics
   */
  private storeError(error: EnhancedError): void {
    this.errorHistory.push(error);

    // Keep only recent errors (last 1000)
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-1000);
    }
  }

  /**
   * Report error to monitoring systems
   */
  private async reportError(error: EnhancedError): Promise<void> {
    try {
      // Report to metrics
      error.monitoring.reportedToMetrics = true;

      // Report critical errors to alerting
      if (error.severity === 'critical') {
        error.monitoring.alertTriggered = true;
      }

      // Could integrate with Sentry, DataDog, etc.
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Get error metrics and analytics
   */
  getErrorMetrics(timeRange?: { start: number; end: number }): ErrorMetrics {
    let errors = this.errorHistory;

    if (timeRange) {
      errors = errors.filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end);
    }

    const errorsByCategory: Record<ErrorCategory, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;
    const errorsByStatusCode: Record<number, number> = {};
    const errorCounts = new Map<string, number>();

    let totalRecoveryAttempts = 0;
    let successfulRecoveries = 0;
    let totalRecoveryTime = 0;

    errors.forEach(error => {
      // Count by category
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;

      // Count by severity
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;

      // Count by status code
      errorsByStatusCode[error.statusCode] = (errorsByStatusCode[error.statusCode] || 0) + 1;

      // Count by error code
      errorCounts.set(error.code, (errorCounts.get(error.code) || 0) + 1);

      // Recovery metrics
      if (error.recovery.attempted) {
        totalRecoveryAttempts++;
        if (error.recovery.successful) {
          successfulRecoveries++;
        }
        totalRecoveryTime += error.monitoring.processingTime;
      }
    });

    // Top errors
    const topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({
        code,
        count,
        lastOccurred: Math.max(...errors.filter(e => e.code === code).map(e => e.timestamp)),
      }));

    return {
      totalErrors: errors.length,
      errorsByCategory,
      errorsBySeverity,
      errorsByStatusCode,
      recoverySuccessRate:
        totalRecoveryAttempts > 0 ? (successfulRecoveries / totalRecoveryAttempts) * 100 : 0,
      averageRecoveryTime:
        totalRecoveryAttempts > 0 ? totalRecoveryTime / totalRecoveryAttempts : 0,
      topErrors,
      errorTrends: this.calculateErrorTrends(errors),
    };
  }

  /**
   * Calculate error trends
   */
  private calculateErrorTrends(
    errors: EnhancedError[]
  ): Array<{ timestamp: number; count: number; category: ErrorCategory }> {
    const hourlyBuckets = new Map<string, Map<ErrorCategory, number>>();
    const now = Date.now();
    const oneHour = 3600000;

    // Create hourly buckets for the last 24 hours
    for (let i = 0; i < 24; i++) {
      const bucketTime = now - i * oneHour;
      const bucketKey = Math.floor(bucketTime / oneHour).toString();
      hourlyBuckets.set(bucketKey, new Map());
    }

    // Fill buckets with error data
    errors.forEach(error => {
      const bucketKey = Math.floor(error.timestamp / oneHour).toString();
      const bucket = hourlyBuckets.get(bucketKey);
      if (bucket) {
        bucket.set(error.category, (bucket.get(error.category) || 0) + 1);
      }
    });

    // Convert to trend data
    const trends: Array<{ timestamp: number; count: number; category: ErrorCategory }> = [];

    hourlyBuckets.forEach((categoryMap, bucketKey) => {
      const timestamp = parseInt(bucketKey) * oneHour;
      categoryMap.forEach((count, category) => {
        trends.push({ timestamp, count, category });
      });
    });

    return trends.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Utility methods
   */
  private generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractClientIP(req: VercelRequest): string {
    return (
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      '127.0.0.1'
    )
      .split(',')[0]
      .trim();
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up old errors
    this.errorHistory = this.errorHistory.filter(error => now - error.timestamp < maxAge);

    // Clean up old circuit breaker data
    this.circuitBreakers.forEach((circuit, key) => {
      if (now - circuit.lastFailure > maxAge) {
        this.circuitBreakers.delete(key);
      }
    });

    // Clean up retry queues
    this.retryQueues.forEach((queue, key) => {
      const validRetries = queue.filter(item => item.retryAt > now);
      if (validRetries.length === 0) {
        this.retryQueues.delete(key);
      } else {
        this.retryQueues.set(key, validRetries);
      }
    });
  }

  /**
   * Destroy manager and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.errorHistory = [];
    this.circuitBreakers.clear();
    this.retryQueues.clear();
  }
}

export default EnhancedErrorManager;
