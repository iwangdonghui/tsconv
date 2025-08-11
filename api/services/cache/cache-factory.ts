/**
 * Enhanced Cache Factory
 * Creates and manages cache service instances with improved configuration and fallback mechanisms
 */

import { CacheConfiguration, ICacheService } from './interfaces';
import { MemoryCacheService } from './memory-cache-service';

export type CacheProvider = 'memory' | 'redis' | 'upstash' | 'hybrid';

export interface CacheFactoryOptions {
  provider?: CacheProvider;
  fallbackProvider?: CacheProvider;
  enableFallback?: boolean;
  customConfig?: Partial<CacheConfiguration>;
}

/**
 * Enhanced Cache Factory with improved provider management and fallback mechanisms
 */
export class CacheFactory {
  private static instances = new Map<string, ICacheService>();
  private static defaultConfig: CacheConfiguration = {
    enabled: true,
    defaultTTL: 300000, // 5 minutes
    maxSize: 100 * 1024 * 1024, // 100MB
    keyPrefix: 'tsconv',
    compressionEnabled: false,
    serializationFormat: 'json',
    evictionPolicy: 'lru',
  };

  /**
   * Creates or returns a cache service instance
   */
  static create(options: CacheFactoryOptions = {}): ICacheService {
    const {
      provider = this.determineProvider(),
      fallbackProvider = 'memory',
      enableFallback = true,
      customConfig = {},
    } = options;

    const instanceKey = this.generateInstanceKey(provider, customConfig);

    // Return existing instance if available
    if (this.instances.has(instanceKey)) {
      return this.instances.get(instanceKey)!;
    }

    // Merge configuration
    const cacheConfig = this.mergeConfiguration(customConfig);

    // Check if caching is disabled
    if (!cacheConfig.enabled) {
      // eslint-disable-next-line no-console
      console.log('🚫 Caching disabled by configuration');
      const disabledCache = new MemoryCacheService({ ...cacheConfig, maxSize: 0 });
      this.instances.set(instanceKey, disabledCache);
      return disabledCache;
    }

    try {
      const cacheService = this.createCacheService(provider, cacheConfig);
      this.instances.set(instanceKey, cacheService);
      // eslint-disable-next-line no-console
      console.log(`✅ Cache service initialized: ${provider}`);
      return cacheService;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`⚠️ Failed to initialize ${provider} cache:`, error);

      if (enableFallback && fallbackProvider !== provider) {
        // eslint-disable-next-line no-console
        console.log(`🔄 Falling back to ${fallbackProvider} cache`);
        try {
          const fallbackCache = this.createCacheService(fallbackProvider, cacheConfig);
          this.instances.set(instanceKey, fallbackCache);
          return fallbackCache;
        } catch (fallbackError) {
          // eslint-disable-next-line no-console
          console.error(`❌ Fallback cache also failed:`, fallbackError);
        }
      }

      // Final fallback to disabled memory cache
      // eslint-disable-next-line no-console
      console.log('🔄 Using disabled memory cache as final fallback');
      const disabledCache = new MemoryCacheService({ ...cacheConfig, maxSize: 0 });
      this.instances.set(instanceKey, disabledCache);
      return disabledCache;
    }
  }

  /**
   * Creates a specific cache service instance
   */
  private static createCacheService(
    provider: CacheProvider,
    config: CacheConfiguration
  ): ICacheService {
    switch (provider) {
      case 'memory':
        return new MemoryCacheService(config);

      case 'redis':
        return this.createRedisCache(config);

      case 'upstash':
        return this.createUpstashCache(config);

      case 'hybrid':
        return this.createHybridCache(config);

      default:
        throw new Error(`Unsupported cache provider: ${provider}`);
    }
  }

  /**
   * Creates Redis cache service
   */
  private static createRedisCache(config: CacheConfiguration): ICacheService {
    try {
      // Dynamic import to avoid loading Redis dependencies if not needed
      const { RedisCacheService } = require('./redis-cache-service');
      return new RedisCacheService(config);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load Redis cache service:', error);
      throw new Error(`Redis cache service not available: ${error}`);
    }
  }

  /**
   * Creates Upstash cache service
   */
  private static createUpstashCache(config: CacheConfiguration): ICacheService {
    try {
      // Dynamic import to avoid loading Upstash dependencies if not needed
      const { UpstashCacheService } = require('./upstash-cache-service');
      return new UpstashCacheService(config);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load Upstash cache service:', error);
      throw new Error(`Upstash cache service not available: ${error}`);
    }
  }

  /**
   * Creates hybrid cache service (L1: Memory, L2: Redis/Upstash)
   */
  private static createHybridCache(config: CacheConfiguration): ICacheService {
    try {
      // Dynamic import to avoid loading hybrid dependencies if not needed
      const { HybridCacheService } = require('./hybrid-cache-service');
      return new HybridCacheService(config);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load Hybrid cache service:', error);
      throw new Error(`Hybrid cache service not available: ${error}`);
    }
  }

  /**
   * Determines the appropriate cache provider based on environment
   */
  private static determineProvider(): CacheProvider {
    // Check for Upstash configuration
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      return 'upstash';
    }

    // Check for Redis configuration
    if (process.env.USE_REDIS === 'true' || process.env.REDIS_URL) {
      return 'redis';
    }

    // Check for hybrid cache preference
    if (process.env.CACHE_PROVIDER === 'hybrid') {
      return 'hybrid';
    }

    // Default to memory cache
    return 'memory';
  }

  /**
   * Merges default configuration with custom configuration and environment variables
   */
  private static mergeConfiguration(customConfig: Partial<CacheConfiguration>): CacheConfiguration {
    const envConfig: Partial<CacheConfiguration> = {
      enabled: process.env.CACHE_ENABLED !== 'false',
      defaultTTL: process.env.CACHE_DEFAULT_TTL
        ? parseInt(process.env.CACHE_DEFAULT_TTL)
        : undefined,
      maxSize: process.env.CACHE_MAX_SIZE ? parseInt(process.env.CACHE_MAX_SIZE) : undefined,
      keyPrefix: process.env.CACHE_KEY_PREFIX || undefined,
      compressionEnabled: process.env.CACHE_COMPRESSION === 'true',
      serializationFormat: (process.env.CACHE_SERIALIZATION as 'json' | 'msgpack') || undefined,
      evictionPolicy: (process.env.CACHE_EVICTION_POLICY as 'lru' | 'lfu' | 'ttl') || undefined,
    };

    // Remove undefined values
    Object.keys(envConfig).forEach(key => {
      if (envConfig[key as keyof CacheConfiguration] === undefined) {
        delete envConfig[key as keyof CacheConfiguration];
      }
    });

    return {
      ...this.defaultConfig,
      ...envConfig,
      ...customConfig,
    };
  }

  /**
   * Generates a unique instance key for caching instances
   */
  private static generateInstanceKey(
    provider: CacheProvider,
    customConfig: Partial<CacheConfiguration>
  ): string {
    const configHash = JSON.stringify(customConfig, Object.keys(customConfig).sort());
    return `${provider}:${Buffer.from(configHash).toString('base64').substring(0, 16)}`;
  }

  /**
   * Gets configuration summary for debugging
   */
  static getConfigurationSummary(): {
    provider: CacheProvider;
    config: CacheConfiguration;
    instances: string[];
    environment: Record<string, string | undefined>;
  } {
    return {
      provider: this.determineProvider(),
      config: this.mergeConfiguration({}),
      instances: Array.from(this.instances.keys()),
      environment: {
        CACHE_ENABLED: process.env.CACHE_ENABLED,
        CACHE_PROVIDER: process.env.CACHE_PROVIDER,
        USE_REDIS: process.env.USE_REDIS,
        REDIS_URL: process.env.REDIS_URL ? '[CONFIGURED]' : undefined,
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? '[CONFIGURED]' : undefined,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? '[CONFIGURED]' : undefined,
      },
    };
  }

  /**
   * Resets all cache instances (useful for testing)
   */
  static reset(): void {
    // Cleanup existing instances
    for (const instance of this.instances.values()) {
      if ('destroy' in instance && typeof instance.destroy === 'function') {
        try {
          instance.destroy();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Error destroying cache instance:', error);
        }
      }
    }
    this.instances.clear();
  }

  /**
   * Gets health status of all cache instances
   */
  static async getHealthStatus(): Promise<Record<string, unknown>> {
    const health: Record<string, unknown> = {};

    for (const [key, instance] of this.instances.entries()) {
      try {
        health[key] = await instance.healthCheck();
      } catch (error) {
        health[key] = {
          status: 'unhealthy',
          error: (error as Error).message,
          lastCheck: Date.now(),
        };
      }
    }

    return health;
  }

  /**
   * Gets statistics from all cache instances
   */
  static async getStatistics(): Promise<Record<string, unknown>> {
    const stats: Record<string, unknown> = {};

    for (const [key, instance] of this.instances.entries()) {
      try {
        stats[key] = await instance.stats();
      } catch (error) {
        stats[key] = {
          error: (error as Error).message,
        };
      }
    }

    return stats;
  }
}

/**
 * Convenience function to get the default cache service instance
 */
export function getCacheService(options?: CacheFactoryOptions): ICacheService {
  return CacheFactory.create(options);
}

/**
 * Convenience function to get a specific cache provider
 */
export function getCacheServiceByProvider(
  provider: CacheProvider,
  customConfig?: Partial<CacheConfiguration>
): ICacheService {
  return CacheFactory.create({ provider, customConfig });
}

// Export types for convenience
export type { CacheConfiguration, ICacheService } from './interfaces';
