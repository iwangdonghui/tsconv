/**
import { logError, logWarn, logInfo } from '../../api-handlers/utils/logger';

 * Redis-based cache service implementation
 * This service uses Redis for caching instead of in-memory storage
 */

import config from '../config/config';
import { CacheService, CacheStats, CacheableRequest } from '../types/api';
import { createRedisClient } from './redis-client';

class RedisCacheService implements CacheService {
  private redis: any; // Redis client
  private connected: boolean = false;
  private keyPrefix: string = 'tsconv:cache:';
  private cacheStats = { hits: 0, misses: 0 };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      this.redis = createRedisClient('cache');
      await this.redis.connect();
      this.connected = true;
      logInfo('Redis cache service initialized');
    } catch (error) {
      logError(
        'Failed to initialize Redis cache service',
        error instanceof Error ? error : new Error(String(error))
      );
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null;

    try {
      const value = await this.redis.get(this.prefixKey(key));

      if (value) {
        this.cacheStats.hits++;
        return JSON.parse(value) as T;
      } else {
        this.cacheStats.misses++;
        return null;
      }
    } catch (error) {
      logWarn('Redis cache get error', { error: String(error) });
      this.cacheStats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = config.caching.defaultTTL): Promise<void> {
    if (!this.connected) return;

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(this.prefixKey(key), Math.ceil(ttl / 1000), serialized);
    } catch (error) {
      logWarn('Redis cache set error', { error: String(error) });
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;

    try {
      await this.redis.del(this.prefixKey(key));
    } catch (error) {
      logWarn('Redis cache del error', { error: String(error) });
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const exists = await this.redis.exists(this.prefixKey(key));
      return exists === 1;
    } catch (error) {
      console.warn('Redis cache exists error:', error);
      return false;
    }
  }

  async clear(pattern?: string): Promise<void> {
    if (!this.connected) return;

    try {
      if (pattern) {
        const keys = await this.redis.keys(this.prefixKey(pattern));
        if (keys.length > 0) {
          // Delete keys in batches to avoid blocking Redis
          const batchSize = 100;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await Promise.all(batch.map((key: string) => this.redis.del(key)));
          }
        }
      } else {
        // Clear all keys with our prefix
        const keys = await this.redis.keys(`${this.keyPrefix}*`);
        if (keys.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await Promise.all(batch.map((key: string) => this.redis.del(key)));
          }
        }
      }
    } catch (error) {
      console.warn('Redis cache clear error:', error);
    }
  }

  async stats(): Promise<CacheStats> {
    if (!this.connected) {
      return { hits: this.cacheStats.hits, misses: this.cacheStats.misses, size: 0, keys: [] };
    }

    try {
      // Get cache size (number of keys with our prefix)
      const keys = await this.redis.keys(`${this.keyPrefix}*`);

      return {
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        size: keys.length,
        keys: keys.slice(0, 100).map((key: string) => key.substring(this.keyPrefix.length)), // Remove prefix
      };
    } catch (error) {
      console.warn('Redis cache stats error:', error);
      return { hits: this.cacheStats.hits, misses: this.cacheStats.misses, size: 0, keys: [] };
    }
  }

  generateKey(request: CacheableRequest): string {
    // Optimize key generation for Redis
    const sortedParams = Object.keys(request.parameters)
      .filter(key => request.parameters[key] !== null && request.parameters[key] !== undefined)
      .sort()
      .map(key => {
        const value = request.parameters[key];
        // Special handling for arrays to make keys more compact
        if (Array.isArray(value) && value.length > 5) {
          return `${key}:[${value.length}items]`;
        }
        return `${key}:${JSON.stringify(value)}`;
      })
      .join('|');

    return `${request.endpoint}:${request.userId || 'anonymous'}:${Buffer.from(sortedParams).toString('base64')}`;
  }

  private prefixKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}

// Factory to create appropriate cache service based on configuration
export class CacheServiceFactory {
  static create(): CacheService {
    if (config.caching.enabled) {
      // Check if Redis is configured
      if (config.caching.redis.url && process.env.USE_REDIS === 'true') {
        try {
          return new RedisCacheService();
        } catch (error) {
          console.warn(
            'Failed to initialize Redis cache service, falling back to memory cache:',
            error
          );
          // Fall back to memory cache service
          const MemoryCacheService = require('./cache-service').default;
          return MemoryCacheService;
        }
      }
    }

    // Default to memory cache service
    const MemoryCacheService = require('./cache-service').default;
    return MemoryCacheService;
  }
}

// Export the class for factory usage
export { RedisCacheService };

// Create and export default cache service instance
const redisCacheService = new RedisCacheService();
export default redisCacheService;
