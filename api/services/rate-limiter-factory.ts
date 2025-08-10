import { RateLimiter } from '../types/api';
import config from '../config/config';
import { MemoryRateLimiter } from './rate-limiter';

/**
 * Rate Limiter Factory - Creates appropriate rate limiter service based on environment configuration
 * Supports multiple rate limiter providers with fallback mechanisms
 */
export class RateLimiterFactory {
  private static instance: RateLimiter | null = null;

  /**
   * Creates and returns a rate limiter instance based on configuration
   * Uses singleton pattern to ensure consistent rate limiter instance across the application
   */
  static create(): RateLimiter {
    if (this.instance) {
      return this.instance;
    }

    // Check if rate limiting is enabled
    if (!config.rateLimiting.enabled) {
      console.log('🚫 Rate limiting disabled by configuration');
      this.instance = new DisabledRateLimiter();
      return this.instance;
    }

    // Determine rate limiter provider based on environment
    const rateLimiterProvider = this.determineRateLimiterProvider();

    try {
      this.instance = this.createRateLimiterService(rateLimiterProvider);
      console.log(`✅ Rate limiter service initialized: ${rateLimiterProvider}`);
      return this.instance;
    } catch (error) {
      console.warn(
        `⚠️ Failed to initialize ${rateLimiterProvider} rate limiter, falling back to memory rate limiter:`,
        error
      );
      this.instance = new MemoryRateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 100,
      });
      return this.instance;
    }
  }

  /**
   * Determines the appropriate rate limiter provider based on environment configuration
   */
  private static determineRateLimiterProvider(): 'upstash' | 'redis' | 'memory' {
    // Check for Upstash Redis configuration
    if (config.caching.redis.useUpstash && process.env.UPSTASH_REDIS_REST_URL) {
      return 'upstash';
    }

    // Check for standard Redis configuration
    if (process.env.USE_REDIS === 'true' && config.caching.redis.url) {
      return 'redis';
    }

    // Default to memory rate limiter
    return 'memory';
  }

  /**
   * Creates the appropriate rate limiter service instance
   */
  private static createRateLimiterService(provider: 'upstash' | 'redis' | 'memory'): RateLimiter {
    switch (provider) {
      case 'upstash':
        return this.createUpstashRateLimiter();

      case 'redis':
        return this.createRedisRateLimiter();

      case 'memory':
      default:
        return this.createMemoryRateLimiter();
    }
  }

  /**
   * Creates Upstash Redis rate limiter service
   */
  private static createUpstashRateLimiter(): RateLimiter {
    try {
      // Dynamic import to avoid loading Upstash dependencies if not needed
      const { UpstashRateLimiter } = require('./upstash-rate-limiter');
      return new UpstashRateLimiter();
    } catch (error) {
      console.warn('Failed to load Upstash rate limiter service:', error);
      throw error;
    }
  }

  /**
   * Creates standard Redis rate limiter service
   */
  private static createRedisRateLimiter(): RateLimiter {
    try {
      // Dynamic import to avoid loading Redis dependencies if not needed
      const { RedisRateLimiter } = require('./rate-limiter');
      return new RedisRateLimiter();
    } catch (error) {
      console.warn('Failed to load Redis rate limiter service:', error);
      throw error;
    }
  }

  /**
   * Creates memory rate limiter service
   */
  private static createMemoryRateLimiter(): RateLimiter {
    return new MemoryRateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    });
  }

  /**
   * Resets the singleton instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }

  /**
   * Gets the current rate limiter service instance without creating a new one
   */
  static getInstance(): RateLimiter | null {
    return this.instance;
  }

  /**
   * Creates a rate limiter service for a specific provider (bypasses singleton)
   * Useful for testing or specific use cases
   */
  static createSpecific(provider: 'upstash' | 'redis' | 'memory'): RateLimiter {
    return this.createRateLimiterService(provider);
  }

  /**
   * Validates rate limiter configuration and returns status
   */
  static validateConfiguration(): {
    valid: boolean;
    provider: string;
    issues: string[];
  } {
    const issues: string[] = [];
    let provider = 'memory';

    // Check rate limiting enabled
    if (!config.rateLimiting.enabled) {
      issues.push('Rate limiting is disabled in configuration');
      return { valid: false, provider: 'disabled', issues };
    }

    // Validate rate limiting rules
    if (!config.rateLimiting.rules || config.rateLimiting.rules.length === 0) {
      issues.push('No rate limiting rules configured');
    }

    // Validate default limits
    if (
      !config.rateLimiting.defaultLimits.anonymous ||
      !config.rateLimiting.defaultLimits.authenticated
    ) {
      issues.push('Default rate limits not properly configured');
    }

    // Validate Upstash configuration
    if (config.caching.redis.useUpstash) {
      if (!process.env.UPSTASH_REDIS_REST_URL) {
        issues.push('UPSTASH_REDIS_REST_URL environment variable is missing');
      }
      if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
        issues.push('UPSTASH_REDIS_REST_TOKEN environment variable is missing');
      }
      if (issues.length === 0) {
        provider = 'upstash';
      }
    }

    // Validate Redis configuration
    if (process.env.USE_REDIS === 'true') {
      if (!config.caching.redis.url) {
        issues.push('Redis URL is not configured');
      }
      if (issues.length === 0) {
        provider = 'redis';
      }
    }

    return {
      valid: issues.length === 0,
      provider,
      issues,
    };
  }

  /**
   * Gets rate limiter configuration summary
   */
  static getConfigurationSummary(): {
    enabled: boolean;
    provider: string;
    rules: number;
    defaultLimits: {
      anonymous: { limit: number; window: number };
      authenticated: { limit: number; window: number };
    };
    redisConfig: {
      url?: string;
      useUpstash: boolean;
      fallbackToMemory: boolean;
    };
  } {
    return {
      enabled: config.rateLimiting.enabled,
      provider: this.determineRateLimiterProvider(),
      rules: config.rateLimiting.rules.length,
      defaultLimits: {
        anonymous: {
          limit: config.rateLimiting.defaultLimits.anonymous.limit,
          window: config.rateLimiting.defaultLimits.anonymous.window,
        },
        authenticated: {
          limit: config.rateLimiting.defaultLimits.authenticated.limit,
          window: config.rateLimiting.defaultLimits.authenticated.window,
        },
      },
      redisConfig: {
        url: config.caching.redis.url ? '[CONFIGURED]' : undefined,
        useUpstash: config.caching.redis.useUpstash ?? false,
        fallbackToMemory: config.caching.redis.fallbackToMemory ?? false,
      },
    };
  }

  /**
   * Performs health check on the rate limiter service
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    provider: string;
    responseTime: number;
    details: any;
  }> {
    const startTime = Date.now();
    const rateLimiter = this.create();
    const testRule = config.rateLimiting.defaultLimits.anonymous;
    const testIdentifier = 'health-check';

    try {
      const result = await rateLimiter.checkLimit(testIdentifier, testRule);
      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (responseTime > 200) {
        status = 'unhealthy';
      } else if (responseTime > 50) {
        status = 'degraded';
      }

      return {
        status,
        provider: this.determineRateLimiterProvider(),
        responseTime,
        details: {
          testResult: result,
          rules: config.rateLimiting.rules.length,
          enabled: config.rateLimiting.enabled,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: this.determineRateLimiterProvider(),
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          rules: config.rateLimiting.rules.length,
          enabled: config.rateLimiting.enabled,
        },
      };
    }
  }
}

/**
 * Disabled rate limiter that allows all requests
 * Used when rate limiting is disabled in configuration
 */
