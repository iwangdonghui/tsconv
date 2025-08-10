import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  APIErrorHandler,
  ResponseBuilder,
  createResponse,
  createErrorResponse,
  validateRequest,
  sanitizeInput,
  generateCacheKey,
  getCacheTTL,
  calculateProcessingTime,
  createCorsHeaders,
} from '../response';
import { VercelResponse } from '@vercel/node';

// Mock VercelResponse
const mockResponse = () =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  }) as unknown as VercelResponse;

describe('Response Utilities', () => {
  describe('createResponse', () => {
    it('should create a successful response with data', () => {
      const data = { message: 'test' };
      const response = createResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.timestamp).toBeTypeOf('number');
      expect(response.error).toBeUndefined();
    });

    it('should create response with different data types', () => {
      const stringResponse = createResponse('test string');
      expect(stringResponse.data).toBe('test string');

      const arrayResponse = createResponse([1, 2, 3]);
      expect(arrayResponse.data).toEqual([1, 2, 3]);

      const numberResponse = createResponse(42);
      expect(numberResponse.data).toBe(42);
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response', () => {
      const errorMessage = 'Something went wrong';
      const response = createErrorResponse(errorMessage);

      expect(response.success).toBe(false);
      expect(response.error).toBe(errorMessage);
      expect(response.timestamp).toBeTypeOf('number');
      expect(response.data).toBeUndefined();
    });
  });

  describe('APIErrorHandler', () => {
    let mockRes: VercelResponse;

    beforeEach(() => {
      mockRes = mockResponse();
    });

    describe('createError', () => {
      it('should create an error object with required fields', () => {
        const error = APIErrorHandler.createError('TEST_ERROR', 'Test message');

        expect(error.code).toBe('TEST_ERROR');
        expect(error.message).toBe('Test message');
        expect(error.timestamp).toBeTypeOf('number');
        expect(error.requestId).toMatch(/^req_/);
      });

      it('should include optional details and suggestions', () => {
        const details = { field: 'value' };
        const suggestions = ['Try again', 'Check input'];

        const error = APIErrorHandler.createError(
          'TEST_ERROR',
          'Test message',
          400,
          details,
          suggestions
        );

        expect(error.details).toEqual(details);
        expect(error.suggestions).toEqual(suggestions);
      });
    });

    describe('sendError', () => {
      it('should send error response with correct status', () => {
        const error = APIErrorHandler.createError('TEST_ERROR', 'Test message');

        APIErrorHandler.sendError(mockRes, error, 400);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', error.requestId);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error,
          metadata: expect.objectContaining({
            processingTime: 0,
            itemCount: 0,
            cacheHit: false,
          }),
        });
      });
    });

    describe('sendSuccess', () => {
      it('should send success response with data', () => {
        const data = { result: 'success' };

        APIErrorHandler.sendSuccess(mockRes, data);

        expect(mockRes.setHeader).toHaveBeenCalledWith(
          'X-Request-ID',
          expect.stringMatching(/^req_/)
        );
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data,
          metadata: expect.objectContaining({
            processingTime: 0,
            itemCount: 1,
            cacheHit: false,
            requestId: expect.stringMatching(/^req_/),
          }),
        });
      });

      it('should calculate item count for arrays', () => {
        const data = [1, 2, 3];

        APIErrorHandler.sendSuccess(mockRes, data);

        const call = (mockRes.json as any).mock.calls[0][0];
        expect(call.metadata.itemCount).toBe(3);
      });
    });

    describe('handleValidationError', () => {
      it('should handle validation errors correctly', () => {
        const validation = {
          valid: false,
          errors: [{ field: 'test', message: 'Invalid', code: 'INVALID' }],
        };

        APIErrorHandler.handleValidationError(mockRes, validation);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: 'Invalid request parameters',
            }),
          })
        );
      });
    });
  });

  describe('ResponseBuilder', () => {
    it('should build response with fluent interface', () => {
      const data = { test: 'data' };
      const builder = new ResponseBuilder<typeof data>();

      const response = builder
        .setData(data)
        .setCacheHit(true)
        .setRateLimit({ limit: 100, remaining: 99, resetTime: Date.now(), window: 3600 })
        .build();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata.cacheHit).toBe(true);
      expect(response.metadata.rateLimit.limit).toBe(100);
    });

    it('should send response with headers', () => {
      const mockRes = mockResponse();
      const builder = new ResponseBuilder();

      builder.setData({ test: 'data' }).send(mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        expect.stringMatching(/^req_/)
      );
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    describe('validateRequest', () => {
      it('should validate GET request successfully', () => {
        const req = { method: 'GET' } as any;
        const result = validateRequest(req);

        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      });

      it('should reject invalid methods', () => {
        const req = { method: 'DELETE' } as any;
        const result = validateRequest(req);

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'method',
          message: 'Method DELETE not allowed',
          code: 'INVALID_METHOD',
        });
      });
    });

    describe('sanitizeInput', () => {
      it('should sanitize input string', () => {
        const input = '  test\x00string\x1F  ';
        const result = sanitizeInput(input);

        expect(result).toBe('teststring');
      });

      it('should limit input length', () => {
        const longInput = 'a'.repeat(2000);
        const result = sanitizeInput(longInput);

        expect(result.length).toBe(1000);
      });
    });

    describe('generateCacheKey', () => {
      it('should generate consistent cache keys', () => {
        const params1 = { a: 1, b: 2 };
        const params2 = { b: 2, a: 1 };

        const key1 = generateCacheKey('test', params1);
        const key2 = generateCacheKey('test', params2);

        expect(key1).toBe(key2);
        expect(key1).toMatch(/^api:test:/);
      });
    });

    describe('getCacheTTL', () => {
      it('should return correct TTL for different endpoints', () => {
        expect(getCacheTTL('batch-convert')).toBe(5 * 60 * 1000);
        expect(getCacheTTL('timezone-info')).toBe(24 * 60 * 60 * 1000);
        expect(getCacheTTL('health')).toBe(60 * 1000);
        expect(getCacheTTL()).toBe(5 * 60 * 1000);
      });
    });

    describe('calculateProcessingTime', () => {
      it('should calculate processing time correctly', () => {
        const startTime = Date.now() - 1000;
        const processingTime = calculateProcessingTime(startTime);

        expect(processingTime).toBeGreaterThanOrEqual(1000);
        expect(processingTime).toBeLessThan(1100);
      });
    });

    describe('createCorsHeaders', () => {
      it('should create CORS headers with default values', () => {
        const headers = createCorsHeaders();

        expect(headers['Access-Control-Allow-Origin']).toBe('*');
        expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, OPTIONS');
        expect(headers['Cache-Control']).toBe('public, max-age=300');
      });

      it('should handle specific origins when configured', () => {
        process.env.ALLOWED_ORIGINS = 'https://example.com,https://test.com';

        const headers = createCorsHeaders('https://example.com');
        expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');

        delete process.env.ALLOWED_ORIGINS;
      });
    });
  });
});
