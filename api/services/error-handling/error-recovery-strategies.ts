/**
 * Error Recovery Strategies
 * Comprehensive error recovery mechanisms with circuit breakers, retries, and fallbacks
 */

// import { VercelRequest, VercelResponse } from '@vercel/node'; // Currently not used
import { EnhancedError, ErrorCategory, RecoveryStrategy } from './enhanced-error-manager';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  jitterEnabled: boolean;
  retryableErrors: ErrorCategory[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  monitoringWindowMs: number;
  halfOpenMaxCalls: number;
}

export interface FallbackConfig {
  enabled: boolean;
  timeoutMs: number;
  fallbackData?: unknown;
  fallbackFunction?: () => Promise<unknown>;
}

export interface BulkheadConfig {
  maxConcurrentRequests: number;
  queueSize: number;
  timeoutMs: number;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  halfOpenCalls: number;
}

/**
 * Retry Strategy Implementation
 */
export class RetryStrategy {
  private config: RetryConfig;
  private retryAttempts = new Map<string, number>();

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      exponentialBackoff: true,
      jitterEnabled: true,
      retryableErrors: ['timeout', 'network', 'external_service', 'database'],
      ...config,
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: EnhancedError): boolean {
    return this.config.retryableErrors.includes(error.category);
  }

  /**
   * Get retry delay for attempt
   */
  getRetryDelay(attemptNumber: number): number {
    let delay = this.config.baseDelayMs;

    if (this.config.exponentialBackoff) {
      delay = Math.min(
        this.config.baseDelayMs * Math.pow(2, attemptNumber - 1),
        this.config.maxDelayMs
      );
    }

    // Add jitter to prevent thundering herd
    if (this.config.jitterEnabled) {
      delay += Math.random() * 1000;
    }

    return Math.floor(delay);
  }

  /**
   * Attempt retry for operation
   */
  async retry<T>(
    operation: () => Promise<T>,
    context: { requestId: string; endpoint: string },
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    const key = `${context.requestId}:${context.endpoint}`;
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation();

        // Reset retry count on success
        this.retryAttempts.delete(key);

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry
        if (attempt === this.config.maxAttempts) {
          break;
        }

        // Call retry callback
        if (onRetry) {
          onRetry(attempt, lastError);
        }

        // Wait before retry
        const delay = this.getRetryDelay(attempt);
        await this.sleep(delay);
      }
    }

    // Update retry attempts
    this.retryAttempts.set(key, this.config.maxAttempts);

    throw lastError!;
  }

  /**
   * Get retry statistics
   */
  getRetryStats(): {
    totalRetries: number;
    activeRetries: number;
    averageAttempts: number;
  } {
    const totalRetries = this.retryAttempts.size;
    const totalAttempts = Array.from(this.retryAttempts.values()).reduce(
      (sum, attempts) => sum + attempts,
      0
    );

    return {
      totalRetries,
      activeRetries: totalRetries,
      averageAttempts: totalRetries > 0 ? totalAttempts / totalRetries : 0,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private metrics = {
    totalRequests: 0,
    failedRequests: 0,
    successfulRequests: 0,
    rejectedRequests: 0,
  };

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeoutMs: 60000,
      monitoringWindowMs: 60000,
      halfOpenMaxCalls: 3,
      ...config,
    };

    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      halfOpenCalls: 0,
    };
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check circuit state
    this.updateState();

    if (this.state.state === 'OPEN') {
      this.metrics.rejectedRequests++;
      throw new Error('Circuit breaker is OPEN - request rejected');
    }

    if (
      this.state.state === 'HALF_OPEN' &&
      this.state.halfOpenCalls >= this.config.halfOpenMaxCalls
    ) {
      this.metrics.rejectedRequests++;
      throw new Error('Circuit breaker is HALF_OPEN - max calls exceeded');
    }

    try {
      this.metrics.totalRequests++;

      if (this.state.state === 'HALF_OPEN') {
        this.state.halfOpenCalls++;
      }

      const result = await operation();

      // Success - reset failure count
      this.onSuccess();

      return result;
    } catch (error) {
      // Failure - increment failure count
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.metrics.successfulRequests++;

    if (this.state.state === 'HALF_OPEN') {
      // Transition to CLOSED if enough successful calls
      if (this.state.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.state.state = 'CLOSED';
        this.state.failureCount = 0;
        this.state.halfOpenCalls = 0;
      }
    } else {
      // Reset failure count on success
      this.state.failureCount = 0;
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.metrics.failedRequests++;
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    // Check if we should open the circuit
    if (this.state.failureCount >= this.config.failureThreshold) {
      this.state.state = 'OPEN';
      this.state.nextAttemptTime = Date.now() + this.config.recoveryTimeoutMs;
    }
  }

  /**
   * Update circuit state based on time
   */
  private updateState(): void {
    if (this.state.state === 'OPEN' && Date.now() >= this.state.nextAttemptTime) {
      this.state.state = 'HALF_OPEN';
      this.state.halfOpenCalls = 0;
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus(): {
    state: CircuitState;
    failureCount: number;
    metrics: {
      totalRequests: number;
      failedRequests: number;
      successfulRequests: number;
      rejectedRequests: number;
    };
    nextAttemptTime?: number;
  } {
    this.updateState();

    return {
      state: this.state.state,
      failureCount: this.state.failureCount,
      metrics: { ...this.metrics },
      nextAttemptTime: this.state.state === 'OPEN' ? this.state.nextAttemptTime : undefined,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      halfOpenCalls: 0,
    };

    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      successfulRequests: 0,
      rejectedRequests: 0,
    };
  }
}

/**
 * Fallback Strategy Implementation
 */
export class FallbackStrategy {
  private config: FallbackConfig;
  private fallbackCache = new Map<string, { data: unknown; timestamp: number }>();

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = {
      enabled: true,
      timeoutMs: 5000,
      ...config,
    };
  }

  /**
   * Execute operation with fallback
   */
  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallbackKey: string,
    customFallback?: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enabled) {
      return await operation();
    }

    try {
      // Execute with timeout
      const result = await this.withTimeout(operation(), this.config.timeoutMs);

      // Cache successful result for future fallback
      this.fallbackCache.set(fallbackKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      // Try custom fallback first
      if (customFallback) {
        try {
          return await customFallback();
        } catch (fallbackError) {
          console.warn('Custom fallback failed:', fallbackError);
        }
      }

      // Try configured fallback function
      if (this.config.fallbackFunction) {
        try {
          return (await this.config.fallbackFunction()) as T;
        } catch (fallbackError) {
          console.warn('Configured fallback failed:', fallbackError);
        }
      }

      // Try cached data
      const cached = this.fallbackCache.get(fallbackKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        console.warn('Using cached fallback data for:', fallbackKey);
        return cached.data as T;
      }

      // Try configured fallback data
      if (this.config.fallbackData !== undefined) {
        console.warn('Using configured fallback data for:', fallbackKey);
        return this.config.fallbackData as T;
      }

      // No fallback available, re-throw original error
      throw error;
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    const maxAge = 3600000; // 1 hour
    return Date.now() - timestamp < maxAge;
  }

  /**
   * Execute operation with timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
      }),
    ]);
  }

  /**
   * Clear fallback cache
   */
  clearCache(): void {
    this.fallbackCache.clear();
  }

  /**
   * Get fallback statistics
   */
  getStats(): {
    cacheSize: number;
    cacheHitRate: number;
    enabled: boolean;
  } {
    return {
      cacheSize: this.fallbackCache.size,
      cacheHitRate: 0, // Would need to track hits/misses
      enabled: this.config.enabled,
    };
  }
}

