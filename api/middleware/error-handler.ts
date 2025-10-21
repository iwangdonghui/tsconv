import { VercelRequest, VercelResponse } from '@vercel/node';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST_ERROR = 'BAD_REQUEST_ERROR',
}

export interface APIErrorInit {
  details?: Record<string, any>;
  suggestions?: string[];
  severity?: ErrorSeverity;
  type?: ErrorType;
  cause?: Error;
}

export class APIErrorClass extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly suggestions?: string[];
  public readonly severity: ErrorSeverity;
  public readonly type: ErrorType;
  public readonly timestamp: number;
  public readonly cause?: Error;

  constructor(message: string, code: string, statusCode = 500, init: APIErrorInit = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = init.details;
    this.suggestions = init.suggestions;
    this.severity = init.severity ?? ErrorSeverity.MEDIUM;
    this.type = init.type ?? ErrorType.INTERNAL_ERROR;
    this.timestamp = Date.now();
    this.cause = init.cause;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIErrorClass);
    }
  }
}

const DEFAULT_RETRY_AFTER_SECONDS = 60;

const SUGGESTION_MAP: Record<string, string> = {
  BAD_REQUEST: 'Review the API documentation and verify your request parameters.',
  VALIDATION_ERROR: 'Check the highlighted fields and submit the request again.',
  NOT_FOUND: 'Confirm the resource identifier and try again.',
  RATE_LIMIT_EXCEEDED: 'Reduce request frequency or wait before retrying.',
  INTERNAL_ERROR: 'Please retry shortly. Contact support if the problem persists.',
};

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeMessage(message: string): string {
  if (!message) {
    return 'An unexpected error occurred.';
  }

  if (/password/i.test(message)) {
    return message.replace(/password[^:]*:[^,]+/gi, 'password [REDACTED]');
  }

  return message;
}

function normalizeError(error: unknown): APIErrorClass {
  if (error instanceof APIErrorClass) {
    return error;
  }

  if (error instanceof Error) {
    switch (error.name) {
      case 'ValidationError':
        return createValidationError(error.message || 'Validation failed');
      case 'TimeoutError':
        return createTimeoutError(0, error.message || 'operation');
      case 'SyntaxError':
        return new APIErrorClass(error.message || 'Invalid JSON', 'BAD_REQUEST_ERROR', 400, {
          severity: ErrorSeverity.LOW,
          type: ErrorType.BAD_REQUEST_ERROR,
          suggestions: ['Review the request payload for missing or invalid fields.'],
        });
      default:
        break;
    }

    return new APIErrorClass(sanitizeMessage(error.message), 'INTERNAL_ERROR', 500, {
      severity: ErrorSeverity.HIGH,
      type: ErrorType.INTERNAL_ERROR,
      cause: error,
    });
  }

  const message = typeof error === 'string' ? error : 'Unknown error';
  return new APIErrorClass(sanitizeMessage(message), 'INTERNAL_ERROR', 500, {
    severity: ErrorSeverity.HIGH,
    type: ErrorType.INTERNAL_ERROR,
  });
}

function buildErrorResponse(
  error: APIErrorClass,
  correlationId: string
): {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  suggestions?: string[];
  severity: ErrorSeverity;
  type: ErrorType;
  timestamp: number;
  requestId: string;
} {
  return {
    code: error.code,
    message: sanitizeMessage(error.message),
    statusCode: error.statusCode,
    details: error.details,
    suggestions: error.suggestions,
    severity: error.severity,
    type: error.type,
    timestamp: error.timestamp,
    requestId: correlationId,
  };
}

export interface ErrorContext {
  request: VercelRequest;
  response: VercelResponse;
  correlationId: string;
  normalizedError?: APIErrorClass;
}

export interface ErrorHandlerOptions {
  logErrors?: boolean;
  onError?: (error: APIErrorClass, context: ErrorContext) => void;
  customErrorFormatter?: (
    error: APIErrorClass,
    context: ErrorContext
  ) => {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, any>;
    suggestions?: string[];
    severity?: ErrorSeverity;
    type?: ErrorType;
    timestamp?: number;
    [key: string]: any;
  };
  retryAfterSeconds?: number;
}

export function errorHandlerMiddleware(options: ErrorHandlerOptions = {}) {
  const { logErrors = true, onError, customErrorFormatter, retryAfterSeconds } = options;
  const handler = ErrorHandler.getInstance();

  return (error: unknown, req: VercelRequest, res: VercelResponse): void => {
    const normalizedError = normalizeError(error);
    const originalError = error instanceof Error ? error : normalizedError;
    const correlationId = (req.headers['x-request-id'] as string) || generateRequestId();
    const context: ErrorContext = {
      request: req,
      response: res,
      correlationId,
      normalizedError,
    };

    handler.record(normalizedError);

    if (logErrors) {
      try {
        handler.logError(normalizedError, context);
      } catch (loggingError) {
        console.warn('Error handler logging failed:', loggingError);
      }
    }

    if (onError) {
      try {
        onError(normalizedError, context);
      } catch (hookError) {
        console.warn('Custom error handler threw an error:', hookError);
      }
    }

    let formatted = buildErrorResponse(normalizedError, correlationId);

    if (customErrorFormatter) {
      const custom = customErrorFormatter(normalizedError, context);
      formatted = {
        code: custom.code,
        message: custom.message,
        statusCode: custom.statusCode,
        details: custom.details ?? normalizedError.details,
        suggestions: custom.suggestions ?? normalizedError.suggestions,
        severity: custom.severity ?? normalizedError.severity,
        type: custom.type ?? normalizedError.type,
        timestamp: custom.timestamp ?? normalizedError.timestamp,
        requestId: correlationId,
      };
    }

    res.setHeader('X-Error-Code', formatted.code);
    res.setHeader('X-Request-ID', correlationId);

    if (formatted.code === 'RATE_LIMIT_EXCEEDED' || formatted.statusCode === 429) {
      const retryAfter = formatted.details?.retryAfter ?? retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS;
      res.setHeader('Retry-After', String(retryAfter));
    }

    res.status(formatted.statusCode).json({
      success: false,
      error: formatted,
    });
  };
}

