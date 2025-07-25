// Environment variables debugging endpoint

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  REDIS_ENABLED?: string;
}

export async function handleEnvDebug(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({
      error: 'Method Not Allowed',
      message: 'Only GET method is supported'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Simple auth check - allow 'debug' token for testing
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || (!authHeader.includes('Bearer debug') && !authHeader.includes('Bearer test'))) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Use "Bearer debug" token for environment debugging'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Check environment variables (mask sensitive data)
    const redisUrl = env.UPSTASH_REDIS_REST_URL;
    const redisToken = env.UPSTASH_REDIS_REST_TOKEN;
    const redisEnabled = env.REDIS_ENABLED;

    const envCheck = {
      UPSTASH_REDIS_REST_URL: {
        configured: !!redisUrl,
        value: redisUrl ? `${redisUrl.substring(0, 20)}...` : null,
        length: redisUrl?.length || 0
      },
      UPSTASH_REDIS_REST_TOKEN: {
        configured: !!redisToken,
        value: redisToken ? `${redisToken.substring(0, 10)}...` : null,
        length: redisToken?.length || 0
      },
      REDIS_ENABLED: {
        configured: redisEnabled !== undefined,
        value: redisEnabled,
        type: typeof redisEnabled
      }
    };

    // Test Redis connection if configured
    let connectionTest = null;
    if (redisUrl && redisToken) {
      try {
        const response = await fetch(redisUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${redisToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['PING']),
        });

        if (response.ok) {
          const result = await response.json();
          connectionTest = {
            success: true,
            status: response.status,
            result: result.result
          };
        } else {
          connectionTest = {
            success: false,
            status: response.status,
            error: `HTTP ${response.status}`
          };
        }
      } catch (error) {
        connectionTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Calculate Redis enabled status
    const shouldBeEnabled = !!(redisUrl && redisToken && redisEnabled !== 'false');

    return new Response(JSON.stringify({
      success: true,
      data: {
        environment: envCheck,
        redis: {
          shouldBeEnabled,
          connectionTest,
          configurationComplete: !!(redisUrl && redisToken)
        },
        recommendations: generateRecommendations(envCheck, connectionTest, shouldBeEnabled)
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Environment debug error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function generateRecommendations(envCheck: any, connectionTest: any, shouldBeEnabled: boolean): string[] {
  const recommendations = [];

  if (!envCheck.UPSTASH_REDIS_REST_URL.configured) {
    recommendations.push('Configure UPSTASH_REDIS_REST_URL in Cloudflare Pages environment variables');
  }

  if (!envCheck.UPSTASH_REDIS_REST_TOKEN.configured) {
    recommendations.push('Configure UPSTASH_REDIS_REST_TOKEN in Cloudflare Pages environment variables');
  }

  if (envCheck.REDIS_ENABLED.value === 'false') {
    recommendations.push('Set REDIS_ENABLED=true to enable Redis caching');
  }

  if (connectionTest && !connectionTest.success) {
    recommendations.push('Check Redis URL and token - connection test failed');
  }

  if (shouldBeEnabled && connectionTest?.success) {
    recommendations.push('✅ Redis configuration looks good! Cache should be working.');
  }

  if (!shouldBeEnabled) {
    recommendations.push('Complete Redis configuration to enable caching');
  }

  return recommendations;
}