/**
 * Bulkhead Strategy Implementation
 */
export class BulkheadStrategy {
  private config: BulkheadConfig;
  private activeRequests = 0;
  private requestQueue: Array<{
    operation: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];

  constructor(config: Partial<BulkheadConfig> = {}) {
    this.config = {
      maxConcurrentRequests: 10,
      queueSize: 50,
      timeoutMs: 30000,
      ...config,
    };
  }

  /**
   * Execute operation with bulkhead protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Check if we can execute immediately
      if (this.activeRequests < this.config.maxConcurrentRequests) {
        this.executeOperation(operation, resolve, reject);
        return;
      }

      // Check queue capacity
      if (this.requestQueue.length >= this.config.queueSize) {
        reject(new Error('Bulkhead queue is full'));
        return;
      }

      // Add to queue
      this.requestQueue.push({
        operation: operation as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        timestamp: Date.now(),
      });

      // Set timeout for queued request
      setTimeout(() => {
        const index = this.requestQueue.findIndex(req => req.resolve === resolve);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error('Bulkhead queue timeout'));
        }
      }, this.config.timeoutMs);
    });
  }

  /**
   * Execute operation and manage concurrency
   */
  private async executeOperation<T>(
    operation: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (error: Error) => void
  ): Promise<void> {
    this.activeRequests++;

    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error as Error);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    while (
      this.requestQueue.length > 0 &&
      this.activeRequests < this.config.maxConcurrentRequests
    ) {
      const request = this.requestQueue.shift()!;

      // Check if request has timed out
      if (Date.now() - request.timestamp > this.config.timeoutMs) {
        request.reject(new Error('Bulkhead queue timeout'));
        continue;
      }

      this.executeOperation(
        request.operation as () => Promise<unknown>,
        request.resolve,
        request.reject
      );
    }
  }

  /**
   * Get bulkhead status
   */
  getStatus(): {
    activeRequests: number;
    queuedRequests: number;
    maxConcurrentRequests: number;
    queueSize: number;
  } {
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      maxConcurrentRequests: this.config.maxConcurrentRequests,
      queueSize: this.config.queueSize,
    };
  }
}

