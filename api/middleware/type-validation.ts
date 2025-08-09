/**
 * Advanced Type Validation Middleware
 * 
 * This middleware provides runtime type validation for API requests
 * and responses, ensuring type safety at the API boundary.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  ValidationResult,
  ValidationError,
  TypedAPIResponse
} from '../../src/types/advanced';
import {
  isValidTimestamp,
  isValidTimestampMs,
  isValidTimezoneId,
  isObject,
  createValidationResult,
  createValidationError
} from '../../src/utils/type-guards';

// ============================================================================
// Validation Schema Types
// ============================================================================

export interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type: 'string' | 'number' | 'boolean' | 'timestamp' | 'timestampMs' | 'timezone' | 'array' | 'object';
    validator?: (value: unknown) => boolean;
    transform?: (value: unknown) => unknown;
    default?: unknown;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: readonly unknown[];
  };
}

// ============================================================================
// Request Validation
// ============================================================================

/**
 * Validates request parameters against a schema
 */
export function validateRequestParams(
  req: VercelRequest,
  schema: ValidationSchema
): ValidationResult<Record<string, unknown>> {
  const errors: ValidationError[] = [];
  const validatedData: Record<string, unknown> = {};
  
  // Combine query and body parameters
  const params = { ...req.query, ...req.body };
  
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const value = params[fieldName];
    const result = validateField(fieldName, value, fieldSchema);
    
    if (result.valid) {
      validatedData[fieldName] = result.data;
    } else {
      errors.push(...result.errors);
    }
  }
  
  if (errors.length === 0) {
    return { valid: true, data: validatedData, errors: undefined as never };
  } else {
    return { valid: false, data: undefined as never, errors };
  }
}

/**
 * Validates a single field against its schema
 */
function validateField(
  fieldName: string,
  value: unknown,
  schema: ValidationSchema[string]
): ValidationResult<unknown> {
  // Handle missing required fields
  if (value === undefined || value === null || value === '') {
    if (schema.required) {
      return createValidationResult(false, undefined, [
        createValidationError(fieldName, `Field is required`, 'REQUIRED', value)
      ]);
    }
    
    // Use default value if provided
    if (schema.default !== undefined) {
      return createValidationResult(true, schema.default);
    }
    
    return createValidationResult(true, undefined);
  }
  
  // Transform value if transformer provided
  let transformedValue = schema.transform ? schema.transform(value) : value;
  
  // Type validation
  const typeValidation = validateFieldType(fieldName, transformedValue, schema);
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  transformedValue = typeValidation.data;
  
  // Additional validations
  const additionalValidation = validateFieldConstraints(fieldName, transformedValue, schema);
  if (!additionalValidation.valid) {
    return additionalValidation;
  }
  
  return createValidationResult(true, transformedValue);
}

/**
 * Validates field type
 */
function validateFieldType(
  fieldName: string,
  value: unknown,
  schema: ValidationSchema[string]
): ValidationResult<unknown> {
  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        return createValidationResult(false, undefined, [
          createValidationError(fieldName, 'Must be a string', 'INVALID_TYPE', value)
        ]);
      }
      break;
      
    case 'number':
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (typeof numValue !== 'number' || isNaN(numValue)) {
        return createValidationResult(false, undefined, [
          createValidationError(fieldName, 'Must be a number', 'INVALID_TYPE', value)
        ]);
      }
      value = numValue;
      break;
      
    case 'boolean':
      if (typeof value === 'string') {
        value = value.toLowerCase() === 'true';
      } else if (typeof value !== 'boolean') {
        return createValidationResult(false, undefined, [
          createValidationError(fieldName, 'Must be a boolean', 'INVALID_TYPE', value)
        ]);
      }
      break;
      
    case 'timestamp':
      const timestampValue = typeof value === 'string' ? parseInt(value, 10) : value;
      if (!isValidTimestamp(timestampValue)) {
        return createValidationResult(false, undefined, [
          createValidationError(fieldName, 'Must be a valid timestamp', 'INVALID_TIMESTAMP', value)
        ]);
      }
      value = timestampValue;
      break;
      
    case 'timestampMs':
      const timestampMsValue = typeof value === 'string' ? parseInt(value, 10) : value;
      if (!isValidTimestampMs(timestampMsValue)) {
        return createValidationResult(false, undefined, [
          createValidationError(fieldName, 'Must be a valid timestamp in milliseconds', 'INVALID_TIMESTAMP_MS', value)
        ]);
      }
      value = timestampMsValue;
      break;
      
    case 'timezone':
      if (!isValidTimezoneId(value)) {
        return createValidationResult(false, undefined, [
          createValidationError(fieldName, 'Must be a valid timezone ID', 'INVALID_TIMEZONE', value)
        ]);
      }
      break;
      
    case 'array':
      if (!Array.isArray(value)) {
        return createValidationResult(false, undefined, [
          createValidationError(fieldName, 'Must be an array', 'INVALID_TYPE', value)
        ]);
      }
      break;
      
    case 'object':
      if (!isObject(value)) {
        return createValidationResult(false, undefined, [
          createValidationError(fieldName, 'Must be an object', 'INVALID_TYPE', value)
        ]);
      }
      break;
  }
  
  // Custom validator
  if (schema.validator && !schema.validator(value)) {
    return createValidationResult(false, undefined, [
      createValidationError(fieldName, 'Custom validation failed', 'CUSTOM_VALIDATION', value)
    ]);
  }
  
  return createValidationResult(true, value);
}

