/**
 * Unified Error Response Formatter
 * Standardized error response formatting with internationalization and context awareness
 */

import { VercelResponse } from '@vercel/node';
import { EnhancedError, ErrorCategory, ErrorSeverity } from './enhanced-error-manager';

export type ResponseFormat = 'standard' | 'minimal' | 'detailed' | 'debug';
export type LocaleCode = 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko';

export interface ErrorResponseConfig {
  format: ResponseFormat;
  locale: LocaleCode;
  includeStack: boolean;
  includeContext: boolean;
  includeSuggestions: boolean;
  includeHelpUrl: boolean;
  sanitizeDetails: boolean;
  correlationId?: string;
}

export interface StandardErrorResponse {
  success: false;
  error: {
    id: string;
    code: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    timestamp: number;
    requestId: string;
    statusCode: number;
    
    // Optional fields based on configuration
    details?: Record<string, unknown>;
    suggestions?: string[];
    helpUrl?: string;
    stack?: string;
    context?: Record<string, unknown>;
    recovery?: {
      strategy: string;
      attempted: boolean;
      successful: boolean;
      retryAfter?: number;
    };
  };
  
  metadata: {
    processingTime: number;
    correlationId?: string;
    version: string;
    environment: string;
    locale: LocaleCode;
    format: ResponseFormat;
  };
  
  // Additional response data for specific error types
  retryAfter?: number;
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: number;
    window: number;
  };
}

/**
 * Error message translations
 */
