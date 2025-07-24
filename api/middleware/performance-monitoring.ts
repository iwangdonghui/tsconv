import { VercelRequest, VercelResponse } from '@vercel/node';
import { getCacheService } from '../services/cache-factory';
import { getRateLimiter } from '../services/rate-limiter-factory';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: number;
  statusCode: number;
  cacheHit?: boolean;
  rateLimited?: boolean;
  userAgent?: string;
  ip?: string;
}

interface RequestTimingData {
  startTime: number;
  endTime?: number;
  cacheHit?: boolean;
  rateLimited?: boolean;
}

// Store timing data in request object
declare global {
  namespace Express {
    interface Request {
      timingData?: RequestTimingData;
    }
  }
}

/**
 * Middleware to track API response times and performance metrics
 */
export function createPerformanceMonitoringMiddleware(options: {
  enableMetricsCollection?: boolean;
  enableCacheHitTracking?: boolean;
  enableRateLimitTracking?: boolean;
  metricsRetentionHours?: number;
} = {}) {
  const {
    enableMetricsCollection = true,
    enableCacheHitTracking = true,
    enableRateLimitTracking = true,
    metricsRetentionHours = 24
  } = options;

  return function performanceMonitoringMiddleware(handler: Function) {
    return async (req: VercelRequest, res: VercelResponse) => {
      if (!enableMetricsCollection) {
        return handler(req, res);
      }

      const startTime = Date.now();
      const timingData: RequestTimingData = { startTime };
      
      // Store timing data in request for other middleware to access
      (req as any).timingData = timingData;

      // Intercept response to capture metrics
      const originalJson = res.json;
      const originalStatus = res.status;
      const originalEnd = res.end;
      
      let statusCode = 200;
      let responseData: any;

      // Override status method to capture status code
      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      // Override json method to capture response data and timing
      res.json = function(data: any) {
        responseData = data;
        timingData.endTime = Date.now();
        
        // Extract cache hit information from response metadata
        if (enableCacheHitTracking && data?.metadata?.cacheHit !== undefined) {
          timingData.cacheHit = data.metadata.cacheHit;
        }
        
        // Check if request was rate limited
        if (enableRateLimitTracking) {
          timingData.rateLimited = statusCode === 429;
        }
        
        // Record metrics asynchronously
        recordMetrics(req, statusCode, timingData, metricsRetentionHours).catch(error => {
          console.warn('Failed to record performance metrics:', error);
        });
        
        return originalJson.call(this, data);
      };

      // Override end method for non-JSON responses
      res.end = function(chunk?: any) {
        if (!timingData.endTime) {
          timingData.endTime = Date.now();
          
          // Record metrics for non-JSON responses
          recordMetrics(req, statusCode, timingData, metricsRetentionHours).catch(error => {
            console.warn('Failed to record performance metrics:', error);
          });
        }
        
        return originalEnd.call(this, chunk);
      };

      try {
        return await handler(req, res);
      } catch (error) {
        // Record metrics for error cases
        timingData.endTime = Date.now();
        statusCode = 500;
        
        recordMetrics(req, statusCode, timingData, metricsRetentionHours).catch(metricsError => {
          console.warn('Failed to record performance metrics for error case:', metricsError);
        });
        
        throw error;
      }
    };
  };
}

/**
 * Record performance metrics to cache/storage
 */
