import { VercelRequest, VercelResponse } from '@vercel/node';
import { createRedisClient } from '../services/redis-client';
import { APIErrorHandler, createCorsHeaders } from '../utils/response';

interface RedisAdminRequest {
  action: 'info' | 'flushall' | 'keys' | 'get' | 'set' | 'del' | 'stats';
  key?: string;
  value?: string;
  pattern?: string;
  ttl?: number;
}

interface RedisStats {
  totalKeys: number;
  memoryUsage: string;
  uptime: string;
  connectedClients: number;
  commandsProcessed: number;
  keyspaceHits: number;
  keyspaceMisses: number;
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

  // Only allow POST requests for admin operations
  if (req.method !== 'POST') {
    return APIErrorHandler.handleMethodNotAllowed(
      res,
      'Only POST method is allowed for Redis admin operations'
    );
  }

  try {
    // Basic authentication check
    const authHeader = req.headers.authorization;
    const adminKey = process.env.REDIS_ADMIN_KEY;

    if (!adminKey || !authHeader || authHeader !== `Bearer ${adminKey}`) {
      return APIErrorHandler.handleUnauthorized(res, 'Invalid or missing admin credentials');
    }

    const { action, key, value, pattern, ttl }: RedisAdminRequest = req.body;

    if (!action) {
      return APIErrorHandler.handleBadRequest(res, 'Action is required', {
        supportedActions: ['info', 'flushall', 'keys', 'get', 'set', 'del', 'stats'],
      });
    }

    const redis = createRedisClient('general');
    // Upstash Redis doesn't require explicit connection

    let result: any;

    switch (action) {
      case 'info':
        // Upstash doesn't have info(), use ping and dbsize instead
        await redis.ping();
        result = { status: 'connected', dbsize: await redis.dbsize() };
        break;

      case 'stats': {
        // Upstash doesn't have info(), use alternative approach
        await redis.ping();
        const keys = await redis.keys('*');
        // Note: Upstash does not expose DB size reliably; avoid unused variable to satisfy TS

        // Since Upstash doesn't provide detailed info, use basic stats
        const stats: RedisStats = {
          totalKeys: keys.length,
          memoryUsage: 'N/A', // Not available in Upstash
          uptime: 'N/A', // Not available in Upstash
          connectedClients: 1, // Always 1 for REST API
          commandsProcessed: 0, // Would need to track separately
          keyspaceHits: 0, // Would need to track separately
          keyspaceMisses: 0, // Would need to track separately
        };

        result = stats;
        break;
      }

      case 'keys': {
        const searchPattern = pattern || '*';
        result = await redis.keys(searchPattern);
        break;
      }

      case 'get': {
        if (!key) {
          return APIErrorHandler.handleBadRequest(res, 'Key is required for get operation');
        }
        result = await redis.get(key);
        break;
      }

      case 'set': {
        if (!key || value === undefined) {
          return APIErrorHandler.handleBadRequest(
            res,
            'Key and value are required for set operation'
          );
        }
        if (ttl) {
          await redis.setex(key, ttl, value);
        } else {
          await redis.set(key, value);
        }
        result = { success: true, key, value, ttl };
        break;
      }

      case 'del': {
        if (!key) {
          return APIErrorHandler.handleBadRequest(res, 'Key is required for delete operation');
        }
        const deleted = await redis.del(key);
        result = { success: true, key, deleted: deleted === 1 };
        break;
      }

      case 'flushall':
        await redis.flushall();
        result = { success: true, message: 'All keys deleted' };
        break;

      default:
        return APIErrorHandler.handleBadRequest(res, `Unsupported action: ${action}`, {
          supportedActions: ['info', 'flushall', 'keys', 'get', 'set', 'del', 'stats'],
        });
    }

    // No need to disconnect with Upstash

    APIErrorHandler.sendSuccess(res, result, {
      processingTime: Date.now(),
      itemCount: Array.isArray(result) ? result.length : 1,
      cacheHit: false,
    });
  } catch (error) {
    console.error('Redis admin error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'redis-admin',
      action: req.body?.action,
    });
  }
}

// @ts-ignore - helper retained for future Redis versions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _extractInfoValue(lines: string[], key: string): string | null {
  const line = lines.find(l => l.startsWith(`${key}:`));
  return line ? line.split(':')[1]?.trim() || null : null;
}
void _extractInfoValue; // mark as intentionally unused
