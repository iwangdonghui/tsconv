// Cloudflare Pages adapter for health API

import { CacheManager } from './cache-utils';
import { logError } from './utils/logger';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  responseTime: number;
}

interface ServiceStatus {
  api: string;
  cache: string;
  redis: string;
}

interface SystemDetails {
  memory: {
    used: string;
    total: string;
  };
  system: {
    platform: string;
    runtime: string;
  };
  performance: {
    responseTime: string;
    requestsPerSecond: string;
  };
  cache: unknown;
}

interface HealthResult extends HealthStatus {
  services: ServiceStatus;
  details?: SystemDetails;
}

export async function handleHealth(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only GET method is supported',
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';

    const startTime = Date.now();
    const cacheManager = new CacheManager(env);

    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 0, // Not available in Cloudflare Workers
      version: '1.0.0',
      environment: env.NODE_ENV || 'production',
      responseTime: 0,
    };

    // Test cache system (Redis + fallback)
    const cacheHealth = await cacheManager.healthCheck();
    const redisStatus = cacheHealth.redis ? 'healthy' : 'degraded';

    const responseTime = Date.now() - startTime;
    health.responseTime = responseTime;

    const result: HealthResult = {
      ...health,
      services: {
        api: 'healthy',
        cache: cacheHealth.status,
        redis: redisStatus,
      },
    };

    if (detailed) {
      result.details = {
        memory: {
          used: 'N/A (Cloudflare)',
          total: 'N/A (Cloudflare)',
        },
        system: {
          platform: 'cloudflare-pages',
          runtime: 'cloudflare-workers',
        },
        performance: {
          responseTime: `${responseTime}ms`,
          requestsPerSecond: 'N/A',
        },
        cache: {
          ...cacheHealth.stats,
          enabled: cacheManager.getRedisStats().enabled,
        },
      };
    }

    // Determine overall status
    if (redisStatus === 'error' || redisStatus === 'unhealthy') {
      result.status = 'degraded';
    }

    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logError('Health API Error', error instanceof Error ? error : new Error(String(error)));

    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
