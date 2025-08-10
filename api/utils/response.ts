import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIError, APIResponse, ValidationResult } from '../types/api';

// Generate a consistent request ID format
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

export class APIErrorHandler {
  static createError(
    code: string,
    message: string,
    statusCode: number = 400,
    details?: Record<string, any>,
    suggestions?: string[]
  ): APIError {
    return {
      code,
      message,
      details,
      suggestions,
      timestamp: Date.now(),
      requestId: generateRequestId(),
    };
  }

  static sendError(res: VercelResponse, error: APIError, statusCode: number = 400): void {
    // Ensure consistent error response format
    const response: APIResponse = {
      success: false,
      error,
      metadata: {
        processingTime: 0,
        itemCount: 0,
        cacheHit: false,
        rateLimit: {
          limit: 0,
          remaining: 0,
          resetTime: 0,
          window: 0,
        },
      },
    };

    // Add correlation ID header for traceability
    res.setHeader('X-Request-ID', error.requestId);

    res.status(statusCode).json(response);
  }

  static sendSuccess<T>(
    res: VercelResponse,
    data: T,
    metadata?: Partial<{
      processingTime: number;
      itemCount: number;
      cacheHit: boolean;
      rateLimit: {
        limit: number;
        remaining: number;
        resetTime: number;
        window: number;
      };
      timezone?: string;
      requestId?: string;
    }>
  ): void {
    // Generate a request ID for successful responses too
    const requestId = generateRequestId();

    // Ensure consistent metadata structure
    const response: APIResponse<T> = {
      success: true,
      data,
      metadata: {
        processingTime: metadata?.processingTime || 0,
        itemCount: Array.isArray(data) ? data.length : data ? 1 : 0,
        cacheHit: metadata?.cacheHit || false,
        rateLimit: metadata?.rateLimit || {
          limit: 0,
          remaining: 0,
          resetTime: 0,
          window: 0,
        },
        requestId, // Add request ID to metadata for traceability
        ...metadata,
      },
    };

    // Add correlation ID header for traceability
    res.setHeader('X-Request-ID', requestId);

    res.json(response);
  }

  static handleValidationError(res: VercelResponse, validation: ValidationResult): void {
    const error = this.createError('VALIDATION_ERROR', 'Invalid request parameters', 400, {
      errors: validation.errors,
    });
    this.sendError(res, error, 400);
  }

  static handleRateLimitError(
    res: VercelResponse,
    limit: number,
    remaining: number,
    resetTime: number
  ): void {
    const error = this.createError(
      'RATE_LIMIT_EXCEEDED',
      'Rate limit exceeded. Please try again later.',
      429,
      { limit, remaining, resetTime },
      ['Wait for the rate limit window to reset', 'Consider upgrading your rate limit tier']
    );

    res.setHeader('Retry-After', Math.ceil((resetTime - Date.now()) / 1000));
    this.sendError(res, error, 429);
  }

  static handleServerError(
    res: VercelResponse,
    originalError: Error,
    context?: Record<string, any>
  ): void {
    console.error('Server error:', originalError, context);

    const requestId = generateRequestId();

    const error = this.createError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred. Please try again later.',
      500,
      {
        originalMessage: process.env.NODE_ENV === 'development' ? originalError.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? originalError.stack : undefined,
        context,
        requestId, // Include request ID in error details for logging
      },
      ['Try your request again in a few moments', 'Contact support if the issue persists']
    );

    // Log the error with the request ID for traceability
    console.error(`[${requestId}] Server error:`, originalError);

    this.sendError(res, error, 500);
  }

  static handleNotFound(res: VercelResponse, resource?: string): void {
    const error = this.createError(
      'NOT_FOUND',
      resource ? `${resource} not found` : 'Resource not found',
      404,
      { resource },
      ['Check the URL and try again', 'Verify the resource identifier is correct']
    );

    this.sendError(res, error, 404);
  }

  static handleBadRequest(
    res: VercelResponse,
    message: string,
    details?: Record<string, any>
  ): void {
    const error = this.createError('BAD_REQUEST', message, 400, details);

    this.sendError(res, error, 400);
  }

  static handleUnauthorized(
    res: VercelResponse,
    message: string = 'Unauthorized access',
    details?: Record<string, any>
  ): void {
    const error = this.createError('UNAUTHORIZED', message, 401, details);
    this.sendError(res, error);
  }

  static handleMethodNotAllowed(res: VercelResponse, message: string) {
    res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message,
      },
    });
  }
}

