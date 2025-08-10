/**
 * Performance Monitoring Configuration
 *
 * Centralized configuration for performance monitoring settings
 */

// Performance thresholds based on Web Vitals recommendations
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  LCP: {
    good: 2500, // Largest Contentful Paint - Good: ≤2.5s
    poor: 4000, // Poor: >4.0s
  },
  INP: {
    good: 200, // Interaction to Next Paint - Good: ≤200ms
    poor: 500, // Poor: >500ms
  },
  CLS: {
    good: 0.1, // Cumulative Layout Shift - Good: ≤0.1
    poor: 0.25, // Poor: >0.25
  },
  FCP: {
    good: 1800, // First Contentful Paint - Good: ≤1.8s
    poor: 3000, // Poor: >3.0s
  },
  TTFB: {
    good: 800, // Time to First Byte - Good: ≤800ms
    poor: 1800, // Poor: >1.8s
  },

  // Custom metrics
  API_RESPONSE: {
    good: 500, // API response time - Good: ≤500ms
    poor: 2000, // Poor: >2s
  },
  RESOURCE_LOAD: {
    good: 1000, // Resource load time - Good: ≤1s
    poor: 3000, // Poor: >3s
  },
  MEMORY_USAGE: {
    good: 50, // Memory usage percentage - Good: ≤50%
    poor: 80, // Poor: >80%
  },
  LONG_TASK: {
    threshold: 50, // Long task threshold - 50ms
  },
} as const;

// Performance monitoring configuration for different environments
export const PERFORMANCE_CONFIG = {
  development: {
    enableWebVitals: true,
    enableCustomMetrics: true,
    enableResourceTiming: true,
    enableUserTiming: true,
    enableNavigationTiming: true,
    enableMemoryMonitoring: true,
    reportToSentry: true,
    reportToConsole: true,
    reportToAnalytics: false,
    sampleRate: 1.0,
    thresholds: PERFORMANCE_THRESHOLDS,
  },

  production: {
    enableWebVitals: true,
    enableCustomMetrics: true,
    enableResourceTiming: true,
    enableUserTiming: false,
    enableNavigationTiming: true,
    enableMemoryMonitoring: false,
    reportToSentry: true,
    reportToConsole: false,
    reportToAnalytics: true,
    sampleRate: 0.1, // Sample 10% of users in production
    thresholds: PERFORMANCE_THRESHOLDS,
  },

  test: {
    enableWebVitals: false,
    enableCustomMetrics: false,
    enableResourceTiming: false,
    enableUserTiming: false,
    enableNavigationTiming: false,
    enableMemoryMonitoring: false,
    reportToSentry: false,
    reportToConsole: false,
    reportToAnalytics: false,
    sampleRate: 0,
    thresholds: PERFORMANCE_THRESHOLDS,
  },
} as const;

// Get configuration for current environment
export function getPerformanceConfig() {
  const env = import.meta.env?.MODE || 'development';

  if (env === 'production') {
    return PERFORMANCE_CONFIG.production;
  } else if (env === 'test') {
    return PERFORMANCE_CONFIG.test;
  } else {
    return PERFORMANCE_CONFIG.development;
  }
}

// Performance budget configuration
export const PERFORMANCE_BUDGET = {
  // Bundle size limits
  bundles: {
    main: 250 * 1024, // 250KB for main bundle
    vendor: 500 * 1024, // 500KB for vendor bundle
    total: 1000 * 1024, // 1MB total bundle size
  },

  // Resource limits
  resources: {
    images: 100 * 1024, // 100KB per image
    fonts: 50 * 1024, // 50KB per font
    css: 50 * 1024, // 50KB per CSS file
    js: 100 * 1024, // 100KB per JS file
  },

  // Performance metrics limits
  metrics: {
    lcp: 2500, // 2.5s LCP
    inp: 200, // 200ms INP
    cls: 0.1, // 0.1 CLS
    fcp: 1800, // 1.8s FCP
    ttfb: 800, // 800ms TTFB
  },

  // Network limits
  network: {
    requests: 50, // Max 50 requests
    totalSize: 2 * 1024 * 1024, // 2MB total transfer
  },
} as const;

// Performance alerts configuration
export const PERFORMANCE_ALERTS = {
  // Alert thresholds
  thresholds: {
    errorRate: 5, // Alert if error rate > 5%
    slowRequests: 10, // Alert if > 10% of requests are slow
    memoryUsage: 85, // Alert if memory usage > 85%
    longTasks: 5, // Alert if > 5 long tasks per minute
  },

  // Alert channels
  channels: {
    console: import.meta.env?.DEV || false,
    sentry: true,
    webhook: import.meta.env?.PROD || false,
  },

  // Alert cooldown (prevent spam)
  cooldown: {
    errorRate: 5 * 60 * 1000, // 5 minutes
    slowRequests: 10 * 60 * 1000, // 10 minutes
    memoryUsage: 15 * 60 * 1000, // 15 minutes
    longTasks: 5 * 60 * 1000, // 5 minutes
  },
} as const;

// Performance monitoring features
export const PERFORMANCE_FEATURES = {
  // Core Web Vitals
  webVitals: {
    enabled: true,
    metrics: ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'],
  },

  // Custom metrics
  customMetrics: {
    enabled: true,
    metrics: [
      'pageLoadTime',
      'domContentLoadedTime',
      'firstInteractionTime',
      'timeToInteractive',
      'resourceLoadTime',
      'apiResponseTimes',
      'memoryUsage',
    ],
  },

  // Resource timing
  resourceTiming: {
    enabled: true,
    trackTypes: ['script', 'stylesheet', 'image', 'font', 'fetch', 'xmlhttprequest'],
    slowResourceThreshold: 1000, // 1 second
  },

  // Navigation timing
  navigationTiming: {
    enabled: true,
    metrics: ['dns', 'tcp', 'ssl', 'ttfb', 'download', 'domProcessing', 'resourceLoad'],
  },

  // Memory monitoring
  memoryMonitoring: {
    enabled: true,
    interval: 30000, // 30 seconds
    alertThreshold: 0.8, // 80%
  },

  // Long task monitoring
  longTaskMonitoring: {
    enabled: true,
    threshold: 50, // 50ms
  },

  // User timing
  userTiming: {
    enabled: import.meta.env?.DEV || false,
    autoMeasure: true,
  },
} as const;

// Performance reporting configuration
export const PERFORMANCE_REPORTING = {
  // Batch reporting
  batch: {
    enabled: true,
    size: 10, // Send metrics in batches of 10
    interval: 30000, // Send every 30 seconds
    maxWait: 60000, // Max wait time before sending
  },

  // Compression
  compression: {
    enabled: true,
    algorithm: 'gzip',
  },

  // Retry configuration
  retry: {
    enabled: true,
    maxAttempts: 3,
    backoff: 'exponential',
    initialDelay: 1000,
  },

  // Data retention
  retention: {
    local: 24 * 60 * 60 * 1000, // 24 hours in localStorage
    memory: 100, // Keep last 100 metrics in memory
  },
} as const;

// Export default configuration
export default {
  thresholds: PERFORMANCE_THRESHOLDS,
  config: getPerformanceConfig(),
  budget: PERFORMANCE_BUDGET,
  alerts: PERFORMANCE_ALERTS,
  features: PERFORMANCE_FEATURES,
  reporting: PERFORMANCE_REPORTING,
};
