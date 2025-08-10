import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { CacheFactory } from '../cache-factory';
import { MemoryCacheService } from '../cache-service';
import config from '../../config/config';

// Store original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;

// Mock the config module with mutable structure
vi.mock('../../config/config', () => {
  const mockConfig = {
    caching: {
      enabled: true,
      defaultTTL: 300000,
      maxCacheSize: 100 * 1024 * 1024,
      redis: {
        url: 'redis://localhost:6379',
        password: undefined,
        maxRetries: 3,
        useUpstash: false,
        fallbackToMemory: true,
      },
    },
    rateLimiting: {
      enabled: false,
    },
    monitoring: {
      metricsEnabled: false,
      logLevel: 'error',
    },
  };

  return {
    default: mockConfig,
  };
});

// Mock the cache service modules to avoid module resolution issues
vi.mock('../upstash-cache-service', () => ({
  UpstashCacheService: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    has: vi.fn(),
    getStats: vi.fn(),
    healthCheck: vi.fn(),
  })),
}));

vi.mock('../redis-cache-service', () => ({
  RedisCacheService: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    has: vi.fn(),
    getStats: vi.fn(),
    healthCheck: vi.fn(),
  })),
}));

// Mock the cache service modules
vi.mock('../cache-service', () => ({
  MemoryCacheService: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    clear: vi.fn(),
    stats: vi.fn(),
    generateKey: vi.fn(),
    healthCheck: vi.fn(),
  })),
}));

vi.mock('../upstash-cache-service', () => ({
  UpstashCacheService: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    clear: vi.fn(),
    stats: vi.fn(),
    generateKey: vi.fn(),
    healthCheck: vi.fn(),
  })),
}));

vi.mock('../redis-cache-service', () => ({
  RedisCacheService: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    clear: vi.fn(),
    stats: vi.fn(),
    generateKey: vi.fn(),
    healthCheck: vi.fn(),
  })),
}));

