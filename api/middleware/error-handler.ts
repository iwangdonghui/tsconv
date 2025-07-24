import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIResponse, APIError, ErrorContext } from '../types/api';
import config from '../config/config';

// Error types for classification
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  UNAUTHORIZED_ERROR = 'UNAUTHORIZED_ERROR',
  FORBIDDEN_ERROR = 'FORBIDDEN_ERROR',
  BAD_REQUEST_ERROR = 'BAD_REQUEST_ERROR'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Custom error class for API errors
export class APIErrorClass extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly suggestions?: string[];
  public readonly severity: ErrorSeverity;
  public readonly type: ErrorType;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    options: {
      details?: Record<string, any>;
      suggestions?: string[];
      severity?: ErrorSeverity;
      type?: ErrorType;
      context?: ErrorContext;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = options.details;
    this.suggestions = options.suggestions;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.type = options.type || ErrorType.INTERNAL_ERROR;
    this.context = options.context;

    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIErrorClass);
    }
  }
}

// Error handler middleware options
export interface ErrorHandlerOptions {
  includeStackTrace?: boolean;
  logErrors?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  customErrorFormatter?: (error: Error, context: ErrorContext) => APIError;
  onError?: (error: Error, context: ErrorContext) => void;
  sanitizeErrors?: boolean;
}

// Default error formatter
const defaultErrorFormatter = (error: Error, context: ErrorContext): APIError => {
  const timestamp = Date.now();
  const requestId = context.requestId || `error-${timestamp}`;

  // Handle APIErrorClass instances
  if (error instanceof APIErrorClass) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp,
      requestId,
      suggestions: error.suggestions,
      statusCode: error.statusCode,
      stack: config.monitoring.logLevel === 'debug' ? error.stack : undefined
    };
  }

  // Handle common error types
  if (error.name === 'ValidationError') {
    return {
      code: 'VALIDATION_ERROR',
      message: error.message,
      timestamp,
      requestId,
      statusCode: 400,
      suggestions: [
        'Check the request parameters',
        'Ensure all required fields are provided',
        'Verify data types and formats'
      ]
    };
  }

  if (error.name === 'TimeoutError') {
    return {
      code: 'TIMEOUT_ERROR',
      message: 'Request timeout',
      details: { originalError: error.message },
      timestamp,
      requestId,
      statusCode: 408,
      suggestions: [
        'Try again with a smaller request',
        'Check network connectivity',
        'Consider breaking the request into smaller parts'
      ]
    };
  }

  if (error.name === 'SyntaxError') {
    return {
      code: 'BAD_REQUEST_ERROR',
      message: 'Invalid request format',
      details: { originalError: error.message },
      timestamp,
      requestId,
      statusCode: 400,
      suggestions: [
        'Check JSON syntax',
        'Verify request content-type',
        'Ensure proper encoding'
      ]
    };
  }

  // Default error handling
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    code: 'INTERNAL_ERROR',
    message: isProduction ? 'An internal error occurred' : error.message,
    details: isProduction ? undefined : { originalError: error.message },
    timestamp,
    requestId,
    statusCode: 500,
    stack: config.monitoring.logLevel === 'debug' ? error.stack : undefined,
    suggestions: [
      'Try again later',
      'Contact support if the problem persists',
      'Check the API documentation for correct usage'
    ]
  };
};

// Error logging utility
const logError = (error: Error, context: ErrorContext, level: string = 'error') => {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error instanceof APIErrorClass ? error.code : 'UNKNOWN'
    },
    context,
    timestamp: new Date().toISOString()
  };

  switch (level) {
    case 'debug':
      console.debug('API Error:', JSON.stringify(logData, null, 2));
      break;
    case 'info':
      console.info('API Error:', JSON.stringify(logData, null, 2));
      break;
    case 'warn':
      console.warn('API Error:', JSON.stringify(logData, null, 2));
      break;
    case 'error':
    default:
      console.error('API Error:', JSON.stringify(logData, null, 2));
      break;
  }
};

