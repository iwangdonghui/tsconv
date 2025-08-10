/**
 * Redis client factory for creating Redis connections
 */

import { Redis } from '@upstash/redis';
import config from '../config/config';

export interface RedisClientOptions {
  url?: string;
  token?: string;
  maxRetries?: number;
  retryDelayOnFailure?: number;
}

/**
 * Create a Redis client instance
 */
export function createRedisClient(purpose: 'cache' | 'rate-limit' | 'general' = 'general'): Redis {
  const options: RedisClientOptions = {
    url: process.env.UPSTASH_REDIS_REST_URL || config.caching?.redis?.url,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || config.caching?.redis?.password,
    maxRetries: 3,
    retryDelayOnFailure: 1000,
  };

  if (!options.url || !options.token) {
    throw new Error(
      `Redis configuration missing for ${purpose}. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.`
    );
  }

  return new Redis({
    url: options.url,
    token: options.token,
    retry: {
      retries: options.maxRetries || 3,
      backoff: retryCount => Math.min(1000 * Math.pow(2, retryCount), 10000),
    },
  });
}

/**
 * Create a Redis client with specific configuration
 */
export function createRedisClientWithConfig(config: RedisClientOptions): Redis {
  if (!config.url || !config.token) {
    throw new Error('Redis URL and token are required');
  }

  return new Redis({
    url: config.url,
    token: config.token,
    retry: {
      retries: config.maxRetries || 3,
      backoff: retryCount => Math.min(1000 * Math.pow(2, retryCount), 10000),
    },
  });
}

/**
 * Test Redis connection
 */
export async function testRedisConnection(client: Redis): Promise<boolean> {
  try {
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}

export default createRedisClient;
