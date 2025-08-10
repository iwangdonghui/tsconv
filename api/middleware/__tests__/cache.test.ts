import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  cacheMiddleware,
  createCacheMiddleware,
  invalidateCache,
  warmCache,
  getCacheStats,
} from '../cache';
import { CacheService, CacheStats } from '../../types/api';

// Mock cache service
const mockCacheService: CacheService = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  generateKey: vi.fn(),
  clear: vi.fn(),
  stats: vi.fn(),
};

// Mock config
vi.mock('../../config/config', () => ({
  default: {
    caching: {
      enabled: true,
      defaultTTL: 300000,
    },
  },
  getCacheTTL: vi.fn(() => 300000),
}));

// Helper to create mock request/response
const createMockReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'GET',
    url: '/api/convert',
    query: { timestamp: '1234567890' },
    headers: {},
    body: {},
    ...overrides,
  }) as VercelRequest;

const createMockRes = (): VercelResponse => {
  const res = {
    statusCode: 200,
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as unknown as VercelResponse;

  return res;
};

describe('Cache Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cacheMiddleware', () => {
    it('should return cached data on cache hit', async () => {
      const cachedData = { success: true, data: { timestamp: 1234567890 } };
      (mockCacheService.get as any).mockResolvedValue(cachedData);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = cacheMiddleware({
        cacheService: mockCacheService,
        ttl: 300000,
      });

      await middleware(req, res, next);

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ...cachedData,
          cache: expect.objectContaining({
            hit: true,
          }),
        })
      );
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
    });

    it('should call next and cache response on cache miss', async () => {
      (mockCacheService.get as any).mockResolvedValue(null);
      (mockCacheService.set as any).mockResolvedValue(undefined);

      const req = createMockReq();
      const res = createMockRes();
      const responseData = { success: true, data: { timestamp: 1234567890 } };

      const next = vi.fn().mockImplementation(() => {
        res.json(responseData);
      });

      const middleware = cacheMiddleware({
        cacheService: mockCacheService,
        ttl: 300000,
      });

      await middleware(req, res, next);

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
    });

    it('should skip caching for POST requests by default', async () => {
      const req = createMockReq({ method: 'POST' });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = cacheMiddleware({
        cacheService: mockCacheService,
      });

      await middleware(req, res, next);

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should skip caching when cache-control header is no-cache', async () => {
      const req = createMockReq({
        headers: { 'cache-control': 'no-cache' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = cacheMiddleware({
        cacheService: mockCacheService,
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should call onCacheHit callback when cache hits', async () => {
      const cachedData = { success: true, data: { timestamp: 1234567890 } };
      (mockCacheService.get as any).mockResolvedValue(cachedData);

      const onCacheHit = vi.fn();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = cacheMiddleware({
        cacheService: mockCacheService,
        onCacheHit,
      });

      await middleware(req, res, next);

      expect(onCacheHit).toHaveBeenCalledWith(expect.any(String), cachedData);
    });

    it('should call onCacheMiss callback when cache misses', async () => {
      (mockCacheService.get as any).mockResolvedValue(null);

      const onCacheMiss = vi.fn();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = cacheMiddleware({
        cacheService: mockCacheService,
        onCacheMiss,
      });

      await middleware(req, res, next);

      expect(onCacheMiss).toHaveBeenCalledWith(expect.any(String));
    });

    it('should use custom key generator when provided', async () => {
      const customKeyGenerator = vi.fn().mockReturnValue('custom-key');
      (mockCacheService.get as any).mockResolvedValue(null);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = cacheMiddleware({
        cacheService: mockCacheService,
        keyGenerator: customKeyGenerator,
      });

      await middleware(req, res, next);

      expect(customKeyGenerator).toHaveBeenCalledWith(req);
      expect(mockCacheService.get).toHaveBeenCalledWith('custom-key');
    });

    it('should handle cache service errors gracefully', async () => {
      (mockCacheService.get as any).mockRejectedValue(new Error('Cache error'));

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = cacheMiddleware({
        cacheService: mockCacheService,
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('createCacheMiddleware', () => {
    it('should create middleware with default cache service', async () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = await createCacheMiddleware();

      // Should not throw
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Cache utilities', () => {
    describe('invalidateCache', () => {
      it('should call cache service clear with pattern', async () => {
        (mockCacheService.clear as any).mockResolvedValue(undefined);

        await invalidateCache(mockCacheService, 'pattern:*');

        expect(mockCacheService.clear).toHaveBeenCalledWith('pattern:*');
      });

      it('should throw error if cache service fails', async () => {
        const error = new Error('Clear failed');
        (mockCacheService.clear as any).mockRejectedValue(error);

        await expect(invalidateCache(mockCacheService, 'pattern:*')).rejects.toThrow(
          'Clear failed'
        );
      });
    });

    describe('warmCache', () => {
      it('should set multiple cache entries', async () => {
        (mockCacheService.set as any).mockResolvedValue(undefined);

        const requests = [
          { key: 'key1', data: 'data1', ttl: 1000 },
          { key: 'key2', data: 'data2' },
        ];

        await warmCache(mockCacheService, requests);

        expect(mockCacheService.set).toHaveBeenCalledTimes(2);
        expect(mockCacheService.set).toHaveBeenCalledWith('key1', 'data1', 1000);
        expect(mockCacheService.set).toHaveBeenCalledWith('key2', 'data2', 300000);
      });

      it('should throw error if cache service fails', async () => {
        const error = new Error('Set failed');
        (mockCacheService.set as any).mockRejectedValue(error);

        const requests = [{ key: 'key1', data: 'data1' }];

        await expect(warmCache(mockCacheService, requests)).rejects.toThrow('Set failed');
      });
    });

    describe('getCacheStats', () => {
      it('should return cache statistics', async () => {
        const stats: CacheStats = {
          hits: 100,
          misses: 20,
          size: 50,
          keys: ['key1', 'key2'],
        };
        (mockCacheService.stats as any).mockResolvedValue(stats);

        const result = await getCacheStats(mockCacheService);

        expect(result).toEqual(stats);
        expect(mockCacheService.stats).toHaveBeenCalled();
      });

      it('should return default stats if cache service fails', async () => {
        (mockCacheService.stats as any).mockRejectedValue(new Error('Stats failed'));

        const result = await getCacheStats(mockCacheService);

        expect(result).toEqual({
          hits: 0,
          misses: 0,
          size: 0,
          keys: [],
        });
      });
    });
  });
});
