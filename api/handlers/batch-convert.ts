import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders, validateRequest } from '../utils/response';
import { convertTimestamp } from '../utils/conversion-utils';
import {
  BatchConversionRequest,
  BatchConversionResponse,
  BatchConversionResult,
} from '../types/api';

const MAX_BATCH_SIZE = 100;
const DEFAULT_OUTPUT_FORMATS = ['iso', 'unix', 'human'];

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

  // Only allow POST requests for batch conversion
  if (req.method !== 'POST') {
    return APIErrorHandler.handleMethodNotAllowed(
      res,
      'Only POST method is allowed for batch conversion'
    );
  }

  try {
    const startTime = Date.now();

    // Validate request
    const validation = validateRequest(req);
    if (!validation.valid) {
      return APIErrorHandler.handleValidationError(res, validation);
    }

    const batchRequest: BatchConversionRequest = req.body;

    // Validate batch request
    if (!batchRequest.items || !Array.isArray(batchRequest.items)) {
      return APIErrorHandler.handleBadRequest(res, 'Items array is required', {
        expected: 'Array of timestamps (numbers or strings)',
        received: typeof batchRequest.items,
      });
    }

    if (batchRequest.items.length === 0) {
      return APIErrorHandler.handleBadRequest(res, 'Items array cannot be empty', {
        minItems: 1,
        maxItems: MAX_BATCH_SIZE,
      });
    }

    if (batchRequest.items.length > MAX_BATCH_SIZE) {
      return APIErrorHandler.handleBadRequest(res, `Batch size exceeds maximum limit`, {
        maxItems: MAX_BATCH_SIZE,
        receivedItems: batchRequest.items.length,
        suggestion: `Split your request into smaller batches of ${MAX_BATCH_SIZE} items or less`,
      });
    }

    // Process batch conversion
    const results = await processBatchConversion(batchRequest);

    const response: BatchConversionResponse = {
      success: true,
      data: results,
      metadata: {
        totalItems: batchRequest.items.length,
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length,
        processingTime: Date.now() - startTime,
      },
    };

    APIErrorHandler.sendSuccess(res, response, {
      processingTime: Date.now() - startTime,
      itemCount: results.length,
      cacheHit: false,
    });
  } catch (error) {
    console.error('Batch conversion error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'batch-convert',
    });
  }
}

async function processBatchConversion(
  request: BatchConversionRequest
): Promise<BatchConversionResult[]> {
  const results: BatchConversionResult[] = [];
  const outputFormats = request.outputFormat || DEFAULT_OUTPUT_FORMATS;
  const continueOnError = request.options?.continueOnError ?? true;

  for (const item of request.items) {
    try {
      // Validate individual item
      if (item === null || item === undefined) {
        results.push({
          input: item,
          success: false,
          error: APIErrorHandler.createError(
            'INVALID_INPUT',
            'Timestamp cannot be null or undefined',
            400
          ),
        });
        continue;
      }

      // Convert the timestamp
      const timestamp = typeof item === 'string' ? parseInt(item, 10) : item;
      const conversionResult = await convertTimestamp(
        timestamp,
        outputFormats,
        request.timezone,
        request.targetTimezone
      );

      results.push({
        input: item,
        success: true,
        data: conversionResult,
      });
    } catch (error) {
      const conversionError = APIErrorHandler.createError(
        'CONVERSION_ERROR',
        `Failed to convert timestamp: ${(error as Error).message}`,
        400,
        { originalInput: item }
      );

      results.push({
        input: item,
        success: false,
        error: conversionError,
      });

      // If continueOnError is false, stop processing
      if (!continueOnError) {
        break;
      }
    }
  }

  return results;
}

// Helper function to validate timestamp input (currently unused but kept for future use)
// function isValidTimestamp(input: any): boolean {
//   if (typeof input === 'number') {
//     return !isNaN(input) && isFinite(input);
//   }
//
//   if (typeof input === 'string') {
//     // Check if it's a valid date string or numeric string
//     const asNumber = parseFloat(input);
//     if (!isNaN(asNumber) && isFinite(asNumber)) {
//       return true;
//     }
//
//     // Check if it's a valid date string
//     const date = new Date(input);
//     return !isNaN(date.getTime());
//   }
//
//   return false;
// }