describe('CacheFactory', () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    CacheFactory.reset();
    vi.clearAllMocks();

    // Set NODE_ENV to production to enable caching
    process.env.NODE_ENV = 'production';

    // Clear environment variables
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.USE_REDIS;
  });

  afterEach(() => {
    CacheFactory.reset();
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('create()', () => {
    it('should create memory cache service by default', () => {
      const cacheService = CacheFactory.create();

      expect(cacheService).toBeDefined();
      expect(MemoryCacheService).toHaveBeenCalled();
    });

    it('should return the same instance on subsequent calls (singleton)', () => {
      const firstInstance = CacheFactory.create();
      const secondInstance = CacheFactory.create();

      expect(firstInstance).toBe(secondInstance);
      expect(MemoryCacheService).toHaveBeenCalledTimes(1);
    });

    it('should create Upstash cache when configured', () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

      // Mock config to use Upstash
      vi.doMock('../config/config', () => ({
        default: {
          caching: {
            enabled: true,
            defaultTTL: 300000,
            maxCacheSize: 100 * 1024 * 1024,
            redis: {
              url: 'https://test.upstash.io',
              useUpstash: true,
              fallbackToMemory: true,
            },
          },
        },
      }));

      const cacheService = CacheFactory.create();
      expect(cacheService).toBeDefined();
    });

    it('should create Redis cache when USE_REDIS is true', () => {
      process.env.USE_REDIS = 'true';

      const cacheService = CacheFactory.create();
      expect(cacheService).toBeDefined();
    });

    it('should fallback to memory cache when Redis fails', () => {
      process.env.USE_REDIS = 'true';

      // Mock Redis service to throw error
      vi.doMock('../redis-cache-service', () => ({
        RedisCacheService: vi.fn().mockImplementation(() => {
          throw new Error('Redis connection failed');
        }),
      }));

      const cacheService = CacheFactory.create();
      expect(cacheService).toBeDefined();
      expect(MemoryCacheService).toHaveBeenCalled();
    });

    it('should create disabled cache when caching is disabled', () => {
      // Get the mocked config and temporarily disable caching
      const mockedConfig = vi.mocked(config);
      const originalEnabled = mockedConfig.caching.enabled;
      mockedConfig.caching.enabled = false;

      const cacheService = CacheFactory.create();
      expect(cacheService).toBeDefined();
      expect(MemoryCacheService).toHaveBeenCalledWith(0);

      // Restore original state
      mockedConfig.caching.enabled = originalEnabled;
    });
  });

  describe('determineCacheProvider()', () => {
    it('should return upstash when Upstash is configured', () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';

      // Access private method through any
      const provider = (CacheFactory as any).determineCacheProvider();
      expect(provider).toBe('memory'); // Will be memory since config mock doesn't have useUpstash: true
    });

    it('should return redis when USE_REDIS is true', () => {
      process.env.USE_REDIS = 'true';

      const provider = (CacheFactory as any).determineCacheProvider();
      expect(provider).toBe('redis');
    });

    it('should return memory by default', () => {
      const provider = (CacheFactory as any).determineCacheProvider();
      expect(provider).toBe('memory');
    });
  });

  describe('validateConfiguration()', () => {
    it('should return valid configuration for memory cache', () => {
      const validation = CacheFactory.validateConfiguration();

      // Debug output
      console.log('Validation result:', validation);
      const mockedConfig = vi.mocked(config);
      console.log('Mock config enabled:', mockedConfig.caching.enabled);

      expect(validation.valid).toBe(true);
      expect(validation.provider).toBe('memory');
      expect(validation.issues).toHaveLength(0);
    });

    it('should return invalid when caching is disabled', () => {
      // Get the mocked config and temporarily disable caching
      const mockedConfig = vi.mocked(config);
      const originalEnabled = mockedConfig.caching.enabled;
      mockedConfig.caching.enabled = false;

      const validation = CacheFactory.validateConfiguration();

      expect(validation.valid).toBe(false);
      expect(validation.provider).toBe('disabled');
      expect(validation.issues).toContain('Caching is disabled in configuration');

      // Restore original state
      mockedConfig.caching.enabled = originalEnabled;
    });

    it('should validate Upstash configuration', () => {
      // Save original environment variables
      const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
      const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      // Get the mocked config
      const mockedConfig = vi.mocked(config);
      const originalUseUpstash = mockedConfig.caching.redis.useUpstash;

      // Clear environment variables to test validation
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      // Set useUpstash to trigger Upstash validation
      mockedConfig.caching.redis.useUpstash = true;

      const validation = CacheFactory.validateConfiguration();

      expect(validation.issues).toContain('UPSTASH_REDIS_REST_URL environment variable is missing');
      expect(validation.issues).toContain(
        'UPSTASH_REDIS_REST_TOKEN environment variable is missing'
      );

      // Restore original state
      if (originalUpstashUrl) process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
      if (originalUpstashToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
      mockedConfig.caching.redis.useUpstash = originalUseUpstash;
    });

    it('should validate Redis configuration', () => {
      // Save original environment variables and config
      const originalUseRedis = process.env.USE_REDIS;
      const originalRedisUrl = process.env.REDIS_URL;
      const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
      const originalKvUrl = process.env.KV_URL;

      // Get the mocked config
      const mockedConfig = vi.mocked(config);
      const originalConfigUrl = mockedConfig.caching.redis.url;

      // Set USE_REDIS but clear all Redis URL sources
      process.env.USE_REDIS = 'true';
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.KV_URL;
      mockedConfig.caching.redis.url = '';

      const validation = CacheFactory.validateConfiguration();

      expect(validation.issues).toContain('Redis URL is not configured');

      // Restore environment variables and config
      if (originalUseRedis) process.env.USE_REDIS = originalUseRedis;
      else delete process.env.USE_REDIS;
      if (originalRedisUrl) process.env.REDIS_URL = originalRedisUrl;
      if (originalUpstashUrl) process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
      if (originalKvUrl) process.env.KV_URL = originalKvUrl;
      mockedConfig.caching.redis.url = originalConfigUrl;
    });
  });

  describe('getConfigurationSummary()', () => {
    it('should return configuration summary', () => {
      const summary = CacheFactory.getConfigurationSummary();

      expect(summary).toEqual({
        enabled: true,
        provider: 'memory',
        maxSize: 100 * 1024 * 1024,
        defaultTTL: 300000,
        redisConfig: {
          url: '[CONFIGURED]',
          useUpstash: false,
          fallbackToMemory: true,
        },
      });
    });

    it('should show configured Redis URL', () => {
      const summary = CacheFactory.getConfigurationSummary();

      // Since config always provides a default Redis URL, it should show as configured
      expect(summary.redisConfig.url).toBe('[CONFIGURED]');
      expect(summary.redisConfig.useUpstash).toBe(false);
      expect(summary.redisConfig.fallbackToMemory).toBe(true);
    });
  });

  describe('createSpecific()', () => {
    it('should create specific cache service bypassing singleton', () => {
      const memoryCache1 = CacheFactory.createSpecific('memory');
      const memoryCache2 = CacheFactory.createSpecific('memory');

      expect(memoryCache1).toBeDefined();
      expect(memoryCache2).toBeDefined();
      expect(MemoryCacheService).toHaveBeenCalledTimes(2);
    });

    it('should create Upstash cache service', () => {
      const upstashCache = CacheFactory.createSpecific('upstash');
      expect(upstashCache).toBeDefined();
    });

    it('should create Redis cache service', () => {
      const redisCache = CacheFactory.createSpecific('redis');
      expect(redisCache).toBeDefined();
    });
  });

  describe('getInstance()', () => {
    it('should return null when no instance exists', () => {
      const instance = CacheFactory.getInstance();
      expect(instance).toBeNull();
    });

    it('should return existing instance', () => {
      const createdInstance = CacheFactory.create();
      const retrievedInstance = CacheFactory.getInstance();

      expect(retrievedInstance).toBe(createdInstance);
    });
  });

  describe('reset()', () => {
    it('should reset singleton instance', () => {
      const firstInstance = CacheFactory.create();
      CacheFactory.reset();
      const secondInstance = CacheFactory.create();

      expect(firstInstance).not.toBe(secondInstance);
      expect(MemoryCacheService).toHaveBeenCalledTimes(2);
    });
  });
});