export function asyncErrorHandler(
  handler: (req: VercelRequest, res: VercelResponse, next?: Function) => Promise<any>,
  options?: ErrorHandlerOptions
) {
  const middleware = errorHandlerMiddleware(options);

  return async (req: VercelRequest, res: VercelResponse, next?: Function) => {
    try {
      if (next) {
        return await handler(req, res, next);
      }
      return await handler(req, res);
    } catch (error) {
      if (next) {
        next(error);
        return;
      }
      middleware(error, req, res);
    }
  };
}

export function createValidationError(message: string, details?: Record<string, any>): APIErrorClass {
  return new APIErrorClass(message, 'VALIDATION_ERROR', 400, {
    details,
    suggestions: details?.errors
      ? ['Review the invalid fields and update the request.']
      : ['Verify the payload matches the expected schema.'],
    severity: ErrorSeverity.LOW,
    type: ErrorType.VALIDATION_ERROR,
  });
}

export function createNotFoundError(resource: string, identifier?: string): APIErrorClass {
  const suffix = identifier ? `: ${identifier}` : '';
  return new APIErrorClass(`${resource} not found${suffix}`, 'NOT_FOUND_ERROR', 404, {
    severity: ErrorSeverity.LOW,
    type: ErrorType.NOT_FOUND_ERROR,
    suggestions: ['Confirm the resource identifier and try again.'],
  });
}

export function createRateLimitError(limit: number, resetTime: number): APIErrorClass {
  const retryAfter = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
  return new APIErrorClass('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, {
    severity: ErrorSeverity.MEDIUM,
    type: ErrorType.RATE_LIMIT_ERROR,
    suggestions: ['Reduce request frequency or wait before retrying.'],
    details: {
      limit,
      resetTime,
      retryAfter,
    },
  });
}

export function createTimeoutError(timeoutMs: number, operation: string): APIErrorClass {
  const readable = timeoutMs > 0 ? `${timeoutMs}ms` : 'configured';
  return new APIErrorClass(`Operation timed out during ${operation}`, 'TIMEOUT_ERROR', 408, {
    severity: ErrorSeverity.MEDIUM,
    type: ErrorType.TIMEOUT_ERROR,
    suggestions: [`Retry the operation or increase the ${readable} timeout.`],
  });
}

export function createInternalError(message: string, cause?: Error): APIErrorClass {
  return new APIErrorClass(message, 'INTERNAL_ERROR', 500, {
    severity: ErrorSeverity.HIGH,
    type: ErrorType.INTERNAL_ERROR,
    cause,
    suggestions: ['Please retry shortly.'],
  });
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  attempts = 3,
  backoffMs = 100
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private nextAttempt = 0;

  constructor(private readonly failureThreshold = 5, private readonly resetTimeoutMs = 30000) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === 'open') {
      if (now >= this.nextAttempt) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
    }
  }
}

interface ErrorSummary {
  total: number;
  byCode: Record<string, number>;
  byStatus: Record<number, number>;
  lastError?: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: number;
  };
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private summary: ErrorSummary = {
    total: 0,
    byCode: {},
    byStatus: {},
  };

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  static badRequest(message: string, details?: Record<string, any>): APIErrorClass {
    return new APIErrorClass(message, 'BAD_REQUEST', 400, {
      details,
      severity: ErrorSeverity.LOW,
      type: ErrorType.BAD_REQUEST_ERROR,
      suggestions: ['Review the request payload for missing or invalid fields.'],
    });
  }

  static notFound(message: string, details?: Record<string, any>): APIErrorClass {
    return new APIErrorClass(message, 'NOT_FOUND', 404, {
      details,
      severity: ErrorSeverity.LOW,
      type: ErrorType.NOT_FOUND_ERROR,
      suggestions: ['Verify the resource exists and retry.'],
    });
  }

  getRecoverySuggestion(code: string): string {
    return SUGGESTION_MAP[code] ?? 'Retry the request or contact support if the issue persists.';
  }

  getErrorSummary(): ErrorSummary {
    return {
      total: this.summary.total,
      byCode: { ...this.summary.byCode },
      byStatus: { ...this.summary.byStatus },
      lastError: this.summary.lastError ? { ...this.summary.lastError } : undefined,
    };
  }

  record(error: APIErrorClass): void {
    this.summary.total += 1;
    this.summary.byCode[error.code] = (this.summary.byCode[error.code] || 0) + 1;
    this.summary.byStatus[error.statusCode] = (this.summary.byStatus[error.statusCode] || 0) + 1;
    this.summary.lastError = {
      code: error.code,
      message: sanitizeMessage(error.message),
      statusCode: error.statusCode,
      timestamp: error.timestamp,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  logError(error: APIErrorClass, context?: ErrorContext): void {
    const payload = {
      code: error.code,
      message: sanitizeMessage(error.message),
      statusCode: error.statusCode,
      severity: error.severity,
      type: error.type,
      requestId: context?.correlationId,
      details: error.details,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error('[ErrorHandler]', payload);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('[ErrorHandler]', payload);
        break;
      default:
        console.info('[ErrorHandler]', payload);
        break;
    }
  }
}

export default ErrorHandler;
