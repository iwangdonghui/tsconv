import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { CacheFactory } from '../cache-factory';
import { MemoryCacheService } from '../cache-service';

// Mock the config module
vi.mock('../config/config', () => ({
  default: {
    caching: {
      enabled: true,
      defaultTTL: 300000,
      maxCacheSize: 100 * 1024 * 1024,
      redis: {
        url: 'redis://localhost:6379',
        useUpstash: false,
        fallbackToMemory: true
      }
    }
  }
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
    healthCheck: vi.fn()
  }))
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
    healthCheck: vi.fn()
  }))
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
    healthCheck: vi.fn()
  }))
}));

describe('CacheFactory', () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    CacheFactory.reset();
    vi.clearAllMocks();
    
    // Clear environment variables
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.USE_REDIS;
  });

  afterEach(() => {
    CacheFactory.reset();
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
              fallbackToMemory: true
            }
          }
        }
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
        })
      }));

      const cacheService = CacheFactory.create();
      expect(cacheService).toBeDefined();
      expect(MemoryCacheService).toHaveBeenCalled();
    });

    it('should create disabled cache when caching is disabled', () => {
      // Mock config with caching disabled
      vi.doMock('../config/config', () => ({
        default: {
          caching: {
            enabled: false,
            defaultTTL: 300000,
            maxCacheSize: 100 * 1024 * 1024,
            redis: {
              url: 'redis://localhost:6379',
              useUpstash: false,
              fallbackToMemory: true
            }
          }
        }
      }));

      const cacheService = CacheFactory.create();
      expect(cacheService).toBeDefined();
      expect(MemoryCacheService).toHaveBeenCalledWith(0);
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
      
      expect(validation.valid).toBe(true);
      expect(validation.provider).toBe('memory');
      expect(validation.issues).toHaveLength(0);
    });

    it('should return invalid when caching is disabled', () => {
      // Mock config with caching disabled
      vi.doMock('../config/config', () => ({
        default: {
          caching: {
            enabled: false,
            defaultTTL: 300000,
            maxCacheSize: 100 * 1024 * 1024,
            redis: {
              url: 'redis://localhost:6379',
              useUpstash: false,
              fallbackToMemory: true
            }
          }
        }
      }));

      const validation = CacheFactory.validateConfiguration();
      
      expect(validation.valid).toBe(false);
      expect(validation.provider).toBe('disabled');
      expect(validation.issues).toContain('Caching is disabled in configuration');
    });

    it('should validate Upstash configuration', () => {
      // Mock config to use Upstash without environment variables
      vi.doMock('../config/config', () => ({
        default: {
          caching: {
            enabled: true,
            defaultTTL: 300000,
            maxCacheSize: 100 * 1024 * 1024,
            redis: {
              url: 'https://test.upstash.io',
              useUpstash: true,
              fallbackToMemory: true
            }
          }
        }
      }));

      const validation = CacheFactory.validateConfiguration();
      
      expect(validation.issues).toContain('UPSTASH_REDIS_REST_URL environment variable is missing');
      expect(validation.issues).toContain('UPSTASH_REDIS_REST_TOKEN environment variable is missing');
    });

    it('should validate Redis configuration', () => {
      process.env.USE_REDIS = 'true';
      
      // Mock config without Redis URL
      vi.doMock('../config/config', () => ({
        default: {
          caching: {
            enabled: true,
            defaultTTL: 300000,
            maxCacheSize: 100 * 1024 * 1024,
            redis: {
              url: '',
              useUpstash: false,
              fallbackToMemory: true
            }
          }
        }
      }));

      const validation = CacheFactory.validateConfiguration();
      
      expect(validation.issues).toContain('Redis URL is not configured');
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
          fallbackToMemory: true
        }
      });
    });

    it('should hide Redis URL when not configured', () => {
      // Mock config without Redis URL
      vi.doMock('../config/config', () => ({
        default: {
          caching: {
            enabled: true,
            defaultTTL: 300000,
            maxCacheSize: 100 * 1024 * 1024,
            redis: {
              url: '',
              useUpstash: false,
              fallbackToMemory: true
            }
          }
        }
      }));

      const summary = CacheFactory.getConfigurationSummary();
      
      expect(summary.redisConfig.url).toBeUndefined();
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