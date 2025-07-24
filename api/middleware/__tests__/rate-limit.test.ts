import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  rateLimitMiddleware, 
  createRateLimitMiddleware, 
  bypassRateLimit,
  resetRateLimit,
  getRateLimitStats,
  createEndpointRateLimit
} from '../rate-limit';
import { RateLimiter, RateLimitRule, RateLimitResult, RateLimitStats } from '../../types/api';

// Mock rate limiter
const mockRateLimiter: RateLimiter = {
  checkLimit: vi.fn(),
  increment: vi.fn(),
  reset: vi.fn(),
  getStats: vi.fn()
};

// Mock config
vi.mock('../../config/config', () => ({
  default: {
    rateLimiting: {
      enabled: true,
      defaultLimits: {
        anonymous: {
          identifier: 'anonymous',
          limit: 100,
          window: 60000,
          type: 'ip'
        },
        authenticated: {
          identifier: 'authenticated',
          limit: 1000,
          window: 60000,
          type: 'user'
        }
      }
    }
  },
  getRateLimitRule: vi.fn()
}));

// Helper to create mock request/response
const createMockReq = (overrides: Partial<VercelRequest> = {}): VercelRequest => ({
  method: 'GET',
  url: '/api/convert',
  query: {},
  headers: {},
  body: {},
  ...overrides
} as VercelRequest);

