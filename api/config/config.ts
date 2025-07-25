import { APIConfiguration, RateLimitRule } from '../_shared';

// Load environment variables with fallbacks
const config: APIConfiguration = {
  rateLimiting: {
    enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
    rules: [
      {
        identifier: 'anonymous',
        limit: parseInt(process.env.ANONYMOUS_RATE_LIMIT || '100', 10),
        window: 60 * 1000, // 1 minute
        type: 'ip'
      },
      {
        identifier: 'authenticated',
        limit: parseInt(process.env.AUTHENTICATED_RATE_LIMIT || '1000', 10),
        window: 60 * 1000, // 1 minute
        type: 'user'
      }
    ],
    defaultLimits: {
      anonymous: {
        identifier: 'anonymous',
        limit: parseInt(process.env.ANONYMOUS_RATE_LIMIT || '100', 10),
        window: 60 * 1000,
        type: 'ip'
      },
      authenticated: {
        identifier: 'authenticated',
        limit: parseInt(process.env.AUTHENTICATED_RATE_LIMIT || '1000', 10),
        window: 60 * 1000,
        type: 'user'
      }
    }
  },
  caching: {
    enabled: process.env.CACHING_ENABLED !== 'false',
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10) * 1000, // 5 minutes
    maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE || '100', 10) * 1024 * 1024, // 100MB
    redis: {
      url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || process.env.KV_URL || 'redis://localhost:6379',
      password: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_PASSWORD || process.env.KV_REST_API_TOKEN,
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
      fallbackToMemory: process.env.REDIS_FALLBACK_ENABLED !== 'false',
      useUpstash: process.env.USE_UPSTASH_REDIS === 'true' || !!process.env.UPSTASH_REDIS_REST_URL
    }
  },
  timezone: {
    dataSource: process.env.TIMEZONE_DATA_SOURCE || 'iana',
    updateInterval: parseInt(process.env.TIMEZONE_UPDATE_INTERVAL || '86400000', 10), // 24 hours
    fallbackTimezone: process.env.FALLBACK_TIMEZONE || 'UTC',
    maxTimezoneOffset: parseInt(process.env.MAX_TIMEZONE_OFFSET || '43200', 10) // 12 hours in seconds
  },
  monitoring: {
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    alertThresholds: [
      {
        metric: 'error_rate',
        threshold: parseFloat(process.env.ERROR_RATE_THRESHOLD || '5'),
        duration: parseInt(process.env.ERROR_ALERT_DURATION || '300000', 10), // 5 minutes
        severity: 'high'
      },
      {
        metric: 'response_time',
        threshold: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '1000', 10), // 1 second
        duration: parseInt(process.env.RESPONSE_TIME_DURATION || '300000', 10), // 5 minutes
        severity: 'medium'
      },
      {
        metric: 'cache_hit_ratio',
        threshold: parseFloat(process.env.CACHE_HIT_THRESHOLD || '0.8'), // 80%
        duration: parseInt(process.env.CACHE_HIT_DURATION || '600000', 10), // 10 minutes
        severity: 'low'
      }
    ]
  },
  security: {
    cors: {
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    },
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '1mb',
    timeout: parseInt(process.env.API_TIMEOUT || '30000', 10) // 30 seconds
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  config.rateLimiting.enabled = false;
  config.caching.enabled = false;
  config.monitoring.logLevel = 'debug';
}

if (process.env.NODE_ENV === 'test') {
  config.rateLimiting.enabled = false;
  config.caching.enabled = false;
  config.monitoring.metricsEnabled = false;
  config.monitoring.logLevel = 'error';
}

export default config;

// Helper functions for accessing configuration
export const getConfig = () => config;

export const isFeatureEnabled = (feature: keyof APIConfiguration): boolean => {
  switch (feature) {
    case 'rateLimiting':
      return config.rateLimiting.enabled;
    case 'caching':
      return config.caching.enabled;
    case 'monitoring':
      return config.monitoring.metricsEnabled;
    default:
      return true;
  }
};

export const getRateLimitRule = (type: 'anonymous' | 'authenticated'): RateLimitRule => {
  return config.rateLimiting.defaultLimits[type];
};

export const getCacheTTL = (endpoint?: string): number => {
  switch (endpoint) {
    case 'batch-convert':
      return 5 * 60 * 1000; // 5 minutes for batch requests
    case 'timezone-info':
      return 24 * 60 * 60 * 1000; // 24 hours for timezone data
    case 'health':
      return 60 * 1000; // 1 minute for health checks
    default:
      return config.caching.defaultTTL;
  }
};

export const getTimezoneConfig = () => config.timezone;
export const getSecurityConfig = () => config.security;
export const getMonitoringConfig = () => config.monitoring;