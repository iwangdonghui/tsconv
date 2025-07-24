import { VercelRequest, VercelResponse } from '@vercel/node';
import rateLimiter from '../services/rate-limiter';
import config from '../config/config';
import { APIErrorHandler } from '../utils/response';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: VercelRequest) => string;
}

export function createRateLimitMiddleware(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute
    max = 100, // 100 requests per window
    message = 'Too many requests, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator
  } = options;

  return function rateLimitMiddleware(handler: Function) {
    return async (req: VercelRequest, res: VercelResponse) => {
      if (!config.rateLimiting.enabled) {
        return handler(req, res);
      }

      try {
        // Generate identifier for rate limiting
        const identifier = keyGenerator ? keyGenerator(req) : getClientIdentifier(req);
        
        // Get appropriate rate limit rule
        const rule = getRateLimitRule(req, max, windowMs);
        
        // Check and increment rate limit
        const result = await rateLimiter.increment(identifier, rule);
        
        // Set rate limit headers
        if (standardHeaders) {
          res.setHeader('RateLimit-Limit', rule.limit);
          res.setHeader('RateLimit-Remaining', Math.max(0, result.remaining));
          res.setHeader('RateLimit-Reset', new Date(result.resetTime).toISOString());
        }
        
        if (legacyHeaders) {
          res.setHeader('X-RateLimit-Limit', rule.limit);
          res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
          res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
        }
        
        // Check if rate limit exceeded
        if (!result.allowed) {
          return APIErrorHandler.handleRateLimitError(
            res,
            rule.limit,
            result.remaining,
            result.resetTime
          );
        }
        
        // Intercept response to track success/failure for rate limiting
        const originalStatus = res.status;
        const originalJson = res.json;
        
        let statusCode = 200;
        let responseData: any;
        
        res.status = function(code: number) {
          statusCode = code;
          return originalStatus.call(this, code);
        };
        
        res.json = function(data: any) {
          responseData = data;
          
          // Optionally skip counting successful or failed requests
          const isSuccess = statusCode >= 200 && statusCode < 300;
          const isFailure = statusCode >= 400;
          
          if ((skipSuccessfulRequests && isSuccess) || 
              (skipFailedRequests && isFailure)) {
            // Decrement the counter since we don't want to count this request
            rateLimiter.checkLimit(identifier, rule).catch(err => {
              console.warn('Rate limit adjustment error:', err);
            });
          }
          
          return originalJson.call(this, data);
        };
        
        return handler(req, res);
        
      } catch (error) {
        console.warn('Rate limit middleware error:', error);
        // Continue without rate limiting on error
        return handler(req, res);
      }
    };
  };
}

function getClientIdentifier(req: VercelRequest): string {
  // Try to get identifier from headers (for authenticated requests)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // Extract user ID from auth token (simplified)
    const token = authHeader.split(' ')[1];
    return `user:${token?.substring(0, 10) || 'unknown'}`;
  }
  
  // Try API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return `api:${String(apiKey).substring(0, 10)}`;
  }

  // Fallback to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? String(forwarded).split(',')[0].trim() : 
            req.headers['x-real-ip'] || 
            req.connection?.remoteAddress || 
            'unknown';
  
  return `ip:${ip}`;
}

function getRateLimitRule(req: VercelRequest, max: number, windowMs: number) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  // Use authenticated limits if user is authenticated
  if (authHeader || apiKey) {
    return {
      identifier: 'authenticated',
      limit: config.rateLimiting.defaultLimits.authenticated.limit || max * 10,
      window: windowMs,
      type: 'user' as const
    };
  }
  
  // Use anonymous limits for unauthenticated requests
  return {
    identifier: 'anonymous',
    limit: config.rateLimiting.defaultLimits.anonymous.limit || max,
    window: windowMs,
    type: 'ip' as const
  };
}