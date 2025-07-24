import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, ResponseBuilder, withCors } from '../utils/response.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import { getPerformanceMetrics, getCacheHitRatio } from '../middleware/performance-monitoring.js';
import { getCacheService } from '../services/cache-factory.js';
import { getRateLimiter } from '../services/rate-limiter-factory.js';

/**
 * API endpoint for retrieving performance metrics and monitoring data
 */
async function metricsHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return APIErrorHandler.handleBadRequest(res, 'Only GET method is allowed');
  }

  try {
    const { type, timeRange, endpoint } = req.query;
    
    switch (type) {
      case 'performance':
        await handlePerformanceMetrics(req, res, { timeRange: timeRange as string, endpoint: endpoint as string });
        break;
        
      case 'cache':
        await handleCacheMetrics(req, res, { timeRange: timeRange as string });
        break;
        
      case 'ratelimit':
        await handleRateLimitMetrics(req, res);
        break;
        
      case 'system':
        await handleSystemMetrics(req, res);
        break;
        
      default:
        await handleOverviewMetrics(req, res);
        break;
    }

  } catch (error) {
    console.error('Metrics API error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

/**
 * Handle performance metrics request
 */
async function handlePerformanceMetrics(
  req: VercelRequest, 
  res: VercelResponse, 
  options: { timeRange?: string; endpoint?: string }
) {
  const { timeRange = 'hour', endpoint } = options;
  
  const metrics = await getPerformanceMetrics({
    timeRange: timeRange as 'hour' | 'day',
    endpoint
  });
  
  const builder = new ResponseBuilder().setData({
    type: 'performance',
    timeRange,
    endpoint: endpoint || 'all',
    ...metrics
  });
  
  builder.send(res);
}

/**
 * Handle cache metrics request
 */
async function handleCacheMetrics(
  req: VercelRequest, 
  res: VercelResponse, 
  options: { timeRange?: string }
) {
  const { timeRange = 'hour' } = options;
  
  const [cacheHitRatio, cacheStats] = await Promise.all([
    getCacheHitRatio(timeRange as 'hour' | 'day'),
    getCacheServiceStats()
  ]);
  
  const builder = new ResponseBuilder().setData({
    type: 'cache',
    timeRange,
    hitRatio: cacheHitRatio,
    stats: cacheStats
  });
  
  builder.send(res);
}

/**
 * Handle rate limit metrics request
 */
async function handleRateLimitMetrics(req: VercelRequest, res: VercelResponse) {
  const rateLimiter = getRateLimiter();
  
  // Get sample rate limit stats
  const sampleIdentifiers = ['anonymous', 'test-user', 'api-key-123'];
  const stats = await Promise.all(
    sampleIdentifiers.map(async (id) => {
      try {
        return await rateLimiter.getStats(id);
      } catch (error) {
        return {
          identifier: id,
          currentCount: 0,
          limit: 0,
          window: 0,
          resetTime: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    })
  );
  
  const builder = new ResponseBuilder().setData({
    type: 'ratelimit',
    stats,
    summary: {
      totalActiveUsers: stats.filter(s => s.currentCount > 0).length,
      averageUsage: stats.reduce((sum, s) => sum + (s.currentCount / Math.max(s.limit, 1)), 0) / stats.length,
      highestUsage: Math.max(...stats.map(s => s.currentCount / Math.max(s.limit, 1)))
    }
  });
  
  builder.send(res);
}

/**
 * Handle system metrics request
 */
async function handleSystemMetrics(req: VercelRequest, res: VercelResponse) {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  const systemMetrics = {
    memory: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
      usagePercentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) / 100
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };
  
  const builder = new ResponseBuilder().setData({
    type: 'system',
    metrics: systemMetrics,
    timestamp: Date.now()
  });
  
  builder.send(res);
}

/**
 * Handle overview metrics request (default)
 */
async function handleOverviewMetrics(req: VercelRequest, res: VercelResponse) {
  const [performanceMetrics, cacheHitRatio, systemInfo] = await Promise.all([
    getPerformanceMetrics({ timeRange: 'hour' }),
    getCacheHitRatio('hour'),
    getSystemOverview()
  ]);
  
  const overview = {
    performance: {
      averageResponseTime: performanceMetrics.summary.averageResponseTime,
      totalRequests: performanceMetrics.summary.totalRequests,
      errorRate: performanceMetrics.summary.errorRate,
      rateLimitRate: performanceMetrics.summary.rateLimitRate
    },
    cache: {
      hitRatio: cacheHitRatio.hitRatio,
      totalRequests: cacheHitRatio.totalRequests,
      cacheHits: cacheHitRatio.cacheHits
    },
    system: systemInfo,
    timestamp: Date.now()
  };
  
  const builder = new ResponseBuilder().setData({
    type: 'overview',
    metrics: overview
  });
  
  builder.send(res);
}

/**
 * Get cache service statistics
 */
async function getCacheServiceStats() {
  try {
    const cacheService = getCacheService();
    const stats = await cacheService.stats();
    const health = await cacheService.healthCheck();
    
    return {
      ...stats,
      health: health.status,
      type: health.type,
      details: health.details
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      health: 'unhealthy'
    };
  }
}

/**
 * Get system overview information
 */
async function getSystemOverview() {
  const memoryUsage = process.memoryUsage();
  
  return {
    memory: {
      usedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
      totalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
      usagePercentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) / 100
    },
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform
  };
}

// Enhanced metrics API with rate limiting
const enhancedMetricsHandler = withCors(
  createRateLimitMiddleware({
    max: 30, // 30 requests per minute for metrics
    windowMs: 60 * 1000,
    message: 'Too many metrics requests, please try again later.'
  })(metricsHandler)
);

export default enhancedMetricsHandler;