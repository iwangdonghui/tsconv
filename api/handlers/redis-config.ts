import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders } from '../utils/response';
import config from '../config/config';

interface RedisConfigRequest {
  action: 'get' | 'test' | 'validate';
  settings?: {
    url?: string;
    password?: string;
    maxRetries?: number;
    useUpstash?: boolean;
  };
}

interface RedisConfigResponse {
  current: {
    url: string;
    hasPassword: boolean;
    maxRetries: number;
    useUpstash: boolean;
    fallbackToMemory: boolean;
  };
  status: 'connected' | 'disconnected' | 'error';
  lastTest?: {
    timestamp: number;
    success: boolean;
    responseTime: number;
    error?: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const corsHeaders = createCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Return current Redis configuration
      const configResponse: RedisConfigResponse = {
        current: {
          url: maskRedisUrl(config.caching.redis.url),
          hasPassword: !!config.caching.redis.password,
          maxRetries: config.caching.redis.maxRetries,
          useUpstash: config.caching.redis.useUpstash || false,
          fallbackToMemory: config.caching.redis.fallbackToMemory || false
        },
        status: 'disconnected'
      };

      // Test connection status
      try {
        const { createRedisClient } = await import('../services/redis-client');
        const redis = createRedisClient('general');
        const startTime = Date.now();
        
        // Upstash Redis doesn't require explicit connection
        await redis.ping(); // Test connection
        // No need to disconnect with Upstash
        
        configResponse.status = 'connected';
        configResponse.lastTest = {
          timestamp: Date.now(),
          success: true,
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        configResponse.status = 'error';
        configResponse.lastTest = {
          timestamp: Date.now(),
          success: false,
          responseTime: 0,
          error: (error as Error).message
        };
      }

      return APIErrorHandler.sendSuccess(res, configResponse);
    }

    if (req.method === 'POST') {
      // Basic authentication check
      const authHeader = req.headers.authorization;
      const adminKey = process.env.REDIS_ADMIN_KEY;
      
      if (!adminKey || !authHeader || authHeader !== `Bearer ${adminKey}`) {
        return APIErrorHandler.handleUnauthorized(res, 'Invalid or missing admin credentials');
      }

      const { action, settings }: RedisConfigRequest = req.body;

      if (!action) {
        return APIErrorHandler.handleBadRequest(res, 'Action is required', {
          supportedActions: ['get', 'test', 'validate']
        });
      }

      switch (action) {
        case 'get':
          const configResponse: RedisConfigResponse = {
            current: {
              url: maskRedisUrl(config.caching.redis.url),
              hasPassword: !!config.caching.redis.password,
              maxRetries: config.caching.redis.maxRetries,
              useUpstash: config.caching.redis.useUpstash || false,
              fallbackToMemory: config.caching.redis.fallbackToMemory || false
            },
            status: 'disconnected'
          };
          return APIErrorHandler.sendSuccess(res, configResponse);

        case 'test':
          const testResult = await testRedisConnection(settings);
          return APIErrorHandler.sendSuccess(res, testResult);

        case 'validate':
          const validationResult = validateRedisConfig(settings);
          return APIErrorHandler.sendSuccess(res, validationResult);

        default:
          return APIErrorHandler.handleBadRequest(res, `Unsupported action: ${action}`, {
            supportedActions: ['get', 'test', 'validate']
          });
      }
    }

    return APIErrorHandler.handleMethodNotAllowed(res, 'Only GET and POST methods are allowed');

  } catch (error) {
    console.error('Redis config error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'redis-config',
      action: req.body?.action
    });
  }
}

function maskRedisUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.password) {
      parsedUrl.password = '********';
    }
    return parsedUrl.toString();
  } catch (error) {
    return url.replace(/:[^:@]+@/, ':********@');
  }
}

async function testRedisConnection(settings?: any): Promise<any> {
  const startTime = Date.now();
  
  try {
    const { createRedisClient } = await import('../services/redis-client');
    const redis = createRedisClient('general');
    
    // Upstash Redis doesn't require explicit connection
    
    // Test basic operations
    const testKey = `test:${Date.now()}`;
    await redis.set(testKey, 'test-value', { ex: 10 }); // 10 second TTL
    const value = await redis.get(testKey);
    await redis.del(testKey);
    
    // No need to disconnect with Upstash
    
    return {
      success: true,
      responseTime: Date.now() - startTime,
      timestamp: Date.now(),
      operations: {
        connect: true,
        set: true,
        get: value === 'test-value',
        delete: true,
        disconnect: true
      }
    };
  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      timestamp: Date.now(),
      error: (error as Error).message,
      operations: {
        connect: false,
        set: false,
        get: false,
        delete: false,
        disconnect: false
      }
    };
  }
}

function validateRedisConfig(settings?: any): any {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!settings) {
    return {
      valid: true,
      current: true,
      errors: [],
      warnings: ['Using current configuration']
    };
  }

  // Validate URL
  if (settings.url) {
    try {
      const url = new URL(settings.url);
      if (!['redis:', 'rediss:'].includes(url.protocol)) {
        errors.push('URL must use redis:// or rediss:// protocol');
      }
      if (!url.hostname) {
        errors.push('URL must include a hostname');
      }
      if (url.port && (parseInt(url.port) < 1 || parseInt(url.port) > 65535)) {
        errors.push('Port must be between 1 and 65535');
      }
    } catch (error) {
      errors.push('Invalid Redis URL format');
    }
  }

  // Validate maxRetries
  if (settings.maxRetries !== undefined) {
    if (typeof settings.maxRetries !== 'number' || settings.maxRetries < 0 || settings.maxRetries > 10) {
      errors.push('maxRetries must be a number between 0 and 10');
    }
  }

  // Validate password
  if (settings.password !== undefined && typeof settings.password !== 'string') {
    errors.push('Password must be a string');
  }

  // Validate useUpstash
  if (settings.useUpstash !== undefined && typeof settings.useUpstash !== 'boolean') {
    errors.push('useUpstash must be a boolean');
  }

  // Warnings
  if (settings.url && !settings.password && !settings.url.includes('@')) {
    warnings.push('Consider using authentication for production Redis instances');
  }

  if (settings.maxRetries && settings.maxRetries > 5) {
    warnings.push('High retry count may cause delays during connection issues');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    settings: {
      url: settings.url ? maskRedisUrl(settings.url) : undefined,
      hasPassword: !!settings.password,
      maxRetries: settings.maxRetries,
      useUpstash: settings.useUpstash
    }
  };
}