async function recordMetrics(
  req: VercelRequest, 
  statusCode: number, 
  timingData: RequestTimingData,
  retentionHours: number
): Promise<void> {
  if (!timingData.endTime) {
    return;
  }

  const duration = timingData.endTime - timingData.startTime;
  const timestamp = Date.now();
  
  const metrics: PerformanceMetrics = {
    endpoint: req.url?.split('?')[0] || 'unknown',
    method: req.method || 'GET',
    duration,
    timestamp,
    statusCode,
    cacheHit: timingData.cacheHit,
    rateLimited: timingData.rateLimited,
    userAgent: req.headers['user-agent'],
    ip: getClientIP(req)
  };

  try {
    const cacheService = getCacheService();
    
    // Store individual metric
    const metricKey = `metrics:${timestamp}:${Math.random().toString(36).substring(7)}`;
    const ttl = retentionHours * 60 * 60 * 1000; // Convert hours to milliseconds
    
    await cacheService.set(metricKey, metrics, ttl);
    
    // Update aggregated metrics
    await updateAggregatedMetrics(metrics, cacheService);
    
  } catch (error) {
    console.warn('Failed to store performance metrics:', error);
  }
}

/**
 * Update aggregated performance metrics
 */
async function updateAggregatedMetrics(
  metrics: PerformanceMetrics, 
  cacheService: any
): Promise<void> {
  const now = Date.now();
  const hourKey = Math.floor(now / (60 * 60 * 1000)); // Hour bucket
  const minuteKey = Math.floor(now / (60 * 1000)); // Minute bucket
  
  try {
    // Update hourly aggregates
    const hourlyKey = `metrics:hourly:${hourKey}`;
    const hourlyData = await cacheService.get(hourlyKey) || {
      timestamp: hourKey * 60 * 60 * 1000,
      totalRequests: 0,
      totalDuration: 0,
      averageDuration: 0,
      errorCount: 0,
      cacheHits: 0,
      rateLimitedRequests: 0,
      endpointStats: {}
    };
    
    // Update hourly stats
    hourlyData.totalRequests++;
    hourlyData.totalDuration += metrics.duration;
    hourlyData.averageDuration = hourlyData.totalDuration / hourlyData.totalRequests;
    
    if (metrics.statusCode >= 400) {
      hourlyData.errorCount++;
    }
    
    if (metrics.cacheHit) {
      hourlyData.cacheHits++;
    }
    
    if (metrics.rateLimited) {
      hourlyData.rateLimitedRequests++;
    }
    
    // Update endpoint-specific stats
    if (!hourlyData.endpointStats[metrics.endpoint]) {
      hourlyData.endpointStats[metrics.endpoint] = {
        requests: 0,
        totalDuration: 0,
        averageDuration: 0,
        errors: 0
      };
    }
    
    const endpointStats = hourlyData.endpointStats[metrics.endpoint];
    endpointStats.requests++;
    endpointStats.totalDuration += metrics.duration;
    endpointStats.averageDuration = endpointStats.totalDuration / endpointStats.requests;
    
    if (metrics.statusCode >= 400) {
      endpointStats.errors++;
    }
    
    // Store updated hourly data (24 hour TTL)
    await cacheService.set(hourlyKey, hourlyData, 24 * 60 * 60 * 1000);
    
    // Update minute-level data for real-time monitoring
    const minutelyKey = `metrics:minute:${minuteKey}`;
    const minutelyData = await cacheService.get(minutelyKey) || {
      timestamp: minuteKey * 60 * 1000,
      requests: 0,
      averageDuration: 0,
      errors: 0
    };
    
    const prevTotal = minutelyData.requests * minutelyData.averageDuration;
    minutelyData.requests++;
    minutelyData.averageDuration = (prevTotal + metrics.duration) / minutelyData.requests;
    
    if (metrics.statusCode >= 400) {
      minutelyData.errors++;
    }
    
    // Store minute data (2 hour TTL)
    await cacheService.set(minutelyKey, minutelyData, 2 * 60 * 60 * 1000);
    
  } catch (error) {
    console.warn('Failed to update aggregated metrics:', error);
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  
  return req.headers['x-real-ip'] as string || 
         req.connection?.remoteAddress || 
         'unknown';
}

/**
 * Get performance metrics for monitoring dashboard
 */
export async function getPerformanceMetrics(options: {
  timeRange?: 'hour' | 'day';
  endpoint?: string;
} = {}): Promise<{
  summary: any;
  hourlyData: any[];
  recentMetrics: any[];
}> {
  const { timeRange = 'hour', endpoint } = options;
  const cacheService = getCacheService();
  
  try {
    const now = Date.now();
    const currentHour = Math.floor(now / (60 * 60 * 1000));
    
    // Get hourly data
    const hoursToFetch = timeRange === 'day' ? 24 : 1;
    const hourlyData = [];
    
    for (let i = 0; i < hoursToFetch; i++) {
      const hourKey = currentHour - i;
      const data = await cacheService.get(`metrics:hourly:${hourKey}`);
      if (data) {
        hourlyData.push(data);
      }
    }
    
    // Get recent minute-level data for real-time view
    const currentMinute = Math.floor(now / (60 * 1000));
    const recentMetrics = [];
    
    for (let i = 0; i < 10; i++) { // Last 10 minutes
      const minuteKey = currentMinute - i;
      const data = await cacheService.get(`metrics:minute:${minuteKey}`);
      if (data) {
        recentMetrics.push(data);
      }
    }
    
    // Calculate summary
    const summary = {
      totalRequests: hourlyData.reduce((sum, h) => sum + (h.totalRequests || 0), 0),
      averageResponseTime: hourlyData.length > 0 
        ? hourlyData.reduce((sum, h) => sum + (h.averageDuration || 0), 0) / hourlyData.length 
        : 0,
      errorRate: hourlyData.reduce((sum, h) => sum + (h.errorCount || 0), 0) / 
                 Math.max(hourlyData.reduce((sum, h) => sum + (h.totalRequests || 0), 0), 1),
      cacheHitRate: hourlyData.reduce((sum, h) => sum + (h.cacheHits || 0), 0) / 
                    Math.max(hourlyData.reduce((sum, h) => sum + (h.totalRequests || 0), 0), 1),
      rateLimitRate: hourlyData.reduce((sum, h) => sum + (h.rateLimitedRequests || 0), 0) / 
                     Math.max(hourlyData.reduce((sum, h) => sum + (h.totalRequests || 0), 0), 1)
    };
    
    return {
      summary,
      hourlyData: hourlyData.reverse(), // Most recent first
      recentMetrics: recentMetrics.reverse()
    };
    
  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    return {
      summary: {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        rateLimitRate: 0
      },
      hourlyData: [],
      recentMetrics: []
    };
  }
}

/**
 * Get cache hit ratio tracking
 */
export async function getCacheHitRatio(timeRange: 'hour' | 'day' = 'hour'): Promise<{
  hitRatio: number;
  totalRequests: number;
  cacheHits: number;
  trend: number[];
}> {
  const cacheService = getCacheService();
  
  try {
    const now = Date.now();
    const currentHour = Math.floor(now / (60 * 60 * 1000));
    const hoursToFetch = timeRange === 'day' ? 24 : 1;
    
    let totalRequests = 0;
    let totalCacheHits = 0;
    const trend: number[] = [];
    
    for (let i = hoursToFetch - 1; i >= 0; i--) {
      const hourKey = currentHour - i;
      const data = await cacheService.get(`metrics:hourly:${hourKey}`);
      
      if (data) {
        totalRequests += data.totalRequests || 0;
        totalCacheHits += data.cacheHits || 0;
        
        const hourlyHitRatio = data.totalRequests > 0 
          ? (data.cacheHits || 0) / data.totalRequests 
          : 0;
        trend.push(hourlyHitRatio);
      } else {
        trend.push(0);
      }
    }
    
    const hitRatio = totalRequests > 0 ? totalCacheHits / totalRequests : 0;
    
    return {
      hitRatio,
      totalRequests,
      cacheHits: totalCacheHits,
      trend
    };
    
  } catch (error) {
    console.error('Failed to get cache hit ratio:', error);
    return {
      hitRatio: 0,
      totalRequests: 0,
      cacheHits: 0,
      trend: []
    };
  }
}

export default createPerformanceMonitoringMiddleware;