// Error handler middleware function
export const errorHandlerMiddleware = (options: ErrorHandlerOptions = {}) => {
  const {
    includeStackTrace = config.monitoring.logLevel === 'debug',
    logErrors = true,
    logLevel = config.monitoring.logLevel,
    customErrorFormatter = defaultErrorFormatter,
    onError,
    sanitizeErrors = process.env.NODE_ENV === 'production'
  } = options;

  return (error: Error, req: VercelRequest, res: VercelResponse) => {
    const context: ErrorContext = {
      requestId: req.headers['x-request-id'] as string || `req-${Date.now()}`,
      processingTime: Date.now() - (req as any).startTime,
      endpoint: req.url,
      method: req.method,
      userId: req.headers['x-user-id'] as string
    };

    // Log the error if enabled
    if (logErrors) {
      logError(error, context, logLevel);
    }

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, context);
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError);
      }
    }

    // Format the error
    const apiError = customErrorFormatter(error, context);

    // Sanitize error details in production
    if (sanitizeErrors && apiError.details) {
      // Remove sensitive information
      const sanitizedDetails = { ...apiError.details };
      delete sanitizedDetails.password;
      delete sanitizedDetails.token;
      delete sanitizedDetails.apiKey;
      delete sanitizedDetails.secret;
      apiError.details = sanitizedDetails;
    }

    // Remove stack trace if not included
    if (!includeStackTrace) {
      delete apiError.stack;
    }

    // Create error response
    const errorResponse: APIResponse = {
      success: false,
      error: apiError,
      metadata: {
        processingTime: context.processingTime || 0,
        itemCount: 0,
        cacheHit: false,
        rateLimit: {
          limit: 0,
          remaining: 0,
          resetTime: 0,
          window: 0
        },
        requestId: context.requestId
      }
    };

    // Set appropriate status code
    const statusCode = apiError.statusCode || 500;
    res.status(statusCode);

    // Set error headers
    res.setHeader('X-Error-Code', apiError.code);
    res.setHeader('X-Request-ID', context.requestId || '');
    
    if (statusCode === 429) {
      res.setHeader('Retry-After', '60');
    }

    // Send error response
    res.json(errorResponse);
  };
};

// Async error wrapper for handlers
export const asyncErrorHandler = (
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) => {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      // Add start time for processing time calculation
      (req as any).startTime = Date.now();
      await handler(req, res);
    } catch (error) {
      const errorHandler = errorHandlerMiddleware();
      errorHandler(error as Error, req, res);
    }
  };
};

// Predefined error creators
export const createValidationError = (
  message: string,
  details?: Record<string, any>
): APIErrorClass => {
  return new APIErrorClass(message, 'VALIDATION_ERROR', 400, {
    details,
    type: ErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    suggestions: [
      'Check the request parameters',
      'Ensure all required fields are provided',
      'Verify data types and formats'
    ]
  });
};

export const createNotFoundError = (
  resource: string,
  identifier?: string
): APIErrorClass => {
  return new APIErrorClass(
    `${resource} not found${identifier ? `: ${identifier}` : ''}`,
    'NOT_FOUND_ERROR',
    404,
    {
      details: { resource, identifier },
      type: ErrorType.NOT_FOUND_ERROR,
      severity: ErrorSeverity.LOW,
      suggestions: [
        'Check the resource identifier',
        'Verify the resource exists',
        'Check the API documentation for correct endpoints'
      ]
    }
  );
};

export const createRateLimitError = (
  limit: number,
  resetTime: number
): APIErrorClass => {
  return new APIErrorClass(
    'Rate limit exceeded',
    'RATE_LIMIT_EXCEEDED',
    429,
    {
      details: { limit, resetTime, retryAfter: Math.ceil((resetTime - Date.now()) / 1000) },
      type: ErrorType.RATE_LIMIT_ERROR,
      severity: ErrorSeverity.MEDIUM,
      suggestions: [
        'Wait for the rate limit to reset',
        'Consider upgrading to a higher rate limit tier',
        'Implement request batching to reduce API calls'
      ]
    }
  );
};

export const createTimeoutError = (
  timeout: number,
  operation?: string
): APIErrorClass => {
  return new APIErrorClass(
    `Operation timed out${operation ? ` during ${operation}` : ''}`,
    'TIMEOUT_ERROR',
    408,
    {
      details: { timeout, operation },
      type: ErrorType.TIMEOUT_ERROR,
      severity: ErrorSeverity.MEDIUM,
      suggestions: [
        'Try again with a smaller request',
        'Check network connectivity',
        'Consider breaking the request into smaller parts'
      ]
    }
  );
};

export const createInternalError = (
  message: string,
  cause?: Error
): APIErrorClass => {
  return new APIErrorClass(
    message,
    'INTERNAL_ERROR',
    500,
    {
      type: ErrorType.INTERNAL_ERROR,
      severity: ErrorSeverity.HIGH,
      cause,
      suggestions: [
        'Try again later',
        'Contact support if the problem persists',
        'Check the API documentation for correct usage'
      ]
    }
  );
};

// Error recovery utilities
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
};

// Circuit breaker pattern for external services
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw createInternalError('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Export types for external use
export type { ErrorHandlerOptions, ErrorContext };