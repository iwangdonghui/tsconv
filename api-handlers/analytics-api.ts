// Analytics API endpoints for monitoring dashboard

import { AnalyticsManager } from './analytics';
import { SecurityManager } from './security';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  REDIS_ENABLED?: string;
}

export async function handleAnalytics(
  request: Request,
  env: Env,
  path: string[]
): Promise<Response> {
  const securityManager = new SecurityManager(env);
  const analyticsManager = new AnalyticsManager(env);

  // Basic auth check
  const authHeader = request.headers.get('Authorization');
  if (
    !authHeader ||
    (!authHeader.includes('Bearer debug') && !authHeader.includes('Bearer admin'))
  ) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: 'Bearer token required for analytics endpoints',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Apply security headers
  const securityHeaders = securityManager.getSecurityHeaders();
  const corsHeaders = securityManager.getCORSHeaders(request.headers.get('Origin') || undefined);

  const responseHeaders = {
    'Content-Type': 'application/json',
    ...securityHeaders,
    ...corsHeaders,
  };

  try {
    const action = path[0] || 'stats';

    switch (action) {
      case 'stats':
        return await handleAnalyticsStats(analyticsManager, _request, responseHeaders);

      case 'realtime':
        return await handleRealTimeStats(analyticsManager, responseHeaders);

      case 'security':
        return await handleSecurityStats(securityManager, responseHeaders);

      case 'dashboard':
        return await handleDashboard(analyticsManager, securityManager, responseHeaders);

      default:
        return new Response(
          JSON.stringify({
            error: 'Not Found',
            message: `Analytics endpoint '${action}' not found`,
            availableEndpoints: ['stats', 'realtime', 'security', 'dashboard'],
          }),
          {
            status: 404,
            headers: responseHeaders,
          }
        );
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Analytics API error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: responseHeaders,
      }
    );
  }
}

async function handleAnalyticsStats(
  analyticsManager: AnalyticsManager,
  request: Request,
  headers: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const date = url.searchParams.get('date'); // YYYY-MM-DD format

  const stats = await analyticsManager.getStats(date || undefined);

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        date: date || new Date().toISOString().split('T')[0],
        stats,
        generated: new Date().toISOString(),
      },
    }),
    {
      headers,
    }
  );
}

async function handleRealTimeStats(
  analyticsManager: AnalyticsManager,
  headers: Record<string, string>
): Promise<Response> {
  const realTimeStats = await analyticsManager.getRealTimeStats();

  return new Response(
    JSON.stringify({
      success: true,
      data: realTimeStats,
    }),
    {
      headers,
    }
  );
}

async function handleSecurityStats(
  securityManager: SecurityManager,
  headers: Record<string, string>
): Promise<Response> {
  // This would get security-related statistics
  // For now, return basic info

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        rateLimits: {
          general: 'Active',
          convert: 'Active',
          admin: 'Active',
        },
        securityHeaders: 'Enabled',
        cors: 'Configured',
        timestamp: new Date().toISOString(),
      },
    }),
    {
      headers,
    }
  );
}

async function handleDashboard(
  analyticsManager: AnalyticsManager,
  securityManager: SecurityManager,
  headers: Record<string, string>
): Promise<Response> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get stats for today and yesterday
  const [todayStats, yesterdayStats, realTimeStats] = await Promise.all([
    analyticsManager.getStats(today),
    analyticsManager.getStats(yesterday),
    analyticsManager.getRealTimeStats(),
  ]);

  // Calculate trends
  const requestsTrend =
    yesterdayStats.totalRequests > 0
      ? ((todayStats.totalRequests - yesterdayStats.totalRequests) / yesterdayStats.totalRequests) *
        100
      : 0;

  const responseTimeTrend =
    yesterdayStats.averageResponseTime > 0
      ? ((todayStats.averageResponseTime - yesterdayStats.averageResponseTime) /
          yesterdayStats.averageResponseTime) *
        100
      : 0;

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        overview: {
          todayRequests: todayStats.totalRequests,
          requestsTrend: Math.round(requestsTrend * 100) / 100,
          averageResponseTime: todayStats.averageResponseTime,
          responseTimeTrend: Math.round(responseTimeTrend * 100) / 100,
          errorRate: todayStats.errorRate,
          cacheHitRate: todayStats.cacheHitRate,
        },
        realTime: realTimeStats,
        today: todayStats,
        yesterday: yesterdayStats,
        security: {
          rateLimitsActive: true,
          securityHeadersEnabled: true,
          corsConfigured: true,
        },
        generated: new Date().toISOString(),
      },
    }),
    {
      headers,
    }
  );
}

