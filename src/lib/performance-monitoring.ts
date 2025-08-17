/**
 * Frontend Performance Monitoring System
 *
 * This module provides comprehensive performance monitoring for the frontend,
 * including Web Vitals, custom metrics, and performance analytics.
 */

import * as Sentry from '@sentry/react';
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';
import logger from '../utils/logger';

// Import onINP separately to handle potential TypeScript issues
let onINP: any = null;

// Performance metrics interface
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id: string;
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

// Custom performance metrics
export interface CustomMetrics {
  pageLoadTime: number;
  domContentLoadedTime: number;
  firstInteractionTime?: number;
  timeToInteractive?: number;
  resourceLoadTime: number;
  apiResponseTimes: Record<string, number[]>;
  errorCount: number;
  memoryUsage?: number;
}

// Performance monitoring configuration
interface PerformanceConfig {
  enableWebVitals: boolean;
  enableCustomMetrics: boolean;
  enableResourceTiming: boolean;
  enableUserTiming: boolean;
  enableNavigationTiming: boolean;
  enableMemoryMonitoring: boolean;
  reportToSentry: boolean;
  reportToConsole: boolean;
  reportToAnalytics: boolean;
  sampleRate: number;
  thresholds: {
    lcp: { good: number; poor: number };
    inp: { good: number; poor: number };
    cls: { good: number; poor: number };
    fcp: { good: number; poor: number };
    ttfb: { good: number; poor: number };
  };
}

