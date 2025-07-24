import { Redis } from '@upstash/redis';
import { RateLimiter, RateLimitRule, RateLimitResult, RateLimitStats } from '../types/api';
import config from '../config/config';
import { MemoryRateLimiter } from '../rate-limiter';

class UpstashRateLimiter implements RateLimiter {
  private redis: Redis;
  private fallbackLimiter: MemoryRateLimiter;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;

  constructor() {
    // Initialize Upstash Redis client
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || config.caching.redis.url,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || config.caching.redis.password,
    });
    
    // Initialize fallback memory rate limiter
    this.fallbackLimiter = new MemoryRateLimiter();
    
    // Test connection on initialization
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.redis.ping();
      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log('✅ Upstash Redis rate limiter connection established');
    } catch (error) {
      this.connectionAttempts++;
      this.isConnected = false;
      console.warn(`⚠️ Upstash Redis rate limiter connection failed (attempt ${this.connectionAttempts}):`, error);
      
      // Retry connection with exponential backoff
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        const delay = Math.pow(2, this.connectionAttempts) * 1000; // 2s, 4s, 8s
        setTimeout(() => this.testConnection(), delay);
      } else {
        console.warn('🔄 Rate limiter falling back to memory after max connection attempts');
      }
    }
  }

  async checkLimit(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    try {
      if (this.isConnected) {
        return await this.checkLimitRedis(identifier, rule);
      }
    } catch (error) {
      console.warn('Redis rate limit check error, falling back to memory:', error);
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect
    }
    
    // Fallback to memory rate limiter
    return this.fallbackLimiter.checkLimit(identifier, rule);
  }

  async increment(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    try {
      if (this.isConnected) {
        return await this.incrementRedis(identifier, rule);
      }
    } catch (error) {
      console.warn('Redis rate limit increment error, falling back to memory:', error);
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect
    }
    
    // Fallback to memory rate limiter
    return this.fallbackLimiter.increment(identifier, rule);
  }

  private async checkLimitRedis(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const key = this.getRedisKey(identifier, rule);
    const now = Date.now();
    const windowStart = Math.floor(now / rule.window) * rule.window;
    const nextResetTime = windowStart + rule.window;

    // Use sliding window with sorted sets
    const pipeline = this.redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart - 1);
    
    // Count current entries
    pipeline.zcard(key);
    
    // Set expiration for the key
    pipeline.expire(key, Math.ceil(rule.window / 1000));
    
    const results = await pipeline.exec();
    
    if (!results || results.length < 2) {
      throw new Error('Invalid pipeline results');
    }

    const currentCount = (results[1] as any)?.[1] || 0;
    const remaining = Math.max(0, rule.limit - currentCount);
    const allowed = currentCount < rule.limit;

    return {
      allowed,
      remaining,
      resetTime: nextResetTime,
      totalLimit: rule.limit
    };
  }

  private async incrementRedis(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const key = this.getRedisKey(identifier, rule);
    const now = Date.now();
    const windowStart = Math.floor(now / rule.window) * rule.window;
    const nextResetTime = windowStart + rule.window;

    // Use sliding window with sorted sets
    const pipeline = this.redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart - 1);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Count current entries
    pipeline.zcard(key);
    
    // Set expiration for the key
    pipeline.expire(key, Math.ceil(rule.window / 1000));
    
    const results = await pipeline.exec();
    
    if (!results || results.length < 3) {
      throw new Error('Invalid pipeline results');
    }

    const currentCount = (results[2] as any)?.[1] || 0;
    const remaining = Math.max(0, rule.limit - currentCount);
    const allowed = currentCount <= rule.limit;

    return {
      allowed,
      remaining,
      resetTime: nextResetTime,
      totalLimit: rule.limit
    };
  }

  async reset(identifier: string, rule: RateLimitRule): Promise<void> {
    try {
      if (this.isConnected) {
        const key = this.getRedisKey(identifier, rule);
        await this.redis.del(key);
        return;
      }
    } catch (error) {
      console.warn('Redis rate limit reset error, falling back to memory:', error);
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect
    }
    
    // Fallback to memory rate limiter
    return this.fallbackLimiter.reset(identifier, rule);
  }

  async getStats(identifier: string): Promise<RateLimitStats> {
    try {
      if (this.isConnected) {
        const rule = config.rateLimiting.defaultLimits.anonymous; // Default rule for stats
        const key = this.getRedisKey(identifier, rule);
        const now = Date.now();
        const windowStart = Math.floor(now / rule.window) * rule.window;
        const nextResetTime = windowStart + rule.window;

        // Remove expired entries and count current ones
        const pipeline = this.redis.pipeline();
        pipeline.zremrangebyscore(key, 0, windowStart - 1);
        pipeline.zcard(key);
        
        const results = await pipeline.exec();
        const currentCount = (results?.[1] as any)?.[1] || 0;

        return {
          identifier,
          currentCount,
          limit: rule.limit,
          window: rule.window,
          resetTime: nextResetTime
        };
      }
    } catch (error) {
      console.warn('Redis rate limit stats error, falling back to memory:', error);
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect
    }
    
    // Fallback to memory rate limiter
    return this.fallbackLimiter.getStats(identifier);
  }

  private getRedisKey(identifier: string, rule: RateLimitRule): string {
    const windowStart = Math.floor(Date.now() / rule.window) * rule.window;
    return `rate_limit:${rule.type}:${identifier}:${windowStart}`;
  }

  // Additional methods for monitoring and management
  async getConnectionStatus(): Promise<{
    connected: boolean;
    attempts: number;
  }> {
    return {
      connected: this.isConnected,
      attempts: this.connectionAttempts,
    };
  }

  async forceReconnect(): Promise<void> {
    this.connectionAttempts = 0;
    await this.testConnection();
  }

  async healthCheck(): Promise<{ status: string; type: string; details: any }> {
    try {
      if (this.isConnected) {
        const pingResult = await this.redis.ping();
        
        return {
          status: 'healthy',
          type: 'upstash-redis-rate-limiter',
          details: {
            connection: 'active',
            ping: pingResult,
            fallbackAvailable: true,
            connectionAttempts: this.connectionAttempts
          }
        };
      } else {
        return {
          status: 'degraded',
          type: 'memory-fallback-rate-limiter',
          details: {
            redisStatus: 'disconnected',
            connectionAttempts: this.connectionAttempts,
            fallbackReason: 'Redis connection failed',
            fallbackActive: true
          }
        };
      }
    } catch (error) {
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect
      
      return {
        status: 'unhealthy',
        type: 'upstash-redis-rate-limiter',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connectionAttempts: this.connectionAttempts,
          fallbackAvailable: true
        }
      };
    }
  }

  // Batch operations for better performance
  async checkMultipleLimits(
    requests: Array<{ identifier: string; rule: RateLimitRule }>
  ): Promise<RateLimitResult[]> {
    if (!this.isConnected || requests.length === 0) {
      // Fallback to individual checks
      return Promise.all(
        requests.map(({ identifier, rule }) => this.checkLimit(identifier, rule))
      );
    }

    try {
      const pipeline = this.redis.pipeline();
      const now = Date.now();
      
      // Build pipeline for all requests
      for (const { identifier, rule } of requests) {
        const key = this.getRedisKey(identifier, rule);
        const windowStart = Math.floor(now / rule.window) * rule.window;
        
        pipeline.zremrangebyscore(key, 0, windowStart - 1);
        pipeline.zcard(key);
        pipeline.expire(key, Math.ceil(rule.window / 1000));
      }
      
      const results = await pipeline.exec();
      
      // Process results
      const rateLimitResults: RateLimitResult[] = [];
      
      for (let i = 0; i < requests.length; i++) {
        const { rule } = requests[i];
        const resultIndex = i * 3 + 1; // Each request has 3 operations, we want the zcard result
        const currentCount = (results?.[resultIndex] as any)?.[1] || 0;
        
        const windowStart = Math.floor(now / rule.window) * rule.window;
        const nextResetTime = windowStart + rule.window;
        const remaining = Math.max(0, rule.limit - currentCount);
        const allowed = currentCount < rule.limit;
        
        rateLimitResults.push({
          allowed,
          remaining,
          resetTime: nextResetTime,
          totalLimit: rule.limit
        });
      }
      
      return rateLimitResults;
    } catch (error) {
      console.warn('Redis batch rate limit check error, falling back to individual checks:', error);
      this.isConnected = false;
      this.testConnection();
      
      // Fallback to individual checks
      return Promise.all(
        requests.map(({ identifier, rule }) => this.checkLimit(identifier, rule))
      );
    }
  }

  // Cleanup method for maintenance
  async cleanup(): Promise<void> {
    try {
      if (this.isConnected) {
        // Find and clean up expired rate limit keys
        const pattern = 'rate_limit:*';
        const keys = await this.scanKeys(pattern);
        
        if (keys.length > 0) {
          const now = Date.now();
          const pipeline = this.redis.pipeline();
          
          for (const key of keys) {
            // Extract window start from key and check if expired
            const parts = key.split(':');
            if (parts.length >= 4) {
              const windowStart = parseInt(parts[3]);
              const windowSize = 60000; // Default 1 minute, should be configurable
              
              if (now > windowStart + windowSize * 2) { // Clean up keys older than 2 windows
                pipeline.del(key);
              }
            }
          }
          
          await pipeline.exec();
        }
      }
    } catch (error) {
      console.warn('Redis rate limiter cleanup error:', error);
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;
    
    do {
      const result = await this.redis.scan(cursor, { match: pattern, count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== 0);
    
    return keys;
  }
}

// Export the memory rate limiter class for fallback
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

  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    const entries = Array.from(this.storage.entries());
    
    for (const [key, entry] of entries) {
      if (now > entry.resetTime + entry.resetTime) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.storage.delete(key);
    }
  }
}

export { UpstashRateLimiter, MemoryRateLimiter };