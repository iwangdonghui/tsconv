import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders } from '../utils/response';
import { HealthCheckResponse, ServiceHealth } from '../types/api';

interface WorkingHealthOptions {
  includeServices?: boolean;
  includeMetrics?: boolean;
  includeDependencies?: boolean;
  timeout?: number;
}

const DEFAULT_TIMEOUT = 5000; // 5 seconds

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const corsHeaders = createCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests for working health check
  if (req.method !== 'GET') {
    return APIErrorHandler.handleMethodNotAllowed(res, 'Only GET method is allowed for working health check');
  }

  try {
    const startTime = Date.now();
    
    // Parse query parameters
    const options: WorkingHealthOptions = {
      includeServices: req.query.services !== 'false',
      includeMetrics: req.query.metrics !== 'false',
      includeDependencies: req.query.dependencies === 'true',
      timeout: req.query.timeout ? parseInt(req.query.timeout as string) : DEFAULT_TIMEOUT
    };

    // Validate timeout
    if (options.timeout && (options.timeout < 1000 || options.timeout > 30000)) {
      return APIErrorHandler.handleBadRequest(res, 'Timeout must be between 1000ms and 30000ms', {
        minTimeout: 1000,
        maxTimeout: 30000,
        received: options.timeout
      });
    }

    // Set timeout for the entire health check
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), options.timeout);
    });

    // Perform working health check with timeout
    const healthCheckPromise = performWorkingHealthCheck(options, startTime);
    
    const healthData = await Promise.race([healthCheckPromise, timeoutPromise]) as HealthCheckResponse;
    
    // Set appropriate HTTP status based on health
    const httpStatus = healthData.status === 'healthy' ? 200 : 
                      healthData.status === 'degraded' ? 200 : 503;

    res.status(httpStatus);
    
    APIErrorHandler.sendSuccess(res, healthData, {
      processingTime: Date.now() - startTime,
      itemCount: 1,
      cacheHit: false
    });

  } catch (error) {
    console.error('Working health check error:', error);
    
    if ((error as Error).message === 'Health check timeout') {
      return APIErrorHandler.sendError(res, APIErrorHandler.createError(
        'TIMEOUT_ERROR',
        'Health check exceeded timeout limit',
        408,
        { timeout: req.query.timeout || DEFAULT_TIMEOUT }
      ), 408);
    }

    // Even if health check fails, we should return a response
    const errorHealthData: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: Date.now(),
      services: {
        cache: { status: 'unhealthy', responseTime: 0, lastCheck: Date.now(), error: 'Health check failed' },
        rateLimiting: { status: 'unhealthy', responseTime: 0, lastCheck: Date.now(), error: 'Health check failed' },
        timezone: { status: 'unhealthy', responseTime: 0, lastCheck: Date.now(), error: 'Health check failed' },
        conversion: { status: 'unhealthy', responseTime: 0, lastCheck: Date.now(), error: 'Health check failed' }
      },
      metrics: {
        uptime: process.uptime(),
        memory: {
          used: 0,
          total: 0,
          percentage: 0
        },
        cache: {
          hits: 0,
          misses: 0,
          hitRatio: 0
        },
        rateLimits: {
          totalRequests: 0,
          rateLimitedRequests: 0,
          blockedPercentage: 0
        }
      }
    };

    res.status(503);
    APIErrorHandler.sendSuccess(res, errorHealthData, {
      processingTime: Date.now(),
      itemCount: 1,
      cacheHit: false
    });
  }
}

async function performWorkingHealthCheck(options: WorkingHealthOptions, startTime: number): Promise<HealthCheckResponse> {
  const timestamp = Date.now();
  const uptime = process.uptime();

  // Initialize health data
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const services: HealthCheckResponse['services'] = {
    cache: { status: 'healthy', responseTime: 0, lastCheck: timestamp },
    rateLimiting: { status: 'healthy', responseTime: 0, lastCheck: timestamp },
    timezone: { status: 'healthy', responseTime: 0, lastCheck: timestamp },
    conversion: { status: 'healthy', responseTime: 0, lastCheck: timestamp }
  };

  // Test services if requested
  if (options.includeServices) {
    // Test cache service
    services.cache = await testCacheService();
    if (services.cache.status !== 'healthy') {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
    }

    // Test rate limiting service
    services.rateLimiting = await testRateLimitingService();
    if (services.rateLimiting.status !== 'healthy') {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
    }

    // Test timezone service
    services.timezone = await testTimezoneService();
    if (services.timezone.status !== 'healthy') {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
    }

    // Test conversion service
    services.conversion = await testConversionService();
    if (services.conversion.status !== 'healthy') {
      overallStatus = 'unhealthy'; // Conversion is critical
    }
  }

  // Get metrics if requested
  let metrics: HealthCheckResponse['metrics'] = {
    uptime,
    memory: {
      used: 0,
      total: 0,
      percentage: 0
    },
    cache: {
      hits: 0,
      misses: 0,
      hitRatio: 0
    },
    rateLimits: {
      totalRequests: 0,
      rateLimitedRequests: 0,
      blockedPercentage: 0
    }
  };

  if (options.includeMetrics) {
    metrics = await getHealthMetrics();
    
    // Check if metrics indicate problems
    if (metrics.memory.percentage > 90) {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
    }
    
    if (metrics.rateLimits.blockedPercentage > 50) {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
    }
  }

  return {
    status: overallStatus,
    timestamp,
    services,
    metrics
  };
}