const ERROR_MESSAGES: Record<LocaleCode, Record<string, string>> = {
  en: {
    validation_error: 'The request contains invalid data. Please check your input and try again.',
    authentication_error: 'Authentication failed. Please check your credentials.',
    authorization_error: 'You do not have permission to access this resource.',
    rate_limit_error: 'Too many requests. Please wait a moment before trying again.',
    timeout_error: 'The request took too long to complete. Please try again.',
    external_service_error: 'An external service is temporarily unavailable. Please try again later.',
    database_error: 'A database error occurred. Please try again later.',
    cache_error: 'A caching error occurred. The request will proceed without caching.',
    security_error: 'A security issue was detected. Please contact support if this persists.',
    system_error: 'A system error occurred. Please try again later.',
    network_error: 'A network error occurred. Please check your connection and try again.',
    business_logic_error: 'A business logic error occurred. Please verify your request.',
    unknown_error: 'An unexpected error occurred. Please try again later.',
  },
  
  zh: {
    validation_error: '请求包含无效数据。请检查您的输入并重试。',
    authentication_error: '身份验证失败。请检查您的凭据。',
    authorization_error: '您没有访问此资源的权限。',
    rate_limit_error: '请求过于频繁。请稍等片刻后重试。',
    timeout_error: '请求超时。请重试。',
    external_service_error: '外部服务暂时不可用。请稍后重试。',
    database_error: '数据库错误。请稍后重试。',
    cache_error: '缓存错误。请求将在不使用缓存的情况下继续。',
    security_error: '检测到安全问题。如果问题持续存在，请联系支持。',
    system_error: '系统错误。请稍后重试。',
    network_error: '网络错误。请检查您的连接并重试。',
    business_logic_error: '业务逻辑错误。请验证您的请求。',
    unknown_error: '发生意外错误。请稍后重试。',
  },
  
  es: {
    validation_error: 'La solicitud contiene datos inválidos. Por favor, verifique su entrada e intente nuevamente.',
    authentication_error: 'Falló la autenticación. Por favor, verifique sus credenciales.',
    authorization_error: 'No tiene permisos para acceder a este recurso.',
    rate_limit_error: 'Demasiadas solicitudes. Por favor, espere un momento antes de intentar nuevamente.',
    timeout_error: 'La solicitud tardó demasiado en completarse. Por favor, intente nuevamente.',
    external_service_error: 'Un servicio externo no está disponible temporalmente. Por favor, intente más tarde.',
    database_error: 'Ocurrió un error de base de datos. Por favor, intente más tarde.',
    cache_error: 'Ocurrió un error de caché. La solicitud continuará sin caché.',
    security_error: 'Se detectó un problema de seguridad. Contacte soporte si esto persiste.',
    system_error: 'Ocurrió un error del sistema. Por favor, intente más tarde.',
    network_error: 'Ocurrió un error de red. Por favor, verifique su conexión e intente nuevamente.',
    business_logic_error: 'Ocurrió un error de lógica de negocio. Por favor, verifique su solicitud.',
    unknown_error: 'Ocurrió un error inesperado. Por favor, intente más tarde.',
  },
  
  fr: {
    validation_error: 'La demande contient des données invalides. Veuillez vérifier votre saisie et réessayer.',
    authentication_error: 'Échec de l\'authentification. Veuillez vérifier vos identifiants.',
    authorization_error: 'Vous n\'avez pas la permission d\'accéder à cette ressource.',
    rate_limit_error: 'Trop de demandes. Veuillez attendre un moment avant de réessayer.',
    timeout_error: 'La demande a pris trop de temps à se terminer. Veuillez réessayer.',
    external_service_error: 'Un service externe est temporairement indisponible. Veuillez réessayer plus tard.',
    database_error: 'Une erreur de base de données s\'est produite. Veuillez réessayer plus tard.',
    cache_error: 'Une erreur de cache s\'est produite. La demande continuera sans cache.',
    security_error: 'Un problème de sécurité a été détecté. Contactez le support si cela persiste.',
    system_error: 'Une erreur système s\'est produite. Veuillez réessayer plus tard.',
    network_error: 'Une erreur réseau s\'est produite. Veuillez vérifier votre connexion et réessayer.',
    business_logic_error: 'Une erreur de logique métier s\'est produite. Veuillez vérifier votre demande.',
    unknown_error: 'Une erreur inattendue s\'est produite. Veuillez réessayer plus tard.',
  },
  
  de: {
    validation_error: 'Die Anfrage enthält ungültige Daten. Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut.',
    authentication_error: 'Authentifizierung fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.',
    authorization_error: 'Sie haben keine Berechtigung, auf diese Ressource zuzugreifen.',
    rate_limit_error: 'Zu viele Anfragen. Bitte warten Sie einen Moment, bevor Sie es erneut versuchen.',
    timeout_error: 'Die Anfrage dauerte zu lange. Bitte versuchen Sie es erneut.',
    external_service_error: 'Ein externer Service ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.',
    database_error: 'Ein Datenbankfehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
    cache_error: 'Ein Cache-Fehler ist aufgetreten. Die Anfrage wird ohne Cache fortgesetzt.',
    security_error: 'Ein Sicherheitsproblem wurde erkannt. Kontaktieren Sie den Support, wenn dies anhält.',
    system_error: 'Ein Systemfehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
    network_error: 'Ein Netzwerkfehler ist aufgetreten. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
    business_logic_error: 'Ein Geschäftslogikfehler ist aufgetreten. Bitte überprüfen Sie Ihre Anfrage.',
    unknown_error: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
  },
  
  ja: {
    validation_error: 'リクエストに無効なデータが含まれています。入力を確認して再試行してください。',
    authentication_error: '認証に失敗しました。認証情報を確認してください。',
    authorization_error: 'このリソースにアクセスする権限がありません。',
    rate_limit_error: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
    timeout_error: 'リクエストの完了に時間がかかりすぎました。再試行してください。',
    external_service_error: '外部サービスが一時的に利用できません。後で再試行してください。',
    database_error: 'データベースエラーが発生しました。後で再試行してください。',
    cache_error: 'キャッシュエラーが発生しました。リクエストはキャッシュなしで続行されます。',
    security_error: 'セキュリティの問題が検出されました。問題が続く場合はサポートにお問い合わせください。',
    system_error: 'システムエラーが発生しました。後で再試行してください。',
    network_error: 'ネットワークエラーが発生しました。接続を確認して再試行してください。',
    business_logic_error: 'ビジネスロジックエラーが発生しました。リクエストを確認してください。',
    unknown_error: '予期しないエラーが発生しました。後で再試行してください。',
  },
  
  ko: {
    validation_error: '요청에 잘못된 데이터가 포함되어 있습니다. 입력을 확인하고 다시 시도하세요.',
    authentication_error: '인증에 실패했습니다. 자격 증명을 확인하세요.',
    authorization_error: '이 리소스에 액세스할 권한이 없습니다.',
    rate_limit_error: '요청이 너무 많습니다. 잠시 기다린 후 다시 시도하세요.',
    timeout_error: '요청 완료에 시간이 너무 오래 걸렸습니다. 다시 시도하세요.',
    external_service_error: '외부 서비스를 일시적으로 사용할 수 없습니다. 나중에 다시 시도하세요.',
    database_error: '데이터베이스 오류가 발생했습니다. 나중에 다시 시도하세요.',
    cache_error: '캐시 오류가 발생했습니다. 요청은 캐시 없이 계속됩니다.',
    security_error: '보안 문제가 감지되었습니다. 문제가 지속되면 지원팀에 문의하세요.',
    system_error: '시스템 오류가 발생했습니다. 나중에 다시 시도하세요.',
    network_error: '네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도하세요.',
    business_logic_error: '비즈니스 로직 오류가 발생했습니다. 요청을 확인하세요.',
    unknown_error: '예기치 않은 오류가 발생했습니다. 나중에 다시 시도하세요.',
  },
};

