import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../../api/convert';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Create more complete mock objects
const createMockRequest = (overrides: Partial<VercelRequest> = {}): VercelRequest => {
  return {
    method: 'GET',
    url: '/api/convert',
    headers: {},
    body: undefined,
    query: {},
    cookies: {},
    ...overrides,
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
  } as unknown as VercelResponse;
  
  return res;
};

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

  it('should reject non-GET requests', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: {},
    });
    
    const res = createMockResponse();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only GET method is allowed"
      }
    });
  });

  it('should require timestamp or date parameter', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: {},
    });
    
    const res = createMockResponse();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "MISSING_PARAMETER",
        message: "Please provide either 'timestamp' or 'date' parameter"
      }
    });
  });

  it('should reject both timestamp and date parameters', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { timestamp: '1640995200', date: '2022-01-01' },
    });
    
    const res = createMockResponse();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "CONFLICTING_PARAMETERS",
        message: "Please provide either 'timestamp' or 'date', not both"
      }
    });
  });

  it('should convert valid timestamp', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { timestamp: '1640995200' },
    });
    
    const res = createMockResponse();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        timestamp: 1640995200,
        utc: 'Sat, 01 Jan 2022 00:00:00 GMT',
        iso8601: '2022-01-01T00:00:00.000Z',
        relative: expect.any(String)
      }
    });
  });

  it('should reject invalid timestamp', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { timestamp: 'invalid' },
    });
    
    const res = createMockResponse();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "INVALID_TIMESTAMP",
        message: "The provided timestamp is invalid"
      }
    });
  });

  it('should reject timestamp out of range', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { timestamp: '2147483648' },
    });
    
    const res = createMockResponse();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "TIMESTAMP_OUT_OF_RANGE",
        message: "Timestamp must be between 0 and 2147483647"
      }
    });
  });

  it('should convert valid date', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { date: '2022-01-01' },
    });
    
    const res = createMockResponse();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        date: '2022-01-01',
        timestamp: expect.any(Number),
        utc: expect.any(String),
        iso8601: expect.any(String)
      }
    });
  });

  it('should reject invalid date', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { date: 'invalid-date' },
    });
    
    const res = createMockResponse();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "INVALID_DATE",
        message: "The date parameter cannot be parsed. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)"
      }
    });
  });
});
