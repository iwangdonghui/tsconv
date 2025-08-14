/**
 * Optimized Batch Convert API
 * High-performance batch processing with intelligent optimization and monitoring
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createCacheMiddleware } from './middleware/cache';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { BatchPerformanceMonitor } from './services/batch-processing/batch-performance-monitor';
import {
  BatchItem,
  BatchProcessingOptions,
  OptimizedBatchProcessor,
} from './services/batch-processing/optimized-batch-processor';
import { createUnifiedErrorMiddleware } from './services/error-handling/unified-error-middleware';
import { createSecurityMiddleware } from './services/security/unified-security-middleware';
import { APIErrorHandler, withCors } from './utils/response';

interface OptimizedBatchRequest {
  items: Array<{
    id?: string;
    timestamp: number | string;
    outputFormats?: string[];
    timezone?: string;
    targetTimezone?: string;
    priority?: 'low' | 'normal' | 'high' | 'critical';
  }>;
  options?: {
    maxConcurrency?: number;
    chunkSize?: number;
    timeout?: number;
    continueOnError?: boolean;
    enableCaching?: boolean;
    enableDeduplication?: boolean;
    enablePrioritization?: boolean;
    enableProgressTracking?: boolean;
    enableAnalytics?: boolean;
    retryFailedItems?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  };
  metadata?: {
    requestId?: string;
    clientId?: string;
    source?: string;
    tags?: string[];
  };
}

interface OptimizedBatchResponse {
  success: boolean;
  data: {
    results: Array<{
      id?: string;
      success: boolean;
      data?: any;
      error?: {
        code: string;
        message: string;
        details?: any;
      };
      processingTime: number;
      index: number;
      cacheHit?: boolean;
      priority?: string;
    }>;
    summary: {
      totalItems: number;
      successfulItems: number;
      failedItems: number;
      cacheHits: number;
      duplicatesSkipped: number;
      totalProcessingTime: number;
      averageItemTime: number;
      throughputPerSecond: number;
    };
    performance?: {
      memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
      };
      concurrencyStats: {
        maxConcurrency: number;
        averageConcurrency: number;
        peakConcurrency: number;
      };
      cacheStats: {
        hitRate: number;
        size: number;
        memoryUsage: number;
      };
    };
    optimization?: {
      recommendations: Array<{
        type: string;
        priority: string;
        description: string;
        expectedImprovement: string;
      }>;
      alerts: Array<{
        severity: string;
        message: string;
        recommendations: string[];
      }>;
    };
  };
  metadata: {
    processingTime: number;
    itemCount: number;
    cacheHit: boolean;
    rateLimit: {
      limit: number;
      remaining: number;
      resetTime: number;
      window: number;
    };
    requestId: string;
    version: string;
  };
}

// Initialize components
const batchProcessor = new OptimizedBatchProcessor();
const performanceMonitor = BatchPerformanceMonitor.getInstance({
  maxMemoryUsageMB: 1024,
  minThroughputPerSecond: 50,
  maxErrorRatePercent: 3,
  maxLatencyMs: 10000,
  minCacheHitRatePercent: 80,
});

// Start performance monitoring
performanceMonitor.startMonitoring(3000); // Monitor every 3 seconds

// Set up performance alerts
performanceMonitor.onAlert(alert => {
  console.warn(`🚨 Batch Performance Alert [${alert.severity}]: ${alert.message}`);

  if (alert.severity === 'critical') {
    // Could integrate with alerting systems here
    console.error('CRITICAL PERFORMANCE ISSUE:', alert);
  }
});

/**
 * Main batch conversion handler
 */
