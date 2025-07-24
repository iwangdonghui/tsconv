import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders } from '../utils/response';

interface SimpleHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  environment: string;
  services?: {
    api: boolean;
    cache?: boolean;
    database?: boolean;
  };
}

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

  // Only allow GET requests for simple health check
  if (req.method !== 'GET') {
    return APIErrorHandler.handleMethodNotAllowed(res, 'Only GET method is allowed for simple health check');
  }

  try {
    const startTime = Date.now();
    
    // Parse query parameters
    const includeServices = req.query.services === 'true';
    const detailed = req.query.detailed === 'true';

    // Perform basic health check
    const healthData = await performSimpleHealthCheck(includeServices, detailed);

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
    console.error('Simple health check error:', error);
    
    // Even if health check fails, we should return a response
    const errorHealthData: SimpleHealthResponse = {
      status: 'unhealthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(503);
    APIErrorHandler.sendSuccess(res, errorHealthData, {
      processingTime: Date.now(),
      itemCount: 1,
      cacheHit: false
    });
  }
}

async function performSimpleHealthCheck(includeServices: boolean, detailed: boolean): Promise<SimpleHealthResponse> {
  const timestamp = Date.now();
  const uptime = process.uptime();
  const version = process.env.npm_package_version || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  let services: any = undefined;

  // Basic API health is always true if we reach this point
  const apiHealth = true;

  if (includeServices) {
    services = { api: apiHealth };

    // Test cache service if available
    try {
      const cacheHealth = await testCacheService();
      services.cache = cacheHealth;
      
      if (!cacheHealth) {
        status = 'degraded';
      }
    } catch (error) {
      services.cache = false;
      status = 'degraded';
    }

    // Test database/storage if available
    try {
      const dbHealth = await testDatabaseService();
      services.database = dbHealth;
      
      if (!dbHealth) {
        status = status === 'healthy' ? 'degraded' : 'unhealthy';
      }
    } catch (error) {
      services.database = false;
      status = status === 'healthy' ? 'degraded' : 'unhealthy';
    }
  }

  // Check system resources if detailed
  if (detailed) {
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    // If memory usage is very high, mark as degraded
    if (memoryUsagePercent > 90) {
      status = status === 'healthy' ? 'degraded' : status;
    }

    // If uptime is very low, might indicate recent restart
    if (uptime < 60) { // Less than 1 minute
      status = status === 'healthy' ? 'degraded' : status;
    }
  }

  const healthResponse: SimpleHealthResponse = {
    status,
    timestamp,
    uptime,
    version,
    environment
  };

  if (services) {
    healthResponse.services = services;
  }

  return healthResponse;
}

async function testCacheService(): Promise<boolean> {
  try {
    // Try to import and test cache service
    const { createRedisClient } = await import('../services/redis-client');
    const redis = createRedisClient('cache');
    
    // Quick connection test with timeout
    const testPromise = (async () => {
      // Upstash Redis doesn't require explicit connection
      await redis.ping(); // Test connection
      // No need to disconnect with Upstash
      return true;
    })();

    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Cache test timeout')), 2000);
    });

    return await Promise.race([testPromise, timeoutPromise]);
  } catch (error) {
    console.warn('Cache service test failed:', error);
    return false;
  }
}

async function testDatabaseService(): Promise<boolean> {
  try {
    // For this timestamp conversion API, we don't have a traditional database
    // But we can test if our core conversion utilities work
    const { convertTimestamp } = await import('../utils/conversion-utils');
    
    // Test basic conversion functionality
    const testResult = await convertTimestamp(
      Math.floor(Date.now() / 1000),
      ['iso', 'unix'],
      'UTC'
    );

    return !!(testResult && testResult.formats && testResult.formats.iso);
  } catch (error) {
    console.warn('Database/core service test failed:', error);
    return false;
  }
}

// Simple ping endpoint variant
export async function ping(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const corsHeaders = createCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
    message: 'pong'
  });
}