import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, ResponseBuilder, withCors } from '../utils/response';
import { createCacheMiddleware } from '../middleware/cache';
import { createRateLimitMiddleware } from '../middleware/rate-limit';
import { getTimezoneOffset, isValidTimezone, getCommonTimezones } from '../utils/conversion-utils';

interface TimezoneInfo {
  identifier: string;
  displayName: string;
  currentOffset: number;
  isDST: boolean;
  region?: string;
  countryCode?: string;
  aliases?: string[];
}

async function timezoneInfoHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return APIErrorHandler.handleBadRequest(res, 'Only GET method is allowed');
  }

  try {
    const { timezone, list } = req.query;

    // If list parameter is provided, return a list of common timezones
    if (list === 'true' || list === '1') {
      const timezones = getCommonTimezones();
      const builder = new ResponseBuilder().setData(timezones);
      return builder.send(res);
    }

    // If no timezone parameter, return error
    if (!timezone) {
      return APIErrorHandler.handleBadRequest(
        res, 
        'Please provide a timezone parameter or use list=true to get common timezones'
      );
    }

    const timezoneStr = String(timezone);

    // Validate timezone
    if (!isValidTimezone(timezoneStr)) {
      return APIErrorHandler.handleBadRequest(res, `Invalid timezone: ${timezoneStr}`);
    }

    // Get timezone information
    const timezoneInfo = await getTimezoneDetails(timezoneStr);
    const builder = new ResponseBuilder().setData(timezoneInfo);
    builder.send(res);

  } catch (error) {
    console.error('Timezone info error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

async function getTimezoneDetails(timezone: string): Promise<TimezoneInfo> {
  const now = new Date();
  const currentOffset = getTimezoneOffset(now, timezone);
  
  // Check if timezone is currently in DST
  const januaryDate = new Date(now.getFullYear(), 0, 1);
  const julyDate = new Date(now.getFullYear(), 6, 1);
  
  const januaryOffset = getTimezoneOffset(januaryDate, timezone);
  const julyOffset = getTimezoneOffset(julyDate, timezone);
  
  const isDST = currentOffset !== Math.max(januaryOffset, julyOffset);
  
  // Get display name using Intl API
  let displayName = timezone;
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'long'
    });
    
    // Extract timezone name from formatted date
    const formatted = formatter.format(now);
    const parts = formatter.formatToParts(now);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    
    if (timeZonePart) {
      displayName = timeZonePart.value;
    }
  } catch (error) {
    console.warn(`Failed to get display name for timezone ${timezone}:`, error);
  }
  
  // Extract region from timezone identifier
  const region = timezone.split('/')[0];
  
  return {
    identifier: timezone,
    displayName,
    currentOffset,
    isDST,
    region,
    // Additional data would typically come from a timezone database
    countryCode: getCountryCodeForTimezone(timezone),
    aliases: getTimezoneAliases(timezone)
  };
}

// Mock function to get country code for timezone
// In a real implementation, this would use a timezone database
function getCountryCodeForTimezone(timezone: string): string | undefined {
  const timezoneMap: Record<string, string> = {
    'America/New_York': 'US',
    'America/Los_Angeles': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'Europe/London': 'GB',
    'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE',
    'Asia/Tokyo': 'JP',
    'Asia/Shanghai': 'CN',
    'Asia/Kolkata': 'IN',
    'Australia/Sydney': 'AU'
  };
  
  return timezoneMap[timezone];
}

// Mock function to get timezone aliases
// In a real implementation, this would use a timezone database
function getTimezoneAliases(timezone: string): string[] {
  const aliasMap: Record<string, string[]> = {
    'America/New_York': ['EST', 'Eastern Time'],
    'America/Los_Angeles': ['PST', 'Pacific Time'],
    'America/Chicago': ['CST', 'Central Time'],
    'America/Denver': ['MST', 'Mountain Time'],
    'Europe/London': ['GMT', 'BST'],
    'Europe/Paris': ['CET', 'CEST'],
    'Asia/Tokyo': ['JST'],
    'Australia/Sydney': ['AEST', 'AEDT']
  };
  
  return aliasMap[timezone] || [];
}

// Enhanced timezone info API with caching and rate limiting
const enhancedTimezoneInfoHandler = withCors(
  createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 24 * 60 * 60 * 1000, // 24 hours for timezone data
      cacheControlHeader: 'public, max-age=86400, stale-while-revalidate=172800'
    })(timezoneInfoHandler)
  )
);

export default enhancedTimezoneInfoHandler;