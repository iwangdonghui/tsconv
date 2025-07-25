// Cloudflare Pages adapter for health API

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

export async function handleHealth(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({
      error: 'Method Not Allowed',
      message: 'Only GET method is supported'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';

    const startTime = Date.now();
    
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 0, // Not available in Cloudflare Workers
      version: '1.0.0',
      environment: env.NODE_ENV || 'production',
      responseTime: 0
    };

    // Test Redis connection if configured
    let redisStatus = 'not-configured';
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const redisResponse = await fetch(`${env.UPSTASH_REDIS_REST_URL}/ping`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (redisResponse.ok) {
          redisStatus = 'healthy';
        } else {
          redisStatus = 'unhealthy';
        }
      } catch (error) {
        redisStatus = 'error';
      }
    }

    const responseTime = Date.now() - startTime;
    health.responseTime = responseTime;

    const result: any = {
      ...health,
      services: {
        api: 'healthy',
        redis: redisStatus
      }
    };

    if (detailed) {
      result.details = {
        memory: {
          used: 'N/A (Cloudflare)',
          total: 'N/A (Cloudflare)'
        },
        system: {
          platform: 'cloudflare-pages',
          runtime: 'cloudflare-workers'
        },
        performance: {
          responseTime: `${responseTime}ms`,
          requestsPerSecond: 'N/A'
        }
      };
    }

    // Determine overall status
    if (redisStatus === 'error' || redisStatus === 'unhealthy') {
      result.status = 'degraded';
    }

    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'degraded' ? 200 : 503;

    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Health API Error:', error);
    
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
