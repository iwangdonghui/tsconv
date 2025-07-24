import { VercelRequest, VercelResponse } from '@vercel/node';
import cacheService from '../services/cache-service.js.js';
import { CacheableRequest } from '../types/api.js.js';

interface CacheOptions {
  ttl?: number;
  cacheControlHeader?: string;
  skipCache?: (req: VercelRequest) => boolean;
  keyGenerator?: (req: VercelRequest) => string;
}

export function createCacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 300000, // 5 minutes default
    cacheControlHeader = 'public, max-age=300',
    skipCache = () => false,
    keyGenerator
  } = options;

  return function cacheMiddleware(handler: Function) {
    return async (req: VercelRequest, res: VercelResponse) => {
      // Skip caching for non-GET requests or when explicitly skipped
      if (req.method !== 'GET' || skipCache(req)) {
        return handler(req, res);
      }

      try {
        // Generate cache key
        const cacheKey = keyGenerator ? keyGenerator(req) : generateCacheKey(req);
        
        // Try to get from cache
        const cachedResponse = await cacheService.get(cacheKey);
        
        if (cachedResponse) {
          // Set cache headers
          res.setHeader('Cache-Control', cacheControlHeader);
          res.setHeader('X-Cache', 'HIT');
          
          // Return cached response
          return res.json(cachedResponse);
        }

        // Cache miss - intercept response to cache it
        const originalJson = res.json;
        let responseData: any;
        
        res.json = function(data: any) {
          responseData = data;
          
          // Cache successful responses only
          if (data.success !== false) {
            cacheService.set(cacheKey, data, ttl).catch(err => {
              console.warn('Cache set error:', err);
            });
          }
          
          // Set cache headers
          res.setHeader('Cache-Control', cacheControlHeader);
          res.setHeader('X-Cache', 'MISS');
          
          return originalJson.call(this, data);
        };

        return handler(req, res);
        
      } catch (error) {
        console.warn('Cache middleware error:', error);
        // Continue without caching on error
        return handler(req, res);
      }
    };
  };
}

function generateCacheKey(req: VercelRequest): string {
  const cacheableRequest: CacheableRequest = {
    endpoint: req.url?.split('?')[0] || '',
    parameters: { ...req.query, ...req.body },
    userId: extractUserId(req)
  };
  
  return cacheService.generateKey(cacheableRequest);
}

function extractUserId(req: VercelRequest): string | undefined {
  // Try to extract user ID from authorization header
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // This is a simplified extraction - in real implementation,
    // you'd decode the JWT token or API key
    return authHeader.split(' ')[1]?.substring(0, 10);
  }
  
  return undefined;
}