# 🏷️ Type System Documentation

This document provides a comprehensive overview of the type system used in the TypeScript Converter project.

## Table of Contents

- [Core Types](#core-types)
- [API Types](#api-types)
- [Utility Types](#utility-types)
- [Branded Types](#branded-types)
- [Validation Types](#validation-types)
- [Type Guards](#type-guards)
- [Best Practices](#best-practices)

## Core Types

### Basic Domain Types

```typescript
// Time-related types
interface TimestampData {
  timestamp: number;        // Unix timestamp in seconds
  timestampMs: number;      // Unix timestamp in milliseconds
  date: string;            // ISO date string
  timezone?: string;       // Timezone identifier
}

// Conversion options
interface ConversionOptions {
  format?: string;         // Output format
  timezone?: string;       // Target timezone
  targetTimezone?: string; // Alternative target timezone
  includeFormats?: boolean; // Include multiple formats
}

// Format definitions
interface SupportedFormat {
  id: string;
  name: string;
  description: string;
  example: string;
  category: 'iso' | 'unix' | 'readable' | 'custom';
  pattern?: string;
}
```

### Configuration Types

```typescript
interface APIConfiguration {
  rateLimiting: {
    enabled: boolean;
    rules: RateLimitRule[];
    defaultLimits: Record<string, RateLimitRule>;
  };
  caching: {
    enabled: boolean;
    defaultTTL: number;
    maxCacheSize: number;
    redis: RedisConfig;
  };
  timezone: TimezoneConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}
```

## API Types

### Request/Response Types

```typescript
// Generic API response
interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata: {
    processingTime: number;
    timestamp: number;
    requestId?: string;
  };
}

// Conversion request
interface ConversionRequest {
  timestamp: number | string;
  isTimestamp?: boolean;
  format?: string;
  timezone?: string;
  targetTimezone?: string;
  includeFormats?: boolean;
}

// Batch conversion request
interface BatchConversionRequest {
  items: Array<{
    timestamp: number | string;
    format?: string;
    timezone?: string;
    targetTimezone?: string;
  }>;
  options?: {
    includeFormats?: boolean;
    continueOnError?: boolean;
  };
}
```

### Error Types

```typescript
interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
  value?: unknown;
}

interface ValidationError extends APIError {
  field: string;
  code: 'REQUIRED' | 'INVALID_TYPE' | 'INVALID_FORMAT' | 'OUT_OF_RANGE';
}
```

## Utility Types

### Advanced Type Transformations

```typescript
// Make all properties required recursively
type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : NonNullable<T[P]>;
};

// Make all properties optional recursively
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Pick required properties and make them required
type PickRequired<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

// Extract all possible paths from an object type
type Paths<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}` | `${K}.${Paths<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

// Get the type of a value at a specific path
type PathValue<T, P extends Paths<T>> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Paths<T[K]>
      ? PathValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never;
```

### Conditional Types

```typescript
// Check if a type is optional
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

// Get only optional properties
type OptionalKeys<T> = {
  [K in keyof T]: IsOptional<T, K> extends true ? K : never;
}[keyof T];

// Get only required properties
type RequiredKeys<T> = {
  [K in keyof T]: IsOptional<T, K> extends true ? never : K;
}[keyof T];
```

## Branded Types

### Domain-Specific Branding

```typescript
// Brand utility
type Brand<T, B> = T & { __brand: B };

// Time-related branded types
type Timestamp = Brand<number, 'Timestamp'>;
type TimestampMs = Brand<number, 'TimestampMs'>;
type UnixTimestamp = Brand<number, 'UnixTimestamp'>;

// String-based branded types
type TimezoneId = Brand<string, 'TimezoneId'>;
type DateString = Brand<string, 'DateString'>;
type ISOString = Brand<string, 'ISOString'>;
type FormatId = Brand<string, 'FormatId'>;

// ID types
type UserId = Brand<string, 'UserId'>;
type SessionId = Brand<string, 'SessionId'>;
type RequestId = Brand<string, 'RequestId'>;
```

### Usage Examples

```typescript
// Type-safe function signatures
function convertTimestamp(timestamp: Timestamp, timezone: TimezoneId): ISOString;
function getUserById(id: UserId): Promise<User>;
function createSession(userId: UserId): SessionId;

// Creating branded values
const timestamp = 1640995200 as Timestamp;
const timezone = 'America/New_York' as TimezoneId;
const result = convertTimestamp(timestamp, timezone);
```

## Validation Types

### Validation Schema

```typescript
interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type: 'string' | 'number' | 'boolean' | 'timestamp' | 'timezone' | 'array' | 'object';
    validator?: (value: unknown) => boolean;
    transform?: (value: unknown) => unknown;
    default?: unknown;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: readonly unknown[];
  };
}

// Validation result
type ValidationResult<T> = 
  | { valid: true; data: T; errors: never }
  | { valid: false; data: never; errors: ValidationError[] };
```

### Common Schemas

```typescript
const timestampSchema: ValidationSchema = {
  timestamp: {
    required: true,
    type: 'timestamp',
    min: 0,
    max: 2147483647
  }
};

const timezoneSchema: ValidationSchema = {
  timezone: {
    required: true,
    type: 'timezone',
    pattern: /^[A-Za-z_]+\/[A-Za-z_]+$/
  }
};

const paginationSchema: ValidationSchema = {
  page: {
    type: 'number',
    default: 1,
    min: 1
  },
  limit: {
    type: 'number',
    default: 10,
    min: 1,
    max: 100
  }
};
```

## Type Guards

### Basic Type Guards

```typescript
// Primitive type guards
function isString(value: unknown): value is string;
function isNumber(value: unknown): value is number;
function isBoolean(value: unknown): value is boolean;
function isObject(value: unknown): value is Record<string, unknown>;
function isArray<T>(value: unknown): value is T[];

// Enhanced type guards
function isNonEmptyString(value: unknown): value is string;
function isPositiveNumber(value: unknown): value is number;
function isNonEmptyArray<T>(value: unknown): value is T[];
```

### Domain-Specific Type Guards

```typescript
// Time-related type guards
function isValidTimestamp(value: unknown): value is Timestamp;
function isValidTimestampMs(value: unknown): value is TimestampMs;
function isValidTimezoneId(value: unknown): value is TimezoneId;
function isValidDateString(value: unknown): value is DateString;
function isValidISOString(value: unknown): value is ISOString;

// API type guards
function isSuccessResponse<T>(response: APIResponse<T>): response is APIResponse<T> & { success: true; data: T };
function isErrorResponse(response: APIResponse<unknown>): response is APIResponse<never> & { success: false; error: string };
```

### Advanced Type Guards

```typescript
// Object shape validation
function hasRequiredProperties<T extends Record<string, unknown>>(
  obj: unknown,
  properties: (keyof T)[]
): obj is T;

function validateObjectShape<T>(
  obj: unknown,
  shape: Record<keyof T, (value: unknown) => boolean>
): obj is T;

// Type assertion utilities
function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  message?: string
): asserts value is T;

function safeCast<T>(
  value: unknown,
  guard: (value: unknown) => value is T
): T | null;
```

## Best Practices

### 1. Use Branded Types for Domain Values

```typescript
// ❌ Avoid - easy to mix up parameters
function convertTime(timestamp: number, timezone: string): string;

// ✅ Prefer - type-safe parameters
function convertTime(timestamp: Timestamp, timezone: TimezoneId): ISOString;
```

### 2. Prefer `unknown` over `any`

```typescript
// ❌ Avoid - no type safety
function processData(data: any): any {
  return data.someProperty;
}

// ✅ Prefer - type-safe with guards
function processData(data: unknown): unknown {
  if (isObject(data) && 'someProperty' in data) {
    return data.someProperty;
  }
  throw new Error('Invalid data structure');
}
```

### 3. Use Type Guards at Boundaries

```typescript
// ✅ Validate external data
function handleAPIRequest(req: VercelRequest): APIResponse<ConversionResult> {
  if (!isValidTimestamp(req.body.timestamp)) {
    return { success: false, error: 'Invalid timestamp' };
  }
  
  // req.body.timestamp is now typed as Timestamp
  return processTimestamp(req.body.timestamp);
}
```

### 4. Leverage Utility Types

```typescript
// ✅ Use utility types for transformations
type PartialUser = DeepPartial<User>;
type RequiredUserFields = PickRequired<User, 'id' | 'email'>;
type UserPaths = Paths<User>;
type UserEmail = PathValue<User, 'profile.email'>;
```

### 5. Create Comprehensive Validation Schemas

```typescript
// ✅ Complete validation with all constraints
const userSchema: ValidationSchema = {
  id: {
    required: true,
    type: 'string',
    pattern: /^[a-zA-Z0-9-]+$/,
    min: 1,
    max: 50
  },
  email: {
    required: true,
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    max: 255
  },
  age: {
    type: 'number',
    min: 0,
    max: 150,
    default: 0
  }
};
```

## Type System Architecture

### Layer Structure

1. **Core Types** (`src/types/api.ts`)
   - Basic domain types
   - Configuration interfaces
   - Core business logic types

2. **Advanced Types** (`src/types/advanced.ts`)
   - Utility types
   - Branded types
   - Generic type helpers

3. **Type Guards** (`src/utils/type-guards.ts`)
   - Runtime validation functions
   - Type assertion utilities
   - Safe casting functions

4. **Validation Middleware** (`api/middleware/type-validation.ts`)
   - Request/response validation
   - Schema-based validation
   - API boundary type safety

### Integration Points

- **API Endpoints**: Use validation middleware for type safety
- **Business Logic**: Use branded types and type guards
- **Data Processing**: Use utility types for transformations
- **Error Handling**: Use typed error responses

## Conclusion

The type system provides comprehensive type safety through:
- **Compile-time Safety**: Advanced TypeScript configuration and custom types
- **Runtime Safety**: Type guards and validation middleware
- **Developer Experience**: Clear error messages and helpful utilities
- **Maintainability**: Consistent patterns and documentation

This multi-layered approach ensures both type safety and developer productivity while maintaining code quality and reliability.