async function optimizedBatchConvertHandler(req: VercelRequest, res: VercelResponse) {
  withCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return APIErrorHandler.handleMethodNotAllowed(res, 'Only POST method is allowed');
  }

  const startTime = Date.now();
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Validate request body
    const batchRequest: OptimizedBatchRequest = req.body;

    if (!batchRequest.items || !Array.isArray(batchRequest.items)) {
      return APIErrorHandler.handleBadRequest(res, 'Items array is required', {
        expected: 'Array of batch items',
        received: typeof batchRequest.items,
      });
    }

    if (batchRequest.items.length === 0) {
      return APIErrorHandler.handleBadRequest(res, 'Items array cannot be empty', {
        minItems: 1,
        maxItems: 1000,
      });
    }

    if (batchRequest.items.length > 1000) {
      return APIErrorHandler.handleBadRequest(res, 'Batch size exceeds maximum limit', {
        maxItems: 1000,
        receivedItems: batchRequest.items.length,
        suggestion: 'Split your request into smaller batches',
      });
    }

    // Prepare batch items
    const batchItems: BatchItem[] = batchRequest.items.map((item, index) => ({
      id: item.id || `item-${index}`,
      timestamp: item.timestamp,
      outputFormats: item.outputFormats || ['iso', 'unix', 'human'],
      timezone: item.timezone,
      targetTimezone: item.targetTimezone,
      priority: item.priority || 'normal',
      metadata: {
        originalIndex: index,
        requestId,
      },
    }));

    // Configure processing options
    const processingOptions: BatchProcessingOptions = {
      maxConcurrency: Math.min(batchRequest.options?.maxConcurrency || 20, 50),
      chunkSize: Math.min(batchRequest.options?.chunkSize || 25, 100),
      timeout: Math.min(batchRequest.options?.timeout || 30000, 120000),
      continueOnError: batchRequest.options?.continueOnError ?? true,
      enableCaching: batchRequest.options?.enableCaching ?? true,
      enableDeduplication: batchRequest.options?.enableDeduplication ?? true,
      enablePrioritization: batchRequest.options?.enablePrioritization ?? true,
      enableProgressTracking: batchRequest.options?.enableProgressTracking ?? false,
      enableAnalytics: batchRequest.options?.enableAnalytics ?? true,
      retryFailedItems: batchRequest.options?.retryFailedItems ?? true,
      maxRetries: Math.min(batchRequest.options?.maxRetries || 3, 5),
      retryDelay: Math.min(batchRequest.options?.retryDelay || 1000, 5000),
    };

    // Set up progress tracking if enabled
    if (processingOptions.enableProgressTracking) {
      batchProcessor.onProgress(progress => {
        console.log(
          `Batch ${requestId} progress: ${progress.percentage.toFixed(1)}% (${progress.completed}/${progress.total})`
        );
      });
    }

    // Process batch with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Batch processing timeout')), processingOptions.timeout!);
    });

    const processingPromise = batchProcessor.processBatch(batchItems, processingOptions);

    const { results, stats } = (await Promise.race([processingPromise, timeoutPromise])) as any;

    // Record performance metrics
    const batchId = `batch-${requestId}`;
    const cacheStats = batchProcessor.getCacheStats();

    performanceMonitor.recordBatchMetrics(
      batchId,
      batchItems.length,
      Date.now() - startTime,
      stats.successfulItems,
      stats.failedItems,
      {
        hitRate: cacheStats.hitRate,
        size: cacheStats.size,
        evictions: 0,
      },
      stats.concurrencyStats
    );

    // Get performance analytics
    const performanceAnalytics = performanceMonitor.getPerformanceAnalytics();

    // Build response
    const response: OptimizedBatchResponse = {
      success: true,
      data: {
        results,
        summary: {
          totalItems: stats.totalItems,
          successfulItems: stats.successfulItems,
          failedItems: stats.failedItems,
          cacheHits: stats.cacheHits,
          duplicatesSkipped: stats.duplicatesSkipped,
          totalProcessingTime: stats.totalProcessingTime,
          averageItemTime: stats.averageItemTime,
          throughputPerSecond: stats.throughputPerSecond,
        },
        performance: {
          memoryUsage: {
            heapUsed: stats.memoryUsage.heapUsed,
            heapTotal: stats.memoryUsage.heapTotal,
            external: stats.memoryUsage.external,
          },
          concurrencyStats: stats.concurrencyStats,
          cacheStats: {
            hitRate: cacheStats.hitRate,
            size: cacheStats.size,
            memoryUsage: cacheStats.memoryUsage,
          },
        },
        optimization: {
          recommendations: performanceAnalytics.recommendations.map(rec => ({
            type: rec.type,
            priority: rec.priority,
            description: rec.description,
            expectedImprovement: rec.expectedImprovement,
          })),
          alerts: performanceAnalytics.alerts.slice(-5).map(alert => ({
            severity: alert.severity,
            message: alert.message,
            recommendations: alert.recommendations,
          })),
        },
      },
      metadata: {
        processingTime: Date.now() - startTime,
        itemCount: results.length,
        cacheHit: stats.cacheHits > 0,
        rateLimit: {
          limit: 100,
          remaining: 99,
          resetTime: Date.now() + 60000,
          window: 60000,
        },
        requestId,
        version: '2.0.0',
      },
    };

    // Set performance headers
    res.setHeader('X-Batch-ID', batchId);
    res.setHeader('X-Processing-Time', stats.totalProcessingTime.toString());
    res.setHeader('X-Throughput', stats.throughputPerSecond.toFixed(2));
    res.setHeader('X-Cache-Hit-Rate', cacheStats.hitRate.toFixed(2));
    res.setHeader('X-Memory-Usage', (stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(2));

    return res.status(200).json(response);
  } catch (error) {
    console.error('Optimized batch conversion error:', error);

    if ((error as Error).message === 'Batch processing timeout') {
      return APIErrorHandler.sendError(
        res,
        APIErrorHandler.createError(
          'TIMEOUT_ERROR',
          'Batch processing exceeded timeout limit',
          408,
          {
            timeout: req.body?.options?.timeout || 30000,
            requestId,
            suggestion: 'Try reducing batch size or increasing timeout',
          }
        ),
        408
      );
    }

    return APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'optimized-batch-convert',
      requestId,
      batchSize: req.body?.items?.length || 0,
    });
  }
}

