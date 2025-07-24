import { RateLimiter, RateLimitRule, RateLimitResult, RateLimitStats } from '../types/api';
import config from '../config/config';

class MemoryRateLimiter implements RateLimiter {
  private storage = new Map<string, { count: number; resetTime: number }>();
  private stats = new Map<string, RateLimitStats>();

  async checkLimit(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const key = this.getStorageKey(identifier, rule);
    const now = Date.now();
    const rateLimitWindowStart = Math.floor(now / rule.window) * rule.window;
    const nextResetTime = rateLimitWindowStart + rule.window;

    const entry = this.storage.get(key);
    
    let currentCount = 0;
    if (entry && entry.resetTime === rateLimitWindowStart) {
      currentCount = entry.count;
    }

    const remaining = Math.max(0, rule.limit - currentCount);
    const allowed = currentCount < rule.limit;

    return {
      allowed,
      remaining,
      resetTime: nextResetTime,
      totalLimit: rule.limit
    };
  }

  async increment(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const key = this.getStorageKey(identifier, rule);
    const now = Date.now();
    const rateLimitWindowStart = Math.floor(now / rule.window) * rule.window;
    const nextResetTime = rateLimitWindowStart + rule.window;

    let entry = this.storage.get(key);
    
    if (!entry || entry.resetTime !== rateLimitWindowStart) {
      entry = { count: 0, resetTime: rateLimitWindowStart };
      this.storage.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, rule.limit - entry.count);
    const allowed = entry.count <= rule.limit;

    // Update stats
    this.stats.set(identifier, {
      identifier,
      currentCount: entry.count,
      limit: rule.limit,
      window: rule.window,
      resetTime: nextResetTime
    });

    return {
      allowed,
      remaining,
      resetTime: nextResetTime,
      totalLimit: rule.limit
    };
  }

  async reset(identifier: string, rule: RateLimitRule): Promise<void> {
    const key = this.getStorageKey(identifier, rule);
    this.storage.delete(key);
    this.stats.delete(identifier);
  }

  async getStats(identifier: string): Promise<RateLimitStats> {
    const stats = this.stats.get(identifier);
    if (stats) return stats;

    return {
      identifier,
      currentCount: 0,
      limit: 0,
      window: 0,
      resetTime: Date.now()
    };
  }

  private getStorageKey(identifier: string, rule: RateLimitRule): string {
    const windowStart = Math.floor(Date.now() / rule.window) * rule.window;
    return `rate_limit:${rule.type}:${identifier}:${windowStart}`;
  }

  // Clean up old entries to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Convert iterator to array to avoid downlevelIteration issues
    const entries = Array.from(this.storage.entries());
    
    for (const [key, entry] of entries) {
      if (now > entry.resetTime + entry.resetTime) { // Clean up old windows
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.storage.delete(key);
    }
  }
}

// Redis-based rate limiter (placeholder for when Redis is available)
class RedisRateLimiter implements RateLimiter {
  private redis: any; // Redis client would be initialized here
  private connected: boolean = false;

  async checkLimit(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    if (!this.connected) return this.getUnlimitedResult(rule);
    
    const key = this.getRedisKey(identifier, rule);
    const now = Date.now();
    const windowStart = Math.floor(now / rule.window) * rule.window;
    const nextResetTime = windowStart + rule.window;

    try {
      const multi = this.redis.multi();
      multi.multi();
      multi.zremrangebyscore(key, 0, windowStart - 1);
      multi.zcard(key);
      multi.expire(key, Math.ceil(rule.window / 1000));
      const results = await multi.exec();

      const currentCount = results[1][1] || 0;
      const remaining = Math.max(0, rule.limit - currentCount);
      const allowed = currentCount < rule.limit;

      return {
        allowed,
        remaining,
        resetTime: nextResetTime,
        totalLimit: rule.limit
      };
    } catch (error) {
      console.warn('Redis rate limit check error:', error);
      return this.getUnlimitedResult(rule);
    }
  }

  async increment(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    if (!this.connected) return this.getUnlimitedResult(rule);

    const key = this.getRedisKey(identifier, rule);
    const now = Date.now();
    const windowStart = Math.floor(now / rule.window) * rule.window;
    const nextResetTime = windowStart + rule.window;

    try {
      const multi = this.redis.multi();
      multi.multi();
      multi.zremrangebyscore(key, 0, windowStart - 1);
      multi.zadd(key, now, now);
      multi.zcard(key);
      multi.expire(key, Math.ceil(rule.window / 1000));
      const results = await multi.exec();

      const currentCount = results[2][1] || 0;
      const remaining = Math.max(0, rule.limit - currentCount);
      const allowed = currentCount <= rule.limit;

      return {
        allowed,
        remaining,
        resetTime: nextResetTime,
        totalLimit: rule.limit
      };
    } catch (error) {
      console.warn('Redis rate limit increment error:', error);
      return this.getUnlimitedResult(rule);
    }
  }

