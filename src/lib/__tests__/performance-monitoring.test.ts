/**
 * Performance Monitoring Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';
import {
    getPerformanceMonitor,
    initializePerformanceMonitoring,
    markTiming,
    measureTiming,
    resetPerformanceMonitor,
    trackApiResponseTime,
} from '../performance-monitoring';

// Mock web-vitals
vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onINP: vi.fn(),
  onFCP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));

// Mock Sentry
vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  withScope: vi.fn(callback => callback({ setTag: vi.fn(), setContext: vi.fn() })),
  captureMessage: vi.fn(),
}));

// Mock performance API
const mockPerformance = {
  mark: vi.fn(),
  measure: vi.fn(),
  now: vi.fn(() => Date.now()),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    jsHeapSizeLimit: 10000000,
  },
};

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn();
mockPerformanceObserver.prototype.observe = vi.fn();
mockPerformanceObserver.prototype.disconnect = vi.fn();

// Mock navigator
const mockNavigator = {
  userAgent: 'test-agent',
  hardwareConcurrency: 4,
  connection: {
    effectiveType: '4g',
  },
  deviceMemory: 8,
};

// Setup global mocks
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();

  // Mock global objects
  global.performance = mockPerformance as any;
  global.PerformanceObserver = mockPerformanceObserver as any;
  global.navigator = mockNavigator as any;
  global.window = {
    location: { href: 'https://test.com' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    performance: mockPerformance,
  } as any;

  // Mock import.meta.env
  vi.stubGlobal('import.meta', {
    env: {
      DEV: true,
      PROD: false,
      MODE: 'development',
    },
  });
});

afterEach(() => {
  // Cleanup
  resetPerformanceMonitor();

  vi.unstubAllGlobals();
});

describe('Performance Monitoring', () => {
  describe('Initialization', () => {
    it('should initialize performance monitoring', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await initializePerformanceMonitoring();

      expect(consoleSpy).toHaveBeenCalledWith('🚀 Initializing performance monitoring...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Performance monitoring initialized successfully');

      consoleSpy.mockRestore();
    });

    it('should not initialize twice', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await initializePerformanceMonitoring();
      await initializePerformanceMonitoring(); // Second call

      expect(consoleSpy).toHaveBeenCalledWith('Performance monitoring already initialized');

      consoleSpy.mockRestore();
    });

    it('should return performance monitor instance', async () => {
      await initializePerformanceMonitoring();

      const monitor = getPerformanceMonitor();
      expect(monitor).toBeDefined();
      expect(monitor).not.toBeNull();
    });
  });

  describe('Web Vitals Monitoring', () => {
    it('should enable Web Vitals monitoring', async () => {
      await initializePerformanceMonitoring({
        enableWebVitals: true,
      });

      expect(onCLS).toHaveBeenCalled();
      // onINP might be dynamically imported, so we might need to check differently or rely on mock
      // But since we mocked 'web-vitals' globally, logic in initialize uses that.
      // However, onINP in source is handled via dynamic import if missing?
      // Source: import { onCLS ... } from 'web-vitals'.
      // Source: onINP = webVitals.onINP.

      // Let's verify commonly used ones
      expect(onFCP).toHaveBeenCalled();
      expect(onLCP).toHaveBeenCalled();
      expect(onTTFB).toHaveBeenCalled();
    });

    it('should not enable Web Vitals when disabled', async () => {
      await initializePerformanceMonitoring({
        enableWebVitals: false,
      });

      expect(onCLS).not.toHaveBeenCalled();
      // onINP might be called or not depending on dynamic import logic, but disabled config should prevent it?
      // Actually code says: if (this.config.enableWebVitals) await this.initializeWebVitals();
      // So if disabled, NO web vitals methods should be called.
      expect(onFCP).not.toHaveBeenCalled();
      expect(onLCP).not.toHaveBeenCalled();
      expect(onTTFB).not.toHaveBeenCalled();
    });
  });

  describe('Custom Metrics', () => {
    it('should track page load metrics', async () => {
      const mockNavigation = {
        fetchStart: 1000,
        loadEventEnd: 3000,
        domContentLoadedEventEnd: 2500,
      };

      mockPerformance.getEntriesByType.mockReturnValue([mockNavigation]);

      await initializePerformanceMonitoring({
        enableCustomMetrics: true,
      });

      // Simulate load event
      const loadHandler = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'load'
      )?.[1];

      if (loadHandler) {
        loadHandler();
      }

      const monitor = getPerformanceMonitor();
      const summary = monitor?.getPerformanceSummary();

      expect(summary?.customMetrics.pageLoadTime).toBe(2000); // 3000 - 1000
      expect(summary?.customMetrics.domContentLoadedTime).toBe(1500); // 2500 - 1000
    });
  });

  describe('Timing API', () => {
    it('should mark timing points', async () => {
      await initializePerformanceMonitoring();

      markTiming('test-mark');

      expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark');
    });

    it('should measure timing between marks', async () => {
      await initializePerformanceMonitoring();

      measureTiming('test-measure', 'start-mark', 'end-mark');

      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'test-measure',
        'start-mark',
        'end-mark'
      );
    });

    it('should handle measurement errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockPerformance.measure.mockImplementation(() => {
        throw new Error('Invalid mark');
      });

      await initializePerformanceMonitoring();

      measureTiming('test-measure', 'invalid-mark');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to measure timing test-measure:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('API Response Tracking', () => {
    it('should track API response times', async () => {
      await initializePerformanceMonitoring();

      trackApiResponseTime('/api/test', 500);

      const monitor = getPerformanceMonitor();
      const summary = monitor?.getPerformanceSummary();

      expect(summary?.customMetrics.apiResponseTimes['/api/test']).toContain(500);
    });

    it('should accumulate multiple response times for same endpoint', async () => {
      await initializePerformanceMonitoring();

      trackApiResponseTime('/api/test', 500);
      trackApiResponseTime('/api/test', 750);

      const monitor = getPerformanceMonitor();
      const summary = monitor?.getPerformanceSummary();

      expect(summary?.customMetrics.apiResponseTimes['/api/test']).toEqual([500, 750]);
    });
  });

  describe('Performance Summary', () => {
    it('should return performance summary', async () => {
      await initializePerformanceMonitoring();

      const monitor = getPerformanceMonitor();
      const summary = monitor?.getPerformanceSummary();

      expect(summary).toBeDefined();
      expect(summary?.webVitals).toBeDefined();
      expect(summary?.customMetrics).toBeDefined();
      expect(summary?.totalMetrics).toBeDefined();
    });

    it('should clear metrics', async () => {
      await initializePerformanceMonitoring();

      trackApiResponseTime('/api/test', 500);

      const monitor = getPerformanceMonitor();
      let summary = monitor?.getPerformanceSummary();

      expect(Object.keys(summary?.customMetrics.apiResponseTimes || {})).toHaveLength(1);

      monitor?.clearMetrics();
      summary = monitor?.getPerformanceSummary();

      expect(Object.keys(summary?.customMetrics.apiResponseTimes || {})).toHaveLength(0);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', async () => {
      const customConfig = {
        enableWebVitals: false,
        enableCustomMetrics: true,
        reportToConsole: true,
        sampleRate: 0.5,
      };

      await initializePerformanceMonitoring(customConfig);

      const monitor = getPerformanceMonitor();
      expect(monitor).toBeDefined();
    });

    it('should handle production environment', async () => {
      vi.stubGlobal('import.meta', {
        env: {
          DEV: false,
          PROD: true,
          MODE: 'production',
        },
      });

      await initializePerformanceMonitoring();

      const monitor = getPerformanceMonitor();
      expect(monitor).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing performance API gracefully', () => {
      global.performance = undefined as any;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      markTiming('test-mark');
      measureTiming('test-measure', 'start', 'end');

      // Should not throw errors
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle missing PerformanceObserver gracefully', async () => {
      global.PerformanceObserver = undefined as any;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await initializePerformanceMonitoring({
        enableResourceTiming: true,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Resource timing monitoring not supported:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup observers on destroy', async () => {
      await initializePerformanceMonitoring();

      const monitor = getPerformanceMonitor();
      monitor?.cleanup();

      expect(mockPerformanceObserver.prototype.disconnect).toHaveBeenCalled();
    });
  });
});
