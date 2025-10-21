import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  performanceMonitoringMiddleware,
  createPerformanceMonitoring,
  getMetricsReport,
  performanceHealthCheck,
  clearMetrics,
  getMetricsStore,
  _PerformanceMetrics,
} from '../performance-monitoring';

// Mock config
vi.mock('../../config/config', () => ({
  default: {
    monitoring: {
      metricsEnabled: true,
      logLevel: 'info',
    },
  },
}));

// Helper to create mock request/response
const createMockReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'GET',
    url: '/api/convert',
    query: { timestamp: '1234567890' },
    headers: {},
    body: {},
    ...overrides,
  }) as VercelRequest;

const createMockRes = (): VercelResponse => {
  const res = {
    statusCode: 200,
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  } as unknown as VercelResponse;

  return res;
};

describe('Performance Monitoring Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMetrics();
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('performanceMonitoringMiddleware', () => {
    it('should collect basic performance metrics', async () => {
      const metricsCollector = vi.fn();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn().mockImplementation(() => {
        // Simulate some processing time
        return new Promise(resolve => setTimeout(resolve, 10));
      });

      const middleware = performanceMonitoringMiddleware({
        metricsCollector,
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(metricsCollector).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.any(String),
          endpoint: '/api/convert',
          method: 'GET',
          statusCode: 200,
          responseTime: expect.any(Number),
          memoryUsage: expect.objectContaining({
            heapUsed: expect.any(Number),
            heapTotal: expect.any(Number),
            external: expect.any(Number),
            rss: expect.any(Number),
          }),
          timestamp: expect.any(Number),
        })
      );
    });

    it('should set performance headers', async () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = performanceMonitoringMiddleware();

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.stringMatching(/\d+ms/));
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('X-Memory-Usage', expect.stringMatching(/\d+MB/));
    });

    it('should use existing request ID from headers', async () => {
      const metricsCollector = vi.fn();
      const req = createMockReq({
        headers: { 'x-request-id': 'existing-request-id' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = performanceMonitoringMiddleware({
        metricsCollector,
      });

      await middleware(req, res, next);

      expect(metricsCollector).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'existing-request-id',
        })
      );
    });

    it('should detect cache hits from response data', async () => {
      const metricsCollector = vi.fn();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn().mockImplementation(() => {
        res.json({ success: true, cache: { hit: true } });
      });

      const middleware = performanceMonitoringMiddleware({
        metricsCollector,
      });

      await middleware(req, res, next);

      expect(metricsCollector).toHaveBeenCalledWith(
        expect.objectContaining({
          cacheHit: true,
        })
      );
    });

    it('should detect rate limiting from response data', async () => {
      const metricsCollector = vi.fn();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn().mockImplementation(() => {
        res.json({
          success: false,
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded' },
        });
      });

      const middleware = performanceMonitoringMiddleware({
        metricsCollector,
      });

      await middleware(req, res, next);

      expect(metricsCollector).toHaveBeenCalledWith(
        expect.objectContaining({
          rateLimited: true,
          errorCode: 'RATE_LIMIT_EXCEEDED',
        })
      );
    });

    it('should handle errors and capture error codes', async () => {
      const metricsCollector = vi.fn();
      const req = createMockReq();
      const res = createMockRes();
      const error = new Error('Test error');
      (error as any).code = 'TEST_ERROR';

      const next = vi.fn().mockRejectedValue(error);

      const middleware = performanceMonitoringMiddleware({
        metricsCollector,
      });

      await expect(middleware(req, res, next)).rejects.toThrow('Test error');

      expect(metricsCollector).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'TEST_ERROR',
        })
      );
    });

    it('should call slow request handler for slow requests', async () => {
      const onSlowRequest = vi.fn();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn().mockImplementation(() => {
        // Simulate slow processing
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      const middleware = performanceMonitoringMiddleware({
        slowRequestThreshold: 50, // Very low threshold for testing
        onSlowRequest,
      });

      await middleware(req, res, next);

      expect(onSlowRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          responseTime: expect.any(Number),
        })
      );
    });

    it('should skip monitoring for excluded endpoints', async () => {
      const metricsCollector = vi.fn();
      const req = createMockReq({ url: '/api/health' });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = performanceMonitoringMiddleware({
        excludeEndpoints: ['/api/health'],
        metricsCollector,
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(metricsCollector).not.toHaveBeenCalled();
    });

    it('should collect detailed metrics when enabled', async () => {
      const metricsCollector = vi.fn();
      const req = createMockReq({
        body: { test: 'data' },
        headers: { 'user-agent': 'test-agent' },
      });
      const res = createMockRes();
      const next = vi.fn().mockImplementation(() => {
        res.json({ result: 'success' });
      });

      const middleware = performanceMonitoringMiddleware({
        collectDetailedMetrics: true,
        includeHeaders: true,
        includeQuery: true,
        metricsCollector,
      });

      await middleware(req, res, next);

      const metrics = metricsCollector.mock.calls[0][0];
      expect(metrics).toHaveProperty('requestSize');
      expect(metrics).toHaveProperty('responseSize');
      expect(metrics).toHaveProperty('memoryDelta');
      expect(metrics).toHaveProperty('queryParams');
      expect(metrics).toHaveProperty('headers');
      expect(metrics.userAgent).toBe('test-agent');
    });

    it('should log metrics based on log level', async () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = performanceMonitoringMiddleware({
        logMetrics: true,
        logLevel: 'info',
      });

      await middleware(req, res, next);

      expect(console.info).toHaveBeenCalledWith('Request metrics:', expect.any(String));
    });

    it('should handle metrics collector errors gracefully', async () => {
      const metricsCollector = vi.fn().mockImplementation(() => {
        throw new Error('Collector error');
      });

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = performanceMonitoringMiddleware({
        metricsCollector,
      });

      // Should not throw despite collector error
      await middleware(req, res, next);

      expect(console.error).toHaveBeenCalledWith('Error in metrics collector:', expect.any(Error));
    });
  });

  describe('createPerformanceMonitoring', () => {
    it('should create middleware with default options', () => {
      const middleware = createPerformanceMonitoring();
      expect(typeof middleware).toBe('function');
    });

    it('should create middleware with custom options', () => {
      const middleware = createPerformanceMonitoring({
        collectMemoryMetrics: false,
        logMetrics: false,
      });
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Metrics utilities', () => {
    beforeEach(() => {
      // Add some test metrics
      const store = getMetricsStore();
      const baseTime = Date.now();

      store.add({
        requestId: 'req-1',
        endpoint: '/api/convert',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        memoryUsage: { heapUsed: 1000, heapTotal: 2000, external: 100, rss: 3000 },
        timestamp: baseTime - 1000,
      });

      store.add({
        requestId: 'req-2',
        endpoint: '/api/convert',
        method: 'POST',
        statusCode: 400,
        responseTime: 200,
        memoryUsage: { heapUsed: 1100, heapTotal: 2000, external: 100, rss: 3100 },
        timestamp: baseTime - 500,
      });

      store.add({
        requestId: 'req-3',
        endpoint: '/api/health',
        method: 'GET',
        statusCode: 200,
        responseTime: 50,
        memoryUsage: { heapUsed: 900, heapTotal: 2000, external: 100, rss: 2900 },
        timestamp: baseTime,
      });
    });

    describe('getMetricsReport', () => {
      it('should return metrics report for all time', () => {
        const report = getMetricsReport();

        expect(report).toHaveProperty('timestamp');
        expect(report).toHaveProperty('timeWindow', 'all-time');
        expect(report).toHaveProperty('summary');
        expect(report).toHaveProperty('topEndpoints');
        expect(report).toHaveProperty('recentMetrics');

        expect(report.summary.totalRequests).toBe(3);
        expect(report.summary.averageResponseTime).toBeCloseTo(116.67, 1);
        expect(report.summary.errorRate).toBeCloseTo(33.33, 1);
      });

      it('should return metrics report for specific time window', () => {
        const report = getMetricsReport(1000); // Last 1 second

        expect(report.summary.totalRequests).toBe(2);
        expect(report.summary.averageResponseTime).toBe(125);
        expect(report.summary.errorRate).toBe(50);
      });
    });

    describe('performanceHealthCheck', () => {
      it('should return health status based on metrics', () => {
        const health = performanceHealthCheck();

        expect(health).toHaveProperty('status');
        expect(health).toHaveProperty('metrics');
        expect(health).toHaveProperty('thresholds');

        expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(health.metrics).toHaveProperty('requestCount');
        expect(health.metrics).toHaveProperty('averageResponseTime');
        expect(health.metrics).toHaveProperty('errorRate');
        expect(health.metrics).toHaveProperty('memoryUsage');
      });
    });

    describe('getMetricsStore', () => {
      it('should return metrics store instance', () => {
        const store = getMetricsStore();

        expect(store).toHaveProperty('add');
        expect(store).toHaveProperty('getMetrics');
        expect(store).toHaveProperty('getAverageResponseTime');
        expect(store).toHaveProperty('getErrorRate');
        expect(store).toHaveProperty('getRequestCount');
      });

      it('should calculate average response time correctly', () => {
        const store = getMetricsStore();

        const avgAll = store.getAverageResponseTime();
        expect(avgAll).toBeCloseTo(116.67, 1);

        const avgConvert = store.getAverageResponseTime('/api/convert');
        expect(avgConvert).toBe(150); // (100 + 200) / 2
      });

      it('should calculate error rate correctly', () => {
        const store = getMetricsStore();

        const errorRateAll = store.getErrorRate();
        expect(errorRateAll).toBeCloseTo(33.33, 1); // 1 error out of 3 requests

        const errorRateConvert = store.getErrorRate('/api/convert');
        expect(errorRateConvert).toBe(50); // 1 error out of 2 requests
      });

      it('should get top endpoints correctly', () => {
        const store = getMetricsStore();
        const topEndpoints = store.getTopEndpoints(5);

        expect(topEndpoints).toHaveLength(2);
        expect(topEndpoints[0].endpoint).toBe('/api/convert');
        expect(topEndpoints[0].count).toBe(2);
        expect(topEndpoints[1].endpoint).toBe('/api/health');
        expect(topEndpoints[1].count).toBe(1);
      });
    });

    describe('clearMetrics', () => {
      it('should clear all metrics', () => {
        const store = getMetricsStore();
        expect(store.getRequestCount()).toBe(3);

        clearMetrics();

        expect(store.getRequestCount()).toBe(0);
      });
    });
  });
});
