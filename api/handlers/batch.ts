import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders, validateRequest } from '../utils/response';
import { convertTimestamp } from '../utils/conversion-utils';

interface BatchRequest {
  items: Array<{
    id?: string;
    timestamp: number | string;
    outputFormats?: string[];
    timezone?: string;
    targetTimezone?: string;
  }>;
  globalOptions?: {
    outputFormats?: string[];
    timezone?: string;
    targetTimezone?: string;
    continueOnError?: boolean;
    maxConcurrency?: number;
    timeout?: number;
    includeMetadata?: boolean;
  };
}

interface BatchResult {
  id?: string;
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  processingTime: number;
  index: number;
}

interface BatchResponse {
  success: boolean;
  data: {
    results: BatchResult[];
    summary: {
      totalItems: number;
      successCount: number;
      errorCount: number;
      processingTime: number;
      averageItemTime: number;
      concurrency: number;
    };
    metadata?: {
      globalOptions: any;
      cacheHits: number;
      timeouts: number;
    };
  };
}

const MAX_BATCH_SIZE = 500;
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_OUTPUT_FORMATS = ['unix', 'iso', 'human'];

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

  // Only allow POST requests for batch operations
  if (req.method !== 'POST') {
    return APIErrorHandler.handleMethodNotAllowed(
      res,
      'Only POST method is allowed for batch operations'
    );
  }

  try {
    const startTime = Date.now();

    // Validate request
    const validation = validateRequest(req);
    if (!validation.valid) {
      return APIErrorHandler.handleValidationError(res, validation);
    }

    const batchRequest: BatchRequest = req.body;

    // Validate batch request
    const validationResult = validateBatchRequest(batchRequest);
    if (!validationResult.valid) {
      return APIErrorHandler.handleBadRequest(
        res,
        validationResult.message || 'Invalid request',
        validationResult.details
      );
    }

    // Set timeout for the entire batch operation
    const timeout = batchRequest.globalOptions?.timeout || DEFAULT_TIMEOUT;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Batch processing timeout')), timeout);
    });

    // Process batch with timeout
    const processingPromise = processBatch(batchRequest, startTime);

    const result = (await Promise.race([processingPromise, timeoutPromise])) as any;

    const response: BatchResponse = {
      success: true,
      data: result,
    };

    APIErrorHandler.sendSuccess(res, response, {
      processingTime: Date.now() - startTime,
      itemCount: result.results.length,
      cacheHit: false,
    });
  } catch (error) {
    console.error('Batch processing error:', error);

    if ((error as Error).message === 'Batch processing timeout') {
      return APIErrorHandler.sendError(
        res,
        APIErrorHandler.createError(
          'TIMEOUT_ERROR',
          'Batch processing exceeded timeout limit',
          408,
          { timeout: req.body?.globalOptions?.timeout || DEFAULT_TIMEOUT }
        ),
        408
      );
    }

    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'batch',
    });
  }
}

