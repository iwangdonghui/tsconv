import { VercelRequest, VercelResponse } from '@vercel/node';
import config from '../config/config';
import { getEnhancedRateLimiter } from '../services/rate-limit/rate-limit-config-init';
import { APIResponse, RateLimiter, RateLimitResult, RateLimitRule } from '../types/api';

// Rate limit middleware options
export interface RateLimitMiddlewareOptions {
  rateLimiter?: RateLimiter;
  identifierExtractor?: (req: VercelRequest) => string;
  ruleSelector?: (req: VercelRequest) => RateLimitRule;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (identifier: string, rule: RateLimitRule, result: RateLimitResult) => void;
  customErrorResponse?: (result: RateLimitResult) => APIResponse;
  max?: number;
  windowMs?: number;
}

// Default identifier extractor
const defaultIdentifierExtractor = (req: VercelRequest): string => {
  // Try to get identifier from headers (for authenticated requests)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    return `user:${token || 'anonymous'}`;
  }

  // Check for API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return `api_key:${apiKey}`;
  }

  // Fallback to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? Array.isArray(forwarded)
      ? (forwarded?.[0] ?? 'unknown')
      : typeof forwarded === 'string'
        ? (forwarded?.split(',')[0]?.trim() ?? 'unknown')
        : 'unknown'
    : req.headers['x-real-ip'] || 'unknown';

  return `ip:${ip}`;
};

// Default rule selector
const defaultRuleSelector = (req: VercelRequest): RateLimitRule => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader || apiKey) {
    return config.rateLimiting.defaultLimits.authenticated;
  }

  return config.rateLimiting.defaultLimits.anonymous;
};

// Default error response generator
const defaultErrorResponse = (result: RateLimitResult): APIResponse => ({
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded. Please try again later.',
    details: {
      limit: result.totalLimit,
      remaining: result.remaining,
      resetTime: result.resetTime,
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    },
    timestamp: Date.now(),
    requestId: `rate-limit-${Date.now()}`,
    suggestions: [
      'Wait for the rate limit to reset',
      'Consider upgrading to a higher rate limit tier',
      'Implement request batching to reduce API calls',
    ],
    statusCode: 429,
  },
});

