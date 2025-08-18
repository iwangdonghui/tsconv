// Security middleware and utilities

import { CacheManager } from './cache-utils';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  REDIS_ENABLED?: string;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (request: Request) => string;
}

interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
}

export class SecurityManager {
  private cacheManager: CacheManager;

  constructor(_env: Env) {
    this.cacheManager = new CacheManager(_env);
  }

  // Rate limiting middleware
  async checkRateLimit(
    request: Request,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const key = config.keyGenerator(_request);
      const now = Date.now();
      const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
      const rateLimitKey = `rate_limit:${key}:${windowStart}`;

      // Get current count
      const currentCount = (await this.cacheManager.get('STATS', rateLimitKey)) || 0;

      if (currentCount >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowStart + config.windowMs,
        };
      }

      // Increment counter
      await this.cacheManager.increment('STATS', rateLimitKey);

      // Set expiry for the key (cleanup)
      const _ttl = Math.ceil((windowStart + config.windowMs - now) / 1000);
      // Note: We should set TTL here, but our current cache implementation doesn't support it easily

      return {
        allowed: true,
        remaining: config.maxRequests - currentCount - 1,
        resetTime: windowStart + config.windowMs,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: Date.now() + config.windowMs,
      };
    }
  }

  // Generate rate limit key based on IP and endpoint
  generateRateLimitKey(request: Request): string {
    const url = new URL(request.url);
    const ip =
      request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For') ||
      'unknown';
    const endpoint = url.pathname;
    return `${ip}:${endpoint}`;
  }

  // Check for suspicious activity
  async checkSuspiciousActivity(
    request: Request
  ): Promise<{ suspicious: boolean; reason?: string }> {
    try {
      const userAgent = request.headers.get('User-Agent') || '';
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

      // Check for common bot patterns
      const botPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python-requests/i,
      ];

      const isBot = botPatterns.some(pattern => pattern.test(userAgent));

      // Check for suspicious IP patterns (this is basic - in production you'd use threat intelligence)
      const suspiciousIPs = ['127.0.0.1']; // Add known bad IPs
      const isSuspiciousIP = suspiciousIPs.includes(ip);

      // Check request frequency from this IP
      const recentRequestCount = await this.getRecentRequestCount(ip);
      const isHighFrequency = recentRequestCount > 100; // More than 100 requests in last minute

      if (isBot && isHighFrequency) {
        return { suspicious: true, reason: 'High frequency bot traffic' };
      }

      if (isSuspiciousIP) {
        return { suspicious: true, reason: 'Suspicious IP address' };
      }

      return { suspicious: false };
    } catch (error) {
      console.error('Suspicious activity check failed:', error);
      return { suspicious: false };
    }
  }

  // Get security headers
  getSecurityHeaders(): SecurityHeaders {
    return {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    };
  }

  // CORS configuration
  getCORSHeaders(origin?: string): Record<string, string> {
    const allowedOrigins = [
      'https://tsconv.com',
      'https://www.tsconv.com',
      'http://localhost:3000',
      'http://localhost:5173',
    ];

    const isAllowedOrigin = origin && allowedOrigins.includes(origin);

    return {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://tsconv.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'false',
    };
  }

  // Validate request input
  validateInput(input: any, rules: ValidationRules): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = input[field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rule.type && typeof value !== rule.type) {
          errors.push(`${field} must be of type ${rule.type}`);
        }

        if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`);
        }

        if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
          errors.push(`${field} must be no more than ${rule.maxLength} characters`);
        }

        if (rule.min && typeof value === 'number' && value < rule.min) {
          errors.push(`${field} must be at least ${rule.min}`);
        }

        if (rule.max && typeof value === 'number' && value > rule.max) {
          errors.push(`${field} must be no more than ${rule.max}`);
        }

        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Log security event
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const securityLog = {
        ...event,
        timestamp: new Date().toISOString(),
      };

      // Store in recent security events
      const recentEvents = (await this.cacheManager.get('STATS', 'security_events')) || [];
      recentEvents.unshift(securityLog);

      // Keep only last 1000 events
      await this.cacheManager.set('STATS', 'security_events', recentEvents.slice(0, 1000));

      // Increment security event counters
      const today = new Date().toISOString().split('T')[0];
      await this.cacheManager.increment('STATS', `security:daily:${today}:${event.type}`);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Get recent request count for IP
  private async getRecentRequestCount(ip: string): Promise<number> {
    try {
      const now = Date.now();
      const _oneMinuteAgo = now - 60000; // 1 minute ago
      const key = `ip_requests:${ip}:${Math.floor(now / 60000)}`; // Per minute bucket

      return (await this.cacheManager.get('STATS', key)) || 0;
    } catch (error) {
      console.error('Failed to get recent request count:', error);
      return 0;
    }
  }
}

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  API_GENERAL: {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyGenerator: (request: Request) => {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      return `general:${ip}`;
    },
  },
  API_CONVERT: {
    windowMs: 60000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    keyGenerator: (request: Request) => {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      return `convert:${ip}`;
    },
  },
  API_ADMIN: {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    keyGenerator: (request: Request) => {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      return `admin:${ip}`;
    },
  },
} as const;

// Validation rules interface
interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

interface ValidationRules {
  [field: string]: ValidationRule;
}

// Security event interface
interface SecurityEvent {
  type: 'rate_limit_exceeded' | 'suspicious_activity' | 'invalid_input' | 'unauthorized_access';
  ip: string;
  userAgent?: string;
  endpoint: string;
  details?: any;
}
