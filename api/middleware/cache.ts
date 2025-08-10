import { VercelRequest, VercelResponse } from '@vercel/node';
import { CacheService, CacheableRequest, APIResponse } from '../types/api';
import config, { getCacheTTL } from '../config/config';

// Cache middleware factory
export interface CacheMiddlewareOptions {
  cacheService: CacheService;
  ttl?: number;
  keyGenerator?: (req: VercelRequest) => string;
  shouldCache?: (req: VercelRequest, res: VercelResponse) => boolean;
  onCacheHit?: (key: string, data: any) => void;
  onCacheMiss?: (key: string) => void;
  cacheControlHeader?: string;
  skipCache?: (req: VercelRequest) => boolean;
}

export interface CacheableResponse extends APIResponse {
  cache?: {
    key: string;
    ttl: number;
    hit: boolean;
    size: number;
  };
}

// Default key generator
const defaultKeyGenerator = (req: VercelRequest): string => {
  const endpoint = req.url || 'unknown';
  const method = req.method || 'GET';
  const query = req.query || {};
  const body = req.method === 'POST' ? req.body : {};

  // Create cacheable request object
  const cacheableRequest: CacheableRequest = {
    endpoint: `${method}:${endpoint}`,
    parameters: { ...query, ...body },
    userId: (req.headers['x-user-id'] as string) || undefined,
  };

  // Use the cache service's key generation logic
  return `middleware:${cacheableRequest.endpoint}:${JSON.stringify(cacheableRequest.parameters)}`;
};

// Default cache condition
const defaultShouldCache = (req: VercelRequest, res: VercelResponse): boolean => {
  // Only cache GET requests by default
  if (req.method !== 'GET') return false;

  // Don't cache if caching is disabled
  if (!config.caching.enabled) return false;

  // Don't cache if cache-control header says no-cache
  const cacheControl = req.headers['cache-control'];
  if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('no-store'))) {
    return false;
  }

  // Don't cache error responses
  if (res.statusCode && res.statusCode >= 400) return false;

  return true;
};

// Cache middleware function
export const cacheMiddleware = (options: CacheMiddlewareOptions) => {
  const {
    cacheService,
    ttl,
    keyGenerator = defaultKeyGenerator,
    shouldCache = defaultShouldCache,
    onCacheHit,
    onCacheMiss,
  } = options;

  return async (
    req: VercelRequest,
    res: VercelResponse,
    next: () => Promise<void>
  ): Promise<void> => {
    // Skip caching if not enabled
    if (!config.caching.enabled) {
      await next();
      return;
    }

    const cacheKey = keyGenerator(req);
    const cacheTTL = ttl || getCacheTTL(req.url?.split('/').pop());

    try {
      // Try to get from cache first
      const cachedData = await cacheService.get<CacheableResponse>(cacheKey);

      if (cachedData && shouldCache(req, res)) {
        // Cache hit - return cached data
        if (onCacheHit) {
          onCacheHit(cacheKey, cachedData);
        }

        // Add cache info to response
        const responseWithCache: CacheableResponse = {
          ...cachedData,
          cache: {
            key: cacheKey,
            ttl: cacheTTL,
            hit: true,
            size: JSON.stringify(cachedData).length,
          },
        };

        // Set cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('Cache-Control', `public, max-age=${Math.floor(cacheTTL / 1000)}`);

        res.status(200).json(responseWithCache);
        return;
      }

      // Cache miss - call next middleware/handler
      if (onCacheMiss) {
        onCacheMiss(cacheKey);
      }

      // Intercept the response to cache it
      const originalJson = res.json;
      const originalSend = res.send;
      let responseData: any = null;

      // Override res.json to capture response data
      res.json = function (data: any) {
        responseData = data;
        return originalJson.call(this, data);
      };

      // Override res.send to capture response data
      res.send = function (data: any) {
        if (typeof data === 'string') {
          try {
            responseData = JSON.parse(data);
          } catch {
            responseData = data;
          }
        } else {
          responseData = data;
        }
        return originalSend.call(this, data);
      };

      // Call the next middleware/handler
      await next();

      // Cache the response if conditions are met
      if (responseData && shouldCache(req, res)) {
        try {
          // Add cache info to response before caching
          const responseToCache: CacheableResponse = {
            ...responseData,
            cache: {
              key: cacheKey,
              ttl: cacheTTL,
              hit: false,
              size: JSON.stringify(responseData).length,
            },
          };

          await cacheService.set(cacheKey, responseToCache, cacheTTL);

          // Set cache headers
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-Key', cacheKey);
          res.setHeader('Cache-Control', `public, max-age=${Math.floor(cacheTTL / 1000)}`);
        } catch (cacheError) {
          // Log cache error but don't fail the request
          console.error('Cache storage error:', cacheError);
        }
      }
    } catch (error) {
      // Log cache error but continue with request
      console.error('Cache middleware error:', error);
      await next();
    }
  };
};

// Convenience function for creating cache middleware with default cache service
export const createCacheMiddleware = (options?: Partial<CacheMiddlewareOptions>) => {
  // Import cache service dynamically to avoid circular dependencies
  const getCacheService = async (): Promise<CacheService> => {
    try {
      const { CacheFactory } = await import('../services/cache-factory');
      return CacheFactory.create();
    } catch {
      // Fallback to memory cache service
      const { MemoryCacheService } = await import('../services/cache-service');
      return new MemoryCacheService();
    }
  };

  return (handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) => {
    return async (req: VercelRequest, res: VercelResponse) => {
      const cacheService = await getCacheService();
      const middleware = cacheMiddleware({
        cacheService,
        ...options,
      });

      return middleware(req, res, async () => {
        await handler(req, res);
      });
    };
  };
};

// Cache invalidation utilities
export const invalidateCache = async (
  cacheService: CacheService,
  pattern: string
): Promise<void> => {
  try {
    await cacheService.clear(pattern);
  } catch (error) {
    console.error('Cache invalidation error:', error);
    throw error;
  }
};

// Cache warming utilities
export const warmCache = async (
  cacheService: CacheService,
  requests: Array<{ key: string; data: any; ttl?: number }>
): Promise<void> => {
  try {
    await Promise.all(
      requests.map(({ key, data, ttl }) =>
        cacheService.set(key, data, ttl || config.caching.defaultTTL)
      )
    );
  } catch (error) {
    console.error('Cache warming error:', error);
    throw error;
  }
};

// Cache statistics utilities
export const getCacheStats = async (cacheService: CacheService) => {
  try {
    return await cacheService.stats();
  } catch (error) {
    console.error('Cache stats error:', error);
    return {
      hits: 0,
      misses: 0,
      size: 0,
      keys: [],
    };
  }
};

// Types are already exported above
