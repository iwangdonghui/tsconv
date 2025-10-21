import { APIConfiguration, RateLimitRule } from '../types/api';

// Helper function for safe environment variable access
function getEnv(key: string): string | undefined {
  return process.env[key];
}

// Load environment variables with fallbacks
const config: APIConfiguration = {
  rateLimiting: {
    enabled: getEnv('RATE_LIMITING_ENABLED') !== 'false',
    rules: [
      {
        identifier: 'anonymous',
        limit: parseInt(getEnv('ANONYMOUS_RATE_LIMIT') || '100', 10),
        window: 60 * 1000, // 1 minute
        type: 'ip',
      },
      {
        identifier: 'authenticated',
        limit: parseInt(getEnv('AUTHENTICATED_RATE_LIMIT') || '1000', 10),
        window: 60 * 1000, // 1 minute
        type: 'user',
      },
    ],
    defaultLimits: {
      anonymous: {
        identifier: 'anonymous',
        limit: parseInt(getEnv('ANONYMOUS_RATE_LIMIT') || '100', 10),
        window: 60 * 1000,
        type: 'ip',
      },
      authenticated: {
        identifier: 'authenticated',
        limit: parseInt(getEnv('AUTHENTICATED_RATE_LIMIT') || '1000', 10),
        window: 60 * 1000,
        type: 'user',
      },
    },
  },
  caching: {
    enabled: getEnv('CACHING_ENABLED') !== 'false',
    defaultTTL: parseInt(getEnv('CACHE_DEFAULT_TTL') || '300', 10) * 1000, // 5 minutes
    maxCacheSize: parseInt(getEnv('MAX_CACHE_SIZE') || '100', 10) * 1024 * 1024, // 100MB
    redis: (() => {
      const password =
        getEnv('UPSTASH_REDIS_REST_TOKEN') ||
        getEnv('REDIS_PASSWORD') ||
        getEnv('KV_REST_API_TOKEN');
      const baseConfig = {
        url:
          getEnv('UPSTASH_REDIS_REST_URL') ||
          getEnv('REDIS_URL') ||
          getEnv('KV_URL') ||
          'redis://localhost:6379',
        maxRetries: parseInt(getEnv('REDIS_MAX_RETRIES') || '3', 10),
        fallbackToMemory: getEnv('REDIS_FALLBACK_ENABLED') !== 'false',
        useUpstash: getEnv('USE_UPSTASH_REDIS') === 'true' || !!getEnv('UPSTASH_REDIS_REST_URL'),
      };
      return password ? { ...baseConfig, password } : baseConfig;
    })(),
  },
  timezone: {
    dataSource: process.env['TIMEZONE_DATA_SOURCE'] || 'iana',
    updateInterval: parseInt(process.env['TIMEZONE_UPDATE_INTERVAL'] || '86400000', 10), // 24 hours
    fallbackTimezone: process.env['FALLBACK_TIMEZONE'] || 'UTC',
    maxTimezoneOffset: parseInt(process.env['MAX_TIMEZONE_OFFSET'] || '43200', 10), // 12 hours in seconds
  },
  monitoring: {
    logLevel: (process.env['LOG_LEVEL'] as 'debug' | 'info' | 'warn' | 'error') || 'info',
    metricsEnabled: process.env['METRICS_ENABLED'] !== 'false',
    alertThresholds: [
      {
        metric: 'error_rate',
        threshold: parseFloat(process.env['ERROR_RATE_THRESHOLD'] || '5'),
        duration: parseInt(process.env['ERROR_ALERT_DURATION'] || '300000', 10), // 5 minutes
        severity: 'high',
      },
      {
        metric: 'response_time',
        threshold: parseInt(process.env['RESPONSE_TIME_THRESHOLD'] || '1000', 10), // 1 second
        duration: parseInt(process.env['RESPONSE_TIME_DURATION'] || '300000', 10), // 5 minutes
        severity: 'medium',
      },
      {
        metric: 'cache_hit_ratio',
        threshold: parseFloat(process.env['CACHE_HIT_THRESHOLD'] || '0.8'), // 80%
        duration: parseInt(process.env['CACHE_HIT_DURATION'] || '600000', 10), // 10 minutes
        severity: 'low',
      },
    ],
  },
  security: {
    cors: {
      allowedOrigins: process.env['ALLOWED_ORIGINS']?.split(',') || ['*'],
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    },
    csp: {
      enabled: process.env['CSP_ENABLED'] !== 'false',
      reportOnly: process.env['CSP_REPORT_ONLY'] === 'true',
      useNonces: process.env['CSP_USE_NONCES'] !== 'false',
      enableViolationReporting: process.env['CSP_VIOLATION_REPORTING'] !== 'false',
      reportEndpoint: process.env['CSP_REPORT_ENDPOINT'] || '/api/csp-report',
    },
    headers: {
      hsts: {
        enabled: process.env['HSTS_ENABLED'] !== 'false',
        maxAge: parseInt(process.env['HSTS_MAX_AGE'] || '31536000', 10), // 1 year
        includeSubDomains: process.env['HSTS_INCLUDE_SUBDOMAINS'] !== 'false',
        preload: process.env['HSTS_PRELOAD'] === 'true',
      },
      frameOptions: process.env['X_FRAME_OPTIONS'] || 'DENY',
      contentTypeOptions: process.env['X_CONTENT_TYPE_OPTIONS'] || 'nosniff',
      xssProtection: process.env['X_XSS_PROTECTION'] || '1; mode=block',
      referrerPolicy: process.env['REFERRER_POLICY'] || 'strict-origin-when-cross-origin',
      permissionsPolicy:
        process.env['PERMISSIONS_POLICY'] || 'camera=(), microphone=(), geolocation=(), payment=()',
    },
    maxRequestSize: process.env['MAX_REQUEST_SIZE'] || '1mb',
    timeout: parseInt(process.env['API_TIMEOUT'] || '30000', 10), // 30 seconds
  },
};

// Environment-specific overrides
if (process.env['NODE_ENV'] === 'development') {
  config.rateLimiting.enabled = false;
  config.caching.enabled = false;
  config.monitoring.logLevel = 'debug';
}

if (process.env['NODE_ENV'] === 'test') {
  const rateLimitEnv = process.env['RATE_LIMITING_ENABLED'];
  const cachingEnv = process.env['CACHING_ENABLED'];

  if (rateLimitEnv !== 'true') {
    config.rateLimiting.enabled = false;
  }

  if (cachingEnv !== 'true') {
    config.caching.enabled = false;
  }

  config.monitoring.metricsEnabled = false;
  config.monitoring.logLevel = 'error';
}

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const baselineConfig: APIConfiguration = deepClone(config);

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

// Test helpers to safely override and reset configuration between test cases
export const overrideConfig = (updater: (mutableConfig: APIConfiguration) => void): void => {
  if (typeof updater === 'function') {
    updater(config);
  }
};

export const resetConfig = (): void => {
  const snapshot = deepClone(baselineConfig);
  (Object.keys(snapshot) as Array<keyof APIConfiguration>).forEach(key => {
    (config as any)[key] = snapshot[key];
  });
};
