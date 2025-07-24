import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, ResponseBuilder, withCors } from '../utils/response';
import { createRateLimitMiddleware } from '../middleware/rate-limit';
import { createRedisClient } from '../services/redis-client';

/**
 * Redis Admin API
 * This API provides administrative functions for Redis
 * Note: This should be protected in production environments
 */
async function redisAdminHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    return APIErrorHandler.handleBadRequest(res, 'Only GET and POST methods are allowed');
  }

  // Check for API key for security
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return APIErrorHandler.handleBadRequest(res, 'Invalid or missing API key');
  }

  try {
    const { action, type = 'main', pattern } = req.query;
    const redis = createRedisClient(type as 'cache' | 'rateLimiting' | 'main');

    // Connect to Redis
    await redis.connect();

    let result;
    switch (action) {
      case 'info':
        // Get Redis info
        result = await redis.info();
        break;

      case 'keys':
        // List keys matching pattern
        const keyPattern = pattern ? String(pattern) : '*';
        const keys = await redis.keys(keyPattern);
        result = {
          pattern: keyPattern,
          count: keys.length,
          keys: keys.slice(0, 100) // Limit to 100 keys
        };
        break;

      case 'flush':
        // Flush all keys (dangerous operation)
        if (req.method !== 'POST') {
          return APIErrorHandler.handleBadRequest(res, 'Flush operation requires POST method');
        }
        await redis.flushall();
        result = { success: true, message: 'Redis flushed successfully' };
        break;

      case 'stats':
        // Get Redis stats
        const info = await redis.info();
        const keyCount = (await redis.keys('*')).length;
        
        // Parse memory usage from info
        const memoryMatch = info.match(/used_memory_human:(\S+)/);
        const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';
        
        result = {
          keyCount,
          memoryUsage,
          type,
          connected: true
        };
        break;

      default:
        return APIErrorHandler.handleBadRequest(res, `Unknown action: ${action}`);
    }

    // Disconnect from Redis
    await redis.disconnect();

    // Send response
    const builder = new ResponseBuilder()
      .setData(result)
      .addMetadata('redisType', type);
    
    builder.send(res);

  } catch (error) {
    console.error('Redis admin error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

// Enhanced Redis admin API with rate limiting
const enhancedRedisAdminHandler = withCors(
  createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Lower limit for admin operations
    message: 'Too many admin requests, please try again later.'
  })(redisAdminHandler)
);

export default enhancedRedisAdminHandler;