/**
 * Unified Error Response Formatter
 */
export class UnifiedErrorFormatter {
  private static instance: UnifiedErrorFormatter;
  private defaultConfig: ErrorResponseConfig;

  constructor(defaultConfig: Partial<ErrorResponseConfig> = {}) {
    this.defaultConfig = {
      format: 'standard',
      locale: 'en',
      includeStack: process.env.NODE_ENV === 'development',
      includeContext: process.env.NODE_ENV === 'development',
      includeSuggestions: true,
      includeHelpUrl: true,
      sanitizeDetails: process.env.NODE_ENV === 'production',
      ...defaultConfig
    };
  }

  static getInstance(defaultConfig?: Partial<ErrorResponseConfig>): UnifiedErrorFormatter {
    if (!UnifiedErrorFormatter.instance) {
      UnifiedErrorFormatter.instance = new UnifiedErrorFormatter(defaultConfig);
    }
    return UnifiedErrorFormatter.instance;
  }

  /**
   * Format and send error response
   */
  sendErrorResponse(
    error: EnhancedError,
    res: VercelResponse,
    config?: Partial<ErrorResponseConfig>
  ): void {
    const responseConfig = { ...this.defaultConfig, ...config };
    const response = this.formatErrorResponse(error, responseConfig);
    
    // Set response headers
    this.setErrorHeaders(res, error, responseConfig);
    
    // Send response
    res.status(error.statusCode).json(response);
  }

  /**
   * Format error response based on configuration
   */
  formatErrorResponse(
    error: EnhancedError,
    config: ErrorResponseConfig
  ): StandardErrorResponse {
    const baseResponse: StandardErrorResponse = {
      success: false,
      error: {
        id: error.id,
        code: error.code,
        message: this.getLocalizedMessage(error, config.locale),
        category: error.category,
        severity: error.severity,
        timestamp: error.timestamp,
        requestId: error.requestId,
        statusCode: error.statusCode,
      },
      metadata: {
        processingTime: error.monitoring.processingTime,
        correlationId: config.correlationId || error.context.correlationId,
        version: error.details.version || '1.0.0',
        environment: error.details.environment || 'unknown',
        locale: config.locale,
        format: config.format,
      }
    };

    // Add optional fields based on configuration and format
    this.addOptionalFields(baseResponse, error, config);
    
    // Add format-specific fields
    this.addFormatSpecificFields(baseResponse, error, config);
    
    // Add category-specific fields
    this.addCategorySpecificFields(baseResponse, error, config);

    return baseResponse;
  }

