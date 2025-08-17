import { VercelRequest, VercelResponse } from '@vercel/node';
import config from '../config/config';

// Performance metrics interface
export interface PerformanceMetrics {
  requestId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  timestamp: number;
  userAgent?: string;
  ip?: string;
  cacheHit?: boolean;
  rateLimited?: boolean;
  errorCode?: string;
}

// Performance monitoring options
export interface PerformanceMonitoringOptions {
  collectMemoryMetrics?: boolean;
  collectDetailedMetrics?: boolean;
  logMetrics?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  metricsCollector?: (metrics: PerformanceMetrics) => void;
  slowRequestThreshold?: number;
  onSlowRequest?: (metrics: PerformanceMetrics) => void;
  includeHeaders?: boolean;
  includeQuery?: boolean;
  excludeEndpoints?: string[];
}

// Metrics storage (in-memory for simplicity, could be extended to use Redis)
class MetricsStore {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxSize = 1000;

  add(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize);
    }
  }

  getMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  getAverageResponseTime(endpoint?: string, timeWindow?: number): number {
    let filteredMetrics = this.metrics;

    if (endpoint) {
      filteredMetrics = filteredMetrics.filter(m => m.endpoint === endpoint);
    }

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      filteredMetrics = filteredMetrics.filter(m => m.timestamp > cutoff);
    }

    if (filteredMetrics.length === 0) return 0;

    const total = filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    return total / filteredMetrics.length;
  }

  getErrorRate(endpoint?: string, timeWindow?: number): number {
    let filteredMetrics = this.metrics;

    if (endpoint) {
      filteredMetrics = filteredMetrics.filter(m => m.endpoint === endpoint);
    }

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      filteredMetrics = filteredMetrics.filter(m => m.timestamp > cutoff);
    }

    if (filteredMetrics.length === 0) return 0;

    const errorCount = filteredMetrics.filter(m => m.statusCode >= 400).length;
    return (errorCount / filteredMetrics.length) * 100;
  }

  getRequestCount(endpoint?: string, timeWindow?: number): number {
    let filteredMetrics = this.metrics;

    if (endpoint) {
      filteredMetrics = filteredMetrics.filter(m => m.endpoint === endpoint);
    }

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      filteredMetrics = filteredMetrics.filter(m => m.timestamp > cutoff);
    }

    return filteredMetrics.length;
  }

  clear(): void {
    this.metrics = [];
  }

  getTopEndpoints(
    limit: number = 10,
    timeWindow?: number
  ): Array<{
    endpoint: string;
    count: number;
    averageResponseTime: number;
    errorRate: number;
  }> {
    let filteredMetrics = this.metrics;

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      filteredMetrics = filteredMetrics.filter(m => m.timestamp > cutoff);
    }

    const endpointStats = new Map<
      string,
      {
        count: number;
        totalResponseTime: number;
        errorCount: number;
      }
    >();

    filteredMetrics.forEach(metric => {
      const stats = endpointStats.get(metric.endpoint) || {
        count: 0,
        totalResponseTime: 0,
        errorCount: 0,
      };

      stats.count++;
      stats.totalResponseTime += metric.responseTime;
      if (metric.statusCode >= 400) {
        stats.errorCount++;
      }

      endpointStats.set(metric.endpoint, stats);
    });

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        averageResponseTime: stats.totalResponseTime / stats.count,
        errorRate: (stats.errorCount / stats.count) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// Global metrics store
const metricsStore = new MetricsStore();

// Default metrics collector
const defaultMetricsCollector = (metrics: PerformanceMetrics): void => {
  metricsStore.add(metrics);
};

// Default slow request handler
const defaultSlowRequestHandler = (metrics: PerformanceMetrics): void => {
  console.warn(
    `Slow request detected: ${metrics.method} ${metrics.endpoint} took ${metrics.responseTime}ms`
  );
};

