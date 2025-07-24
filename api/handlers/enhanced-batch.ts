import { VercelRequest, VercelResponse } from '@vercel/node';
import { BatchConversionRequest, BatchConversionResponse, BatchConversionResult, ConversionData } from '../types/api';
import { APIErrorHandler, ResponseBuilder, withCors } from '../utils/response';
import { createCacheMiddleware } from '../middleware/cache';
import { createBatchRateLimit } from '../middleware/rate-limit';
import { validateBatchRequest } from '../utils/validation';
import { convertTimestamp, convertDate } from '../utils/conversion-utils';

interface ProcessedItem {
  input: string | number;
  success: boolean;
  data?: ConversionData;
  error?: any;
}

async function processBatchItems(
  items: Array<string | number>,
  options: BatchConversionRequest['options'] = { continueOnError: true, maxItems: 100 },
  outputFormats: string[] = [],
  timezone?: string,
  targetTimezone?: string
): Promise<ProcessedItem[]> {
  const results: ProcessedItem[] = [];
  const promises = items.map(async (item, index) => {
    try {
      const inputStr = String(item).trim();
      let result: Partial<ConversionData> = { input: item };

      // Try to parse as timestamp first
      const timestampMatch = inputStr.match(/^(\d{10}|\d{13})$/);
      if (timestampMatch) {
        const timestamp = parseInt(timestampMatch[0]);
        const normalizedTimestamp = timestampMatch[0].length === 10 ? timestamp : Math.floor(timestamp / 1000);
        const data = await convertTimestamp(normalizedTimestamp, outputFormats, timezone, targetTimezone);
        return { input: item, success: true, data };
      }

      // Try to parse as date string
      const date = new Date(inputStr);
      if (!isNaN(date.getTime())) {
        const timestamp = Math.floor(date.getTime() / 1000);
        const data = await convertTimestamp(timestamp, outputFormats, timezone, targetTimezone);
        return { input: item, success: true, data };
      }

      return {
        input: item,
        success: false,
        error: APIErrorHandler.createError(
          'INVALID_INPUT',
          `Unable to parse "${item}" as timestamp or date`,
          400,
          { item }
        )
      };

    } catch (error) {
      return {
        input: item,
        success: false,
        error: APIErrorHandler.createError(
          'PROCESSING_ERROR',
          'Failed to process item',
          500,
          { error: error instanceof Error ? error.message : String(error) }
        )
      };
    }
  });

  try {
    const settled = await Promise.allSettled(promises);
    settled.forEach((settlement) => {
      if (settlement.status === 'fulfilled') {
        results.push(settlement.value);
      } else {
        results.push({
          input: '',
          success: false,
          error: APIErrorHandler.createError(
            'PROCESSING_ERROR',
            'Unexpected processing error',
            500,
            { error: settlement.reason }
          )
        });
      }
    });
  } catch (error) {
    throw error;
  }

  return results;
}

async function enhancedBatchHandler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  if (req.method !== 'POST') {
    return APIErrorHandler.handleBadRequest(res, 'Only POST method is allowed');
  }

  try {
    const body = req.body as BatchConversionRequest;
    const validation = validateBatchRequest(body);
    
    if (!validation.valid) {
      return APIErrorHandler.handleValidationError(res, validation);
    }

    const {
      items,
      outputFormat = ['iso8601', 'utc', 'timestamp'],
      timezone,
      targetTimezone,
      options = { continueOnError: true, maxItems: 100 }
    } = body;

    const results = await processBatchItems(items, options, outputFormat, timezone, targetTimezone);
    const validResults = results.filter(r => r.success);
    const errorResults = results.filter(r => !r.success);

    const response: BatchConversionResponse = {
      success: true,
      data: results.map(r => ({
        input: r.input,
        success: r.success,
        data: r.data,
        error: r.error
      })),
      metadata: {
        totalItems: items.length,
        successCount: validResults.length,
        errorCount: errorResults.length,
        processingTime: Date.now() - startTime
      }
    };

    const builder = new ResponseBuilder<BatchConversionResponse>()
      .setData(response.data)
      .setProcessingTime(Date.now() - startTime)
      .setRateLimit({
        limit: 100,
        remaining: 100 - items.length,
        resetTime: Date.now() + 60000,
        window: 60000
      });

    builder.send(res);

  } catch (error) {
    console.error('Enhanced batch API error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

// Enhanced batch API with caching, rate limiting, and error handling
const enhancedBatchHandlerWithMiddleware = withCors(
  createBatchRateLimit({
    includeHeaders: true
  })(
    createCacheMiddleware({
      ttl: 5 * 60 * 1000, // 5 minutes for batch results
      cacheControlHeader: 'public, max-age=300, stale-while-revalidate=600'
    })(enhancedBatchHandler)
  )
);

export default enhancedBatchHandlerWithMiddleware;