// Rate limit middleware function
export const rateLimitMiddleware = (options: RateLimitMiddlewareOptions) => {
  const {
    rateLimiter,
    identifierExtractor = defaultIdentifierExtractor,
    ruleSelector = defaultRuleSelector,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    onLimitReached,
    customErrorResponse = defaultErrorResponse,
  } = options;

  // Ensure we have a rate limiter
  if (!rateLimiter) {
    throw new Error('Rate limiter is required for rate limit middleware');
  }

  return async (
    req: VercelRequest,
    res: VercelResponse,
    next: () => Promise<void>
  ): Promise<void> => {
    // Skip rate limiting if disabled
    if (!config.rateLimiting.enabled) {
      await next();
      return;
    }

    const identifier = identifierExtractor(req);
    const rule = ruleSelector(req);

    try {
      // Check current rate limit status
      const checkResult = await rateLimiter.checkLimit(identifier, rule);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rule.limit.toString());
      res.setHeader('X-RateLimit-Remaining', checkResult.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(checkResult.resetTime / 1000).toString());
      res.setHeader('X-RateLimit-Window', Math.ceil(rule.window / 1000).toString());

      // Check if rate limit is exceeded
      if (!checkResult.allowed) {
        // Call onLimitReached callback if provided
        if (onLimitReached) {
          onLimitReached(identifier, rule, checkResult);
        }

        // Set additional headers for rate limit exceeded
        const retryAfter = Math.ceil((checkResult.resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.setHeader('X-RateLimit-Exceeded', 'true');

        // Return rate limit error response
        const errorResponse = customErrorResponse(checkResult);
        res.status(429).json(errorResponse);
        return;
      }

      // Increment rate limit counter (before processing request)
      if (!skipSuccessfulRequests && !skipFailedRequests) {
        await rateLimiter.increment(identifier, rule);
      } else {
        // We'll increment after the request based on response
        const originalJson = res.json;
        const originalSend = res.send;
        let shouldIncrement = true;

        // Override response methods to check status
        res.json = function (data: unknown) {
          const statusCode = res.statusCode || 200;

          if (skipSuccessfulRequests && statusCode >= 200 && statusCode < 400) {
            shouldIncrement = false;
          }

          if (skipFailedRequests && statusCode >= 400) {
            shouldIncrement = false;
          }

          if (shouldIncrement) {
            rateLimiter.increment(identifier, rule).catch(error => {
              console.error('Rate limit increment error:', error);
            });
          }

          return originalJson.call(this, data);
        };

        res.send = function (data: unknown) {
          const statusCode = res.statusCode || 200;

          if (skipSuccessfulRequests && statusCode >= 200 && statusCode < 400) {
            shouldIncrement = false;
          }

          if (skipFailedRequests && statusCode >= 400) {
            shouldIncrement = false;
          }

          if (shouldIncrement) {
            rateLimiter.increment(identifier, rule).catch(error => {
              console.error('Rate limit increment error:', error);
            });
          }

          return originalSend.call(this, data);
        };
      }

      // Update rate limit headers with new values after increment
      const updatedResult = await rateLimiter.checkLimit(identifier, rule);
      res.setHeader('X-RateLimit-Remaining', updatedResult.remaining.toString());

      // Proceed to next middleware/handler
      await next();
    } catch (error) {
      // Log rate limiting error but don't fail the request
      console.error('Rate limiting middleware error:', error);
      await next();
    }
  };
};

// Convenience function for creating rate limit middleware with enhanced rate limiter
export const createRateLimitMiddleware = (options?: Partial<RateLimitMiddlewareOptions>) => {
  // Use enhanced rate limiter by default
  const getRateLimiter = async (): Promise<RateLimiter> => {
    try {
      // Use enhanced rate limiter if not provided in options
      if (options?.rateLimiter) {
        return options.rateLimiter;
      }

      return await getEnhancedRateLimiter();
    } catch (error) {
      console.warn('Failed to get enhanced rate limiter, falling back to memory:', error);
      // Fallback to memory rate limiter
      const { MemoryRateLimiter } = await import('../services/rate-limiter');
      return new MemoryRateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 100,
      });
    }
  };

  return (handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) => {
    return async (req: VercelRequest, res: VercelResponse) => {
      const rateLimiter = await getRateLimiter();
      const middleware = rateLimitMiddleware({
        rateLimiter,
        ...options,
      });

      return middleware(req, res, async () => {
        await handler(req, res);
      });
    };
  };
};

// Rate limit bypass utilities
export const bypassRateLimit = (req: VercelRequest): boolean => {
  // Check for bypass header (for internal services)
  const bypassHeader = req.headers['x-rate-limit-bypass'];
  if (
    bypassHeader &&
    process.env.RATE_LIMIT_BYPASS_TOKEN &&
    bypassHeader === process.env.RATE_LIMIT_BYPASS_TOKEN
  ) {
    return true;
  }

  // Check for admin API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey && process.env.ADMIN_API_KEY && apiKey === process.env.ADMIN_API_KEY) {
    return true;
  }

  // Check for localhost in development (disabled in test env)
  if (process.env.NODE_ENV === 'development') {
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    if (ip.toString().includes('127.0.0.1') || ip.toString().includes('localhost')) {
      return true;
    }
  }

  return false;
};

// Rate limit reset utilities
export const resetRateLimit = async (
  rateLimiter: RateLimiter,
  identifier: string,
  rule: RateLimitRule
): Promise<void> => {
  try {
    await rateLimiter.reset(identifier, rule);
  } catch (error) {
    console.error('Rate limit reset error:', error);
    throw error;
  }
};

// Rate limit statistics utilities
export const getRateLimitStats = async (rateLimiter: RateLimiter, identifier: string) => {
  try {
    return await rateLimiter.getStats(identifier);
  } catch (error) {
    console.error('Rate limit stats error:', error);
    return {
      identifier,
      currentCount: 0,
      limit: 0,
      window: 0,
      resetTime: Date.now(),
    };
  }
};

// Middleware for specific endpoints with custom rules
export const createEndpointRateLimit = (endpoint: string, customRule: Partial<RateLimitRule>) => {
  const endpointRule: RateLimitRule = {
    identifier: endpoint,
    limit: customRule.limit || 50,
    window: customRule.window || 60000, // 1 minute
    type: customRule.type || 'ip',
  };

  return createRateLimitMiddleware({
    ruleSelector: () => endpointRule,
  });
};

// Types are already exported above with their definitions