  async reset(identifier: string, rule: RateLimitRule): Promise<void> {
    if (!this.connected) return;

    const key = this.getRedisKey(identifier, rule);
    try {
      await this.redis.del(key);
    } catch (error) {
      console.warn('Redis rate limit reset error:', error);
    }
  }

  async getStats(identifier: string): Promise<RateLimitStats> {
    if (!this.connected) return this.getEmptyStats(identifier);

    const rule = config.rateLimiting.defaultLimits.anonymous; // Default rule for stats
    const key = this.getRedisKey(identifier, rule);
    const now = Date.now();
    const windowStart = Math.floor(now / rule.window) * rule.window;
    const nextResetTime = windowStart + rule.window;

    try {
      const multi = this.redis.multi();
      multi.zremrangebyscore(key, 0, windowStart - 1);
      multi.zcard(key);
      const results = await multi.exec();

      const currentCount = results[1][1] || 0;

      return {
        identifier,
        currentCount,
        limit: rule.limit,
        window: rule.window,
        resetTime: nextResetTime
      };
    } catch (error) {
      console.warn('Redis rate limit stats error:', error);
      return this.getEmptyStats(identifier);
    }
  }

  private getRedisKey(identifier: string, rule: RateLimitRule): string {
    const windowStart = Math.floor(Date.now() / rule.window) * rule.window;
    return `rate_limit:${rule.type}:${identifier}:${windowStart}`;
  }

  private getUnlimitedResult(rule: RateLimitRule): RateLimitResult {
    return {
      allowed: true,
      remaining: rule.limit,
      resetTime: Date.now() + rule.window,
      totalLimit: rule.limit
    };
  }

  private getEmptyStats(identifier: string): RateLimitStats {
    return {
      identifier,
      currentCount: 0,
      limit: 0,
      window: 0,
      resetTime: Date.now()
    };
  }
}

// Factory to create appropriate rate limiter based on configuration
export class RateLimiterFactory {
  static create(): RateLimiter {
    if (config.rateLimiting.enabled) {
      // In production, check for Redis configuration
      if (config.caching.redis.url) {
        try {
          return new RedisRateLimiter();
        } catch (error) {
          console.warn('Failed to initialize Redis rate limiter, falling back to memory limiter:', error);
          return new MemoryRateLimiter();
        }
      }
    }
    return new MemoryRateLimiter();
  }
}

// Utility functions for rate limiting
export function getClientIdentifier(req: any): string {
  // Try to get identifier from headers (for authenticated requests)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return `user:${authHeader.split(' ')[1] || 'anonymous'}`;
  }

  // Fallback to IP address
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  return `ip:${ip.toString().split(',')[0].trim()}`;
}

export function getRateLimitRule(req: any): RateLimitRule {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  if (authHeader || apiKey) {
    return config.rateLimiting.defaultLimits.authenticated;
  }
  
  return config.rateLimiting.defaultLimits.anonymous;
}

// Health check for rate limiting service
export async function rateLimitingHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  rules: RateLimitRule[];
}> {
  const startTime = Date.now();
  const limiter = RateLimiterFactory.create();
  const testRule = config.rateLimiting.defaultLimits.anonymous;
  const testIdentifier = 'health-check';

  try {
    await limiter.checkLimit(testIdentifier, testRule);
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 50 ? 'healthy' : responseTime < 200 ? 'degraded' : 'unhealthy',
      responseTime,
      rules: config.rateLimiting.rules
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      rules: config.rateLimiting.rules
    };
  }
}

// Start cleanup interval for memory rate limiter
if (RateLimiterFactory.create() instanceof MemoryRateLimiter) {
  const memoryLimiter = RateLimiterFactory.create();
  setInterval(() => {
    if (memoryLimiter instanceof MemoryRateLimiter) {
      memoryLimiter.cleanup();
    }
  }, 60000); // Cleanup every minute
}

// Export classes for direct use
export { MemoryRateLimiter };

// Factory class for creating rate limiters
export class RateLimiterFactory {
  static create(): RateLimiter {
    if (config.rateLimiting.enabled) {
      // In production, check for Redis configuration
      if (config.caching.redis.url) {
        try {
          return new RedisRateLimiter();
        } catch (error) {
          console.warn('Failed to initialize Redis rate limiter, falling back to memory limiter:', error);
          return new MemoryRateLimiter();
        }
      }
    }
    return new MemoryRateLimiter();
  }
}

// For backward compatibility, export a default instance
// In production, use the rate-limiter-factory.ts instead
export const rateLimiter = RateLimiterFactory.create();
export default rateLimiter;