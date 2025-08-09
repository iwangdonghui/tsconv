import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VercelRequest, VercelResponse } from '@vercel/node';
import cacheService from '../services/cache-service';
import timezoneService from '../services/timezone-service';
import formatService from '../services/format-service';
import { ErrorHandler } from '../middleware/error-handler';
import { monitoringService } from '../health';

describe('API Integration Tests', () => {
  let mockReq: Partial<VercelRequest>;
  let mockRes: Partial<VercelResponse>;

  beforeEach(() => {
    mockReq = {
      query: {},
      body: {},
      method: 'GET',
      url: '/api/test',
      headers: {}
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Cache Service', () => {
    it('should cache and retrieve values correctly', async () => {
      const key = 'test-key';
      const value = { test: 'data' };
      
      await cacheService.set(key, value, 1000);
      const retrieved = await cacheService.get(key);
      
      expect(retrieved).toEqual(value);
    });

    it('should handle cache expiration', async () => {
      const key = 'expired-key';
      const value = { test: 'data' };
      
      await cacheService.set(key, value, -1); // Expired
      const retrieved = await cacheService.get(key);
      
      expect(retrieved).toBeNull();
    });

    it('should provide health check', async () => {
      const health = await cacheService.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('entries');
      expect(health).toHaveProperty('memoryUsage');
    });
  });

  describe('Timezone Service', () => {
    it('should validate known timezones', () => {
      expect(timezoneService.validateTimezone('UTC')).toBe(true);
      expect(timezoneService.validateTimezone('America/New_York')).toBe(true);
      expect(timezoneService.validateTimezone('Invalid/Timezone')).toBe(false);
    });

    it('should resolve timezone shortcuts', () => {
      expect(timezoneService.resolveTimezone('EST')).toBe('America/New_York');
      expect(timezoneService.resolveTimezone('PST')).toBe('America/Los_Angeles');
    });

    it('should get timezone info', () => {
      const info = timezoneService.getTimezoneInfo('UTC');
      
      expect(info).toHaveProperty('identifier');
      expect(info).toHaveProperty('currentOffset');
      expect(info).toHaveProperty('isDST');
      expect(info.identifier).toBe('UTC');
    });

    it('should convert timestamps between timezones', () => {
      const timestamp = 1640995200; // 2022-01-01 00:00:00 UTC
      const result = timezoneService.convertTimestamp(timestamp, 'UTC', 'America/New_York');
      
      expect(result).toHaveProperty('originalTimestamp');
      expect(result).toHaveProperty('convertedTimestamp');
      expect(result).toHaveProperty('offsetDifference');
    });
  });

  describe('Format Service', () => {
    it('should register and retrieve formats', () => {
      const format = formatService.getFormat('iso8601');
      expect(format).toBeDefined();
      expect(format?.name).toBe('ISO 8601');
    });

    it('should format dates correctly', () => {
      const date = new Date('2022-01-01T12:00:00Z');
      const formatted = formatService.formatDate(date, 'us-date');
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('should validate format patterns', () => {
      const result = formatService.validateFormat('iso8601', '2022-01-01T12:00:00.000Z');
      expect(result.valid).toBe(true);
    });

    it('should parse dates from formats', () => {
      const date = formatService.parseDate('2022-01-01', 'iso8601-date');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2022);
    });
  });

  describe('Error Handler', () => {
    it('should create appropriate error types', () => {
      const badRequest = ErrorHandler.badRequest('Test message');
      expect(badRequest.code).toBe('BAD_REQUEST');
      expect(badRequest.statusCode).toBe(400);

      const notFound = ErrorHandler.notFound('Resource not found');
      expect(notFound.code).toBe('NOT_FOUND');
      expect(notFound.statusCode).toBe(404);
    });

    it('should provide recovery suggestions', () => {
      const suggestion = ErrorHandler.getInstance().getRecoverySuggestion('BAD_REQUEST');
      expect(suggestion).toContain('API documentation');
    });

    it('should track error summary', () => {
      const summary = ErrorHandler.getInstance().getErrorSummary();
      expect(summary).toHaveProperty('total');
      expect(summary).toHaveProperty('byCode');
      expect(summary).toHaveProperty('byStatus');
    });
  });

  describe('Monitoring Service', () => {
    it('should provide system status', async () => {
      const status = await monitoringService.getSystemStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('services');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('errors');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
    });

    it('should check all services', async () => {
      const services = await monitoringService.getSystemStatus();
      
      expect(services.services).toHaveProperty('cache');
      expect(services.services).toHaveProperty('timezone');
      expect(services.services).toHaveProperty('format');
    });
  });

  describe('API Integration', () => {
    it('should handle batch conversion correctly', async () => {
      const batchData = {
        items: [1640995200, '2022-01-01', 1641081600],
        outputFormat: ['iso8601', 'timestamp'],
        timezone: 'UTC',
        targetTimezone: 'America/New_York'
      };

      mockReq.method = 'POST';
      mockReq.body = batchData;

      // Import and test batch handler
      const batchHandler = (await import('../handlers/enhanced-batch')).default;
      await batchHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          metadata: expect.any(Object)
        })
      );
    });

    it('should handle timezone conversion correctly', async () => {
      mockReq.query = {
        from: 'UTC',
        to: 'America/New_York'
      };

      const tzHandler = (await import('../timezone-difference')).default;
      await tzHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      );
    });

    it('should handle format listing correctly', async () => {
      mockReq.query = {};

      const formatsHandler = (await import('../formats')).default;
      await formatsHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      );
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid timestamp gracefully', async () => {
      mockReq.query = { timestamp: 'invalid' };

      const convertHandler = (await import('../convert')).default;
      await convertHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: expect.any(String)
          })
        })
      );
    });

    it('should handle invalid timezone gracefully', async () => {
      mockReq.query = { from: 'invalid', to: 'timezone' };

      const tzHandler = (await import('../timezone-difference')).default;
      await tzHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle missing parameters gracefully', async () => {
      mockReq.query = {};

      const convertHandler = (await import('../convert')).default;
      await convertHandler(mockReq as VercelRequest, mockRes as VercelResponse);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Performance Tests', () => {
    it('should handle batch conversion efficiently', async () => {
      const largeBatch = {
        items: Array.from({ length: 100 }, (_, i) => 1640995200 + i * 86400),
        outputFormat: ['iso8601', 'timestamp']
      };

      mockReq.method = 'POST';
      mockReq.body = largeBatch;

      const start = Date.now();
      const batchHandler = (await import('../handlers/enhanced-batch')).default;
      await batchHandler(mockReq as VercelRequest, mockRes as VercelResponse);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should cache repeated requests', async () => {
      const timestamp = 1640995200;
      mockReq.query = { timestamp: String(timestamp) };

      const convertHandler = (await import('../convert')).default;
      
      // First call
      await convertHandler(mockReq as VercelRequest, mockRes as VercelResponse);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Second call should be faster (cached)
      const start = Date.now();
      await convertHandler(mockReq as VercelRequest, mockRes as VercelResponse);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should be very fast from cache
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      mockReq.query = { timestamp: '1640995200' };
      mockReq.headers = { 'x-forwarded-for': '192.168.1.1' };

      const convertHandler = (await import('../convert')).default;
      
      // Make many requests
      const promises = Array.from({ length: 110 }, () => 
        convertHandler(mockReq as VercelRequest, mockRes as VercelResponse)
      );
      
      await Promise.all(promises);
      
      // At least one should hit rate limit
      const statusCalls = mockRes.status.mock.calls;
      expect(statusCalls.some(call => call[0] === 429)).toBe(true);
    });
  });
});

// Contract tests
describe('API Contract Tests', () => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

  describe('Convert API Contract', () => {
    it('should follow response contract', async () => {
      const response = await fetch(`${baseUrl}/api/convert?timestamp=1640995200`);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('timestamp');
      expect(data.data).toHaveProperty('formats');
    });

    it('should handle errors with contract', async () => {
      const response = await fetch(`${baseUrl}/api/convert?timestamp=invalid`);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
    });
  });

  describe('Batch API Contract', () => {
    it('should follow batch response contract', async () => {
      const response = await fetch(`${baseUrl}/api/enhanced-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [1640995200, '2022-01-01'],
          outputFormat: ['iso8601']
        })
      });

      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('metadata');
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.metadata).toHaveProperty('totalItems');
      expect(data.metadata).toHaveProperty('successCount');
    });
  });

  describe('Health API Contract', () => {
    it('should provide health status', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('services');
    });
  });
});