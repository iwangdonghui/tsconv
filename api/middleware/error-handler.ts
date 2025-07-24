import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIError, ErrorContext } from '../types/api.js';

// Generate a consistent request ID format
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: Array<{
    timestamp: number;
    error: APIError;
    context: ErrorContext;
    stack?: string;
  }> = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(
    error: Error | APIError,
    req: VercelRequest,
    res: VercelResponse,
    context: ErrorContext = {}
  ): void {
    const apiError = this.normalizeError(error);
    
    // Get or generate request ID for traceability
    const requestId = (req as any).requestId || context.requestId || generateRequestId();
    
    // Log the error
    this.logError(apiError, { ...context, requestId });

    // Determine if it's a client error or server error
    const isClientError = apiError.statusCode >= 400 && apiError.statusCode < 500;

    // Create a standardized error response
    const response = {
      success: false,
      error: {
        code: apiError.code,
        message: isClientError ? apiError.message : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          details: apiError.details,
          stack: apiError.stack
        }),
        timestamp: Date.now(),
        requestId,
        path: req.url,
        method: req.method
      },
      metadata: {
        processingTime: context.processingTime || 0,
        itemCount: 0,
        cacheHit: false,
        requestId,
        rateLimit: {
          limit: 0,
          remaining: 0,
          resetTime: 0,
          window: 0
        }
      }
    };

    // Add correlation ID header for traceability
    res.setHeader('X-Request-ID', requestId);
    
    res.status(apiError.statusCode).json(response);
  }

  private normalizeError(error: Error | APIError): APIError {
    if (this.isAPIError(error)) {
      return error;
    }

    // Convert standard Error to APIError
    return {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
      details: { originalError: error.message }
    };
  }

  private isAPIError(error: any): error is APIError {
    return error.code && error.statusCode && error.message;
  }

  private logError(error: APIError, context: ErrorContext): void {
    const logEntry = {
      timestamp: Date.now(),
      error,
      context,
      stack: new Error().stack
    };

    this.errorLog.push(logEntry);

    // Keep only last 1000 errors in memory
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-1000);
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context.requestId || 'no-id'}] API Error:`, {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        context,
        stack: error.stack
      });
    }
  }

  // Error factory methods
  static badRequest(message: string, details?: any): APIError {
    return {
      code: 'BAD_REQUEST',
      message,
      statusCode: 400,
      details
    };
  }

  static unauthorized(message: string = 'Unauthorized'): APIError {
    return {
      code: 'UNAUTHORIZED',
      message,
      statusCode: 401
    };
  }

  static forbidden(message: string = 'Forbidden'): APIError {
    return {
      code: 'FORBIDDEN',
      message,
      statusCode: 403
    };
  }

  static notFound(message: string = 'Resource not found'): APIError {
    return {
      code: 'NOT_FOUND',
      message,
      statusCode: 404
    };
  }

  static validationError(message: string, details: any): APIError {
    return {
      code: 'VALIDATION_ERROR',
      message,
      statusCode: 422,
      details
    };
  }

  static rateLimited(message: string = 'Rate limit exceeded'): APIError {
    return {
      code: 'RATE_LIMITED',
      message,
      statusCode: 429
    };
  }

  static internalError(message: string = 'Internal server error', details?: any): APIError {
    return {
      code: 'INTERNAL_ERROR',
      message,
      statusCode: 500,
      details
    };
  }

  static serviceUnavailable(message: string = 'Service temporarily unavailable'): APIError {
    return {
      code: 'SERVICE_UNAVAILABLE',
      message,
      statusCode: 503
    };
  }

  // Error summary for monitoring
  getErrorSummary(timeWindow: number = 3600000): {
    total: number;
    byCode: Record<string, number>;
    byStatus: Record<string, number>;
    recent: Array<{
      code: string;
      message: string;
      timestamp: number;
      requestId?: string;
    }>;
  } {
    const cutoff = Date.now() - timeWindow;
    const recentErrors = this.errorLog.filter(entry => entry.timestamp > cutoff);

    const byCode: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    recentErrors.forEach(entry => {
      byCode[entry.error.code] = (byCode[entry.error.code] || 0) + 1;
      byStatus[entry.error.statusCode.toString()] = 
        (byStatus[entry.error.statusCode.toString()] || 0) + 1;
    });

    return {
      total: recentErrors.length,
      byCode,
      byStatus,
      recent: recentErrors.slice(-10).map(entry => ({
        code: entry.error.code,
        message: entry.error.message,
        timestamp: entry.timestamp,
        requestId: entry.context.requestId
      }))
    };
  }

  // Error recovery suggestions
  getRecoverySuggestion(errorCode: string): string {
    const suggestions: Record<string, string> = {
      'BAD_REQUEST': 'Check your request parameters and ensure they match the API documentation',
      'VALIDATION_ERROR': 'Review the validation errors in the response details and correct your input',
      'NOT_FOUND': 'Verify the requested resource exists and the URL is correct',
      'RATE_LIMITED': 'Reduce your request rate or implement exponential backoff',
      'INTERNAL_ERROR': 'This is a temporary issue. Please try again in a few moments',
      'SERVICE_UNAVAILABLE': 'The service is temporarily unavailable. Please try again later'
    };

    return suggestions[errorCode] || 'Please check the error details and try again';
  }
}

// Middleware for async error handling
export function asyncErrorHandler(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      // Generate request ID if not already present
      if (!(req as any).requestId) {
        (req as any).requestId = generateRequestId();
        res.setHeader('X-Request-ID', (req as any).requestId);
      }
      
      await handler(req, res);
    } catch (error) {
      const errorHandler = ErrorHandler.getInstance();
      errorHandler.handleError(error as Error, req, res, {
        requestId: (req as any).requestId
      });
    }
  };
}

// Global error boundary for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log to monitoring service
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log to monitoring service
});

export default ErrorHandler;