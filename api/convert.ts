import { VercelRequest, VercelResponse } from '@vercel/node';
import { createCacheMiddleware } from './middleware/cache';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { getStrategicCacheService } from './services/cache/cache-config-init';
import formatService from './services/format-service';
import { createSecurityMiddleware } from './services/security/unified-security-middleware';
import { createError, ErrorType, handleError } from './services/unified-error-handler';
import { convertTimezone } from './utils/conversion-utils';
import { ResponseBuilder, withCors } from './utils/response';

async function convertHandler(req: VercelRequest, res: VercelResponse) {
  withCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    const error = createError({
      type: ErrorType.BAD_REQUEST_ERROR,
      message: 'Only GET and POST methods are allowed',
      statusCode: 405,
    });
    return handleError(error, req, res);
  }

  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const { timestamp, date, format, timezone, targetTimezone, includeFormats = false } = params;

    if (!timestamp && !date) {
      const error = createError({
        type: ErrorType.VALIDATION_ERROR,
        message: 'Please provide either timestamp or date parameter',
      });
      return handleError(error, req, res);
    }

    if (timestamp && date) {
      const error = createError({
        type: ErrorType.VALIDATION_ERROR,
        message: 'Please provide either timestamp or date, not both',
      });
      return handleError(error, req, res);
    }

    // Process conversion logic with strategic caching
    const inputValue = timestamp || date;
    const isTimestamp = !!timestamp;

    const options: {
      format?: string;
      timezone?: string;
      targetTimezone?: string;
      includeFormats?: boolean;
    } = { includeFormats };

    if (format) options.format = String(format);
    if (timezone) options.timezone = String(timezone);
    if (targetTimezone) options.targetTimezone = String(targetTimezone);

    // Get strategic cache service
    const strategicCache = await getStrategicCacheService();

    // Generate cache key for strategic caching
    const cacheKey = strategicCache.generateKey(
      {
        endpoint: '/api/convert',
        parameters: {
          input: inputValue,
          isTimestamp,
          ...options,
        },
      },
      { includeStrategy: true }
    );

    // Try to get cached result
    const cachedResult = await strategicCache.get(cacheKey);
    if (cachedResult) {
      const builder = new ResponseBuilder()
        .setData(cachedResult)
        .addMetadata('cached', true)
        .addMetadata('cacheKey', cacheKey);
      builder.send(res);
      return;
    }

    // Process conversion
    const result = await processConversion(inputValue, isTimestamp, options);

    // Cache the result with strategic options
    await strategicCache.set(cacheKey, result, {
      tags: ['conversion', 'timestamp', options.format || 'default'],
      priority: 'high',
    });

    const builder = new ResponseBuilder()
      .setData(result)
      .addMetadata('cached', false)
      .addMetadata('cacheKey', cacheKey);
    builder.send(res);
  } catch (error) {
    return handleError(error as Error, req, res);
  }
}

async function processConversion(
  input: string | number,
  isTimestamp: boolean,
  options: {
    format?: string;
    timezone?: string;
    targetTimezone?: string;
    includeFormats?: boolean;
  }
): Promise<any> {
  const { format, timezone, targetTimezone, includeFormats = false } = options;

  let date: Date;
  let originalTimestamp: number;

  if (isTimestamp) {
    originalTimestamp = input as number;
    date = new Date(originalTimestamp * 1000);
  } else {
    date = new Date(input as string);
    originalTimestamp = Math.floor(date.getTime() / 1000);
  }

  // Handle timezone conversion
  if (timezone || targetTimezone) {
    try {
      if (targetTimezone) {
        date = convertTimezone(date, timezone || 'UTC', targetTimezone);
      }
    } catch (error) {
      throw new Error(`Timezone conversion failed: ${error}`);
    }
  }

  const formats: any = {};

  // Standard formats
  formats.iso8601 = date.toISOString();
  formats.utc = date.toUTCString();
  formats.timestamp = Math.floor(date.getTime() / 1000);
  formats.local = date.toLocaleString();
  formats.relative = getRelativeTime(date);

  // Custom format if specified
  if (format) {
    try {
      formats.custom = formatService.formatDate(date, format, targetTimezone || timezone);
    } catch (error) {
      console.warn('Custom format error:', error);
    }
  }

  // Additional formats if requested
  if (includeFormats) {
    formats.rfc2822 = date.toUTCString();
    formats.unix = formats.timestamp;
    formats.short = date.toLocaleDateString();
    formats.time = date.toLocaleTimeString();
  }

  const result: any = {
    input,
    timestamp: Math.floor(date.getTime() / 1000),
    formats,
  };

  if (timezone || targetTimezone) {
    result.timezone = {
      original: timezone || 'UTC',
      target: targetTimezone || timezone || 'UTC',
    };
  }

  return result;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const absDiff = Math.abs(diffInSeconds);
  const prefix = diffInSeconds < 0 ? 'in' : '';
  const suffix = diffInSeconds > 0 ? 'ago' : '';

  if (absDiff < 60) return `${prefix} ${absDiff} seconds ${suffix}`.trim();
  if (absDiff < 3600) return `${prefix} ${Math.floor(absDiff / 60)} minutes ${suffix}`.trim();
  if (absDiff < 86400) return `${prefix} ${Math.floor(absDiff / 3600)} hours ${suffix}`.trim();
  if (absDiff < 2592000) return `${prefix} ${Math.floor(absDiff / 86400)} days ${suffix}`.trim();
  return `${prefix} ${Math.floor(absDiff / 2592000)} months ${suffix}`.trim();
}

// Enhanced convert API with unified security, error handling, strategic caching, and enhanced rate limiting
const securityMiddleware = createSecurityMiddleware({
  policyLevel: process.env.NODE_ENV === 'production' ? 'strict' : 'standard',
  enableThreatDetection: true,
  enableRealTimeBlocking: process.env.NODE_ENV === 'production',
  loggerConfig: {
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  },
});

// Error handling is now handled by the unified error handler

const enhancedConvertHandler = async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Apply security middleware first
    await new Promise<void>((resolve, reject) => {
      securityMiddleware(req, res, () => {
        // Then apply rate limiting
        createRateLimitMiddleware({
          ruleSelector: _req => ({
            identifier: '/api/convert',
            limit: 120, // Will be overridden by strategy-based limits
            window: 60000, // 1 minute
            type: 'ip',
          }),
        })(
          // Finally apply caching
          createCacheMiddleware({
            ttl: 5 * 60 * 1000, // 5 minutes
            cacheControlHeader: 'public, max-age=300, stale-while-revalidate=600',
          })(async (req: VercelRequest, res: VercelResponse) => {
            try {
              await convertHandler(req, res);
              resolve();
            } catch (error) {
              reject(error);
            }
          })
        )(req, res);
      });
    });
  } catch (error) {
    // Handle errors with unified error handler
    return handleError(error as Error, req, res);
  }
};

export default enhancedConvertHandler;
