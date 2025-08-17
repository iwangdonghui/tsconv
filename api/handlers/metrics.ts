import { VercelRequest, VercelResponse } from '@vercel/node';
import { createRedisClient } from '../services/redis-client';
import { APIErrorHandler, createCorsHeaders } from '../utils/response';

interface SystemMetrics {
  timestamp: number;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRatio: number;
    totalKeys: number;
    memoryUsage: string;
  };
  rateLimits: {
    totalRequests: number;
    rateLimitedRequests: number;
    blockedPercentage: number;
  };
  api: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    endpointStats: Record<string, EndpointMetrics>;
  };
  redis: {
    connected: boolean;
    responseTime: number;
    commandsProcessed: number;
    keyspaceHits: number;
    keyspaceMisses: number;
  };
}

interface EndpointMetrics {
  requests: number;
  averageResponseTime: number;
  errorCount: number;
  lastAccessed: number;
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

  // Only allow GET requests for metrics
  if (req.method !== 'GET') {
    return APIErrorHandler.handleMethodNotAllowed(res, 'Only GET method is allowed for metrics');
  }

  try {
    const startTime = Date.now();
    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: getMemoryMetrics(),
      cache: await getCacheMetrics(),
      rateLimits: await getRateLimitMetrics(),
      api: await getApiMetrics(),
      redis: await getRedisMetrics(),
    };

    APIErrorHandler.sendSuccess(res, metrics, {
      processingTime: Date.now() - startTime,
      itemCount: 1,
      cacheHit: false,
    });
  } catch (error) {
    console.error('Metrics error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'metrics',
    });
  }
}

function getMemoryMetrics() {
  const memUsage = process.memoryUsage();
  const totalMemory = require('os').totalmem();
  const usedMemory = memUsage.rss;

  return {
    used: usedMemory,
    total: totalMemory,
    percentage: (usedMemory / totalMemory) * 100,
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
  };
}

async function getCacheMetrics() {
  try {
    const redis = createRedisClient('cache');
    // Upstash Redis doesn't require explicit connection

    // Get cache keys and basic stats
    const keys = await redis.keys('tsconv:cache:*');
    // Note: Upstash does not expose DB size reliably; avoid unused variable to satisfy TS

    // Upstash Redis doesn't support INFO command, use default values
    let memoryUsage = '0B';
    try {
      // Upstash doesn't provide memory info, so we'll use a placeholder
      memoryUsage = 'N/A (Upstash)';
    } catch (error) {
      console.warn('Redis INFO not available, using default memory usage');
    }

    // Since Upstash doesn't provide detailed info, we'll use basic metrics
    const keyspaceHits = 0; // Would need to track this separately
    const keyspaceMisses = 0; // Would need to track this separately
    const totalRequests = keyspaceHits + keyspaceMisses;
    const hitRatio = totalRequests > 0 ? (keyspaceHits / totalRequests) * 100 : 0;

    // No need to disconnect with Upstash

    return {
      hits: keyspaceHits,
      misses: keyspaceMisses,
      hitRatio: Math.round(hitRatio * 100) / 100,
      totalKeys: keys.length,
      memoryUsage,
    };
  } catch (error) {
    console.warn('Failed to get cache metrics:', error);
    return {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalKeys: 0,
      memoryUsage: '0B',
    };
  }
}

async function getRateLimitMetrics() {
  try {
    const redis = createRedisClient('rate-limit');
    // Upstash Redis doesn't require explicit connection

    // Get rate limit keys
    const rateLimitKeys = await redis.keys('tsconv:ratelimit:*');
    let totalRequests = 0;
    let rateLimitedRequests = 0;

    // Sample some rate limit data
    for (const key of rateLimitKeys.slice(0, 100)) {
      // Limit to avoid performance issues
      try {
        const value = await redis.get(key);
        if (value) {
          const data = JSON.parse(String(value));
          totalRequests += data.count || 0;
          if (data.blocked) {
            rateLimitedRequests += data.blocked;
          }
        }
      } catch (error) {
        // Skip invalid entries
      }
    }

    // No need to disconnect with Upstash

    const blockedPercentage = totalRequests > 0 ? (rateLimitedRequests / totalRequests) * 100 : 0;

    return {
      totalRequests,
      rateLimitedRequests,
      blockedPercentage: Math.round(blockedPercentage * 100) / 100,
    };
  } catch (error) {
    console.warn('Failed to get rate limit metrics:', error);
    return {
      totalRequests: 0,
      rateLimitedRequests: 0,
      blockedPercentage: 0,
    };
  }
}

async function getApiMetrics() {
  try {
    const redis = createRedisClient('general');
    // Upstash Redis doesn't require explicit connection

    // Get API metrics from Redis
    const metricsKeys = await redis.keys('tsconv:metrics:*');
    let totalRequests = 0;
    let totalResponseTime = 0;
    let errorCount = 0;
    const endpointStats: Record<string, EndpointMetrics> = {};

    for (const key of metricsKeys) {
      try {
        const value = await redis.get(key);
        if (value) {
          const data = JSON.parse(String(value));
          totalRequests += data.requests || 0;
          totalResponseTime += (data.responseTime || 0) * (data.requests || 0);
          errorCount += data.errors || 0;

          // Extract endpoint from key
          const endpoint = key.replace('tsconv:metrics:', '');
          endpointStats[endpoint] = {
            requests: data.requests || 0,
            averageResponseTime: data.responseTime || 0,
            errorCount: data.errors || 0,
            lastAccessed: data.lastAccessed || 0,
          };
        }
      } catch (error) {
        // Skip invalid entries
      }
    }

    // No need to disconnect with Upstash

    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      endpointStats,
    };
  } catch (error) {
    console.warn('Failed to get API metrics:', error);
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      endpointStats: {},
    };
  }
}

async function getRedisMetrics() {
  const startTime = Date.now();

  try {
    const redis = createRedisClient('general');
    // Upstash Redis doesn't require explicit connection

    // Test connection with ping and get basic stats
    await redis.ping();
    // Note: Upstash does not expose DB size reliably; avoid unused variable to satisfy TS

    const responseTime = Date.now() - startTime;
    // Upstash doesn't provide detailed info, use basic metrics
    const commandsProcessed = 0; // Would need to track separately
    const keyspaceHits = 0; // Would need to track separately
    const keyspaceMisses = 0; // Would need to track separately

    // No need to disconnect with Upstash

    return {
      connected: true,
      responseTime,
      commandsProcessed,
      keyspaceHits,
      keyspaceMisses,
    };
  } catch (error) {
    return {
      connected: false,
      responseTime: Date.now() - startTime,
      commandsProcessed: 0,
      keyspaceHits: 0,
      keyspaceMisses: 0,
    };
  }
}

// Helper function for extracting Redis info values (kept for potential future use)
// @ts-ignore - not currently used in Upstash env but kept for parity
 
function _extractInfoValue(lines: string[], key: string): string | null {
  const line = lines.find(l => l.startsWith(`${key}:`));
  return line ? line.split(':')[1]?.trim() || null : null;
}
void _extractInfoValue; // mark as intentionally unused
