/**
 * Redis configuration for the application
 * This file contains configuration for Redis connections
 */

const redisConfig = {
  // Main Redis connection
  main: {
    url: process.env.REDIS_URL || process.env.KV_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || process.env.KV_REST_API_TOKEN,
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    retryDelay: 1000,
    connectTimeout: 5000,
    keepAlive: 30000,
    family: 4, // IPv4
    keyPrefix: 'tsconv:',
  },

  // Redis connection for rate limiting
  rateLimiting: {
    url:
      process.env.RATE_LIMIT_REDIS_URL ||
      process.env.REDIS_URL ||
      process.env.KV_URL ||
      'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || process.env.KV_REST_API_TOKEN,
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    keyPrefix: 'tsconv:ratelimit:',
  },

  // Redis connection for caching
  cache: {
    url:
      process.env.CACHE_REDIS_URL ||
      process.env.REDIS_URL ||
      process.env.KV_URL ||
      'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || process.env.KV_REST_API_TOKEN,
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    keyPrefix: 'tsconv:cache:',
  },
};

// Helper functions
function getRedisConfig(type = 'main') {
  return redisConfig[type] || redisConfig.main;
}

function createRedisClient(type = 'main') {
  // This is a mock function - in a real implementation, you would create a Redis client
  // using a library like ioredis or redis
  const config = getRedisConfig(type);

  return {
    config,
    isConnected: false,
    connect: async () => {
      // Mock connection
      console.log(`Connecting to Redis (${type})...`);
      return Promise.resolve(true);
    },
    disconnect: async () => {
      // Mock disconnection
      console.log(`Disconnecting from Redis (${type})...`);
      return Promise.resolve(true);
    },
  };
}

module.exports = {
  redisConfig,
  getRedisConfig,
  createRedisClient,
};