// Default configuration
const defaultConfig: PerformanceConfig = {
  enableWebVitals: true,
  enableCustomMetrics: true,
  enableResourceTiming: true,
  enableUserTiming: true,
  enableNavigationTiming: true,
  enableMemoryMonitoring: true,
  reportToSentry: true,
  reportToConsole: import.meta.env?.DEV || false,
  reportToAnalytics: import.meta.env?.PROD || false,
  sampleRate: import.meta.env?.PROD ? 0.1 : 1.0,
  thresholds: {
    lcp: { good: 2500, poor: 4000 },
    inp: { good: 200, poor: 500 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
  },
};

// Performance monitoring class
class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private customMetrics: CustomMetrics;
  private isInitialized = false;
  private observers: PerformanceObserver[] = [];

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.customMetrics = {
      pageLoadTime: 0,
      domContentLoadedTime: 0,
      resourceLoadTime: 0,
      apiResponseTimes: {},
      errorCount: 0,
    };
  }

  /**
   * Initialize performance monitoring
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Performance monitoring already initialized');
      return;
    }

    logger.info('🚀 Initializing performance monitoring...');

    // Initialize Web Vitals monitoring
    if (this.config.enableWebVitals) {
      await this.initializeWebVitals();
    }

    // Initialize custom metrics
    if (this.config.enableCustomMetrics) {
      this.initializeCustomMetrics();
    }

    // Initialize resource timing
    if (this.config.enableResourceTiming) {
      this.initializeResourceTiming();
    }

    // Initialize navigation timing
    if (this.config.enableNavigationTiming) {
      this.initializeNavigationTiming();
    }

    // Initialize memory monitoring
    if (this.config.enableMemoryMonitoring) {
      this.initializeMemoryMonitoring();
    }

    // Initialize user timing
    if (this.config.enableUserTiming) {
      this.initializeUserTiming();
    }

    this.isInitialized = true;
    logger.info('✅ Performance monitoring initialized successfully');
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private async initializeWebVitals(): Promise<void> {
    const reportMetric = (metric: any) => {
      if (Math.random() > this.config.sampleRate) return;

      const performanceMetric: PerformanceMetric = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        connectionType: this.getConnectionType(),
        deviceMemory: this.getDeviceMemory(),
        hardwareConcurrency: navigator.hardwareConcurrency,
      };

      this.recordMetric(performanceMetric);
    };

    try {
      // Load onINP dynamically
      if (!onINP) {
        const webVitals = await import('web-vitals');
        onINP = webVitals.onINP;
      }

      // Monitor Core Web Vitals
      onCLS(reportMetric);
      if (onINP) {
        onINP(reportMetric);
      }
      onFCP(reportMetric);
      onLCP(reportMetric);
      onTTFB(reportMetric);

      logger.info('📊 Web Vitals monitoring enabled');
    } catch (error) {
      logger.warn('Failed to initialize Web Vitals', { error: String(error) });
    }
  }

  /**
   * Initialize custom metrics monitoring
   */
  private initializeCustomMetrics(): void {
    // Page load time
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.customMetrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        this.customMetrics.domContentLoadedTime =
          navigation.domContentLoadedEventEnd - navigation.fetchStart;
      }
    });

    // First interaction time
    let firstInteractionTime: number | undefined;
    const recordFirstInteraction = () => {
      if (!firstInteractionTime) {
        firstInteractionTime = performance.now();
        this.customMetrics.firstInteractionTime = firstInteractionTime;
      }
    };

    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, recordFirstInteraction, { once: true, passive: true });
    });

    logger.info('📈 Custom metrics monitoring enabled');
  }

  /**
   * Initialize resource timing monitoring
   */
  private initializeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const resourceObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;

          // Track slow resources
          if (resource.duration > 1000) {
            this.recordMetric({
              name: 'slow-resource',
              value: resource.duration,
              rating: 'poor',
              id: `resource-${Date.now()}`,
              timestamp: Date.now(),
              url: resource.name,
              userAgent: navigator.userAgent,
            });
          }

          // Track API response times
          if (resource.name.includes('/api/')) {
            const apiEndpoint = new URL(resource.name).pathname;
            if (!this.customMetrics.apiResponseTimes[apiEndpoint]) {
              this.customMetrics.apiResponseTimes[apiEndpoint] = [];
            }
            this.customMetrics.apiResponseTimes[apiEndpoint].push(resource.duration);
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      logger.info('🔗 Resource timing monitoring enabled');
    } catch (error) {
      logger.warn('Resource timing monitoring not supported', { error: String(error) });
    }
  }

  /**
   * Initialize navigation timing monitoring
   */
  private initializeNavigationTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const navigationObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const navigation = entry as PerformanceNavigationTiming;

          // Calculate key timing metrics
          const metrics = {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            ssl:
              navigation.secureConnectionStart > 0
                ? navigation.connectEnd - navigation.secureConnectionStart
                : 0,
            ttfb: navigation.responseStart - navigation.requestStart,
            download: navigation.responseEnd - navigation.responseStart,
            domProcessing: navigation.domContentLoadedEventStart - navigation.responseEnd,
            resourceLoad: navigation.loadEventStart - navigation.domContentLoadedEventEnd,
          };

          // Report significant timing issues
          Object.entries(metrics).forEach(([name, value]) => {
            if (value > 1000) {
              // More than 1 second
              this.recordMetric({
                name: `navigation-${name}`,
                value,
                rating: 'poor',
                id: `nav-${name}-${Date.now()}`,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent,
              });
            }
          });
        }
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

      logger.info('🧭 Navigation timing monitoring enabled');
    } catch (error) {
      logger.warn('Navigation timing monitoring not supported', { error: String(error) });
    }
  }

  /**
   * Initialize memory monitoring
   */
  private initializeMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    const checkMemoryUsage = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        this.customMetrics.memoryUsage = memoryUsage;

        // Report high memory usage
        if (memoryUsage > 0.8) {
          this.recordMetric({
            name: 'high-memory-usage',
            value: memoryUsage * 100,
            rating: 'poor',
            id: `memory-${Date.now()}`,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          });
        }
      }
    };

    // Check memory usage every 30 seconds
    setInterval(checkMemoryUsage, 30000);
    checkMemoryUsage(); // Initial check

    logger.info('💾 Memory monitoring enabled');
  }

  /**
   * Initialize user timing monitoring
   */
  private initializeUserTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const userTimingObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.recordMetric({
              name: `user-timing-${entry.name}`,
              value: entry.duration,
              rating:
                entry.duration > 1000
                  ? 'poor'
                  : entry.duration > 500
                    ? 'needs-improvement'
                    : 'good',
              id: `user-${entry.name}-${Date.now()}`,
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            });
          }
        }
      });

      userTimingObserver.observe({ entryTypes: ['measure'] });
      this.observers.push(userTimingObserver);

      logger.info('⏱️ User timing monitoring enabled');
    } catch (error) {
      logger.warn('User timing monitoring not supported', { error: String(error) });
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    // Store metric
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    this.metrics.get(metric.name)!.push(metric);

    // Report to console in development
    if (this.config.reportToConsole) {
      logger.debug(`📊 Performance Metric: ${metric.name}`, {
        value: metric.value,
        rating: metric.rating,
        url: metric.url,
      });
    }

    // Report to Sentry
    if (this.config.reportToSentry) {
      this.reportToSentry(metric);
    }

    // Report to analytics (placeholder)
    if (this.config.reportToAnalytics) {
      this.reportToAnalytics(metric);
    }
  }

  /**
   * Report metric to Sentry
   */
  private reportToSentry(metric: PerformanceMetric): void {
    try {
      // Add performance context to Sentry
      Sentry.addBreadcrumb({
        message: `Performance metric: ${metric.name}`,
        category: 'performance',
        level: metric.rating === 'poor' ? 'warning' : 'info',
        data: {
          value: metric.value,
          rating: metric.rating,
          url: metric.url,
        },
      });

      // Report poor performance as issues
      if (metric.rating === 'poor') {
        Sentry.withScope(scope => {
          scope.setTag('performance_issue', true);
          scope.setContext('performance_metric', {
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            url: metric.url,
            timestamp: metric.timestamp,
          });

          Sentry.captureMessage(`Poor performance detected: ${metric.name}`, 'warning');
        });
      }
    } catch (error) {
      logger.warn('Failed to report metric to Sentry', { error: String(error) });
    }
  }

  /**
   * Report metric to analytics (placeholder)
   */
  private reportToAnalytics(metric: PerformanceMetric): void {
    // Placeholder for analytics integration
    // Could integrate with Google Analytics, Mixpanel, etc.
    logger.info('📈 Analytics report:', metric as unknown as Record<string, unknown>);
  }

  /**
   * Get connection type
   */
  private getConnectionType(): string | undefined {
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    return connection?.effectiveType;
  }

  /**
   * Get device memory
   */
  private getDeviceMemory(): number | undefined {
    return (navigator as any).deviceMemory;
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    webVitals: Record<string, PerformanceMetric[]>;
    customMetrics: CustomMetrics;
    totalMetrics: number;
  } {
    const webVitals: Record<string, PerformanceMetric[]> = {};

    ['CLS', 'INP', 'FCP', 'LCP', 'TTFB'].forEach(vital => {
      webVitals[vital] = this.metrics.get(vital) || [];
    });

    return {
      webVitals,
      customMetrics: this.customMetrics,
      totalMetrics: Array.from(this.metrics.values()).reduce(
        (sum, metrics) => sum + metrics.length,
        0
      ),
    };
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
    this.customMetrics = {
      pageLoadTime: 0,
      domContentLoadedTime: 0,
      resourceLoadTime: 0,
      apiResponseTimes: {},
      errorCount: 0,
    };
  }

  /**
   * Cleanup observers
   */
  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isInitialized = false;
  }
}

