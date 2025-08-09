/**
 * Advanced Type Definitions for TypeScript Converter
 * 
 * This file contains advanced type definitions, utility types,
 * and type guards to enhance type safety throughout the application.
 */

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Makes all properties of T required and non-nullable
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : NonNullable<T[P]>;
};

/**
 * Makes all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Creates a type with only the specified keys from T
 */
export type PickRequired<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

/**
 * Creates a union type of all possible paths in an object
 */
export type Paths<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}` | `${K}.${Paths<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

/**
 * Gets the type of a nested property by path
 */
export type PathValue<T, P extends Paths<T>> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Paths<T[K]>
      ? PathValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never;

/**
 * Branded types for enhanced type safety
 */
export type Brand<T, B> = T & { __brand: B };

// ============================================================================
// Branded Types for Domain-Specific Values
// ============================================================================

export type Timestamp = Brand<number, 'Timestamp'>;
export type TimestampMs = Brand<number, 'TimestampMs'>;
export type TimezoneId = Brand<string, 'TimezoneId'>;
export type DateString = Brand<string, 'DateString'>;
export type ISOString = Brand<string, 'ISOString'>;
export type UnixTimestamp = Brand<number, 'UnixTimestamp'>;

// ============================================================================
// Advanced API Types
// ============================================================================

/**
 * Generic API Response wrapper with enhanced type safety
 */
export interface TypedAPIResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly message?: string;
  readonly metadata: {
    readonly processingTime: number;
    readonly timestamp: UnixTimestamp;
    readonly requestId?: string;
    readonly version?: string;
  };
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> extends TypedAPIResponse<T[]> {
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly hasNext: boolean;
    readonly hasPrev: boolean;
  };
}

/**
 * Error response with detailed error information
 */
export interface ErrorResponse extends TypedAPIResponse<never> {
  readonly success: false;
  readonly error: string;
  readonly details?: {
    readonly code: string;
    readonly field?: string;
    readonly value?: unknown;
    readonly expected?: string;
  };
  readonly stack?: string; // Only in development
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is a valid timestamp
 */
export function isTimestamp(value: unknown): value is Timestamp {
  return typeof value === 'number' && 
         Number.isInteger(value) && 
         value > 0 && 
         value < 2147483647; // Max 32-bit signed integer
}

/**
 * Type guard to check if a value is a valid timestamp in milliseconds
 */
export function isTimestampMs(value: unknown): value is TimestampMs {
  return typeof value === 'number' && 
         Number.isInteger(value) && 
         value > 0 && 
         value < 2147483647000; // Max timestamp in ms
}

/**
 * Type guard to check if a value is a valid timezone ID
 */
export function isTimezoneId(value: unknown): value is TimezoneId {
  return typeof value === 'string' && 
         value.length > 0 && 
         /^[A-Za-z_]+\/[A-Za-z_]+$/.test(value);
}

/**
 * Type guard to check if a value is a valid ISO date string
 */
export function isISOString(value: unknown): value is ISOString {
  return typeof value === 'string' && 
         /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value) &&
         !isNaN(Date.parse(value));
}

/**
 * Type guard to check if a value is a valid date string (YYYY-MM-DD)
 */
export function isDateString(value: unknown): value is DateString {
  return typeof value === 'string' && 
         /^\d{4}-\d{2}-\d{2}$/.test(value) &&
         !isNaN(Date.parse(value));
}

/**
 * Type guard for API success response
 */
export function isSuccessResponse<T>(
  response: TypedAPIResponse<T>
): response is TypedAPIResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard for API error response
 */
export function isErrorResponse(
  response: TypedAPIResponse<unknown>
): response is ErrorResponse {
  return response.success === false;
}

// ============================================================================
// Advanced Validation Types
// ============================================================================

/**
 * Validation result type
 */
export type ValidationResult<T> = 
  | { valid: true; data: T; errors: never }
  | { valid: false; data: never; errors: ValidationError[] };

/**
 * Validation error type
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
  readonly value?: unknown;
}

/**
 * Schema validation function type
 */
export type Validator<T> = (value: unknown) => ValidationResult<T>;

// ============================================================================
// Advanced Function Types
// ============================================================================

/**
 * Async function with timeout
 */
export type AsyncWithTimeout<T extends (...args: any[]) => Promise<any>> = (
  ...args: Parameters<T>
) => Promise<Awaited<ReturnType<T>>>;

/**
 * Function with retry capability
 */
export type RetryableFunction<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T>>;

/**
 * Memoized function type
 */
export type MemoizedFunction<T extends (...args: any[]) => any> = T & {
  cache: Map<string, ReturnType<T>>;
  clear: () => void;
};

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Environment-aware configuration
 */
export interface EnvironmentConfig {
  readonly NODE_ENV: 'development' | 'production' | 'test';
  readonly API_URL: string;
  readonly DEBUG: boolean;
  readonly LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Feature flag configuration
 */
export interface FeatureFlags {
  readonly enableAdvancedTypes: boolean;
  readonly enableStrictValidation: boolean;
  readonly enablePerformanceMonitoring: boolean;
  readonly enableDetailedLogging: boolean;
}

// All types are already exported above with their definitions