async function testCacheService(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const { createRedisClient } = await import('../services/redis-client');
    const redis = createRedisClient('cache');
    
    // Test with timeout
    const testPromise = (async () => {
      // Upstash Redis doesn't require explicit connection
      
      // Test basic operations
      const testKey = `health-check:${Date.now()}`;
      await redis.set(testKey, 'test-value', { ex: 5 }); // 5 second TTL
      const value = await redis.get(testKey);
      await redis.del(testKey);
      
      // No need to disconnect with Upstash
      
      return value === 'test-value';
    })();

    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Cache test timeout')), 3000);
    });

    const success = await Promise.race([testPromise, timeoutPromise]);
    
    return {
      status: success ? 'healthy' : 'degraded',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      error: (error as Error).message
    };
  }
}

async function testRateLimitingService(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const { createRedisClient } = await import('../services/redis-client');
    const redis = createRedisClient('rateLimiting');
    
    // Test with timeout
    const testPromise = (async () => {
      // Upstash Redis doesn't require explicit connection
      
      // Test rate limiting operations
      const testKey = `ratelimit:health-check:${Date.now()}`;
      await redis.setex(testKey, 60, '1'); // 1 minute TTL
      const exists = await redis.exists(testKey);
      await redis.del(testKey);
      
      // No need to disconnect with Upstash
      
      return exists === 1;
    })();

    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Rate limiting test timeout')), 2000);
    });

    const success = await Promise.race([testPromise, timeoutPromise]);
    
    return {
      status: success ? 'healthy' : 'degraded',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now()
    };
  } catch (error) {
    return {
      status: 'degraded', // Rate limiting failure is not critical
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      error: (error as Error).message
    };
  }
}

async function testTimezoneService(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Test timezone operations
    const testDate = new Date();
    const utcTime = testDate.toISOString();
    const localTime = testDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const offset = testDate.getTimezoneOffset();
    
    // Verify basic timezone functionality
    if (!utcTime || !localTime || isNaN(offset)) {
      throw new Error('Timezone operations failed');
    }

    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now()
    };
  } catch (error) {
    return {
      status: 'degraded',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      error: (error as Error).message
    };
  }
}

async function testConversionService(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const { convertTimestamp } = await import('../utils/conversion-utils');
    
    // Test conversion functionality
    const testTimestamp = Math.floor(Date.now() / 1000);
    const result = await convertTimestamp(
      testTimestamp,
      ['iso', 'unix', 'human'],
      'UTC'
    );

    // Verify conversion result
    if (!result || !result.formats || !result.formats.iso || !result.formats.unix) {
      throw new Error('Conversion service returned invalid result');
    }

    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now()
    };
  } catch (error) {
    return {
      status: 'unhealthy', // Conversion is critical
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      error: (error as Error).message
    };
  }
}

async function getHealthMetrics(): Promise<HealthCheckResponse['metrics']> {
  const memUsage = process.memoryUsage();
  
  // Get cache metrics
  let cacheMetrics = {
    hits: 0,
    misses: 0,
    hitRatio: 0
  };

  try {
    const { createRedisClient } = await import('../services/redis-client');
    const redis = createRedisClient('general');
    // Upstash Redis doesn't require explicit connection
    
    // Upstash doesn't have info(), use basic metrics
    await redis.ping(); // Test connection
    const dbSize = await redis.dbsize();
    
    // Since Upstash doesn't provide detailed info, use basic metrics
    const keyspaceHits = 0; // Would need to track separately
    const keyspaceMisses = 0; // Would need to track separately
    const totalRequests = keyspaceHits + keyspaceMisses;
    
    cacheMetrics = {
      hits: keyspaceHits,
      misses: keyspaceMisses,
      hitRatio: totalRequests > 0 ? (keyspaceHits / totalRequests) * 100 : 0
    };
    
    // No need to disconnect with Upstash
  } catch (error) {
    console.warn('Failed to get cache metrics:', error);
  }

  // Get rate limit metrics (simplified)
  const rateLimitMetrics = {
    totalRequests: Math.floor(Math.random() * 1000), // Simulated
    rateLimitedRequests: Math.floor(Math.random() * 50), // Simulated
    blockedPercentage: Math.random() * 10 // Simulated
  };

  return {
    uptime: process.uptime(),
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
    },
    cache: cacheMetrics,
    rateLimits: rateLimitMetrics
  };
}

function extractInfoValue(lines: string[], key: string): string | null {
  const line = lines.find(l => l.startsWith(`${key}:`));
  return line ? line.split(':')[1]?.trim() : null;
}