import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders, validateRequest } from '../utils/response';
import { convertTimestamp } from '../utils/conversion-utils';
import {
  EnhancedConversionRequest,
  EnhancedConversionResponse,
  ConversionData,
} from '../types/api';

const MAX_BATCH_SIZE = 250;
const DEFAULT_OUTPUT_FORMATS = ['iso', 'unix', 'human', 'relative'];

interface EnhancedBatchRequest extends EnhancedConversionRequest {
  parallel?: boolean;
  chunkSize?: number;
  includeAnalytics?: boolean;
  validateInputs?: boolean;
}

interface BatchAnalytics {
  totalProcessingTime: number;
  averageItemTime: number;
  fastestItem: number;
  slowestItem: number;
  inputTypes: Record<string, number>;
  errorTypes: Record<string, number>;
  timezoneDistribution?: Record<string, number>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const corsHeaders = createCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests for enhanced batch conversion
  if (req.method !== 'POST') {
    return APIErrorHandler.handleMethodNotAllowed(
      res,
      'Only POST method is allowed for enhanced batch conversion'
    );
  }

  try {
    const startTime = Date.now();

    // Validate request
    const validation = validateRequest(req);
    if (!validation.valid) {
      return APIErrorHandler.handleValidationError(res, validation);
    }

    const batchRequest: EnhancedBatchRequest = req.body;

    // Validate enhanced batch request
    const validationResult = validateEnhancedBatchRequest(batchRequest);
    if (!validationResult.valid) {
      return APIErrorHandler.handleBadRequest(
        res,
        validationResult.message || 'Invalid request',
        validationResult.details
      );
    }

    // Process enhanced batch conversion
    const { results, analytics } = await processEnhancedBatchConversion(batchRequest);

    const response: EnhancedConversionResponse & { analytics?: BatchAnalytics } = {
      success: true,
      data: results,
      metadata: {
        processingTime: Date.now() - startTime,
        itemCount: Array.isArray(results) ? results.length : 1,
        cacheHit: false,
        rateLimit: {
          limit: 0,
          remaining: 0,
          resetTime: 0,
          window: 0,
        },
      },
    };

    if (batchRequest.includeAnalytics) {
      response.analytics = analytics;
    }

    APIErrorHandler.sendSuccess(res, response, {
      processingTime: Date.now() - startTime,
      itemCount: Array.isArray(results) ? results.length : 1,
      cacheHit: false,
    });
  } catch (error) {
    console.error('Enhanced batch conversion error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'enhanced-batch',
    });
  }
}

function validateEnhancedBatchRequest(request: EnhancedBatchRequest): {
  valid: boolean;
  message?: string;
  details?: any;
} {
  if (!request.items || !Array.isArray(request.items)) {
    return {
      valid: false,
      message: 'Items array is required',
      details: {
        expected: 'Array of timestamps (numbers or strings)',
        received: typeof request.items,
      },
    };
  }

  if (request.items.length === 0) {
    return {
      valid: false,
      message: 'Items array cannot be empty',
      details: {
        minItems: 1,
        maxItems: MAX_BATCH_SIZE,
      },
    };
  }

  if (request.items.length > MAX_BATCH_SIZE) {
    return {
      valid: false,
      message: `Enhanced batch size exceeds maximum limit`,
      details: {
        maxItems: MAX_BATCH_SIZE,
        receivedItems: request.items.length,
        suggestion: `Split your request into smaller batches of ${MAX_BATCH_SIZE} items or less`,
      },
    };
  }

  if (request.chunkSize && (request.chunkSize < 1 || request.chunkSize > 50)) {
    return {
      valid: false,
      message: 'Chunk size must be between 1 and 50',
      details: {
        minChunkSize: 1,
        maxChunkSize: 50,
        receivedChunkSize: request.chunkSize,
      },
    };
  }

  if (request.maxItems && request.maxItems < request.items.length) {
    return {
      valid: false,
      message: 'Request exceeds specified maxItems limit',
      details: {
        maxItems: request.maxItems,
        receivedItems: request.items.length,
      },
    };
  }

  return { valid: true };
}

