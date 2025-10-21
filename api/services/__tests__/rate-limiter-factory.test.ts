import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRateLimiter } from '../rate-limiter';
import {
  RateLimiterFactory,
  applyRateLimit,
  createRateLimitHeaders,
  getClientIdentifier,
  getRateLimitRule,
} from '../rate-limiter-factory';
import { getConfig, overrideConfig, resetConfig } from '../../config/config';

// Mock the rate limiter modules
vi.mock('../rate-limiter', () => ({
  MemoryRateLimiter: vi.fn().mockImplementation(() => ({
    checkLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
      totalLimit: 100,
    }),
    increment: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 98,
      resetTime: Date.now() + 60000,
      totalLimit: 100,
    }),
    reset: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({
      identifier: 'test',
      currentCount: 1,
      limit: 100,
      window: 60000,
      resetTime: Date.now() + 60000,
    }),
  })),
}));

vi.mock('../upstash-rate-limiter', () => ({
  UpstashRateLimiter: vi.fn().mockImplementation(() => ({
    checkLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
      totalLimit: 100,
    }),
    increment: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 98,
      resetTime: Date.now() + 60000,
      totalLimit: 100,
    }),
    reset: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({
      identifier: 'test',
      currentCount: 1,
      limit: 100,
      window: 60000,
      resetTime: Date.now() + 60000,
    }),
  })),
}));

const originalRateLimitEnv = process.env.RATE_LIMITING_ENABLED;

