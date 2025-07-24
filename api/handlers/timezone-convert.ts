import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, ResponseBuilder, withCors } from '../utils/response';
import { createCacheMiddleware } from '../middleware/cache';
import { createRateLimitMiddleware } from '../middleware/rate-limit';
import { convertTimezone, isValidTimezone, getTimezoneOffset } from '../utils/conversion-utils';

interface TimezoneConversionResult {
  originalTimestamp: number;
  convertedTimestamp: number;
  originalDate: string;
  convertedDate: string;
  fromTimezone: string;
  toTimezone: string;
  offsetDifference: number;
}

async function timezoneConvertHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Allow both GET and POST methods
  const params = req.method === 'GET' ? req.query : req.body;

  try {
    const { timestamp, date, fromTimezone, toTimezone } = params;

    // Validate required parameters
    if (!fromTimezone || !toTimezone) {
      return APIErrorHandler.handleBadRequest(
        res, 
        'Both fromTimezone and toTimezone parameters are required'
      );
    }

    // Validate timezones
    if (!isValidTimezone(String(fromTimezone))) {
      return APIErrorHandler.handleBadRequest(res, `Invalid fromTimezone: ${fromTimezone}`);
    }

    if (!isValidTimezone(String(toTimezone))) {
      return APIErrorHandler.handleBadRequest(res, `Invalid toTimezone: ${toTimezone}`);
    }

    // Parse input timestamp or date
    let inputDate: Date;
    let originalTimestamp: number;

    if (timestamp) {
      // Parse as timestamp
      const ts = parseInt(String(timestamp));
      if (isNaN(ts)) {
        return APIErrorHandler.handleBadRequest(res, 'Invalid timestamp format');
      }
      originalTimestamp = ts;
      inputDate = new Date(ts * 1000);
    } else if (date) {
      // Parse as date string
      inputDate = new Date(String(date));
      if (isNaN(inputDate.getTime())) {
        return APIErrorHandler.handleBadRequest(res, 'Invalid date format');
      }
      originalTimestamp = Math.floor(inputDate.getTime() / 1000);
    } else {
      // Default to current time
      inputDate = new Date();
      originalTimestamp = Math.floor(inputDate.getTime() / 1000);
    }

    // Convert timezone
    const convertedDate = convertTimezone(
      inputDate,
      String(fromTimezone),
      String(toTimezone)
    );
    
    const convertedTimestamp = Math.floor(convertedDate.getTime() / 1000);
    
    // Calculate offset difference in minutes
    const offsetDifference = getTimezoneOffset(inputDate, String(toTimezone)) - 
                            getTimezoneOffset(inputDate, String(fromTimezone));

    // Build result
    const result: TimezoneConversionResult = {
      originalTimestamp,
      convertedTimestamp,
      originalDate: inputDate.toISOString(),
      convertedDate: convertedDate.toISOString(),
      fromTimezone: String(fromTimezone),
      toTimezone: String(toTimezone),
      offsetDifference
    };

    // Send response
    const builder = new ResponseBuilder().setData(result);
    builder.send(res);

  } catch (error) {
    console.error('Timezone conversion error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

// Enhanced timezone conversion API with caching and rate limiting
const enhancedTimezoneConvertHandler = withCors(
  createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 60 * 60 * 1000, // 1 hour
      cacheControlHeader: 'public, max-age=3600, stale-while-revalidate=7200'
    })(timezoneConvertHandler)
  )
);

export default enhancedTimezoneConvertHandler;