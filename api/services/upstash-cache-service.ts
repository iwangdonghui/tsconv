import { Redis } from '@upstash/redis';
import config from '../config/config';
import { CacheService, CacheStats, CacheableRequest } from '../types/api';
import { MemoryCacheService } from './cache-service';

class UpstashCacheService implements CacheService {
  private redis: Redis;
  private fallbackCache: MemoryCacheService;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;
  private cacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };

  constructor() {
    // Initialize Upstash Redis client
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || config.caching.redis.url,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || config.caching.redis.password,
    });

    // Initialize fallback memory cache
    this.fallbackCache = new MemoryCacheService();

    // Test connection on initialization
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.redis.ping();
      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log('✅ Upstash Redis connection established');
    } catch (error) {
      this.connectionAttempts++;
      this.isConnected = false;
      console.warn(
        `⚠️ Upstash Redis connection failed (attempt ${this.connectionAttempts}):`,
        error
      );

      // Retry connection with exponential backoff
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        const delay = Math.pow(2, this.connectionAttempts) * 1000; // 2s, 4s, 8s
        setTimeout(() => this.testConnection(), delay);
      } else {
        console.warn('🔄 Falling back to memory cache after max connection attempts');
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isConnected) {
        const result = await this.redis.get(key);
        if (result !== null) {
          this.cacheStats.hits++;
          return result as T;
        } else {
          this.cacheStats.misses++;
          return null;
        }
      }
    } catch (error) {
      console.warn('Redis get error, falling back to memory cache:', error);
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect
    }

    // Fallback to memory cache
    return this.fallbackCache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl: number = config.caching.defaultTTL): Promise<void> {
    try {
      if (this.isConnected) {
        // Convert TTL from milliseconds to seconds for Redis
        const ttlSeconds = Math.ceil(ttl / 1000);
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        this.cacheStats.sets++;
        return;
      }
    } catch (error) {
      console.warn('Redis set error, falling back to memory cache:', error);
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect
    }

    // Fallback to memory cache
    return this.fallbackCache.set<T>(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    try {
      if (this.isConnected) {
        await this.redis.del(key);
        this.cacheStats.deletes++;
        return;
      }
    } catch (error) {
      console.warn('Redis del error, falling back to memory cache:', error);
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect
    }

    // Fallback to memory cache
    return this.fallbackCache.del(key);
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.isConnected) {
        const result = await this.redis.exists(key);
        return result === 1;
      }
    } catch (error) {
      console.warn('Redis exists error, falling back to memory cache:', error);
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect
    }

    // Fallback to memory cache
    return this.fallbackCache.exists(key);
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (this.isConnected) {
        if (pattern) {
          // Use SCAN to find keys matching pattern
          const keys = await this.scanKeys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          // Clear all keys (use with caution in production)
          await this.redis.flushdb();
        }
        return;
      }
    } catch (error) {
      console.warn('Redis clear error, falling back to memory cache:', error);
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect
    }

    // Fallback to memory cache
    return this.fallbackCache.clear(pattern);
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;

    do {
      const result = await this.redis.scan(cursor, { match: pattern, count: 100 });
      cursor = parseInt(String(result[0]));
      keys.push(...result[1]);
    } while (cursor !== 0);

    return keys;
  }

  async stats(): Promise<CacheStats> {
    try {
      if (this.isConnected) {
        // Get Redis info and key count
        // Upstash doesn't have info(), use dbsize instead
        const dbsize = await this.redis.dbsize();

        // Memory info not available in Upstash
        // const __memoryUsed = 0; // Not available in Upstash

        // Get sample keys for debugging
        const sampleKeys = await this.scanKeys('*');

        return {
          hits: this.cacheStats.hits,
          misses: this.cacheStats.misses,
          size: dbsize,
          keys: sampleKeys.slice(0, 100), // Limit to first 100 keys
        };
      }
    } catch (error) {
      console.warn('Redis stats error, falling back to memory cache:', error);
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect
    }

    // Fallback to memory cache stats
    return this.fallbackCache.stats();
  }

  async healthCheck(): Promise<{ status: string; type: string; details: any }> {
    try {
      if (this.isConnected) {
        const pingResult = await this.redis.ping();
        // Upstash doesn't have info(), use ping instead
        await this.redis.ping();

        return {
          status: 'healthy',
          type: 'upstash-redis',
          details: {
            connection: 'active',
            ping: pingResult,
            fallbackAvailable: true,
            connectionAttempts: this.connectionAttempts,
            serverInfo: 'Upstash Redis (info not available)', // Upstash doesn't support info command
            stats: {
              hits: this.cacheStats.hits,
              misses: this.cacheStats.misses,
              sets: this.cacheStats.sets,
              deletes: this.cacheStats.deletes,
              hitRatio: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses || 1),
            },
          },
        };
      } else {
        // Return fallback cache health with Redis status
        const fallbackHealth = await this.fallbackCache.healthCheck();
        return {
          status: 'degraded',
          type: 'memory-fallback',
          details: {
            ...fallbackHealth.details,
            redisStatus: 'disconnected',
            connectionAttempts: this.connectionAttempts,
            fallbackReason: 'Redis connection failed',
          },
        };
      }
    } catch (error) {
      this.isConnected = false;
      this.testConnection(); // Attempt to reconnect

      return {
        status: 'unhealthy',
        type: 'upstash-redis',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connectionAttempts: this.connectionAttempts,
          fallbackAvailable: true,
        },
      };
    }
  }

  generateKey(request: CacheableRequest): string {
    // Use the same key generation logic as the memory cache
    return this.fallbackCache.generateKey(request);
  }

  // Additional Upstash-specific methods
  async getConnectionStatus(): Promise<{
    connected: boolean;
    attempts: number;
    lastError?: string;
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

  // Batch operations for better performance
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (this.isConnected && keys.length > 0) {
        const results = await this.redis.mget(...keys);
        return results.map(result => {
          if (result !== null) {
            this.cacheStats.hits++;
            return result as T;
          } else {
            this.cacheStats.misses++;
            return null;
          }
        });
      }
    } catch (error) {
      console.warn('Redis mget error, falling back to individual gets:', error);
      this.isConnected = false;
      this.testConnection();
    }

    // Fallback to individual gets
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    try {
      if (this.isConnected && keyValuePairs.length > 0) {
        // Use pipeline for better performance
        const pipeline = this.redis.pipeline();

        for (const { key, value, ttl = config.caching.defaultTTL } of keyValuePairs) {
          const ttlSeconds = Math.ceil(ttl / 1000);
          pipeline.setex(key, ttlSeconds, JSON.stringify(value));
        }

        await pipeline.exec();
        this.cacheStats.sets += keyValuePairs.length;
        return;
      }
    } catch (error) {
      console.warn('Redis mset error, falling back to individual sets:', error);
      this.isConnected = false;
      this.testConnection();
    }

    // Fallback to individual sets
    await Promise.all(keyValuePairs.map(({ key, value, ttl }) => this.set(key, value, ttl)));
  }
}

export { UpstashCacheService };
export default UpstashCacheService;
