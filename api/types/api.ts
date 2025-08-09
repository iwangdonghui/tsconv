// Core API types and interfaces for enhanced functionality

// Base response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: ResponseMetadata;
  cache?: CacheInfo;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
  requestId: string;
  suggestions?: string[];
  statusCode?: number;
  stack?: string;
}

export interface ResponseMetadata {
  processingTime: number;
  itemCount: number;
  cacheHit: boolean;
  rateLimit: RateLimitInfo;
  timezone?: string;
  requestId?: string;
}

export interface CacheInfo {
  key: string;
  ttl: number;
  hit: boolean;
  size: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  window: number;
}

// Enhanced conversion request types
export interface EnhancedConversionRequest {
  // Single conversion
  timestamp?: number;
  date?: string;
  
  // Batch conversion
  items?: Array<string | number>;
  
  // Common parameters
  outputFormats?: string[];
  timezone?: string;
  targetTimezone?: string;
  
  // Options
  includeMetadata?: boolean;
  cacheControl?: 'no-cache' | 'force-refresh';
  
  // Validation options
  continueOnError?: boolean;
  maxItems?: number;
}

export interface EnhancedConversionResponse {
  success: boolean;
  data: ConversionData | ConversionData[];
  metadata?: ResponseMetadata;
  cache?: CacheInfo;
  error?: APIError;
}

export interface ConversionData {
  input: string | number;
  timestamp: number;
  formats: Record<string, string>;
  timezone?: TimezoneInfo;
  relative?: string;
  metadata?: {
    originalTimezone?: string;
    targetTimezone?: string;
    offsetDifference?: number;
    isDST?: boolean;
  };
}

// Batch conversion types
export interface BatchConversionRequest {
  items: Array<string | number>;
  outputFormat?: string[];
  timezone?: string;
  targetTimezone?: string;
  options?: {
    continueOnError: boolean;
    maxItems: number;
  };
}

export interface BatchConversionResponse {
  success: boolean;
  data: BatchConversionResult[];
  metadata: {
    totalItems: number;
    successCount: number;
    errorCount: number;
    processingTime: number;
  };
}

export interface BatchConversionResult {
  input: string | number;
  success: boolean;
  data?: ConversionData;
  error?: APIError;
}

// Timezone types
export interface TimezoneInfo {
  identifier: string;
  displayName: string;
  currentOffset: number;
  isDST: boolean;
  dstTransitions?: DSTTransition[];
  aliases?: string[];
}

export interface DSTTransition {
  date: string;
  offsetBefore: number;
  offsetAfter: number;
  type: 'start' | 'end';
}

export interface CommonTimezone {
  identifier: string;
  displayName: string;
  region: string;
  popularityRank: number;
  offset: number;
  isDST: boolean;
}

export interface TimezoneConversionRequest {
  timestamp: number;
  fromTimezone: string;
  toTimezone: string;
  formats?: string[];
}

export interface TimezoneConversionResponse {
  success: boolean;
  data: {
    originalTimestamp: number;
    convertedTimestamp: number;
    fromTimezone: TimezoneInfo;
    toTimezone: TimezoneInfo;
    offsetDifference: number;
    formats: Record<string, string>;
  };
}

// Format types
export interface CustomFormat {
  name: string;
  pattern: string;
  description: string;
  example: string;
  category: 'standard' | 'regional' | 'human' | 'technical';
}

export interface FormatService {
  format(timestamp: number, formats: string[], timezone?: string): Promise<FormattedResult[]>;
  validateFormat(format: string): FormatValidationResult;
  getSupportedFormats(): SupportedFormat[];
}

export interface FormattedResult {
  format: string;
  result: string;
  success: boolean;
  error?: string;
}

export interface FormatValidationResult {
  valid: boolean;
  format?: string;
  error?: string;
  suggestions?: string[];
}

export interface SupportedFormat {
  name: string;
  pattern: string;
  example: string;
  description: string;
  category: 'standard' | 'locale' | 'custom' | 'iso';
}

// Cache types
export interface CacheableRequest {
  endpoint: string;
  parameters: Record<string, any>;
  userId?: string;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  generateKey(request: CacheableRequest): string;
  clear(pattern?: string): Promise<void>;
  stats(): Promise<CacheStats>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  keys: string[];
}

// Rate limiting types
export interface RateLimitRule {
  identifier: string;
  limit: number;
  window: number;
  type: 'ip' | 'user' | 'api_key';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalLimit: number;
}

export interface RateLimiter {
  checkLimit(identifier: string, rule: RateLimitRule): Promise<RateLimitResult>;
  increment(identifier: string, rule: RateLimitRule): Promise<RateLimitResult>;
  reset(identifier: string, rule: RateLimitRule): Promise<void>;
  getStats(identifier: string): Promise<RateLimitStats>;
}

export interface RateLimitStats {
  identifier: string;
  currentCount: number;
  limit: number;
  window: number;
  resetTime: number;
}

// Configuration types
export interface APIConfiguration {
  rateLimiting: {
    enabled: boolean;
    rules: RateLimitRule[];
    defaultLimits: {
      anonymous: RateLimitRule;
      authenticated: RateLimitRule;
    };
  };
  caching: {
    enabled: boolean;
    defaultTTL: number;
    maxCacheSize: number;
    redis: {
      url: string;
      password?: string;
      maxRetries: number;
      fallbackToMemory?: boolean;
      useUpstash?: boolean;
    };
  };
  timezone: {
    dataSource: string;
    updateInterval: number;
    fallbackTimezone: string;
    maxTimezoneOffset: number;
  };
  monitoring: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    metricsEnabled: boolean;
    alertThresholds: AlertThreshold[];
  };
  security: {
    cors: {
      allowedOrigins: string[];
      allowedMethods: string[];
      allowedHeaders: string[];
    };
    csp: {
      enabled: boolean;
      reportOnly: boolean;
      useNonces: boolean;
      enableViolationReporting: boolean;
      reportEndpoint: string;
    };
    headers: {
      hsts: {
        enabled: boolean;
        maxAge: number;
        includeSubDomains: boolean;
        preload: boolean;
      };
      frameOptions: string;
      contentTypeOptions: string;
      xssProtection: string;
      referrerPolicy: string;
      permissionsPolicy: string;
    };
    maxRequestSize: string;
    timeout: number;
  };
}

export interface AlertThreshold {
  metric: string;
  threshold: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Request validation types
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

// Error context for error handling
export interface ErrorContext {
  requestId?: string;
  processingTime?: number;
  endpoint?: string;
  method?: string;
  userId?: string;
}

// Health check types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  services: {
    cache: ServiceHealth;
    rateLimiting: ServiceHealth;
    timezone: ServiceHealth;
    conversion: ServiceHealth;
  };
  metrics: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cache: {
      hits: number;
      misses: number;
      hitRatio: number;
    };
    rateLimits: {
      totalRequests: number;
      rateLimitedRequests: number;
      blockedPercentage: number;
    };
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: number;
  error?: string;
}