  /**
   * Get localized error message
   */
  private getLocalizedMessage(error: EnhancedError, locale: LocaleCode): string {
    const messageKey = `${error.category}_error`;
    const messages = ERROR_MESSAGES[locale] || ERROR_MESSAGES.en;
    return messages[messageKey] || error.userMessage || error.message;
  }

  /**
   * Add optional fields based on configuration
   */
  private addOptionalFields(
    response: StandardErrorResponse,
    error: EnhancedError,
    config: ErrorResponseConfig
  ): void {
    // Add suggestions
    if (config.includeSuggestions && error.suggestions.length > 0) {
      response.error.suggestions = error.suggestions;
    }

    // Add help URL
    if (config.includeHelpUrl && error.helpUrl) {
      response.error.helpUrl = error.helpUrl;
    }

    // Add stack trace
    if (config.includeStack && error.details.stack) {
      response.error.stack = error.details.stack;
    }

    // Add context
    if (config.includeContext) {
      response.error.context = this.sanitizeContext(error.context, config.sanitizeDetails);
    }

    // Add details
    if (error.details.parameters) {
      response.error.details = config.sanitizeDetails 
        ? this.sanitizeDetails(error.details.parameters)
        : error.details.parameters;
    }

    // Add recovery information
    if (error.recovery.attempted) {
      response.error.recovery = {
        strategy: error.recovery.strategy,
        attempted: error.recovery.attempted,
        successful: error.recovery.successful,
        retryAfter: error.recovery.nextRetryAt ? 
          Math.ceil((error.recovery.nextRetryAt - Date.now()) / 1000) : undefined
      };
    }
  }

  /**
   * Add format-specific fields
   */
  private addFormatSpecificFields(
    response: StandardErrorResponse,
    error: EnhancedError,
    config: ErrorResponseConfig
  ): void {
    switch (config.format) {
      case 'minimal':
        // Remove optional fields for minimal format
        delete response.error.details;
        delete response.error.context;
        delete response.error.suggestions;
        delete response.error.helpUrl;
        delete response.metadata.correlationId;
        break;

      case 'detailed':
        // Add extra details for detailed format
        response.metadata.errorId = error.id;
        response.metadata.category = error.category;
        response.metadata.severity = error.severity;
        break;

      case 'debug':
        // Add debug information
        response.error.debug = {
          originalError: error.details.originalError?.message,
          stack: error.details.stack,
          parameters: error.details.parameters,
          recovery: error.recovery,
          monitoring: error.monitoring
        };
        break;
    }
  }

  /**
   * Add category-specific fields
   */
  private addCategorySpecificFields(
    response: StandardErrorResponse,
    error: EnhancedError,
    config: ErrorResponseConfig
  ): void {
    switch (error.category) {
      case 'rate_limit':
        // Add retry-after header value
        if (error.recovery.nextRetryAt) {
          response.retryAfter = Math.ceil((error.recovery.nextRetryAt - Date.now()) / 1000);
        }
        
        // Add rate limit information if available
        if (error.details.parameters) {
          const params = error.details.parameters as any;
          if (params.limit || params.remaining || params.resetTime) {
            response.rateLimit = {
              limit: params.limit || 0,
              remaining: params.remaining || 0,
              resetTime: params.resetTime || 0,
              window: params.window || 60000
            };
          }
        }
        break;

      case 'validation':
        // Add validation errors if available
        if (error.details.parameters?.errors) {
          response.error.validationErrors = error.details.parameters.errors;
        }
        break;

      case 'timeout':
        // Add timeout information
        if (error.details.parameters?.timeout) {
          response.error.timeoutMs = error.details.parameters.timeout;
        }
        break;
    }
  }