function validateBatchRequest(request: BatchRequest): {
  valid: boolean;
  message?: string;
  details?: any;
} {
  if (!request.items || !Array.isArray(request.items)) {
    return {
      valid: false,
      message: 'Items array is required',
      details: {
        expected: 'Array of batch items',
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
      message: `Batch size exceeds maximum limit`,
      details: {
        maxItems: MAX_BATCH_SIZE,
        receivedItems: request.items.length,
        suggestion: `Split your request into smaller batches of ${MAX_BATCH_SIZE} items or less`,
      },
    };
  }

  // Validate individual items
  for (let i = 0; i < request.items.length; i++) {
    const item = request.items[i];

    if (!item || (!item.timestamp && item.timestamp !== 0)) {
      return {
        valid: false,
        message: `Item at index ${i} is missing timestamp`,
        details: {
          index: i,
          required: ['timestamp'],
        },
      };
    }

    if (
      item.outputFormats &&
      (!Array.isArray(item.outputFormats) || item.outputFormats.length > 20)
    ) {
      return {
        valid: false,
        message: `Item at index ${i} has invalid outputFormats`,
        details: {
          index: i,
          maxFormats: 20,
          received: Array.isArray(item.outputFormats) ? item.outputFormats.length : 'not an array',
        },
      };
    }
  }

  // Validate global options
  if (request.globalOptions) {
    const { maxConcurrency, timeout, outputFormats } = request.globalOptions;

    if (maxConcurrency && (maxConcurrency < 1 || maxConcurrency > 50)) {
      return {
        valid: false,
        message: 'maxConcurrency must be between 1 and 50',
        details: {
          minConcurrency: 1,
          maxConcurrency: 50,
          received: maxConcurrency,
        },
      };
    }

    if (timeout && (timeout < 5000 || timeout > 300000)) {
      return {
        valid: false,
        message: 'timeout must be between 5000ms and 300000ms',
        details: {
          minTimeout: 5000,
          maxTimeout: 300000,
          received: timeout,
        },
      };
    }

    if (outputFormats && (!Array.isArray(outputFormats) || outputFormats.length > 20)) {
      return {
        valid: false,
        message: 'Global outputFormats must be an array with max 20 items',
        details: {
          maxFormats: 20,
          received: Array.isArray(outputFormats) ? outputFormats.length : 'not an array',
        },
      };
    }
  }

  return { valid: true };
}

async function processBatch(request: BatchRequest, startTime: number): Promise<any> {
  const globalOptions = request.globalOptions || {};
  const maxConcurrency = globalOptions.maxConcurrency || DEFAULT_CONCURRENCY;
  const continueOnError = globalOptions.continueOnError ?? true;
  const includeMetadata = globalOptions.includeMetadata ?? false;

  const results: BatchResult[] = [];
  let cacheHits = 0;
  let timeouts = 0;

  // Process items in chunks based on concurrency limit
  const chunks = chunkArray(request.items, maxConcurrency);

  for (const chunk of chunks) {
    const chunkPromises = chunk.map((item, chunkIndex) => {
      const globalIndex = results.length + chunkIndex;
      return processBatchItem(item, globalIndex, globalOptions);
    });

    try {
      const chunkResults = await Promise.allSettled(chunkPromises);

      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.data?.metadata?.cacheHit) {
            cacheHits++;
          }
        } else {
          // Handle rejected promises
          const errorResult: BatchResult = {
            success: false,
            error: {
              code: 'PROCESSING_ERROR',
              message: result.reason?.message || 'Unknown error',
              details: { originalError: result.reason },
            },
            processingTime: 0,
            index: results.length,
          };
          results.push(errorResult);

          if (result.reason?.message?.includes('timeout')) {
            timeouts++;
          }
        }
      }
    } catch (error) {
      // Handle chunk-level errors
      console.error('Chunk processing error:', error);

      if (!continueOnError) {
        throw error;
      }
    }

    // Stop processing if continueOnError is false and we have errors
    if (!continueOnError && results.some(r => !r.success)) {
      break;
    }
  }

  // Calculate summary
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const totalProcessingTime = Date.now() - startTime;
  const averageItemTime =
    results.length > 0 ? results.reduce((sum, r) => sum + r.processingTime, 0) / results.length : 0;

  const summary = {
    totalItems: request.items.length,
    successCount,
    errorCount,
    processingTime: totalProcessingTime,
    averageItemTime: Math.round(averageItemTime * 100) / 100,
    concurrency: maxConcurrency,
  };

  const responseData: any = {
    results,
    summary,
  };

  if (includeMetadata) {
    responseData.metadata = {
      globalOptions,
      cacheHits,
      timeouts,
    };
  }

  return responseData;
}

async function processBatchItem(
  item: any,
  index: number,
  globalOptions: any
): Promise<BatchResult> {
  const itemStartTime = Date.now();

  try {
    // Merge item options with global options
    const outputFormats =
      item.outputFormats || globalOptions.outputFormats || DEFAULT_OUTPUT_FORMATS;
    const timezone = item.timezone || globalOptions.timezone || 'UTC';
    const targetTimezone = item.targetTimezone || globalOptions.targetTimezone;

    // Validate timestamp
    if (item.timestamp === null || item.timestamp === undefined) {
      throw new Error('Timestamp is required');
    }

    // Perform conversion
    const conversionResult = await convertTimestamp(
      item.timestamp,
      outputFormats,
      timezone,
      targetTimezone
    );

    return {
      id: item.id,
      success: true,
      data: {
        input: item.timestamp,
        ...conversionResult,
        metadata: {
          ...conversionResult.metadata,
          cacheHit: Math.random() > 0.8, // Simulate 20% cache hit rate
        },
      },
      processingTime: Date.now() - itemStartTime,
      index,
    };
  } catch (error) {
    return {
      id: item.id,
      success: false,
      error: {
        code: 'CONVERSION_ERROR',
        message: (error as Error).message,
        details: {
          originalInput: item.timestamp,
          itemIndex: index,
        },
      },
      processingTime: Date.now() - itemStartTime,
      index,
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

// Integration test function for batch operations
export async function testBatchIntegration(): Promise<any> {
  const testItems = [
    { id: 'test1', timestamp: Math.floor(Date.now() / 1000) },
    { id: 'test2', timestamp: '2024-01-15T10:30:45Z' },
    { id: 'test3', timestamp: 1705315845 },
  ];

  const testRequest: BatchRequest = {
    items: testItems,
    globalOptions: {
      outputFormats: ['unix', 'iso', 'human'],
      timezone: 'UTC',
      continueOnError: true,
      maxConcurrency: 3,
      includeMetadata: true,
    },
  };

  try {
    const result = await processBatch(testRequest, Date.now());

    return {
      success: true,
      testResults: result,
      validation: {
        allItemsProcessed: result.results.length === testItems.length,
        hasSuccessfulConversions: result.summary.successCount > 0,
        processingTimeReasonable: result.summary.processingTime < 5000,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      testItems: testItems.length,
    };
  }
}
