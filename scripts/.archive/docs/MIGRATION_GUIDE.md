# Error Handling System Migration Guide

## Overview

This guide explains how to migrate from the old scattered error handling system to the new unified error handler.

## Old vs New System

### Before (Multiple Files)
```
api/middleware/error-handler.ts
api/services/error-handling/enhanced-error-manager.ts
api/services/error-handling/unified-error-middleware.ts
api/services/error-handling/unified-error-formatter.ts
api/services/error-handling/error-recovery-strategies.ts
```

### After (Single File)
```
api/services/unified-error-handler.ts
```

## Migration Steps

### 1. Update Imports

**Old:**
```typescript
import { APIErrorClass, ErrorType } from '../middleware/error-handler';
import { EnhancedErrorManager } from '../services/error-handling/enhanced-error-manager';
```

**New:**
```typescript
import { UnifiedError, ErrorType, createError, handleError } from '../services/unified-error-handler';
```

### 2. Error Creation

**Old:**
```typescript
throw new APIErrorClass('Validation failed', 'VALIDATION_ERROR', 400);
```

**New:**
```typescript
throw createError({
  type: ErrorType.VALIDATION_ERROR,
  message: 'Validation failed'
});
```

### 3. Error Handling in Routes

**Old:**
```typescript
try {
  // route logic
} catch (error) {
  const errorHandler = new EnhancedErrorManager();
  errorHandler.handleError(error, req, res);
}
```

**New:**
```typescript
try {
  // route logic
} catch (error) {
  handleError(error, req, res);
}
```

### 4. Middleware Usage

**Old:**
```typescript
import { errorMiddleware } from '../middleware/error-handler';
app.use(errorMiddleware);
```

**New:**
```typescript
import { errorMiddleware } from '../services/unified-error-handler';
app.use(errorMiddleware);
```

## Key Benefits

1. **Single Source of Truth**: All error handling logic in one file
2. **Simplified Dependencies**: No complex inter-file dependencies
3. **Consistent API**: Unified interface for all error operations
4. **Better Maintainability**: Easier to update and extend
5. **Reduced Bundle Size**: Eliminates duplicate code

## Type Mapping

| Old Type | New Type |
|----------|----------|
| `ErrorType.VALIDATION_ERROR` | `ErrorType.VALIDATION_ERROR` |
| `ErrorSeverity.HIGH` | `ErrorSeverity.HIGH` |
| `APIErrorClass` | `UnifiedError` |
| `EnhancedError` | `UnifiedError` |

## Files to Remove After Migration

Once migration is complete, these files can be safely removed:

- `api/middleware/error-handler.ts`
- `api/services/error-handling/enhanced-error-manager.ts`
- `api/services/error-handling/unified-error-middleware.ts`
- `api/services/error-handling/unified-error-formatter.ts`
- `api/services/error-handling/error-recovery-strategies.ts`

## Testing

After migration, ensure:

1. All error responses maintain the same format
2. Error logging continues to work
3. Status codes are correctly mapped
4. Error context is preserved

## Rollback Plan

If issues arise:

1. Revert imports to old system
2. Keep old files until migration is fully validated
3. Test thoroughly in staging environment first

## Next Steps

1. Update one route at a time
2. Test each migration thoroughly
3. Update tests to use new error types
4. Remove old files once migration is complete
5. Update documentation
