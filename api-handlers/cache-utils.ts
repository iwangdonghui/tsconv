// Cache utilities and strategies for API responses

import { RedisClient } from './redis-client';
import { logDebug, logError, logWarn } from './utils/logger';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  REDIS_ENABLED?: string;
}

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  keyPrefix: string;
  enabled: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

interface HealthCheckStats {
  redis: unknown;
  cache: Record<string, CacheStats>;
}

interface HealthCheckResult {
  status: string;
  redis: boolean;
  stats: HealthCheckStats;
}

// Cache configurations for different types of data
export const CACHE_CONFIGS = {
  // API responses
  CONVERT_API: {
    ttl: 3600, // 1 hour
    keyPrefix: 'api:convert:',
    enabled: true,
  },
  NOW_API: {
    ttl: 60, // 1 minute (current time changes frequently)
    keyPrefix: 'api:now:',
    enabled: true,
  },
  HEALTH_API: {
    ttl: 300, // 5 minutes
    keyPrefix: 'api:health:',
    enabled: true,
  },

  // Static data
  TIMEZONES: {
    ttl: 86400, // 24 hours
    keyPrefix: 'data:timezones:',
    enabled: true,
  },
  FORMATS: {
    ttl: 86400, // 24 hours
    keyPrefix: 'data:formats:',
    enabled: true,
  },

  // User data
  USER_PREFERENCES: {
    ttl: 7200, // 2 hours
    keyPrefix: 'user:prefs:',
    enabled: true,
  },

  // Analytics
  STATS: {
    ttl: 1800, // 30 minutes
    keyPrefix: 'stats:',
    enabled: true,
  },
} as const;

export class CacheManager {
  private redis: RedisClient;
  private stats: Map<string, CacheStats>;

  constructor(env: Env) {
    this.redis = new RedisClient(env);
    this.stats = new Map();
  }

  // Generate cache key with proper prefix and normalization
  private generateKey(config: CacheConfig, identifier: string): string {
    // Normalize identifier to ensure consistent keys
    const normalized = identifier.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${config.keyPrefix}${normalized}`;
  }

  // Update cache statistics
  private updateStats(configKey: string, hit: boolean): void {
    const current = this.stats.get(configKey) || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
    };

    if (hit) {
      current.hits++;
    } else {
      current.misses++;
    }

    current.totalRequests = current.hits + current.misses;
    current.hitRate = current.totalRequests > 0 ? (current.hits / current.totalRequests) * 100 : 0;

    this.stats.set(configKey, current);
  }

  // Get cached data
  async get<T>(configKey: keyof typeof CACHE_CONFIGS, identifier: string): Promise<T | null> {
    const config = CACHE_CONFIGS[configKey];
    if (!config.enabled) return null;

    try {
      const key = this.generateKey(config, identifier);
      const cached = await this.redis.get(key);

      const hit = cached !== null;
      this.updateStats(configKey, hit);

      if (hit) {
        logDebug(`Cache HIT: ${key}`);
        return cached as T;
      } else {
        logDebug(`Cache MISS: ${key}`);
        return null;
      }
    } catch (error) {
      logError(
        `Cache GET error for ${configKey}`,
        error instanceof Error ? error : new Error(String(error))
      );
      this.updateStats(configKey, false);
      return null;
    }
  }

  // Set cached data
  async set<T>(
    configKey: keyof typeof CACHE_CONFIGS,
    identifier: string,
    data: T
  ): Promise<boolean> {
    const config = CACHE_CONFIGS[configKey];
    if (!config.enabled) return false;

    try {
      const key = this.generateKey(config, identifier);
      const success = await this.redis.set(key, data, config.ttl);

      if (success) {
        logDebug(`Cache SET: ${key} (TTL: ${config.ttl}s)`);
      }

      return success;
    } catch (error) {
      logError(
        `Cache SET error for ${configKey}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  // Delete cached data
  async del(configKey: keyof typeof CACHE_CONFIGS, identifier: string): Promise<boolean> {
    const config = CACHE_CONFIGS[configKey];

    try {
      const key = this.generateKey(config, identifier);
      const success = await this.redis.del(key);

      if (success) {
        logDebug(`Cache DEL: ${key}`);
      }

      return success;
    } catch (error) {
      logError(
        `Cache DEL error for ${configKey}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  // Cache wrapper for API functions
  async cached<T>(
    configKey: keyof typeof CACHE_CONFIGS,
    identifier: string,
    fetchFunction: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(configKey, identifier);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch data
    try {
      const data = await fetchFunction();

      // Cache the result (don't await to avoid blocking response)
      this.set(configKey, identifier, data).catch(error => {
        logError(
          `Background cache SET failed for ${configKey}`,
          error instanceof Error ? error : new Error(String(error))
        );
      });

      return data;
    } catch (error) {
      logError(
        `Fetch function failed for ${configKey}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // Increment counter (useful for rate limiting and analytics)
  async increment(configKey: keyof typeof CACHE_CONFIGS, identifier: string): Promise<number> {
    const config = CACHE_CONFIGS[configKey];
    const key = this.generateKey(config, identifier);

    try {
      const count = await this.redis.incr(key);
      // Set expiry if this is a new key
      if (count === 1) {
        await this.redis.expire(key, config.ttl);
      }
      return count;
    } catch (error) {
      logError(
        `Cache INCREMENT error for ${configKey}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return 1; // Fallback value
    }
  }

  // Get cache statistics
  getStats(): Record<string, CacheStats> {
    const result: Record<string, CacheStats> = {};
    for (const [key, stats] of this.stats.entries()) {
      result[key] = { ...stats };
    }
    return result;
  }

  // Get Redis client stats
  getRedisStats(): { enabled: boolean; type: string; size?: number } {
    return this.redis.getStats();
  }

  // Health check
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const redisPing = await this.redis.ping();
      const redisStats = this.redis.getStats();
      const cacheStats = this.getStats();

      return {
        status: redisPing ? 'healthy' : 'degraded',
        redis: redisPing,
        stats: {
          redis: redisStats,
          cache: cacheStats,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        redis: false,
        stats: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  // Clear all cache (useful for testing)
  async clearAll(): Promise<void> {
    logWarn('Clearing all cache statistics');
    this.stats.clear();
    // Note: We don't clear Redis here as it might affect other applications
  }
}
