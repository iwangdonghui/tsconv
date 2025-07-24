import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  errorHandlerMiddleware,
  asyncErrorHandler,
  APIErrorClass,
  ErrorType,
  ErrorSeverity,
  createValidationError,
  createNotFoundError,
  createRateLimitError,
  createTimeoutError,
  createInternalError,
  withRetry,
  CircuitBreaker
} from '../error-handler';

// Mock config
vi.mock('../../config/config', () => ({
  default: {
    monitoring: {
      logLevel: 'info'
    }
  }
}));

// Helper to create mock request/response
const createMockReq = (overrides: Partial<VercelRequest> = {}): VercelRequest => ({
  method: 'GET',
  url: '/api/convert',
  query: {},
  headers: {},
  body: {},
  ...overrides
} as VercelRequest);

const createMockRes = (): VercelResponse => {
  const res = {
    statusCode: 200,
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis()
  } as unknown as VercelResponse;
  
  return res;
};

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('APIErrorClass', () => {
    it('should create API error with all properties', () => {
      const error = new APIErrorClass(
        'Test error',
        'TEST_ERROR',
        400,
        {
          details: { field: 'value' },
          suggestions: ['Try again'],
          severity: ErrorSeverity.HIGH,
          type: ErrorType.VALIDATION_ERROR
        }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'value' });
      expect(error.suggestions).toEqual(['Try again']);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    it('should use default values when not provided', () => {
      const error = new APIErrorClass('Test error', 'TEST_ERROR');

      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.type).toBe(ErrorType.INTERNAL_ERROR);
    });
  });

  describe('errorHandlerMiddleware', () => {
    it('should handle APIErrorClass instances correctly', () => {
      const apiError = new APIErrorClass('Test error', 'TEST_ERROR', 400);
      const req = createMockReq();
      const res = createMockRes();

      const middleware = errorHandlerMiddleware();
      middleware(apiError, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TEST_ERROR',
            message: 'Test error',
            statusCode: 400
          })
        })
      );
    });

    it('should handle validation errors', () => {
      const error = new Error('Invalid input');
      error.name = 'ValidationError';
      
      const req = createMockReq();
      const res = createMockRes();

      const middleware = errorHandlerMiddleware();
      middleware(error, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            statusCode: 400
          })
        })
      );
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';
      
      const req = createMockReq();
      const res = createMockRes();

      const middleware = errorHandlerMiddleware();
      middleware(error, req, res);

      expect(res.status).toHaveBeenCalledWith(408);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TIMEOUT_ERROR',
            statusCode: 408
          })
        })
      );
    });

    it('should handle syntax errors', () => {
      const error = new SyntaxError('Invalid JSON');
      
      const req = createMockReq();
      const res = createMockRes();

      const middleware = errorHandlerMiddleware();
      middleware(error, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'BAD_REQUEST_ERROR',
            statusCode: 400
          })
        })
      );
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');
      
      const req = createMockReq();
      const res = createMockRes();

      const middleware = errorHandlerMiddleware();
      middleware(error, req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            statusCode: 500
          })
        })
      );
    });

    it('should log errors when enabled', () => {
      const error = new Error('Test error');
      const req = createMockReq();
      const res = createMockRes();

      const middleware = errorHandlerMiddleware({ logErrors: true });
      middleware(error, req, res);

      expect(console.error).toHaveBeenCalled();
    });

    it('should not log errors when disabled', () => {
      const error = new Error('Test error');
      const req = createMockReq();
      const res = createMockRes();

      const middleware = errorHandlerMiddleware({ logErrors: false });
      middleware(error, req, res);

      expect(console.error).not.toHaveBeenCalled();
    });

    it('should call custom error handler', () => {
      const onError = vi.fn();
      const error = new Error('Test error');
      const req = createMockReq();
      const res = createMockRes();

      const middleware = errorHandlerMiddleware({ onError });
      middleware(error, req, res);

      expect(onError).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it('should use custom error formatter', () => {
      const customErrorFormatter = vi.fn().mockReturnValue({
        code: 'CUSTOM_ERROR',
        message: 'Custom error message',
        timestamp: Date.now(),
        requestId: 'test-id',
        statusCode: 418
      });

      const error = new Error('Test error');
      const req = createMockReq();
      const res = createMockRes();

      const middleware = errorHandlerMiddleware({ customErrorFormatter });
      middleware(error, req, res);

      expect(customErrorFormatter).toHaveBeenCalledWith(error, expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(418);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'CUSTOM_ERROR'
          })
        })
      );
    });

    it('should set appropriate headers', () => {
      const error = new APIErrorClass('Test error', 'TEST_ERROR', 400);
      const req = createMockReq({ headers: { 'x-request-id': 'test-request-id' } });
      const res = createMockRes();

      const middleware = errorHandlerMiddleware();
      middleware(error, req, res);

      expect(res.setHeader).toHaveBeenCalledWith('X-Error-Code', 'TEST_ERROR');
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'test-request-id');
    });

    it('should set retry-after header for rate limit errors', () => {
      const error = new APIErrorClass('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429);
      const req = createMockReq();
      const res = createMockRes();

      const middleware = errorHandlerMiddleware();
      middleware(error, req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    });
  });

  describe('asyncErrorHandler', () => {
    it('should handle successful async operations', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = asyncErrorHandler(handler);
      
      const req = createMockReq();
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(handler).toHaveBeenCalledWith(req, res);
    });

    it('should catch and handle async errors', async () => {
      const error = new Error('Async error');
      const handler = vi.fn().mockRejectedValue(error);
      const wrappedHandler = asyncErrorHandler(handler);
      
      const req = createMockReq();
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(handler).toHaveBeenCalledWith(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Error creators', () => {
    describe('createValidationError', () => {
      it('should create validation error with correct properties', () => {
        const error = createValidationError('Invalid input', { field: 'timestamp' });

        expect(error.message).toBe('Invalid input');
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.statusCode).toBe(400);
        expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
        expect(error.severity).toBe(ErrorSeverity.LOW);
        expect(error.details).toEqual({ field: 'timestamp' });
      });
    });

    describe('createNotFoundError', () => {
      it('should create not found error', () => {
        const error = createNotFoundError('User', '123');

        expect(error.message).toBe('User not found: 123');
        expect(error.code).toBe('NOT_FOUND_ERROR');
        expect(error.statusCode).toBe(404);
        expect(error.type).toBe(ErrorType.NOT_FOUND_ERROR);
      });
    });

    describe('createRateLimitError', () => {
      it('should create rate limit error', () => {
        const resetTime = Date.now() + 60000;
        const error = createRateLimitError(100, resetTime);

        expect(error.message).toBe('Rate limit exceeded');
        expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(error.statusCode).toBe(429);
        expect(error.type).toBe(ErrorType.RATE_LIMIT_ERROR);
        expect(error.details).toEqual({
          limit: 100,
          resetTime,
          retryAfter: expect.any(Number)
        });
      });
    });

    describe('createTimeoutError', () => {
      it('should create timeout error', () => {
        const error = createTimeoutError(5000, 'database query');

        expect(error.message).toBe('Operation timed out during database query');
        expect(error.code).toBe('TIMEOUT_ERROR');
        expect(error.statusCode).toBe(408);
        expect(error.type).toBe(ErrorType.TIMEOUT_ERROR);
      });
    });

    describe('createInternalError', () => {
      it('should create internal error', () => {
        const cause = new Error('Database connection failed');
        const error = createInternalError('Service unavailable', cause);

        expect(error.message).toBe('Service unavailable');
        expect(error.code).toBe('INTERNAL_ERROR');
        expect(error.statusCode).toBe(500);
        expect(error.type).toBe(ErrorType.INTERNAL_ERROR);
        expect(error.cause).toBe(cause);
      });
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const error = new Error('Persistent failure');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(withRetry(operation, 2, 10)).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('CircuitBreaker', () => {
    it('should execute operation when circuit is closed', async () => {
      const circuitBreaker = new CircuitBreaker(3, 1000);
      const operation = vi.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after threshold failures', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000);
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));

      // First two failures should be allowed
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');

      // Third attempt should be blocked by circuit breaker
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is open');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should transition to half-open after timeout', async () => {
      const circuitBreaker = new CircuitBreaker(1, 10); // Very short timeout for testing
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');

      // Trigger circuit to open
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 15));

      // Should now allow operation and succeed
      const result = await circuitBreaker.execute(operation);
      expect(result).toBe('success');
    });
  });
});