import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders, validateRequest } from '../utils/response';
import { convertTimestamp } from '../utils/conversion-utils';

const MAX_BATCH_SIZE = 50;
const DEFAULT_TIMEOUT = 30000; // 30 seconds

interface WorkingBatchRequest {
  items: Array<string | number>;
  outputFormats?: string[];
  timezone?: string;
  targetTimezone?: string;
  options?: {
    continueOnError?: boolean;
    timeout?: number;
    priority?: 'low' | 'normal' | 'high';
    includeProgress?: boolean;
  };
}

interface WorkingBatchResult {
  input: string | number;
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  index: number;
}

interface WorkingBatchResponse {
  success: boolean;
  data: WorkingBatchResult[];
  metadata: {
    totalItems: number;
    successCount: number;
    errorCount: number;
    processingTime: number;
    averageItemTime: number;
    progress?: {
      completed: number;
      remaining: number;
      percentage: number;
    };
  };
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

  // Only allow POST requests for working batch conversion
  if (req.method !== 'POST') {
    return APIErrorHandler.handleMethodNotAllowed(res, 'Only POST method is allowed for working batch conversion');
  }

  try {
    const startTime = Date.now();

    // Validate request
    const validation = validateRequest(req);
    if (!validation.valid) {
      return APIErrorHandler.handleValidationError(res, validation);
    }

    const batchRequest: WorkingBatchRequest = req.body;

    // Validate working batch request
    const validationResult = validateWorkingBatchRequest(batchRequest);
    if (!validationResult.valid) {
      return APIErrorHandler.handleBadRequest(res, validationResult.message || 'Invalid request', validationResult.details);
    }

    // Set timeout for the entire operation
    const timeout = batchRequest.options?.timeout || DEFAULT_TIMEOUT;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Batch processing timeout')), timeout);
    });

    // Process working batch conversion with timeout
    const processingPromise = processWorkingBatchConversion(batchRequest);
    
    const results = await Promise.race([processingPromise, timeoutPromise]) as WorkingBatchResult[];
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    const totalProcessingTime = Date.now() - startTime;
    const averageItemTime = results.length > 0 ? 
      results.reduce((sum, r) => sum + r.processingTime, 0) / results.length : 0;

    const response: WorkingBatchResponse = {
      success: true,
      data: results,
      metadata: {
        totalItems: batchRequest.items.length,
        successCount,
        errorCount,
        processingTime: totalProcessingTime,
        averageItemTime
      }
    };

    // Add progress information if requested
    if (batchRequest.options?.includeProgress) {
      response.metadata.progress = {
        completed: results.length,
        remaining: Math.max(0, batchRequest.items.length - results.length),
        percentage: (results.length / batchRequest.items.length) * 100
      };
    }

    APIErrorHandler.sendSuccess(res, response, {
      processingTime: totalProcessingTime,
      itemCount: results.length,
      cacheHit: false
    });

  } catch (error) {
    console.error('Working batch conversion error:', error);
    
    if ((error as Error).message === 'Batch processing timeout') {
      return APIErrorHandler.sendError(res, APIErrorHandler.createError(
        'TIMEOUT_ERROR',
        'Batch processing exceeded timeout limit',
        408,
        { timeout: req.body?.options?.timeout || DEFAULT_TIMEOUT }
      ), 408);
    }

    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'working-batch'
    });
  }
}

function validateWorkingBatchRequest(request: WorkingBatchRequest): { valid: boolean; message?: string; details?: any } {
  if (!request.items || !Array.isArray(request.items)) {
    return {
      valid: false,
      message: 'Items array is required',
      details: {
        expected: 'Array of timestamps (numbers or strings)',
        received: typeof request.items
      }
    };
  }

  if (request.items.length === 0) {
    return {
      valid: false,
      message: 'Items array cannot be empty',
      details: {
        minItems: 1,
        maxItems: MAX_BATCH_SIZE
      }
    };
  }

  if (request.items.length > MAX_BATCH_SIZE) {
    return {
      valid: false,
      message: `Working batch size exceeds maximum limit`,
      details: {
        maxItems: MAX_BATCH_SIZE,
        receivedItems: request.items.length,
        suggestion: `This endpoint is optimized for smaller batches. Use enhanced-batch for larger requests.`
      }
    };
  }

  if (request.options?.timeout && (request.options.timeout < 1000 || request.options.timeout > 60000)) {
    return {
      valid: false,
      message: 'Timeout must be between 1000ms and 60000ms',
      details: {
        minTimeout: 1000,
        maxTimeout: 60000,
        receivedTimeout: request.options.timeout
      }
    };
  }

  if (request.options?.priority && !['low', 'normal', 'high'].includes(request.options.priority)) {
    return {
      valid: false,
      message: 'Priority must be one of: low, normal, high',
      details: {
        validPriorities: ['low', 'normal', 'high'],
        receivedPriority: request.options.priority
      }
    };
  }

  return { valid: true };
}

async function processWorkingBatchConversion(request: WorkingBatchRequest): Promise<WorkingBatchResult[]> {
  const results: WorkingBatchResult[] = [];
  const outputFormats = request.outputFormats || ['iso', 'unix', 'human'];
  const continueOnError = request.options?.continueOnError ?? true;
  const priority = request.options?.priority || 'normal';

  // Adjust processing based on priority
  const processingDelay = priority === 'high' ? 0 : priority === 'normal' ? 10 : 50;

  for (let index = 0; index < request.items.length; index++) {
    const item = request.items[index];
    const itemStartTime = Date.now();

    try {
      // Add processing delay based on priority
      if (processingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, processingDelay));
      }

      // Validate individual item
      if (item === null || item === undefined) {
        results.push({
          input: item,
          success: false,
          error: 'Timestamp cannot be null or undefined',
          processingTime: Date.now() - itemStartTime,
          index
        });
        continue;
      }

      if (!isValidTimestamp(item)) {
        results.push({
          input: item,
          success: false,
          error: `Invalid timestamp format: ${item}`,
          processingTime: Date.now() - itemStartTime,
          index
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
        processingTime: Date.now() - itemStartTime,
        index
      });

    } catch (error) {
      results.push({
        input: item,
        success: false,
        error: `Conversion failed: ${(error as Error).message}`,
        processingTime: Date.now() - itemStartTime,
        index
      });

      // If continueOnError is false, stop processing
      if (!continueOnError) {
        break;
      }
    }
  }

  return results;
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