/**
 * Comprehensive Error Recovery Manager
 */
export class ErrorRecoveryManager {
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;
  private fallbackStrategy: FallbackStrategy;
  private bulkheadStrategy: BulkheadStrategy;

  constructor(
    config: {
      retry?: Partial<RetryConfig>;
      circuitBreaker?: Partial<CircuitBreakerConfig>;
      fallback?: Partial<FallbackConfig>;
      bulkhead?: Partial<BulkheadConfig>;
    } = {}
  ) {
    this.retryStrategy = new RetryStrategy(config.retry);
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    this.fallbackStrategy = new FallbackStrategy(config.fallback);
    this.bulkheadStrategy = new BulkheadStrategy(config.bulkhead);
  }

  /**
   * Execute operation with comprehensive recovery strategies
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: {
      requestId: string;
      endpoint: string;
      strategy: RecoveryStrategy;
      fallbackKey?: string;
      customFallback?: () => Promise<T>;
    }
  ): Promise<T> {
    switch (context.strategy) {
      case 'retry':
        return await this.retryStrategy.retry(operation, context);

      case 'circuit_breaker':
        return await this.circuitBreaker.execute(operation);

      case 'fallback':
        return await this.fallbackStrategy.executeWithFallback(
          operation,
          context.fallbackKey || context.endpoint,
          context.customFallback
        );

      case 'graceful_degradation':
        return await this.bulkheadStrategy.execute(operation);

      case 'fail_fast':
        return await operation();

      default:
        // Comprehensive recovery: retry + circuit breaker + fallback
        return await this.retryStrategy.retry(async () => {
          return await this.circuitBreaker.execute(async () => {
            return await this.fallbackStrategy.executeWithFallback(
              operation,
              context.fallbackKey || context.endpoint,
              context.customFallback
            );
          });
        }, context);
    }
  }

  /**
   * Get comprehensive recovery statistics
   */
  getRecoveryStats(): {
    retry: ReturnType<RetryStrategy['getRetryStats']>;
    circuitBreaker: ReturnType<CircuitBreaker['getStatus']>;
    fallback: ReturnType<FallbackStrategy['getStats']>;
    bulkhead: ReturnType<BulkheadStrategy['getStatus']>;
  } {
    return {
      retry: this.retryStrategy.getRetryStats(),
      circuitBreaker: this.circuitBreaker.getStatus(),
      fallback: this.fallbackStrategy.getStats(),
      bulkhead: this.bulkheadStrategy.getStatus(),
    };
  }

  /**
   * Reset all recovery mechanisms
   */
  reset(): void {
    this.circuitBreaker.reset();
    this.fallbackStrategy.clearCache();
  }
}

export default ErrorRecoveryManager;