export class ResponseBuilder<T> {
  private startTime: number;
  private data?: T;
  private cacheHit: boolean = false;
  private rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: number;
    window: number;
  };
  private processingTime?: number;
  private requestId: string;
  private additionalMetadata: Record<string, any> = {};

  constructor() {
    this.startTime = Date.now();
    this.requestId = generateRequestId();
  }

  setData(data: T): this {
    this.data = data;
    return this;
  }

  setCacheHit(hit: boolean): this {
    this.cacheHit = hit;
    return this;
  }

  setRateLimit(rateLimit: {
    limit: number;
    remaining: number;
    resetTime: number;
    window: number;
  }): this {
    this.rateLimit = rateLimit;
    return this;
  }

  setProcessingTime(processingTime: number): this {
    this.processingTime = processingTime;
    return this;
  }

  // Add additional metadata fields
  addMetadata(key: string, value: any): this {
    this.additionalMetadata[key] = value;
    return this;
  }

  build(): APIResponse<T> {
    const processingTime = this.processingTime || Date.now() - this.startTime;
    const itemCount = Array.isArray(this.data) ? this.data.length : this.data ? 1 : 0;

    return {
      success: true,
      data: this.data,
      metadata: {
        processingTime,
        itemCount,
        cacheHit: this.cacheHit,
        requestId: this.requestId,
        rateLimit: this.rateLimit || {
          limit: 0,
          remaining: 0,
          resetTime: 0,
          window: 0,
        },
        ...this.additionalMetadata,
      },
    };
  }

  send(res: VercelResponse): void {
    const response = this.build();

    // Add correlation ID header for traceability
    res.setHeader('X-Request-ID', this.requestId);

    res.json(response);
  }
}

export function createCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const corsOrigin =
    origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins.includes('*')
        ? '*'
        : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': corsOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'public, max-age=300', // 5 minutes default
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  };
}

export function validateRequest(
  req: VercelRequest,
  schema?: Record<string, any>
): ValidationResult {
  const errors: Array<{
    field: string;
    message: string;
    code: string;
  }> = [];
  const warnings: Array<{
    field: string;
    message: string;
    code: string;
    suggestion?: string;
  }> = [];

  // Basic request validation
  if (!req.method) {
    errors.push({
      field: 'method',
      message: 'HTTP method is required',
      code: 'MISSING_METHOD',
    });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    errors.push({
      field: 'method',
      message: `Method ${req.method} not allowed`,
      code: 'INVALID_METHOD',
    });
  }

  // Content-Type validation for POST requests
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      warnings.push({
        field: 'content-type',
        message: 'Content-Type should be application/json',
        code: 'INVALID_CONTENT_TYPE',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '')
    .substring(0, 1000);
}

export function generateCacheKey(endpoint: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|');

  return `api:${endpoint}:${Buffer.from(sortedParams).toString('base64')}`;
}

export function getCacheTTL(endpoint?: string): number {
  switch (endpoint) {
    case 'batch-convert':
      return 5 * 60 * 1000; // 5 minutes for batch requests
    case 'timezone-info':
      return 24 * 60 * 60 * 1000; // 24 hours for timezone data
    case 'health':
      return 60 * 1000; // 1 minute for health checks
    default:
      return 5 * 60 * 1000; // 5 minutes default
  }
}

export function calculateProcessingTime(startTime: number): number {
  return Date.now() - startTime;
}

export function withCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

// Simple response utilities as specified in the design document
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export function createResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}

export function createErrorResponse(error: string): ApiResponse {
  return {
    success: false,
    error,
    timestamp: Date.now(),
  };
}
