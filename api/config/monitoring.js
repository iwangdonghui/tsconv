/**
 * Monitoring configuration for production deployment
 * This file contains the configuration for monitoring, metrics, and alerts
 */

module.exports = {
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
    // Log rotation settings
    rotation: {
      enabled: process.env.LOG_ROTATION_ENABLED !== 'false',
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10),
    },
    // Fields to redact from logs for security/privacy
    redact: ['authorization', 'password', 'token', 'apiKey', 'secret'],
  },

  // Metrics collection
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    // Providers configuration
    providers: {
      datadog: {
        enabled: process.env.DATADOG_ENABLED === 'true',
        apiKey: process.env.DATADOG_API_KEY,
        appKey: process.env.DATADOG_APP_KEY,
        site: process.env.DATADOG_SITE || 'us',
        service: process.env.DATADOG_SERVICE || 'timestamp-converter-api',
      },
      newRelic: {
        enabled: process.env.NEW_RELIC_ENABLED === 'true',
        licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
        appName: process.env.NEW_RELIC_APP_NAME || 'Timestamp Converter API',
      },
      prometheus: {
        enabled: process.env.PROMETHEUS_ENABLED === 'true',
        port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
        endpoint: process.env.PROMETHEUS_ENDPOINT || '/metrics',
      },
    },
    // Metrics collection settings
    collection: {
      interval: parseInt(process.env.METRICS_INTERVAL || '15000', 10), // 15 seconds
      sampleRate: parseFloat(process.env.METRICS_SAMPLE_RATE || '1.0'), // 100% of requests
      // Metrics to collect
      metrics: [
        'request_count',
        'request_duration_ms',
        'response_size_bytes',
        'error_count',
        'cache_hit_ratio',
        'rate_limit_exceeded_count',
        'memory_usage_bytes',
        'cpu_usage_percent',
      ],
    },
  },

  // Alerting configuration
  alerting: {
    enabled: process.env.ALERTS_ENABLED !== 'false',
    // Alert providers
    providers: {
      email: {
        enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
        recipients: (process.env.ALERT_EMAIL_RECIPIENTS || '').split(','),
      },
      slack: {
        enabled: process.env.SLACK_ALERTS_ENABLED === 'true',
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#api-alerts',
      },
      pagerDuty: {
        enabled: process.env.PAGERDUTY_ALERTS_ENABLED === 'true',
        routingKey: process.env.PAGERDUTY_ROUTING_KEY,
        severity: process.env.PAGERDUTY_DEFAULT_SEVERITY || 'warning',
      },
    },
    // Alert thresholds
    thresholds: [
      {
        metric: 'error_rate',
        threshold: parseFloat(process.env.ERROR_RATE_THRESHOLD || '5'), // 5%
        duration: parseInt(process.env.ERROR_ALERT_DURATION || '300000', 10), // 5 minutes
        severity: 'high',
      },
      {
        metric: 'response_time',
        threshold: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '1000', 10), // 1 second
        duration: parseInt(process.env.RESPONSE_TIME_DURATION || '300000', 10), // 5 minutes
        severity: 'medium',
      },
      {
        metric: 'cache_hit_ratio',
        threshold: parseFloat(process.env.CACHE_HIT_THRESHOLD || '0.8'), // 80%
        duration: parseInt(process.env.CACHE_HIT_DURATION || '600000', 10), // 10 minutes
        severity: 'low',
      },
      {
        metric: 'rate_limit_exceeded',
        threshold: parseInt(process.env.RATE_LIMIT_THRESHOLD || '100'), // 100 per minute
        duration: parseInt(process.env.RATE_LIMIT_DURATION || '300000', 10), // 5 minutes
        severity: 'medium',
      },
      {
        metric: 'memory_usage',
        threshold: parseFloat(process.env.MEMORY_USAGE_THRESHOLD || '85'), // 85%
        duration: parseInt(process.env.MEMORY_USAGE_DURATION || '300000', 10), // 5 minutes
        severity: 'high',
      },
    ],
  },

  // Dashboard configuration
  dashboards: {
    // Default dashboard panels
    panels: [
      {
        title: 'API Request Volume',
        metrics: ['request_count'],
        type: 'line',
        timeRange: '24h',
      },
      {
        title: 'API Response Time',
        metrics: ['request_duration_ms'],
        type: 'line',
        timeRange: '24h',
      },
      {
        title: 'Error Rate',
        metrics: ['error_count', 'request_count'],
        type: 'line',
        formula: 'error_count / request_count * 100',
        timeRange: '24h',
      },
      {
        title: 'Cache Hit Ratio',
        metrics: ['cache_hit_ratio'],
        type: 'line',
        timeRange: '24h',
      },
      {
        title: 'Rate Limit Exceeded',
        metrics: ['rate_limit_exceeded_count'],
        type: 'line',
        timeRange: '24h',
      },
      {
        title: 'Memory Usage',
        metrics: ['memory_usage_bytes'],
        type: 'line',
        timeRange: '24h',
      },
    ],
  },
};