// Global performance monitor instance
let performanceMonitor: PerformanceMonitor | null = null;

/**
 * Initialize performance monitoring
 */
export async function initializePerformanceMonitoring(
  config?: Partial<PerformanceConfig>
): Promise<void> {
  if (performanceMonitor) {
    console.warn('Performance monitoring already initialized');
    return;
  }

  performanceMonitor = new PerformanceMonitor(config);
  await performanceMonitor.initialize();

  // Expose to window for debugging
  if (import.meta.env?.DEV) {
    (window as any).performanceMonitor = performanceMonitor;
  }
}

/**
 * Get performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor | null {
  return performanceMonitor;
}

/**
 * Mark a custom timing point
 */
export function markTiming(name: string): void {
  if ('performance' in window && 'mark' in performance) {
    performance.mark(name);
  }
}

/**
 * Measure time between two marks
 */
export function measureTiming(name: string, startMark: string, endMark?: string): void {
  if ('performance' in window && 'measure' in performance) {
    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }
    } catch (error) {
      console.warn(`Failed to measure timing ${name}:`, error);
    }
  }
}

/**
 * Track API response time
 */
export function trackApiResponseTime(endpoint: string, duration: number): void {
  if (performanceMonitor) {
    const customMetrics = performanceMonitor.getPerformanceSummary().customMetrics;
    if (!customMetrics.apiResponseTimes[endpoint]) {
      customMetrics.apiResponseTimes[endpoint] = [];
    }
    customMetrics.apiResponseTimes[endpoint].push(duration);
  }
}

export default PerformanceMonitor;
