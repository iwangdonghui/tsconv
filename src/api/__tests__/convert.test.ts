import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../../api/convert';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock the dependencies
vi.mock('../../../api/utils/response', () => ({
  APIErrorHandler: {
    handleBadRequest: vi.fn((res, message) => {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message
        }
      });
    }),
    handleMethodNotAllowed: vi.fn((res, message) => {
      res.status(405).json({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message
        }
      });
    }),
    handleServerError: vi.fn((res, error) => {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    })
  },
  ResponseBuilder: vi.fn().mockImplementation(() => ({
    setData: vi.fn().mockReturnThis(),
    send: vi.fn((res) => {
      res.status(200).json({
        success: true,
        data: expect.any(Object)
      });
    })
  })),
  withCors: vi.fn((handler) => {
    return async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return handler(req, res);
    };
  })
}));

vi.mock('../../../api/middleware/cache', () => ({
  createCacheMiddleware: vi.fn(() => (handler) => handler)
}));

vi.mock('../../../api/middleware/rate-limit', () => ({
  createRateLimitMiddleware: vi.fn(() => () => (handler) => handler)
}));

vi.mock('../../../api/services/format-service', () => ({
  default: {
    formatDate: vi.fn(() => 'formatted-date')
  }
}));

vi.mock('../../../api/utils/conversion-utils', () => ({
  convertTimezone: vi.fn((date) => date)
}));

describe('/api/convert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle OPTIONS request', async () => {
    const req = createMockRequest({
      method: 'OPTIONS',
      query: {},
    });
    
    const res = createMockResponse();
    
    await handler(req, res);
    
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });
});

const createMockRequest = (options: {
  method: string;
  query: Record<string, any>;
  body?: any;
}): VercelRequest => {
  return {
    method: options.method,
    query: options.query,
    body: options.body,
    headers: {},
    url: '',
    cookies: {},
  } as VercelRequest;
};

const createMockResponse = (): VercelResponse => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    write: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
    removeHeader: vi.fn(),
    writeHead: vi.fn(),
  } as unknown as VercelResponse;
  
  return res;
};