async function processEnhancedBatchConversion(request: EnhancedBatchRequest): Promise<{
  results: ConversionData[];
  analytics: BatchAnalytics;
}> {
  const startTime = Date.now();
  const results: ConversionData[] = [];
  const itemTimes: number[] = [];
  const inputTypes: Record<string, number> = {};
  const errorTypes: Record<string, number> = {};
  const timezoneDistribution: Record<string, number> = {};

  const outputFormats = request.outputFormats || DEFAULT_OUTPUT_FORMATS;
  const chunkSize = request.chunkSize || 10;
  const parallel = request.parallel ?? true;
  const validateInputs = request.validateInputs ?? true;

  // Process items in chunks if parallel processing is enabled
  if (parallel && request.items && request.items.length > chunkSize) {
    const chunks = chunkArray(request.items, chunkSize);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(item => processEnhancedSingleItem(item, request, outputFormats, validateInputs))
      );

      chunkResults.forEach(result => {
        if (result.success && result.data) {
          results.push(result.data);
          itemTimes.push(result.processingTime);

          // Track input types
          const inputType = typeof result.data.input;
          inputTypes[inputType] = (inputTypes[inputType] || 0) + 1;

          // Track timezone distribution
          if (result.data.timezone?.identifier) {
            const tz = result.data.timezone.identifier;
            timezoneDistribution[tz] = (timezoneDistribution[tz] || 0) + 1;
          }
        } else {
          // Track error types
          const errorType = result.error?.code || 'UNKNOWN_ERROR';
          errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
        }
      });
    }
  } else {
    // Sequential processing
    for (const item of request.items || []) {
      const result = await processEnhancedSingleItem(item, request, outputFormats, validateInputs);

      if (result.success && result.data) {
        results.push(result.data);
        itemTimes.push(result.processingTime);

        // Track input types
        const inputType = typeof result.data.input;
        inputTypes[inputType] = (inputTypes[inputType] || 0) + 1;

        // Track timezone distribution
        if (result.data.timezone?.identifier) {
          const tz = result.data.timezone.identifier;
          timezoneDistribution[tz] = (timezoneDistribution[tz] || 0) + 1;
        }
      } else {
        // Track error types
        const errorType = result.error?.code || 'UNKNOWN_ERROR';
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;

        // Continue on error if specified
        if (!request.continueOnError) {
          break;
        }
      }
    }
  }

  // Calculate analytics
  const totalProcessingTime = Date.now() - startTime;
  const analytics: BatchAnalytics = {
    totalProcessingTime,
    averageItemTime:
      itemTimes.length > 0 ? itemTimes.reduce((a, b) => a + b, 0) / itemTimes.length : 0,
    fastestItem: itemTimes.length > 0 ? Math.min(...itemTimes) : 0,
    slowestItem: itemTimes.length > 0 ? Math.max(...itemTimes) : 0,
    inputTypes,
    errorTypes,
    timezoneDistribution,
  };

  return { results, analytics };
}

async function processEnhancedSingleItem(
  item: string | number,
  request: EnhancedBatchRequest,
  outputFormats: string[],
  validateInputs: boolean
): Promise<{
  success: boolean;
  data?: ConversionData;
  error?: any;
  processingTime: number;
}> {
  const itemStartTime = Date.now();

  try {
    // Validate input if requested
    if (validateInputs && !isValidTimestamp(item)) {
      return {
        success: false,
        error: {
          code: 'INVALID_TIMESTAMP',
          message: `Invalid timestamp format: ${item}`,
        },
        processingTime: Date.now() - itemStartTime,
      };
    }

    // Convert the timestamp with enhanced options
    const timestamp = typeof item === 'string' ? parseInt(item, 10) : item;
    const conversionResult = await convertTimestamp(
      timestamp,
      outputFormats,
      request.timezone,
      request.targetTimezone
    );

    return {
      success: true,
      data: conversionResult,
      processingTime: Date.now() - itemStartTime,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'CONVERSION_ERROR',
        message: (error as Error).message,
      },
      processingTime: Date.now() - itemStartTime,
    };
  }
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function isValidTimestamp(input: any): boolean {
  if (typeof input === 'number') {
    return !isNaN(input) && isFinite(input);
  }

  if (typeof input === 'string') {
    // Check if it's a valid date string or numeric string
    const asNumber = parseFloat(input);
    if (!isNaN(asNumber) && isFinite(asNumber)) {
      return true;
    }

    // Check if it's a valid date string
    const date = new Date(input);
    return !isNaN(date.getTime());
  }

  return false;
}
