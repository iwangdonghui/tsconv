/**
 * Advanced Type Guards and Validation Utilities
 *
 * This module provides comprehensive type guards and validation utilities
 * for enhanced runtime type safety.
 */

import type {
  DateString,
  ISOString,
  Timestamp,
  TimestampMs,
  TimezoneId,
  TypedAPIResponse,
  ValidationError,
  ValidationResult,
} from '../types/advanced';

// ============================================================================
// Basic Type Guards
// ============================================================================

/**
 * Checks if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks if a value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value > 0;
}

/**
 * Checks if a value is a valid array with at least one element
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

// ============================================================================
// Domain-Specific Type Guards
// ============================================================================

/**
 * Enhanced timestamp validation with range checking
 */
export function isValidTimestamp(value: unknown): value is Timestamp {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return false;
  }

  // Unix timestamp should be between 1970 and 2038 (32-bit limit)
  const minTimestamp = 0;
  const maxTimestamp = 2147483647; // 2038-01-19

  return value >= minTimestamp && value <= maxTimestamp;
}

/**
 * Enhanced millisecond timestamp validation
 */
export function isValidTimestampMs(value: unknown): value is TimestampMs {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return false;
  }

  // Millisecond timestamp range
  const minTimestampMs = 0;
  const maxTimestampMs = 2147483647000; // 2038-01-19 in ms

  return value >= minTimestampMs && value <= maxTimestampMs;
}

/**
 * Comprehensive timezone ID validation
 */
export function isValidTimezoneId(value: unknown): value is TimezoneId {
  if (typeof value !== 'string') {
    return false;
  }

  // Common timezone patterns
  const timezonePatterns = [
    /^[A-Za-z_]+\/[A-Za-z_]+$/, // America/New_York
    /^[A-Za-z_]+\/[A-Za-z_]+\/[A-Za-z_]+$/, // America/Argentina/Buenos_Aires
    /^UTC[+-]\d{1,2}$/, // UTC+5, UTC-8
    /^GMT[+-]\d{1,2}$/, // GMT+5, GMT-8
    /^[A-Z]{3,4}$/, // EST, PST, etc.
  ];

  return timezonePatterns.some(pattern => pattern.test(value));
}

/**
 * Enhanced date string validation (YYYY-MM-DD)
 */
export function isValidDateString(value: unknown): value is DateString {
  if (typeof value !== 'string') {
    return false;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/**
 * Enhanced ISO string validation
 */
export function isValidISOString(value: unknown): value is ISOString {
  if (typeof value !== 'string') {
    return false;
  }

  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoPattern.test(value)) {
    return false;
  }

  const date = new Date(value);
  return !isNaN(date.getTime());
}

// ============================================================================
// Complex Type Guards
// ============================================================================

/**
 * Validates API response structure
 */
export function isValidAPIResponse<T>(
  value: unknown,
  dataValidator?: (data: unknown) => data is T
): value is TypedAPIResponse<T> {
  if (!isObject(value)) {
    return false;
  }

  const response = value as Record<string, unknown>;

  // Check required fields
  if (typeof response.success !== 'boolean') {
    return false;
  }

  if (!isObject(response.metadata)) {
    return false;
  }

  const metadata = response.metadata as Record<string, unknown>;
  if (typeof metadata.processingTime !== 'number' || typeof metadata.timestamp !== 'number') {
    return false;
  }

  // Validate data if validator provided
  if (dataValidator && response.data !== undefined) {
    return dataValidator(response.data);
  }

  return true;
}

/**
 * Validates configuration object structure
 */
export function isValidConfig(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) {
    return false;
  }

  // Add specific configuration validation logic here
  return true;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Creates a validation result
 */
export function createValidationResult<T>(
  valid: boolean,
  data?: T,
  errors?: ValidationError[]
): ValidationResult<T> {
  if (valid && data !== undefined) {
    return { valid: true, data, errors: undefined as never };
  } else {
    return { valid: false, data: undefined as never, errors: errors || [] };
  }
}

/**
 * Creates a validation error
 */
export function createValidationError(
  field: string,
  message: string,
  code: string,
  value?: unknown
): ValidationError {
  return { field, message, code, value };
}

/**
 * Validates multiple fields and combines results
 */
export function validateFields(
  validators: Array<() => ValidationResult<unknown>>
): ValidationResult<Record<string, unknown>> {
  const errors: ValidationError[] = [];
  const data: Record<string, unknown> = {};

  for (const validator of validators) {
    const result = validator();
    if (!result.valid) {
      errors.push(...result.errors);
    }
  }

  return errors.length === 0
    ? createValidationResult(true, data)
    : createValidationResult(false, {}, errors);
}

// ============================================================================
// Advanced Type Assertion Utilities
// ============================================================================

/**
 * Asserts that a value is of a specific type, throwing if not
 */
export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  message?: string
): asserts value is T {
  if (!guard(value)) {
    throw new TypeError(message || `Type assertion failed`);
  }
}

/**
 * Safely casts a value to a type with validation
 */
export function safeCast<T>(value: unknown, guard: (value: unknown) => value is T): T | null {
  return guard(value) ? value : null;
}

/**
 * Casts a value to a type with a default fallback
 */
export function castWithDefault<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  defaultValue: T
): T {
  return guard(value) ? value : defaultValue;
}

// ============================================================================
// Runtime Type Checking Utilities
// ============================================================================

/**
 * Checks if an object has all required properties
 */
export function hasRequiredProperties<T extends Record<string, unknown>>(
  obj: unknown,
  properties: (keyof T)[]
): obj is T {
  if (!isObject(obj)) {
    return false;
  }

  return properties.every(prop => prop in obj);
}

/**
 * Validates object shape at runtime
 */
export function validateObjectShape<T>(
  obj: unknown,
  shape: Record<keyof T, (value: unknown) => boolean>
): obj is T {
  if (!isObject(obj)) {
    return false;
  }

  return Object.entries(shape).every(([key, validator]) => {
    const value = (obj as Record<string, unknown>)[key];
    return typeof validator === 'function' ? validator(value) : false;
  });
}

// All functions are already exported above with their definitions
