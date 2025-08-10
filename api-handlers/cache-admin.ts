// Cache administration API for monitoring and management

import { CacheManager } from './cache-utils';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  REDIS_ENABLED?: string;
}

export async function handleCacheAdmin(
  request: Request,
  env: Env,
  path: string[]
): Promise<Response> {
  const cacheManager = new CacheManager(env);
  const action = path[0] || 'status';

  // Basic auth check (in production, implement proper authentication)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: 'Bearer token required for cache admin endpoints',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    switch (action) {
      case 'status':
        return await handleCacheStatus(cacheManager);

      case 'stats':
        return await handleCacheStats(cacheManager);

      case 'health':
        return await handleCacheHealth(cacheManager);

      case 'clear':
        if (request.method !== 'POST') {
          return new Response(
            JSON.stringify({
              error: 'Method Not Allowed',
              message: 'POST method required for cache clear',
            }),
            {
              status: 405,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        return await handleCacheClear(cacheManager);

      default:
        return new Response(
          JSON.stringify({
            error: 'Not Found',
            message: `Cache admin action '${action}' not found`,
            availableActions: ['status', 'stats', 'health', 'clear'],
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
    }
  } catch (error) {
    console.error('Cache admin error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleCacheStatus(cacheManager: CacheManager): Promise<Response> {
  const redisStats = cacheManager.getRedisStats();
  const cacheStats = cacheManager.getStats();

  // Calculate overall cache metrics
  const totalRequests = Object.values(cacheStats).reduce(
    (sum, stat) => sum + stat.totalRequests,
    0
  );
  const totalHits = Object.values(cacheStats).reduce((sum, stat) => sum + stat.hits, 0);
  const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        redis: redisStats,
        cache: {
          overallHitRate: Math.round(overallHitRate * 100) / 100,
          totalRequests,
          totalHits,
          totalMisses: totalRequests - totalHits,
          categories: Object.keys(cacheStats).length,
        },
        timestamp: new Date().toISOString(),
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

async function handleCacheStats(cacheManager: CacheManager): Promise<Response> {
  const cacheStats = cacheManager.getStats();
  const redisStats = cacheManager.getRedisStats();

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        redis: redisStats,
        detailed: cacheStats,
        summary: {
          categories: Object.keys(cacheStats).length,
          totalRequests: Object.values(cacheStats).reduce(
            (sum, stat) => sum + stat.totalRequests,
            0
          ),
          averageHitRate:
            Object.values(cacheStats).length > 0
              ? Object.values(cacheStats).reduce((sum, stat) => sum + stat.hitRate, 0) /
                Object.values(cacheStats).length
              : 0,
        },
        timestamp: new Date().toISOString(),
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

async function handleCacheHealth(cacheManager: CacheManager): Promise<Response> {
  const healthCheck = await cacheManager.healthCheck();

  return new Response(
    JSON.stringify({
      success: true,
      data: healthCheck,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

async function handleCacheClear(cacheManager: CacheManager): Promise<Response> {
  try {
    await cacheManager.clearAll();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cache statistics cleared successfully',
        note: 'Redis data is preserved for other applications',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