describe('RateLimiterFactory', () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    RateLimiterFactory.reset();
    vi.clearAllMocks();

    resetConfig();
    process.env.RATE_LIMITING_ENABLED = 'true';
    overrideConfig(cfg => {
      cfg.rateLimiting.enabled = true;
      cfg.caching.redis.useUpstash = false;
    });

    // Clear environment variables
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.USE_REDIS;
  });

  afterEach(() => {
    RateLimiterFactory.reset();
    vi.clearAllMocks();
    resetConfig();

    if (originalRateLimitEnv === undefined) {
      delete process.env.RATE_LIMITING_ENABLED;
    } else {
      process.env.RATE_LIMITING_ENABLED = originalRateLimitEnv;
    }
  });

  describe('create()', () => {
    it('should create memory rate limiter by default', () => {
      const rateLimiter = RateLimiterFactory.create();

      expect(rateLimiter).toBeDefined();
      expect(MemoryRateLimiter).toHaveBeenCalled();
    });

    it('should return the same instance on subsequent calls (singleton)', () => {
      const firstInstance = RateLimiterFactory.create();
      const secondInstance = RateLimiterFactory.create();

      expect(firstInstance).toBe(secondInstance);
      expect(MemoryRateLimiter).toHaveBeenCalledTimes(1);
    });

    it('should create Upstash rate limiter when configured', () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

      overrideConfig(cfg => {
        cfg.caching.redis = {
          ...cfg.caching.redis,
          url: 'https://test.upstash.io',
          useUpstash: true,
          fallbackToMemory: true,
        };
      });

      const rateLimiter = RateLimiterFactory.create();
      expect(rateLimiter).toBeDefined();
    });

    it('should create Redis rate limiter when USE_REDIS is true', () => {
      process.env.USE_REDIS = 'true';

      const rateLimiter = RateLimiterFactory.create();
      expect(rateLimiter).toBeDefined();
    });

    it('should fallback to memory rate limiter when Redis fails', () => {
      process.env.USE_REDIS = 'true';

      // Mock Redis service to throw error
      vi.doMock('../rate-limiter', () => ({
        MemoryRateLimiter: vi.fn().mockImplementation(() => ({
          checkLimit: vi.fn(),
          increment: vi.fn(),
          reset: vi.fn(),
          getStats: vi.fn(),
        })),
        RedisRateLimiter: vi.fn().mockImplementation(() => {
          throw new Error('Redis connection failed');
        }),
      }));

      const rateLimiter = RateLimiterFactory.create();
      expect(rateLimiter).toBeDefined();
      expect(MemoryRateLimiter).toHaveBeenCalled();
    });

    it('should create disabled rate limiter when rate limiting is disabled', () => {
      overrideConfig(cfg => {
        cfg.rateLimiting.enabled = false;
      });

      const rateLimiter = RateLimiterFactory.create();
      expect(rateLimiter).toBeDefined();
    });
  });

  describe('validateConfiguration()', () => {
    it('should return valid configuration for memory rate limiter', () => {
      const validation = RateLimiterFactory.validateConfiguration();

      expect(validation.valid).toBe(true);
      expect(validation.provider).toBe('memory');
      expect(validation.issues).toHaveLength(0);
    });

    it('should return invalid when rate limiting is disabled', () => {
      const originalEnv = process.env.RATE_LIMITING_ENABLED;
      process.env.RATE_LIMITING_ENABLED = 'false';
      overrideConfig(cfg => {
        cfg.rateLimiting.enabled = false;
      });

      const validation = RateLimiterFactory.validateConfiguration();

      expect(validation.valid).toBe(false);
      expect(validation.provider).toBe('disabled');
      expect(validation.issues).toContain('Rate limiting is disabled in configuration');

      if (originalEnv) {
        process.env.RATE_LIMITING_ENABLED = originalEnv;
      } else {
        delete process.env.RATE_LIMITING_ENABLED;
      }
    });

    it('should validate Upstash configuration', () => {
      // Mock config to use Upstash without environment variables
      overrideConfig(cfg => {
        cfg.caching.redis = {
          ...cfg.caching.redis,
          url: 'https://test.upstash.io',
          useUpstash: true,
          fallbackToMemory: true,
        };
      });

      const validation = RateLimiterFactory.validateConfiguration();

      expect(validation.issues).toContain('UPSTASH_REDIS_REST_URL environment variable is missing');
      expect(validation.issues).toContain(
        'UPSTASH_REDIS_REST_TOKEN environment variable is missing'
      );
    });
  });

  describe('getConfigurationSummary()', () => {
    it('should return configuration summary', () => {
      const summary = RateLimiterFactory.getConfigurationSummary();
      const currentConfig = getConfig();

      expect(summary).toEqual({
        enabled: currentConfig.rateLimiting.enabled,
        provider: 'memory',
        rules: currentConfig.rateLimiting.rules.length,
        defaultLimits: {
          anonymous: {
            limit: currentConfig.rateLimiting.defaultLimits.anonymous.limit,
            window: currentConfig.rateLimiting.defaultLimits.anonymous.window,
          },
          authenticated: {
            limit: currentConfig.rateLimiting.defaultLimits.authenticated.limit,
            window: currentConfig.rateLimiting.defaultLimits.authenticated.window,
          },
        },
        redisConfig: {
          url: currentConfig.caching.redis.url ? '[CONFIGURED]' : undefined,
          useUpstash: currentConfig.caching.redis.useUpstash ?? false,
          fallbackToMemory: currentConfig.caching.redis.fallbackToMemory ?? false,
        },
      });
    });
  });

  describe('healthCheck()', () => {
    it('should perform health check successfully', async () => {
      const rateLimiter = RateLimiterFactory.create();
      expect(typeof (rateLimiter as any).checkLimit).toBe('function');

      const health = await RateLimiterFactory.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.provider).toBe('memory');
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.details).toBeDefined();
    });

    it('should handle health check errors', async () => {
      // Mock rate limiter to throw error
      const mockRateLimiter = {
        checkLimit: vi.fn().mockRejectedValue(new Error('Test error')),
      };

      const createSpy = vi
        .spyOn(RateLimiterFactory, 'create')
        .mockReturnValue(mockRateLimiter as any);

      const health = await RateLimiterFactory.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBe('Test error');

      createSpy.mockRestore();
    });
  });

  describe('createSpecific()', () => {
    it('should create specific rate limiter service bypassing singleton', () => {
      const memoryLimiter1 = RateLimiterFactory.createSpecific('memory');
      const memoryLimiter2 = RateLimiterFactory.createSpecific('memory');

      expect(memoryLimiter1).toBeDefined();
      expect(memoryLimiter2).toBeDefined();
      expect(MemoryRateLimiter).toHaveBeenCalledTimes(2);
    });
  });

  describe('getInstance()', () => {
    it('should return null when no instance exists', () => {
      const instance = RateLimiterFactory.getInstance();
      expect(instance).toBeNull();
    });

    it('should return existing instance', () => {
      const createdInstance = RateLimiterFactory.create();
      const retrievedInstance = RateLimiterFactory.getInstance();

      expect(retrievedInstance).toBe(createdInstance);
    });
  });

  describe('reset()', () => {
    it('should reset singleton instance', () => {
      const firstInstance = RateLimiterFactory.create();
      RateLimiterFactory.reset();
      const secondInstance = RateLimiterFactory.create();

      expect(firstInstance).not.toBe(secondInstance);
      expect(MemoryRateLimiter).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Utility Functions', () => {
  describe('getClientIdentifier()', () => {
    it('should extract identifier from authorization header', () => {
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };

      const identifier = getClientIdentifier(req);
      expect(identifier).toBe('user:token123');
    });

    it('should extract identifier from API key header', () => {
      const req = {
        headers: {
          'x-api-key': 'api-key-123',
        },
      };

      const identifier = getClientIdentifier(req);
      expect(identifier).toBe('api:api-key-123');
    });

    it('should fallback to IP address', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      };

      const identifier = getClientIdentifier(req);
      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('should handle missing headers', () => {
      const req = {
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
      };

      const identifier = getClientIdentifier(req);
      expect(identifier).toBe('ip:127.0.0.1');
    });
  });

  describe('getRateLimitRule()', () => {
    it('should return authenticated rule for authorized requests', () => {
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };

      const rule = getRateLimitRule(req);
      expect(rule.identifier).toBe('authenticated');
      expect(rule.limit).toBe(1000);
    });

    it('should return authenticated rule for API key requests', () => {
      const req = {
        headers: {
          'x-api-key': 'api-key-123',
        },
      };

      const rule = getRateLimitRule(req);
      expect(rule.identifier).toBe('authenticated');
      expect(rule.limit).toBe(1000);
    });

    it('should return anonymous rule for unauthenticated requests', () => {
      const req = {
        headers: {},
      };

      const rule = getRateLimitRule(req);
      expect(rule.identifier).toBe('anonymous');
      expect(rule.limit).toBe(100);
    });
  });

  describe('applyRateLimit()', () => {
    it('should apply rate limiting to request', async () => {
      const req = {
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
      };

      const result = await applyRateLimit(req);

      expect(result.allowed).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.remaining).toBe(98);
    });

    it('should use custom identifier and rule', async () => {
      const req = { headers: {} };
      const customRule = {
        identifier: 'custom',
        limit: 50,
        window: 30000,
        type: 'user' as const,
      };

      const result = await applyRateLimit(req, 'custom-id', customRule);

      expect(result.allowed).toBe(true);
      expect(result.result).toBeDefined();
    });
  });

  describe('createRateLimitHeaders()', () => {
    it('should create rate limit headers', () => {
      const result = {
        allowed: true,
        remaining: 95,
        resetTime: Date.now() + 60000,
        totalLimit: 100,
      };

      const headers = createRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('95');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['X-RateLimit-Window']).toBeDefined();
    });
  });
});