// Middleware to record analytics for all API requests
export async function recordAnalyticsMiddleware(
  request: Request,
  response: Response,
  env: Env,
  startTime: number
): Promise<void> {
  try {
    const analyticsManager = new AnalyticsManager(env);
    const url = new URL(request.url);

    const event = {
      endpoint: url.pathname,
      method: request.method,
      status: response.status,
      responseTime: Date.now() - startTime,
      userAgent: request.headers.get('User-Agent') || undefined,
      country: request.headers.get('CF-IPCountry') || undefined,
      timestamp: new Date().toISOString(),
      cached: response.headers.get('X-Cache-Status') === 'HIT',
    };

    // Record asynchronously to not block response
    analyticsManager.recordEvent(event).catch(error => {
      if (process.env.NODE_ENV === 'development')
        console.error('Failed to record analytics event:', error);
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Analytics middleware error:', error);
  }
}

// Security middleware to apply rate limiting and security checks
export async function securityMiddleware(
  request: Request,
  env: Env
): Promise<{ allowed: boolean; response?: Response }> {
  try {
    const securityManager = new SecurityManager(env);
    const url = new URL(request.url);

    // Determine rate limit config based on endpoint
    let rateLimitConfig;
    if (url.pathname.startsWith('/api/admin')) {
      rateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator: securityManager.generateRateLimitKey.bind(securityManager),
      };
    } else if (url.pathname.startsWith('/api/convert')) {
      rateLimitConfig = {
        windowMs: 60000,
        maxRequests: 60,
        keyGenerator: securityManager.generateRateLimitKey.bind(securityManager),
      };
    } else {
      rateLimitConfig = {
        windowMs: 60000,
        maxRequests: 100,
        keyGenerator: securityManager.generateRateLimitKey.bind(securityManager),
      };
    }

    // Check rate limit
    const rateLimitResult = await securityManager.checkRateLimit(_request, rateLimitConfig);

    if (!rateLimitResult.allowed) {
      // Log security event
      await securityManager.logSecurityEvent({
        type: 'rate_limit_exceeded',
        ip: request.headers.get('CF-Connecting-IP') || 'unknown',
        userAgent: request.headers.get('User-Agent') || undefined,
        endpoint: url.pathname,
      });

      const securityHeaders = securityManager.getSecurityHeaders();
      const corsHeaders = securityManager.getCORSHeaders(
        request.headers.get('Origin') || undefined
      );

      return {
        allowed: false,
        response: new Response(
          JSON.stringify({
            error: 'Rate Limit Exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
              ...securityHeaders,
              ...corsHeaders,
            },
          }
        ),
      };
    }

    // Check for suspicious activity
    const suspiciousCheck = await securityManager.checkSuspiciousActivity(_request);

    if (suspiciousCheck.suspicious) {
      // Log security event
      await securityManager.logSecurityEvent({
        type: 'suspicious_activity',
        ip: request.headers.get('CF-Connecting-IP') || 'unknown',
        userAgent: request.headers.get('User-Agent') || undefined,
        endpoint: url.pathname,
        details: { reason: suspiciousCheck.reason },
      });

      // For now, just log but don't block (could be enhanced to block in the future)
    }

    return { allowed: true };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Security middleware error:', error);
    // Fail open - allow request if security check fails
    return { allowed: true };
  }
}
