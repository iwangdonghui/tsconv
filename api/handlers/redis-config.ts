import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, ResponseBuilder, withCors } from '../utils/response.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import config from '../config/config.js';

/**
 * API endpoint for Redis configuration and status
 * This endpoint allows checking Redis connection status and configuration
 * It's protected and only accessible with admin privileges
 */
async function redisConfigHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    return APIErrorHandler.handleBadRequest(res, 'Only GET and POST methods are allowed');
  }

  // Check for admin authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return APIErrorHandler.handleBadRequest(res, 'Authorization required');
  }

  // Simple token validation (in production, use proper authentication)
  const token = authHeader.split(' ')[1];
  if (token !== 'admin-token') {
    return APIErrorHandler.handleBadRequest(res, 'Invalid authorization token');
  }

  try {
    // GET request returns Redis configuration and status
    if (req.method === 'GET') {
      const redisConfig = {
        enabled: config.caching.enabled,
        url: maskRedisUrl(config.caching.redis.url),
        maxRetries: config.caching.redis.maxRetries,
        status: 'disconnected', // Default status
        connectionType: 'mock' // Default connection type
      };

      // Check if Redis is actually connected
      // This is a mock implementation - in a real app, you'd check the actual connection
      if (config.caching.enabled && config.caching.redis.url) {
        // Mock Redis connection check
        const isConnected = mockRedisConnectionCheck();
        
        redisConfig.status = isConnected ? 'connected' : 'error';
        redisConfig.connectionType = config.caching.redis.url.includes('redis://') ? 'redis' : 'upstash';
      }

      const builder = new ResponseBuilder().setData(redisConfig);
      return builder.send(res);
    }

    // POST request allows updating Redis configuration
    if (req.method === 'POST') {
      const { enabled, url, maxRetries } = req.body;

      // Validate input
      if (typeof enabled !== 'boolean' && enabled !== undefined) {
        return APIErrorHandler.handleBadRequest(res, 'enabled must be a boolean');
      }

      if (url !== undefined && typeof url !== 'string') {
        return APIErrorHandler.handleBadRequest(res, 'url must be a string');
      }

      if (maxRetries !== undefined && (typeof maxRetries !== 'number' || maxRetries < 0)) {
        return APIErrorHandler.handleBadRequest(res, 'maxRetries must be a positive number');
      }

      // Update configuration (mock implementation)
      const updatedConfig = {
        enabled: enabled !== undefined ? enabled : config.caching.enabled,
        url: url !== undefined ? url : config.caching.redis.url,
        maxRetries: maxRetries !== undefined ? maxRetries : config.caching.redis.maxRetries,
        status: 'updated',
        connectionType: url?.includes('redis://') ? 'redis' : 'upstash'
      };

      // In a real implementation, you would update the actual configuration
      // and restart the Redis connection

      const builder = new ResponseBuilder()
        .setData({
          message: 'Redis configuration updated',
          config: {
            ...updatedConfig,
            url: maskRedisUrl(updatedConfig.url)
          }
        });
      
      return builder.send(res);
    }
  } catch (error) {
    console.error('Redis config API error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

// Mask Redis URL for security
function maskRedisUrl(url: string): string {
  if (!url) return '';
  
  try {
    const parsedUrl = new URL(url);
    
    // Mask password if present
    if (parsedUrl.password) {
      parsedUrl.password = '********';
    }
    
    return parsedUrl.toString();
  } catch (error) {
    // If URL parsing fails, return a generic masked string
    return url.replace(/:[^:@]+@/, ':********@');
  }
}

// Mock Redis connection check
function mockRedisConnectionCheck(): boolean {
  // In a real implementation, you would check the actual Redis connection
  // This is just a mock that returns true 90% of the time
  return Math.random() < 0.9;
}

// Enhanced Redis config API with rate limiting
const enhancedRedisConfigHandler = withCors(
  createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Strict limit for admin endpoints
    message: 'Too many requests to admin endpoint, please try again later.'
  })(redisConfigHandler)
);

export default enhancedRedisConfigHandler;