// Enhanced batch convert API with comprehensive middleware stack
const securityMiddleware = createSecurityMiddleware({
  policyLevel: process.env.NODE_ENV === 'production' ? 'strict' : 'standard',
  enableThreatDetection: true,
  enableRealTimeBlocking: process.env.NODE_ENV === 'production',
  loggerConfig: {
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  },
});

const errorMiddleware = createUnifiedErrorMiddleware({
  enableRecovery: process.env.NODE_ENV === 'production',
  enableFormatting: true,
  enableMonitoring: true,
  enableLogging: true,
  responseFormat: {
    format: process.env.NODE_ENV === 'development' ? 'debug' : 'standard',
    locale: 'en',
    includeStack: process.env.NODE_ENV === 'development',
    includeContext: process.env.NODE_ENV === 'development',
    sanitizeDetails: process.env.NODE_ENV === 'production',
  },
  recovery: {
    retry: {
      maxAttempts: 2,
      baseDelayMs: 500,
      exponentialBackoff: true,
    },
    circuitBreaker: {
      failureThreshold: 10,
      recoveryTimeoutMs: 30000,
    },
    fallback: {
      enabled: true,
      timeoutMs: 3000,
    },
  },
});

const enhancedOptimizedBatchHandler = async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Apply security middleware first
    await new Promise<void>((resolve, reject) => {
      securityMiddleware(req, res, () => {
        // Then apply rate limiting with higher limits for batch operations
        createRateLimitMiddleware({
          ruleSelector: _req => ({
            identifier: '/api/optimized-batch-convert',
            limit: 20, // 20 batch requests per minute
            window: 60000,
            type: 'ip',
          }),
        })(
          // Apply caching with longer TTL for batch results
          createCacheMiddleware({
            ttl: 10 * 60 * 1000, // 10 minutes
            cacheControlHeader: 'public, max-age=600, stale-while-revalidate=1200',
            keyGenerator: req => {
              // Create cache key based on batch content hash
              const batchContent = JSON.stringify(req.body?.items || []);
              const hash = Buffer.from(batchContent).toString('base64').slice(0, 32);
              return `batch:${hash}`;
            },
          })(async (req: VercelRequest, res: VercelResponse) => {
            try {
              await optimizedBatchConvertHandler(req, res);
              resolve();
            } catch (error) {
              reject(error);
            }
          })
        )(req, res);
      });
    });
  } catch (error) {
    // Handle errors with unified error middleware
    await errorMiddleware(error as Error, req, res);
  }
};

export default enhancedOptimizedBatchHandler;
