import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, ResponseBuilder, withCors } from './utils/response';
import { createCacheMiddleware } from './middleware/cache';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import formatService from './services/format-service';
import { convertTimezone } from './utils/conversion-utils';

async function convertHandler(req: VercelRequest, res: VercelResponse) {
  withCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return APIErrorHandler.handleMethodNotAllowed(res, 'Only GET and POST methods are allowed');
  }

  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const { timestamp, date, format, timezone, targetTimezone, includeFormats = false } = params;

    if (!timestamp && !date) {
      return APIErrorHandler.handleBadRequest(
        res,
        'Please provide either timestamp or date parameter'
      );
    }

    if (timestamp && date) {
      return APIErrorHandler.handleBadRequest(
        res,
        'Please provide either timestamp or date, not both'
      );
    }

    // Process conversion logic here...
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

    const result = await processConversion(inputValue, isTimestamp, options);

    const builder = new ResponseBuilder().setData(result);
    builder.send(res);
  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
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

// Enhanced convert API with caching and rate limiting
const enhancedConvertHandler = createRateLimitMiddleware()(
  createCacheMiddleware({
    ttl: 5 * 60 * 1000, // 5 minutes
    cacheControlHeader: 'public, max-age=300, stale-while-revalidate=600',
  })(convertHandler)
);

export default enhancedConvertHandler;
