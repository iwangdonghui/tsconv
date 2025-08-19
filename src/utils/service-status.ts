// 创建环境检测工具
export const getEnvironment = () => {
  // Safely access process.env with fallbacks for browser environment
  const nodeEnv = (typeof process !== 'undefined' && process.env?.NODE_ENV) || 'development';
  const redisUrl = (typeof process !== 'undefined' && process.env?.REDIS_URL) || '';
  const kvUrl = (typeof process !== 'undefined' && process.env?.KV_URL) || '';

  return {
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    hasRedis: !!(redisUrl || kvUrl),
    hasRateLimiter: true, // 内存实现始终可用
  };
};

// 创建服务可用性检测
export const checkServiceAvailability = async () => {
  const env = getEnvironment();

  return {
    redis: {
      available: env.hasRedis,
      type: env.hasRedis ? 'redis' : 'memory',
      description: env.hasRedis ? 'Redis缓存服务' : '内存缓存服务',
    },
    rateLimit: {
      available: true,
      type: 'memory',
      description: '内存限流服务',
    },
    timezone: {
      available: true,
      type: 'iana',
      description: 'IANA时区数据库',
    },
    format: {
      available: true,
      type: 'built-in',
      description: '内置格式服务',
    },
  };
};
