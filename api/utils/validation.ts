import { BatchConversionRequest, BatchConversionResult, ValidationResult, ValidationError } from '../types/api';

export function validateBatchRequest(body: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!body) {
    errors.push({
      field: 'body',
      message: 'Request body is required',
      code: 'MISSING_BODY'
    });
    return { valid: false, errors };
  }

  // Validate items array
  if (!body.items || !Array.isArray(body.items)) {
    errors.push({
      field: 'items',
      message: 'Items must be an array',
      code: 'INVALID_ITEMS_TYPE'
    });
  } else {
    if (body.items.length === 0) {
      errors.push({
        field: 'items',
        message: 'Items array cannot be empty',
        code: 'EMPTY_ITEMS_ARRAY'
      });
    }

    if (body.items.length > 100) {
      errors.push({
        field: 'items',
        message: 'Maximum 100 items allowed per batch request',
        code: 'TOO_MANY_ITEMS'
      });
    }

    // Validate individual items
    body.items.forEach((item, index) => {
      if (item === null || item === undefined) {
        errors.push({
          field: `items[${index}]`,
          message: 'Item cannot be null or undefined',
          code: 'INVALID_ITEM_VALUE'
        });
      } else if (typeof item !== 'string' && typeof item !== 'number') {
        errors.push({
          field: `items[${index}]`,
          message: 'Item must be a string or number',
          code: 'INVALID_ITEM_TYPE'
        });
      } else {
        const strItem = String(item).trim();
        if (strItem.length === 0 || strItem.length > 50) {
          errors.push({
            field: `items[${index}]`,
            message: 'Item must be between 1 and 50 characters',
            code: 'INVALID_ITEM_LENGTH'
          });
        }
      }
    });
  }

  // Validate outputFormat if provided
  if (body.outputFormat !== undefined) {
    if (!Array.isArray(body.outputFormat)) {
      errors.push({
        field: 'outputFormat',
        message: 'outputFormat must be an array of strings',
        code: 'INVALID_OUTPUT_FORMAT_TYPE'
      });
    } else {
      body.outputFormat.forEach((format: string, index: number) => {
        if (typeof format !== 'string') {
          errors.push({
            field: `outputFormat[${index}]`,
            message: 'Format must be a string',
            code: 'INVALID_FORMAT_TYPE'
          });
        } else if (!isValidOutputFormat(format)) {
          errors.push({
            field: `outputFormat[${index}]`,
            message: `Invalid output format: ${format}`,
            code: 'INVALID_FORMAT_VALUE'
          });
        }
      });
    }
  }

  // Validate timezone parameters
  if (body.timezone !== undefined) {
    if (typeof body.timezone !== 'string') {
      errors.push({
        field: 'timezone',
        message: 'timezone must be a string',
        code: 'INVALID_TIMEZONE_TYPE'
      });
    } else if (!isValidTimezone(body.timezone)) {
      errors.push({
        field: 'timezone',
        message: `Invalid timezone: ${body.timezone}`,
        code: 'INVALID_TIMEZONE_VALUE'
      });
    }
  }

  if (body.targetTimezone !== undefined) {
    if (typeof body.targetTimezone !== 'string') {
      errors.push({
        field: 'targetTimezone',
        message: 'targetTimezone must be a string',
        code: 'INVALID_TARGET_TIMEZONE_TYPE'
      });
    } else if (!isValidTimezone(body.targetTimezone)) {
      errors.push({
        field: 'targetTimezone',
        message: `Invalid target timezone: ${body.targetTimezone}`,
        code: 'INVALID_TARGET_TIMEZONE_VALUE'
      });
    }
  }

  // Validate options object
  if (body.options !== undefined) {
    if (typeof body.options !== 'object' || body.options === null) {
      errors.push({
        field: 'options',
        message: 'options must be an object',
        code: 'INVALID_OPTIONS_TYPE'
      });
    } else {
      const options = body.options;
      if (options.continueOnError !== undefined && typeof options.continueOnError !== 'boolean') {
        errors.push({
          field: 'options.continueOnError',
          message: 'continueOnError must be a boolean',
          code: 'INVALID_CONTINUE_ON_ERROR_TYPE'
        });
      }
      if (options.maxItems !== undefined) {
        if (typeof options.maxItems !== 'number' || !Number.isInteger(options.maxItems)) {
          errors.push({
            field: 'options.maxItems',
            message: 'maxItems must be a positive integer',
            code: 'INVALID_MAX_ITEMS_TYPE'
          });
        } else if (options.maxItems < 1 || options.maxItems > 1000) {
          errors.push({
            field: 'options.maxItems',
            message: 'maxItems must be between 1 and 1000',
            code: 'INVALID_MAX_ITEMS_RANGE'
          });
        }
      }
    }
  }

  // Validate cacheControl if provided
  if (body.cacheControl !== undefined) {
    const validCacheControls = ['no-cache', 'force-refresh'];
    if (!validCacheControls.includes(body.cacheControl)) {
      errors.push({
        field: 'cacheControl',
        message: 'cacheControl must be one of: no-cache, force-refresh',
        code: 'INVALID_CACHE_CONTROL_VALUE'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

function isValidOutputFormat(format: string): boolean {
  const validFormats = [
    'iso8601', 'utc', 'timestamp', 'local', 'rfc2822', 'unix', 'relative'
  ];
  return validFormats.includes(format.toLowerCase());
}

function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function sanitizeBatchInput(input: string | number): string {
  return String(input).trim().substring(0, 50);
}

export function estimateBatchProcessingTime(itemCount: number): number {
  const baseTime = 10; // ms per item
  const overhead = 50; // ms overhead
  return Math.min(5000, baseTime * itemCount + overhead);
}

export function getBatchErrorSummary(results: BatchConversionResult[]): {
  totalErrors: number;
  errorTypes: Record<string, number>;
  mostCommonError?: string;
} {
  const errorTypes: Record<string, number> = {};
  let totalErrors = 0;

  results.forEach(result => {
    if (!result.success && result.error) {
      totalErrors++;
      const errorType = result.error.code || 'UNKNOWN';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    }
  });

  const mostCommonError = Object.entries(errorTypes)
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  return {
    totalErrors,
    errorTypes,
    mostCommonError
  };
}