class DisabledRateLimiter implements RateLimiter {
  async checkLimit(): Promise<import('../types/api').RateLimitResult> {
    return {
      allowed: true,
      remaining: Infinity,
      resetTime: Date.now() + 60000,
      totalLimit: Infinity,
    };
  }

  async increment(): Promise<import('../types/api').RateLimitResult> {
    return {
      allowed: true,
      remaining: Infinity,
      resetTime: Date.now() + 60000,
      totalLimit: Infinity,
    };
  }

  async reset(): Promise<void> {
    // No-op for disabled rate limiter
  }

  async getStats(identifier: string): Promise<import('../types/api').RateLimitStats> {
    return {
      identifier,
      currentCount: 0,
      limit: Infinity,
      window: 60000,
      resetTime: Date.now() + 60000,
    };
  }
}

/**
 * Convenience function to get rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  return RateLimiterFactory.create();
}

/**
 * Gets rate limiter health information
 */
export async function getRateLimiterHealth(): Promise<{
  status: 'healthy' | 'unhealthy' | 'degraded';
  provider: string;
  responseTime?: number;
  error?: string;
  details?: any;
}> {
  try {
    const healthResult = await RateLimiterFactory.healthCheck();
    return {
      status: healthResult.status,
      provider: healthResult.provider,
      responseTime: healthResult.responseTime,
      details: healthResult.details,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      provider: RateLimiterFactory.getConfigurationSummary().provider,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export default factory instance for convenience
export default RateLimiterFactory;

// Export individual rate limiter classes for direct use if needed
export { MemoryRateLimiter } from './rate-limiter';

// Re-export types for convenience
export type { RateLimiter, RateLimitRule, RateLimitResult, RateLimitStats } from '../types/api';

// Utility functions for rate limiting
export function getClientIdentifier(req: any): string {
  // Try to get identifier from headers (for authenticated requests)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return `user:${authHeader.split(' ')[1] || 'anonymous'}`;
  }

  // Try API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return `api:${apiKey}`;
  }

  // Fallback to IP address
  const ip =
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';

  return `ip:${ip.toString().split(',')[0].trim()}`;
}

export function getRateLimitRule(req: any): import('../types/api').RateLimitRule {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader || apiKey) {
    return config.rateLimiting.defaultLimits.authenticated;
  }

  return config.rateLimiting.defaultLimits.anonymous;
}

/**
 * Middleware helper for applying rate limiting to requests
 */
export async function applyRateLimit(
  req: any,
  identifier?: string,
  rule?: import('../types/api').RateLimitRule
): Promise<{
  allowed: boolean;
  result: import('../types/api').RateLimitResult;
}> {
  const rateLimiter = RateLimiterFactory.create();
  const clientId = identifier || getClientIdentifier(req);
  const limitRule = rule || getRateLimitRule(req);

  const result = await rateLimiter.increment(clientId, limitRule);

  return {
    allowed: result.allowed,
    result,
  };
}

/**
 * Creates rate limit headers for HTTP responses
 */
export function createRateLimitHeaders(
  result: import('../types/api').RateLimitResult
): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.totalLimit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'X-RateLimit-Window': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
  };
}
