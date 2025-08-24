// Cloudflare Pages adapter for admin API routes

import { handleAnalytics } from './analytics-api';
import { handleCacheAdmin } from './cache-admin';
import { handleCacheTest } from './cache-test';
import { handleEnvDebug } from './env-debug';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

export async function handleAdminRoutes(
  request: Request,
  env: Env,
  path: string[]
): Promise<Response> {
  const endpoint = path[0] || '';

  // Basic auth check (you should implement proper authentication)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: 'Bearer token required for admin endpoints',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  switch (endpoint) {
    case 'stats':
      return handleAdminStats(request, env);
    case 'cache':
      // Handle cache admin with sub-paths
      return handleCacheAdmin(request, env, path.slice(1));
    case 'health':
      return handleAdminHealth(request, env);
    case 'env-debug':
      return handleEnvDebug(request, env);
    case 'cache-test':
      return handleCacheTest(request, env);
    case 'analytics':
      // Handle analytics with sub-paths
      return handleAnalytics(request, env, path.slice(1));
    default:
      return new Response(
        JSON.stringify({
          error: 'Not Found',
          message: `Admin endpoint /${path.join('/')} not found`,
          availableEndpoints: ['stats', 'cache', 'health', 'env-debug', 'cache-test', 'analytics'],
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
  }
}

async function handleAdminStats(request: Request, env: Env): Promise<Response> {
  try {
    // Mock stats for now (you can implement real metrics collection)
    const stats = {
      requests: {
        total: 1000,
        today: 150,
        lastHour: 25,
      },
      endpoints: {
        '/api/convert': 450,
        '/api/now': 300,
        '/api/health': 100,
        '/api/v1/*': 150,
      },
      performance: {
        averageResponseTime: '45ms',
        uptime: '99.9%',
      },
      cache: {
        hits: 750,
        misses: 250,
        hitRate: '75%',
      },
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
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

export async function handleAdminCache(request: Request, env: Env): Promise<Response> {
  if (request.method === 'DELETE') {
    // Clear cache
    try {
      if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
        const response = await fetch(`${env.UPSTASH_REDIS_REST_URL}/flushall`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Cache cleared successfully',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } else {
          throw new Error('Failed to clear cache');
        }
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Redis not configured',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (error) {
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
  } else {
    // Get cache info
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: 'active',
          provider: 'upstash-redis',
          configured: !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleAdminHealth(request: Request, env: Env): Promise<Response> {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        cache: 'unknown',
        database: 'not-applicable',
      },
      environment: {
        platform: 'cloudflare-pages',
        runtime: 'cloudflare-workers',
        region: 'auto',
      },
    };

    // Test Redis if configured
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const response = await fetch(`${env.UPSTASH_REDIS_REST_URL}/ping`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        health.services.cache = response.ok ? 'healthy' : 'unhealthy';
      } catch (error) {
        health.services.cache = 'error';
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: health,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
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