// Performance monitoring middleware
export const performanceMonitoringMiddleware = (options: PerformanceMonitoringOptions = {}) => {
  const {
    collectMemoryMetrics = true,
    collectDetailedMetrics = false,
    logMetrics = config.monitoring.metricsEnabled,
    logLevel = config.monitoring.logLevel,
    metricsCollector = defaultMetricsCollector,
    slowRequestThreshold = 1000, // 1 second
    onSlowRequest = defaultSlowRequestHandler,
    includeHeaders = false,
    includeQuery = false,
    excludeEndpoints = [],
  } = options;

  return async (
    req: VercelRequest,
    res: VercelResponse,
    next: () => Promise<void>
  ): Promise<void> => {
    const startTime = Date.now();
    const startMemory = collectMemoryMetrics ? process.memoryUsage() : null;

    // Generate request ID if not present
    const requestId =
      (req.headers['x-request-id'] as string) ||
      `req-${startTime}-${Math.random().toString(36).substr(2, 9)}`;

    // Skip monitoring for excluded endpoints
    if (excludeEndpoints.some(pattern => req.url?.includes(pattern))) {
      await next();
      return;
    }

    // Store start time in request for other middleware
    (req as any).startTime = startTime;
    (req as any).requestId = requestId;

    // Override response methods to capture metrics
    const originalJson = res.json;
    const originalSend = res.send;
    const originalEnd = res.end;

    let responseSize = 0;
    let cacheHit = false;
    let rateLimited = false;
    let errorCode: string | undefined;

    // Capture response data
    res.json = function (data: unknown) {
      responseSize = JSON.stringify(data).length;

      // Type guard for response data
      const responseData = data as Record<string, any>;

      // Check for cache hit
      if (responseData.cache?.hit) {
        cacheHit = true;
      }

      // Check for rate limiting
      if (responseData.error?.code === 'RATE_LIMIT_EXCEEDED') {
        rateLimited = true;
        errorCode = responseData.error.code;
      }

      return originalJson.call(this, data);
    };

    res.send = function (data: unknown) {
      if (typeof data === 'string') {
        responseSize = data.length;
      } else {
        responseSize = JSON.stringify(data).length;
      }

      return originalSend.call(this, data);
    };

    res.end = function (chunk?: unknown) {
      if (chunk) {
        responseSize = typeof chunk === 'string' ? chunk.length : JSON.stringify(chunk).length;
      }

      return originalEnd.call(this, chunk, 'utf8');
    };

    try {
      // Execute the request
      await next();
    } catch (error) {
      // Capture error information
      if (error instanceof Error) {
        errorCode = (error as any).code || 'UNKNOWN_ERROR';
      }
      throw error;
    } finally {
      // Calculate metrics
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const endMemory = collectMemoryMetrics ? process.memoryUsage() : null;

      // Extract client information
      const userAgent = req.headers['user-agent'];
      const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

      // Build metrics object
      const metrics: PerformanceMetrics = {
        requestId,
        endpoint: req.url || 'unknown',
        method: req.method || 'GET',
        statusCode: res.statusCode || 200,
        responseTime,
        memoryUsage: endMemory || {
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
          rss: 0,
        },
        timestamp: endTime,
        userAgent: includeHeaders ? userAgent : undefined,
        ip: collectDetailedMetrics
          ? Array.isArray(ip)
            ? (ip?.[0] ?? 'unknown')
            : typeof ip === 'string'
              ? (ip?.split(',')[0]?.trim() ?? 'unknown')
              : 'unknown'
          : undefined,
        cacheHit,
        rateLimited,
        errorCode,
      };

      // Add detailed metrics if enabled
      if (collectDetailedMetrics) {
        (metrics as any).requestSize = JSON.stringify(req.body || {}).length;
        (metrics as any).responseSize = responseSize;
        (metrics as any).memoryDelta =
          startMemory && endMemory
            ? {
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                external: endMemory.external - startMemory.external,
                rss: endMemory.rss - startMemory.rss,
              }
            : undefined;

        if (includeQuery) {
          (metrics as any).queryParams = req.query;
        }

        if (includeHeaders) {
          (metrics as any).headers = req.headers;
        }
      }

      // Log metrics if enabled
      if (logMetrics) {
        const logData = {
          requestId,
          method: metrics.method,
          endpoint: metrics.endpoint,
          statusCode: metrics.statusCode,
          responseTime: metrics.responseTime,
          memoryUsage: metrics.memoryUsage.heapUsed,
          cacheHit,
          rateLimited,
          errorCode,
        };

        switch (logLevel) {
          case 'debug':
            console.debug('Request metrics:', JSON.stringify(logData, null, 2));
            break;
          case 'info':
            console.info('Request metrics:', JSON.stringify(logData));
            break;
          case 'warn':
            if (metrics.statusCode >= 400 || responseTime > slowRequestThreshold) {
              console.warn('Request metrics:', JSON.stringify(logData));
            }
            break;
          case 'error':
            if (metrics.statusCode >= 500) {
              console.error('Request metrics:', JSON.stringify(logData));
            }
            break;
        }
      }

      // Check for slow requests
      if (responseTime > slowRequestThreshold && onSlowRequest) {
        onSlowRequest(metrics);
      }

      // Collect metrics
      if (metricsCollector) {
        try {
          metricsCollector(metrics);
        } catch (error) {
          console.error('Error in metrics collector:', error);
        }
      }

      // Set performance headers
      res.setHeader('X-Response-Time', `${responseTime}ms`);
      res.setHeader('X-Request-ID', requestId);

      if (collectMemoryMetrics && endMemory) {
        res.setHeader('X-Memory-Usage', `${Math.round(endMemory.heapUsed / 1024 / 1024)}MB`);
      }
    }
  };
};