/**
 * Validates field constraints (min, max, pattern, enum)
 */
function validateFieldConstraints(
  fieldName: string,
  value: unknown,
  schema: ValidationSchema[string]
): ValidationResult<unknown> {
  const errors: ValidationError[] = [];
  
  // Min/Max validation for numbers
  if (typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push(createValidationError(
        fieldName, 
        `Must be at least ${schema.min}`, 
        'MIN_VALUE', 
        value
      ));
    }
    
    if (schema.max !== undefined && value > schema.max) {
      errors.push(createValidationError(
        fieldName, 
        `Must be at most ${schema.max}`, 
        'MAX_VALUE', 
        value
      ));
    }
  }
  
  // Min/Max validation for strings (length)
  if (typeof value === 'string') {
    if (schema.min !== undefined && value.length < schema.min) {
      errors.push(createValidationError(
        fieldName, 
        `Must be at least ${schema.min} characters`, 
        'MIN_LENGTH', 
        value
      ));
    }
    
    if (schema.max !== undefined && value.length > schema.max) {
      errors.push(createValidationError(
        fieldName, 
        `Must be at most ${schema.max} characters`, 
        'MAX_LENGTH', 
        value
      ));
    }
  }
  
  // Pattern validation for strings
  if (typeof value === 'string' && schema.pattern) {
    if (!schema.pattern.test(value)) {
      errors.push(createValidationError(
        fieldName, 
        'Does not match required pattern', 
        'PATTERN_MISMATCH', 
        value
      ));
    }
  }
  
  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(createValidationError(
      fieldName, 
      `Must be one of: ${schema.enum.join(', ')}`, 
      'INVALID_ENUM', 
      value
    ));
  }
  
  return errors.length === 0
    ? createValidationResult(true, value)
    : createValidationResult(false, undefined, errors);
}

// ============================================================================
// Response Validation
// ============================================================================

/**
 * Validates API response structure
 */
export function validateResponse<T>(
  response: unknown,
  dataValidator?: (data: unknown) => data is T
): ValidationResult<TypedAPIResponse<T>> {
  if (!isObject(response)) {
    return createValidationResult(false, undefined, [
      createValidationError('response', 'Response must be an object', 'INVALID_TYPE', response)
    ]);
  }
  
  const resp = response as Record<string, unknown>;
  const errors: ValidationError[] = [];
  
  // Validate success field
  if (typeof resp.success !== 'boolean') {
    errors.push(createValidationError('success', 'Must be a boolean', 'INVALID_TYPE', resp.success));
  }
  
  // Validate metadata
  if (!isObject(resp.metadata)) {
    errors.push(createValidationError('metadata', 'Must be an object', 'INVALID_TYPE', resp.metadata));
  } else {
    const metadata = resp.metadata as Record<string, unknown>;
    
    if (typeof metadata.processingTime !== 'number') {
      errors.push(createValidationError('metadata.processingTime', 'Must be a number', 'INVALID_TYPE', metadata.processingTime));
    }
    
    if (typeof metadata.timestamp !== 'number') {
      errors.push(createValidationError('metadata.timestamp', 'Must be a number', 'INVALID_TYPE', metadata.timestamp));
    }
  }
  
  // Validate data if validator provided
  if (dataValidator && resp.data !== undefined && !dataValidator(resp.data)) {
    errors.push(createValidationError('data', 'Data validation failed', 'INVALID_DATA', resp.data));
  }
  
  return errors.length === 0
    ? createValidationResult(true, response as unknown as TypedAPIResponse<T>)
    : createValidationResult(false, undefined, errors);
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Creates a validation middleware for API endpoints
 */
export function createValidationMiddleware(schema: ValidationSchema) {
  return (req: VercelRequest, res: VercelResponse, next?: () => void) => {
    const validation = validateRequestParams(req, schema);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validation.errors,
        metadata: {
          processingTime: 0,
          timestamp: Math.floor(Date.now() / 1000)
        }
      });
    }
    
    // Attach validated data to request
    (req as any).validatedData = validation.data;

    if (next) {
      return next();
    }

    return undefined;
  };
}

// ============================================================================
// Common Validation Schemas
// ============================================================================

export const commonSchemas = {
  timestamp: {
    timestamp: {
      required: true,
      type: 'timestamp' as const,
      transform: (value: unknown) => typeof value === 'string' ? parseInt(value, 10) : value
    }
  },
  
  timezone: {
    timezone: {
      required: true,
      type: 'timezone' as const,
      transform: (value: unknown) => typeof value === 'string' ? value.trim() : value
    }
  },
  
  pagination: {
    page: {
      type: 'number' as const,
      default: 1,
      min: 1,
      transform: (value: unknown) => typeof value === 'string' ? parseInt(value, 10) : value
    },
    limit: {
      type: 'number' as const,
      default: 10,
      min: 1,
      max: 100,
      transform: (value: unknown) => typeof value === 'string' ? parseInt(value, 10) : value
    }
  }
} as const;
