import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, ResponseBuilder, withCors } from '../utils/response';
import { createCacheMiddleware } from '../middleware/cache';
import { createRateLimitMiddleware } from '../middleware/rate-limit';
import formatService from '../services/format-service';
import { parseTimestamp, convertTimezone, formatRelativeTime } from '../utils/conversion-utils';

interface BatchConversionItem {
  input: string | number;
  success: boolean;
  data?: {
    timestamp: number;
    formats: Record<string, string>;
    timezone?: {
      original: string;
      target: string;
      offset?: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

async function batchConvertHandler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return APIErrorHandler.handleBadRequest(res, 'Only POST method is allowed');
  }

  try {
    const { 
      items, 
      outputFormats = ['iso8601', 'timestamp', 'utc'], 
      timezone, 
      targetTimezone,
      options = { continueOnError: true, maxItems: 100 }
    } = req.body;

    // Validate request
    if (!items || !Array.isArray(items)) {
      return APIErrorHandler.handleBadRequest(res, 'Request must include an items array');
    }

    if (items.length === 0) {
      return APIErrorHandler.handleBadRequest(res, 'Items array cannot be empty');
    }

    if (items.length > options.maxItems) {
      return APIErrorHandler.handleBadRequest(
        res, 
        `Too many items. Maximum allowed: ${options.maxItems}`
      );
    }

    // Process each item in the batch
    const results: BatchConversionItem[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        const result = await processConversionItem(
          item, 
          outputFormats, 
          timezone, 
          targetTimezone
        );
        
        results.push(result);
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          if (!options.continueOnError && errorCount > 0) {
            break;
          }
        }
      } catch (error) {
        const errorItem: BatchConversionItem = {
          input: item,
          success: false,
          error: {
            code: 'PROCESSING_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        
        results.push(errorItem);
        errorCount++;
        
        if (!options.continueOnError && errorCount > 0) {
          break;
        }
      }
    }

    // Build response
    const processingTime = Date.now() - startTime;
    
    const builder = new ResponseBuilder()
      .setData({
        results,
        summary: {
          total: items.length,
          processed: results.length,
          successful: successCount,
          failed: errorCount
        }
      })
      .setProcessingTime(processingTime)
      .addMetadata('batchSize', items.length);

    builder.send(res);

  } catch (error) {
    console.error('Batch conversion error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

async function processConversionItem(
  item: string | number,
  outputFormats: string[],
  timezone?: string,
  targetTimezone?: string
): Promise<BatchConversionItem> {
  // Parse the input
  const { timestamp, isValid } = parseTimestamp(item);
  
  if (!isValid) {
    return {
      input: item,
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: `Could not parse "${item}" as a valid timestamp or date`
      }
    };
  }

  // Create date object
  let date = new Date(timestamp * 1000);
  
  // Apply timezone conversion if needed
  if (timezone && targetTimezone) {
    try {
      date = convertTimezone(date, timezone, targetTimezone);
    } catch (error) {
      return {
        input: item,
        success: false,
        error: {
          code: 'TIMEZONE_ERROR',
          message: `Timezone conversion failed: ${error instanceof Error ? error.message : error}`
        }
      };
    }
  }

  // Generate formats
  const formats: Record<string, string> = {};
  
  for (const format of outputFormats) {
    try {
      switch (format.toLowerCase()) {
        case 'iso8601':
          formats.iso8601 = date.toISOString();
          break;
        case 'timestamp':
          formats.timestamp = Math.floor(date.getTime() / 1000).toString();
          break;
        case 'utc':
          formats.utc = date.toUTCString();
          break;
        case 'local':
          formats.local = date.toLocaleString();
          break;
        case 'relative':
          formats.relative = formatRelativeTime(date);
          break;
        default:
          // Try to use format service for custom formats
          try {
            formats[format] = formatService.formatDate(date, format, targetTimezone || timezone);
          } catch (formatError) {
            formats[format] = `Error: ${formatError instanceof Error ? formatError.message : 'Invalid format'}`;
          }
      }
    } catch (formatError) {
      formats[format] = `Error: ${formatError instanceof Error ? formatError.message : 'Format error'}`;
    }
  }

  // Build result
  return {
    input: item,
    success: true,
    data: {
      timestamp: Math.floor(date.getTime() / 1000),
      formats,
      ...(timezone || targetTimezone ? {
        timezone: {
          original: timezone || 'UTC',
          target: targetTimezone || timezone || 'UTC'
        }
      } : {})
    }
  };
}

// Enhanced batch convert API with caching and rate limiting
const enhancedBatchConvertHandler = withCors(
  createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Lower limit for batch operations
    message: 'Too many batch requests, please try again later.'
  })(
    createCacheMiddleware({
      ttl: 5 * 60 * 1000, // 5 minutes
      cacheControlHeader: 'public, max-age=300, stale-while-revalidate=600'
    })(batchConvertHandler)
  )
);

export default enhancedBatchConvertHandler;