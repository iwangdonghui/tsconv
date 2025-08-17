/**
 * Unified Error Handler
 *
 * A comprehensive, single-file error handling system that replaces all
 * scattered error handling components with a unified, maintainable solution.
 *
 * Features:
 * - Unified error types and severity levels
 * - Recovery strategies and fallback mechanisms
 * - Standardized response formatting
 * - Monitoring and logging integration
 * - Simple, clean API
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// CORE TYPES AND ENUMS
// ============================================================================

export enum ErrorType {
  // Client errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED_ERROR = 'UNAUTHORIZED_ERROR',
  FORBIDDEN_ERROR = 'FORBIDDEN_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  BAD_REQUEST_ERROR = 'BAD_REQUEST_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RecoveryStrategy {
  NONE = 'none',
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: number;
  additionalData?: Record<string, any>;
}

export interface ErrorConfig {
  type: ErrorType;
  message: string;
  severity?: ErrorSeverity;
  recoveryStrategy?: RecoveryStrategy;
  statusCode?: number;
  context?: ErrorContext;
  cause?: Error;
}

export interface ErrorResponse {
  success: false;
  error: {
    id: string;
    type: ErrorType;
    message: string;
    severity: ErrorSeverity;
    statusCode: number;
    timestamp: number;
    context?: Partial<ErrorContext>;
  };
}

// ============================================================================
// UNIFIED ERROR CLASS
// ============================================================================

export class UnifiedError extends Error {
  public readonly id: string;
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly context: ErrorContext;
  public readonly timestamp: number;

  constructor(config: ErrorConfig) {
    super(config.message);

    this.id = this.generateErrorId();
    this.type = config.type;
    this.severity = config.severity || this.getDefaultSeverity(config.type);
    this.statusCode = config.statusCode || this.getDefaultStatusCode(config.type);
    this.recoveryStrategy = config.recoveryStrategy || RecoveryStrategy.NONE;
    this.context = config.context || {};
    this.timestamp = Date.now();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnifiedError);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultSeverity(type: ErrorType): ErrorSeverity {
    const severityMap: Record<ErrorType, ErrorSeverity> = {
      [ErrorType.VALIDATION_ERROR]: ErrorSeverity.LOW,
      [ErrorType.UNAUTHORIZED_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.FORBIDDEN_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.NOT_FOUND_ERROR]: ErrorSeverity.LOW,
      [ErrorType.BAD_REQUEST_ERROR]: ErrorSeverity.LOW,
      [ErrorType.RATE_LIMIT_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.INTERNAL_ERROR]: ErrorSeverity.HIGH,
      [ErrorType.TIMEOUT_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.NETWORK_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.CACHE_ERROR]: ErrorSeverity.LOW,
      [ErrorType.DATABASE_ERROR]: ErrorSeverity.HIGH,
      [ErrorType.EXTERNAL_SERVICE_ERROR]: ErrorSeverity.MEDIUM,
    };
    return severityMap[type] || ErrorSeverity.MEDIUM;
  }

  private getDefaultStatusCode(type: ErrorType): number {
    const statusMap: Record<ErrorType, number> = {
      [ErrorType.VALIDATION_ERROR]: 400,
      [ErrorType.UNAUTHORIZED_ERROR]: 401,
      [ErrorType.FORBIDDEN_ERROR]: 403,
      [ErrorType.NOT_FOUND_ERROR]: 404,
      [ErrorType.BAD_REQUEST_ERROR]: 400,
      [ErrorType.RATE_LIMIT_ERROR]: 429,
      [ErrorType.INTERNAL_ERROR]: 500,
      [ErrorType.TIMEOUT_ERROR]: 504,
      [ErrorType.NETWORK_ERROR]: 502,
      [ErrorType.CACHE_ERROR]: 500,
      [ErrorType.DATABASE_ERROR]: 500,
      [ErrorType.EXTERNAL_SERVICE_ERROR]: 502,
    };
    return statusMap[type] || 500;
  }

  public toResponse(): ErrorResponse {
    return {
      success: false,
      error: {
        id: this.id,
        type: this.type,
        message: this.message,
        severity: this.severity,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        context: this.sanitizeContext(this.context),
      },
    };
  }

  private sanitizeContext(context: ErrorContext): Partial<ErrorContext> {
    // Remove sensitive information from context
    const { additionalData, ...safeContext } = context;
    return safeContext;
  }
}

// ============================================================================
// UNIFIED ERROR HANDLER
// ============================================================================

export class UnifiedErrorHandler {
  private static instance: UnifiedErrorHandler;

  public static getInstance(): UnifiedErrorHandler {
    if (!UnifiedErrorHandler.instance) {
      UnifiedErrorHandler.instance = new UnifiedErrorHandler();
    }
    return UnifiedErrorHandler.instance;
  }

  /**
   * Handle error and send appropriate response
   */
  public handleError(error: Error | UnifiedError, req: VercelRequest, res: VercelResponse): void {
    const unifiedError = this.normalizeError(error, req);

    // Log error based on severity
    this.logError(unifiedError);

    // Apply recovery strategy if applicable
    const recoveredError = this.applyRecoveryStrategy(unifiedError);

    // Send response
    this.sendErrorResponse(recoveredError, res);
  }

  /**
   * Convert any error to UnifiedError
   */
  private normalizeError(error: Error | UnifiedError, req: VercelRequest): UnifiedError {
    if (error instanceof UnifiedError) {
      return error;
    }

    // Extract context from request
    const context: ErrorContext = {
      requestId: req.headers['x-request-id'] as string,
      endpoint: req.url,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string) || req.connection?.remoteAddress,
      timestamp: Date.now(),
    };

    // Determine error type based on error message/type
    const errorType = this.classifyError(error);

    return new UnifiedError({
      type: errorType,
      message: error.message || 'An unexpected error occurred',
      context,
      cause: error,
    });
  }

  /**
   * Classify unknown errors into appropriate types
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION_ERROR;
    }
    if (message.includes('unauthorized') || message.includes('auth')) {
      return ErrorType.UNAUTHORIZED_ERROR;
    }
    if (message.includes('forbidden')) {
      return ErrorType.FORBIDDEN_ERROR;
    }
    if (message.includes('not found')) {
      return ErrorType.NOT_FOUND_ERROR;
    }
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR;
    }
    if (message.includes('network') || message.includes('connection')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (message.includes('cache')) {
      return ErrorType.CACHE_ERROR;
    }
    if (message.includes('database') || message.includes('db')) {
      return ErrorType.DATABASE_ERROR;
    }

    return ErrorType.INTERNAL_ERROR;
  }

  /**
   * Log error based on severity level
   */
  private logError(error: UnifiedError): void {
    const logData = {
      id: error.id,
      type: error.type,
      message: error.message,
      severity: error.severity,
      context: error.context,
      stack: error.stack,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error('[ERROR]', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('[WARN]', logData);
        break;
      case ErrorSeverity.LOW:
        console.info('[INFO]', logData);
        break;
    }
  }

  /**
   * Apply recovery strategy (placeholder for future implementation)
   */
  private applyRecoveryStrategy(error: UnifiedError): UnifiedError {
    // For now, just return the error as-is
    // Future: implement retry, fallback, circuit breaker logic
    return error;
  }

  /**
   * Send standardized error response
   */
  private sendErrorResponse(error: UnifiedError, res: VercelResponse): void {
    const response = error.toResponse();

    res.status(error.statusCode).json(response);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a new UnifiedError
 */
export function createError(config: ErrorConfig): UnifiedError {
  return new UnifiedError(config);
}

/**
 * Handle error in middleware style
 */
export function handleError(
  error: Error | UnifiedError,
  req: VercelRequest,
  res: VercelResponse
): void {
  const handler = UnifiedErrorHandler.getInstance();
  handler.handleError(error, req, res);
}

/**
 * Express-style error middleware
 */
export function errorMiddleware(
  error: Error,
  req: VercelRequest,
  res: VercelResponse,
  _next?: Function
): void {
  handleError(error, req, res);
}