  /**
   * Set error response headers
   */
  private setErrorHeaders(
    res: VercelResponse,
    error: EnhancedError,
    config: ErrorResponseConfig
  ): void {
    // Standard headers
    res.setHeader('X-Error-Code', error.code);
    res.setHeader('X-Error-ID', error.id);
    res.setHeader('X-Request-ID', error.requestId);
    res.setHeader('X-Error-Category', error.category);
    res.setHeader('X-Error-Severity', error.severity);

    // Correlation ID
    if (config.correlationId) {
      res.setHeader('X-Correlation-ID', config.correlationId);
    }

    // Category-specific headers
    switch (error.category) {
      case 'rate_limit':
        if (error.recovery.nextRetryAt) {
          const retryAfter = Math.ceil((error.recovery.nextRetryAt - Date.now()) / 1000);
          res.setHeader('Retry-After', retryAfter.toString());
        }
        break;

      case 'authentication':
        res.setHeader('WWW-Authenticate', 'Bearer');
        break;

      case 'timeout':
        res.setHeader('X-Timeout-Ms', error.details.parameters?.timeout?.toString() || '30000');
        break;
    }

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
  }

  /**
   * Sanitize context information
   */
  private sanitizeContext(context: any, sanitize: boolean): any {
    if (!sanitize) {
      return context;
    }

    const sanitized = { ...context };
    
    // Remove sensitive information
    delete sanitized.ip;
    delete sanitized.userAgent;
    delete sanitized.userId;
    delete sanitized.sessionId;
    
    return sanitized;
  }

  /**
   * Sanitize error details
   */
  private sanitizeDetails(details: any): any {
    if (typeof details !== 'object' || details === null) {
      return details;
    }

    const sanitized = { ...details };
    
    // Remove sensitive keys
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Create error response for different scenarios
   */
  createValidationErrorResponse(
    validationErrors: Array<{ field: string; message: string; code: string }>,
    config?: Partial<ErrorResponseConfig>
  ): StandardErrorResponse {
    const responseConfig = { ...this.defaultConfig, ...config };
    
    return {
      success: false,
      error: {
        id: this.generateId(),
        code: 'VALIDATION_ERROR',
        message: this.getLocalizedMessage({ category: 'validation' } as any, responseConfig.locale),
        category: 'validation',
        severity: 'low',
        timestamp: Date.now(),
        requestId: this.generateId(),
        statusCode: 400,
        validationErrors
      },
      metadata: {
        processingTime: 0,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'unknown',
        locale: responseConfig.locale,
        format: responseConfig.format,
      }
    };
  }

  /**
   * Create rate limit error response
   */
  createRateLimitErrorResponse(
    limit: number,
    remaining: number,
    resetTime: number,
    config?: Partial<ErrorResponseConfig>
  ): StandardErrorResponse {
    const responseConfig = { ...this.defaultConfig, ...config };
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    
    return {
      success: false,
      error: {
        id: this.generateId(),
        code: 'RATE_LIMIT_EXCEEDED',
        message: this.getLocalizedMessage({ category: 'rate_limit' } as any, responseConfig.locale),
        category: 'rate_limit',
        severity: 'medium',
        timestamp: Date.now(),
        requestId: this.generateId(),
        statusCode: 429,
      },
      metadata: {
        processingTime: 0,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'unknown',
        locale: responseConfig.locale,
        format: responseConfig.format,
      },
      retryAfter,
      rateLimit: {
        limit,
        remaining,
        resetTime,
        window: 60000
      }
    };
  }

  /**
   * Update default configuration
   */
  updateDefaultConfig(updates: Partial<ErrorResponseConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...updates };
  }

  /**
   * Get current default configuration
   */
  getDefaultConfig(): ErrorResponseConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Utility method to generate IDs
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default UnifiedErrorFormatter;