// Convenience function for creating performance monitoring middleware
export const createPerformanceMonitoring = (options?: PerformanceMonitoringOptions) => {
  return performanceMonitoringMiddleware(options);
};

// Metrics reporting utilities
export const getMetricsReport = (timeWindow?: number) => {
  const now = Date.now();
  const windowStart = timeWindow ? now - timeWindow : 0;

  return {
    timestamp: now,
    timeWindow: timeWindow || 'all-time',
    summary: {
      totalRequests: metricsStore.getRequestCount(undefined, timeWindow),
      averageResponseTime: metricsStore.getAverageResponseTime(undefined, timeWindow),
      errorRate: metricsStore.getErrorRate(undefined, timeWindow),
    },
    topEndpoints: metricsStore.getTopEndpoints(10, timeWindow),
    recentMetrics: metricsStore.getMetrics(50).filter(m => m.timestamp > windowStart),
  };
};

// Health check for performance monitoring
export const performanceHealthCheck = () => {
  const recentMetrics = metricsStore.getMetrics(100);
  const last5Minutes = 5 * 60 * 1000;
  const recentRequests = recentMetrics.filter(m => Date.now() - m.timestamp < last5Minutes);

  const avgResponseTime =
    recentRequests.length > 0
      ? recentRequests.reduce((sum, m) => sum + m.responseTime, 0) / recentRequests.length
      : 0;

  const errorRate =
    recentRequests.length > 0
      ? (recentRequests.filter(m => m.statusCode >= 400).length / recentRequests.length) * 100
      : 0;

  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (avgResponseTime > 2000 || errorRate > 10 || memoryUsagePercent > 90) {
    status = 'unhealthy';
  } else if (avgResponseTime > 1000 || errorRate > 5 || memoryUsagePercent > 75) {
    status = 'degraded';
  }

  return {
    status,
    metrics: {
      requestCount: recentRequests.length,
      averageResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      memoryUsage: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round(memoryUsagePercent * 100) / 100,
      },
    },
    thresholds: {
      responseTime: { warning: 1000, critical: 2000 },
      errorRate: { warning: 5, critical: 10 },
      memoryUsage: { warning: 75, critical: 90 },
    },
  };
};

// Clear metrics (useful for testing)
export const clearMetrics = () => {
  metricsStore.clear();
};

// Get metrics store for advanced usage
export const getMetricsStore = () => metricsStore;

/**
 * Gets performance metrics for a specific time range
 */
export async function getPerformanceMetrics(options?: {
  timeRange?: 'minute' | 'hour' | 'day';
  endpoint?: string;
}): Promise<{
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  slowRequests: number;
  endpoints: Record<
    string,
    {
      requests: number;
      averageTime: number;
      errors: number;
    }
  >;
}> {
  const now = Date.now();
  const timeRanges = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  };

  const timeRange = timeRanges[options?.timeRange || 'hour'];
  const cutoffTime = now - timeRange;

  // Filter metrics by time range
  const recentMetrics = metricsStore
    .getMetrics(1000)
    .filter((metric: PerformanceMetrics) => metric.timestamp >= cutoffTime);

  if (recentMetrics.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      slowRequests: 0,
      endpoints: {},
    };
  }

  // Calculate aggregate metrics
  const totalRequests = recentMetrics.length;
  const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
  const averageResponseTime = totalResponseTime / totalRequests;
  const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
  const errorRate = (errorCount / totalRequests) * 100;
  const slowRequests = recentMetrics.filter(m => m.responseTime > 1000).length;

  // Group by endpoint
  const endpoints: Record<string, { requests: number; averageTime: number; errors: number }> = {};

  for (const metric of recentMetrics) {
    const endpoint = metric.endpoint || 'unknown';
    if (!endpoints[endpoint]) {
      endpoints[endpoint] = { requests: 0, averageTime: 0, errors: 0 };
    }

    endpoints[endpoint].requests++;
    endpoints[endpoint].averageTime += metric.responseTime;
    if (metric.statusCode >= 400) {
      endpoints[endpoint].errors++;
    }
  }

  // Calculate average times for each endpoint
  for (const endpoint in endpoints) {
    const ep = endpoints[endpoint];
    if (ep) {
      ep.averageTime = ep.requests > 0 ? ep.averageTime / ep.requests : 0;
    }
  }

  return {
    totalRequests,
    averageResponseTime,
    errorRate,
    slowRequests,
    endpoints,
  };
}

// Types are already exported above with their definitions