const createMockRes = (): VercelResponse => {
  const res = {
    statusCode: 200,
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis()
  } as unknown as VercelResponse;
  
  return res;
};

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rateLimitMiddleware', () => {
    it('should allow request when rate limit is not exceeded', async () => {
      const rateLimitResult: RateLimitResult = {
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalLimit: 100
      };

      (mockRateLimiter.checkLimit as any).mockResolvedValue(rateLimitResult);
      (mockRateLimiter.increment as any).mockResolvedValue(rateLimitResult);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = rateLimitMiddleware({
        rateLimiter: mockRateLimiter
      });

      await middleware(req, res, next);

      expect(mockRateLimiter.checkLimit).toHaveBeenCalled();
      expect(mockRateLimiter.increment).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '99');
    });

    it('should block request when rate limit is exceeded', async () => {
      const rateLimitResult: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalLimit: 100
      };

      (mockRateLimiter.checkLimit as any).mockResolvedValue(rateLimitResult);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = rateLimitMiddleware({
        rateLimiter: mockRateLimiter
      });

      await middleware(req, res, next);

      expect(mockRateLimiter.checkLimit).toHaveBeenCalled();
      expect(mockRateLimiter.increment).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Exceeded', 'true');
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('should use custom identifier extractor', async () => {
      const rateLimitResult: RateLimitResult = {
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalLimit: 100
      };

      (mockRateLimiter.checkLimit as any).mockResolvedValue(rateLimitResult);
      (mockRateLimiter.increment as any).mockResolvedValue(rateLimitResult);

      const customIdentifierExtractor = vi.fn().mockReturnValue('custom-id');
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = rateLimitMiddleware({
        rateLimiter: mockRateLimiter,
        identifierExtractor: customIdentifierExtractor
      });

      await middleware(req, res, next);

      expect(customIdentifierExtractor).toHaveBeenCalledWith(req);
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(
        'custom-id',
        expect.any(Object)
      );
    });

    it('should use custom rule selector', async () => {
      const rateLimitResult: RateLimitResult = {
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalLimit: 100
      };

      const customRule: RateLimitRule = {
        identifier: 'custom',
        limit: 50,
        window: 30000,
        type: 'ip'
      };

      (mockRateLimiter.checkLimit as any).mockResolvedValue(rateLimitResult);
      (mockRateLimiter.increment as any).mockResolvedValue(rateLimitResult);

      const customRuleSelector = vi.fn().mockReturnValue(customRule);
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = rateLimitMiddleware({
        rateLimiter: mockRateLimiter,
        ruleSelector: customRuleSelector
      });

      await middleware(req, res, next);

      expect(customRuleSelector).toHaveBeenCalledWith(req);
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(
        expect.any(String),
        customRule
      );
    });

    it('should call onLimitReached callback when rate limit is exceeded', async () => {
      const rateLimitResult: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalLimit: 100
      };

      (mockRateLimiter.checkLimit as any).mockResolvedValue(rateLimitResult);

      const onLimitReached = vi.fn();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = rateLimitMiddleware({
        rateLimiter: mockRateLimiter,
        onLimitReached
      });

      await middleware(req, res, next);

      expect(onLimitReached).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        rateLimitResult
      );
    });

    it('should use custom error response', async () => {
      const rateLimitResult: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalLimit: 100
      };

      const customErrorResponse = vi.fn().mockReturnValue({
        success: false,
        error: { code: 'CUSTOM_RATE_LIMIT', message: 'Custom rate limit message' }
      });

      (mockRateLimiter.checkLimit as any).mockResolvedValue(rateLimitResult);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = rateLimitMiddleware({
        rateLimiter: mockRateLimiter,
        customErrorResponse
      });

      await middleware(req, res, next);

      expect(customErrorResponse).toHaveBeenCalledWith(rateLimitResult);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'CUSTOM_RATE_LIMIT'
          })
        })
      );
    });

    it('should extract identifier from authorization header', async () => {
      const rateLimitResult: RateLimitResult = {
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalLimit: 100
      };

      (mockRateLimiter.checkLimit as any).mockResolvedValue(rateLimitResult);
      (mockRateLimiter.increment as any).mockResolvedValue(rateLimitResult);

      const req = createMockReq({
        headers: { authorization: 'Bearer token123' }
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = rateLimitMiddleware({
        rateLimiter: mockRateLimiter
      });

      await middleware(req, res, next);

      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(
        'user:token123',
        expect.any(Object)
      );
    });

    it('should extract identifier from API key header', async () => {
      const rateLimitResult: RateLimitResult = {
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalLimit: 100
      };

      (mockRateLimiter.checkLimit as any).mockResolvedValue(rateLimitResult);
      (mockRateLimiter.increment as any).mockResolvedValue(rateLimitResult);

      const req = createMockReq({
        headers: { 'x-api-key': 'api-key-123' }
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = rateLimitMiddleware({
        rateLimiter: mockRateLimiter
      });

      await middleware(req, res, next);

      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(
        'api_key:api-key-123',
        expect.any(Object)
      );
    });

    it('should handle rate limiter errors gracefully', async () => {
      (mockRateLimiter.checkLimit as any).mockRejectedValue(new Error('Rate limiter error'));

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = rateLimitMiddleware({
        rateLimiter: mockRateLimiter
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Utility functions', () => {
    describe('bypassRateLimit', () => {
      it('should bypass rate limit with valid bypass token', () => {
        process.env.RATE_LIMIT_BYPASS_TOKEN = 'bypass-token';
        
        const req = createMockReq({
          headers: { 'x-rate-limit-bypass': 'bypass-token' }
        });

        expect(bypassRateLimit(req)).toBe(true);
        
        delete process.env.RATE_LIMIT_BYPASS_TOKEN;
      });

      it('should bypass rate limit with admin API key', () => {
        process.env.ADMIN_API_KEY = 'admin-key';
        
        const req = createMockReq({
          headers: { 'x-api-key': 'admin-key' }
        });

        expect(bypassRateLimit(req)).toBe(true);
        
        delete process.env.ADMIN_API_KEY;
      });

      it('should not bypass rate limit without valid credentials', () => {
        const req = createMockReq();
        expect(bypassRateLimit(req)).toBe(false);
      });
    });

    describe('resetRateLimit', () => {
      it('should call rate limiter reset', async () => {
        (mockRateLimiter.reset as any).mockResolvedValue(undefined);

        const rule: RateLimitRule = {
          identifier: 'test',
          limit: 100,
          window: 60000,
          type: 'ip'
        };

        await resetRateLimit(mockRateLimiter, 'test-id', rule);

        expect(mockRateLimiter.reset).toHaveBeenCalledWith('test-id', rule);
      });

      it('should throw error if rate limiter fails', async () => {
        const error = new Error('Reset failed');
        (mockRateLimiter.reset as any).mockRejectedValue(error);

        const rule: RateLimitRule = {
          identifier: 'test',
          limit: 100,
          window: 60000,
          type: 'ip'
        };

        await expect(resetRateLimit(mockRateLimiter, 'test-id', rule))
          .rejects.toThrow('Reset failed');
      });
    });

    describe('getRateLimitStats', () => {
      it('should return rate limit statistics', async () => {
        const stats: RateLimitStats = {
          identifier: 'test-id',
          currentCount: 10,
          limit: 100,
          window: 60000,
          resetTime: Date.now() + 60000
        };

        (mockRateLimiter.getStats as any).mockResolvedValue(stats);

        const result = await getRateLimitStats(mockRateLimiter, 'test-id');

        expect(result).toEqual(stats);
        expect(mockRateLimiter.getStats).toHaveBeenCalledWith('test-id');
      });

      it('should return default stats if rate limiter fails', async () => {
        (mockRateLimiter.getStats as any).mockRejectedValue(new Error('Stats failed'));

        const result = await getRateLimitStats(mockRateLimiter, 'test-id');

        expect(result).toEqual({
          identifier: 'test-id',
          currentCount: 0,
          limit: 0,
          window: 0,
          resetTime: expect.any(Number)
        });
      });
    });

    describe('createEndpointRateLimit', () => {
      it('should create middleware with custom endpoint rule', async () => {
        const middleware = await createEndpointRateLimit('test-endpoint', {
          limit: 50,
          window: 30000
        });

        expect(typeof middleware).toBe('function');
      });
    });
  });
});