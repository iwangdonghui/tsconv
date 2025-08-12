import config from '../config/config';
import { CacheService } from '../types/api';
import { MemoryCacheService } from './cache-service';

/**
 * Cache Factory - Creates appropriate cache service based on environment configuration
 * Supports multiple cache providers with fallback mechanisms
 */
export class CacheFactory {
  private static instance: CacheService | null = null;

  /**
   * Creates and returns a cache service instance based on configuration
   * Uses singleton pattern to ensure consistent cache instance across the application
   */
  static create(): CacheService {
    if (this.instance) {
      return this.instance;
    }

    // Check if caching is enabled
    if (!config.caching.enabled) {
      console.log('🚫 Caching disabled by configuration');
      this.instance = new MemoryCacheService(0); // Disabled cache with 0 size
      return this.instance;
    }

    // Determine cache provider based on environment
    const cacheProvider = this.determineCacheProvider();

    try {
      this.instance = this.createCacheService(cacheProvider);
      console.log(`✅ Cache service initialized: ${cacheProvider}`);
      return this.instance;
    } catch (error) {
      console.warn(
        `⚠️ Failed to initialize ${cacheProvider} cache, falling back to memory cache:`,
        error
      );
      this.instance = new MemoryCacheService();
      return this.instance;
    }
  }

  /**
   * Determines the appropriate cache provider based on environment configuration
   */
  private static determineCacheProvider(): 'upstash' | 'redis' | 'memory' {
    // Check for Upstash Redis configuration
    if (config.caching.redis.useUpstash && process.env.UPSTASH_REDIS_REST_URL) {
      return 'upstash';
    }

    // Check for standard Redis configuration
    if (process.env.USE_REDIS === 'true' && config.caching.redis.url) {
      return 'redis';
    }

    // Default to memory cache
    return 'memory';
  }

  /**
   * Creates the appropriate cache service instance
   */
  private static createCacheService(provider: 'upstash' | 'redis' | 'memory'): CacheService {
    switch (provider) {
      case 'upstash':
        return this.createUpstashCache();

      case 'redis':
        return this.createRedisCache();

      case 'memory':
      default:
        return this.createMemoryCache();
    }
  }

  /**
   * Creates Upstash Redis cache service
   */
  private static createUpstashCache(): CacheService {
    try {
      // Dynamic import to avoid loading Upstash dependencies if not needed
      // In Vitest, ESM/CJS interop can differ; support both default and named exports
      // Try both ESM and CJS paths to satisfy vitest resolver
      let UpstashCacheServiceModule: any;
      try {
        UpstashCacheServiceModule = require('./upstash-cache-service');
      } catch (e) {
        UpstashCacheServiceModule = require('./upstash-cache-service.ts');
      }
      const UpstashCacheService =
        UpstashCacheServiceModule?.UpstashCacheService ?? UpstashCacheServiceModule?.default;
      return new UpstashCacheService();
    } catch (error) {
      console.warn('Failed to load Upstash cache service:', error);
      throw error;
    }
  }

  /**
   * Creates standard Redis cache service
   */
  private static createRedisCache(): CacheService {
    try {
      // Dynamic import to avoid loading Redis dependencies if not needed
      const { RedisCacheService } = require('./redis-cache-service.ts');
      return new RedisCacheService();
    } catch (error) {
      console.warn('Failed to load Redis cache service:', error);
      throw error;
    }
  }

  /**
   * Creates memory cache service
   */
  private static createMemoryCache(): CacheService {
    const maxSize = Math.floor(config.caching.maxCacheSize / (1024 * 1024)); // Convert bytes to MB
    return new MemoryCacheService(maxSize);
  }

  /**
   * Resets the singleton instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }

  /**
   * Gets the current cache service instance without creating a new one
   */
  static getInstance(): CacheService | null {
    return this.instance;
  }

  /**
   * Creates a cache service for a specific provider (bypasses singleton)
   * Useful for testing or specific use cases
   */
  static createSpecific(provider: 'upstash' | 'redis' | 'memory'): CacheService {
    return this.createCacheService(provider);
  }

  /**
   * Validates cache configuration and returns status
   */
  static validateConfiguration(): {
    valid: boolean;
    provider: string;
    issues: string[];
  } {
    const issues: string[] = [];
    let provider = 'memory';

    // Check caching enabled
    if (!config.caching.enabled) {
      issues.push('Caching is disabled in configuration');
      return { valid: false, provider: 'disabled', issues };
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

    // Validate memory cache configuration
    if (config.caching.maxCacheSize <= 0) {
      issues.push('Invalid max cache size configuration');
    }

    return {
      valid: issues.length === 0,
      provider,
      issues,
    };
  }

  /**
   * Gets cache configuration summary
   */
  static getConfigurationSummary(): {
    enabled: boolean;
    provider: string;
    maxSize: number;
    defaultTTL: number;
    redisConfig: {
      url?: string;
      useUpstash: boolean;
      fallbackToMemory: boolean;
    };
  } {
    return {
      enabled: config.caching.enabled,
      provider: this.determineCacheProvider(),
      maxSize: config.caching.maxCacheSize,
      defaultTTL: config.caching.defaultTTL,
      redisConfig: {
        url: config.caching.redis.url ? '[CONFIGURED]' : undefined,
        useUpstash: config.caching.redis.useUpstash ?? false,
        fallbackToMemory: config.caching.redis.fallbackToMemory ?? false,
      },
    };
  }
}

/**
 * Convenience function to get cache service instance
 */
export function getCacheService(): CacheService {
  return CacheFactory.create();
}

/**
 * Gets cache service health information
 */
export async function getCacheServiceHealth(): Promise<{
  status: 'healthy' | 'unhealthy' | 'degraded';
  provider: string;
  latency?: number;
  error?: string;
  stats?: any;
}> {
  try {
    const startTime = Date.now();
    const cacheService = getCacheService();

    // Test basic cache operations
    const testKey = `health_check_${Date.now()}`;
    const testValue = { test: true, timestamp: Date.now() };

    await cacheService.set(testKey, testValue, 10); // 10 second TTL
    const retrieved = await cacheService.get(testKey);
    await cacheService.del(testKey);

    const latency = Date.now() - startTime;

    // Get cache stats if available
    let stats;
    try {
      stats = await cacheService.stats();
    } catch (error) {
      // Stats not available for all cache providers
    }

    return {
      status: retrieved ? 'healthy' : 'degraded',
      provider: CacheFactory.getConfigurationSummary().provider,
      latency,
      stats,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      provider: CacheFactory.getConfigurationSummary().provider,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export default factory instance for convenience
export default CacheFactory;

// Export individual cache service classes for direct use if needed
export { MemoryCacheService } from './cache-service';

// Re-export types for convenience
export type { CacheableRequest, CacheService, CacheStats } from '../types/api';
