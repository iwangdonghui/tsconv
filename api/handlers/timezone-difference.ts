import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders } from '../utils/response';

interface TimezoneDifferenceRequest {
  timezone1: string;
  timezone2: string;
  timestamp?: number;
  includeDetails?: boolean;
}

interface TimezoneDifferenceResponse {
  success: boolean;
  data: {
    timezone1: {
      identifier: string;
      displayName: string;
      offset: number;
      isDST: boolean;
    };
    timezone2: {
      identifier: string;
      displayName: string;
      offset: number;
      isDST: boolean;
    };
    difference: {
      hours: number;
      minutes: number;
      totalMinutes: number;
      description: string;
    };
    timestamp: number;
    details?: {
      timezone1Time: string;
      timezone2Time: string;
      utcTime: string;
      comparison: string;
    };
  };
}

// Common timezone mappings
const TIMEZONE_ALIASES: Record<string, string> = {
  EST: 'America/New_York',
  PST: 'America/Los_Angeles',
  CST: 'America/Chicago',
  MST: 'America/Denver',
  GMT: 'UTC',
  BST: 'Europe/London',
  CET: 'Europe/Paris',
  JST: 'Asia/Tokyo',
  IST: 'Asia/Kolkata',
  AEST: 'Australia/Sydney',
};

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

  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return APIErrorHandler.handleMethodNotAllowed(res, 'Only GET and POST methods are allowed');
  }

  try {
    const startTime = Date.now();

    // Parse request parameters
    let request: TimezoneDifferenceRequest;

    if (req.method === 'GET') {
      const { timezone1, timezone2, timestamp, details } = req.query;

      if (!timezone1 || !timezone2) {
        return APIErrorHandler.handleBadRequest(res, 'Both timezone1 and timezone2 are required', {
          required: ['timezone1', 'timezone2'],
          received: { timezone1: !!timezone1, timezone2: !!timezone2 },
        });
      }

      request = {
        timezone1: timezone1 as string,
        timezone2: timezone2 as string,
        timestamp: timestamp ? parseInt(timestamp as string) : Date.now() / 1000,
        includeDetails: details === 'true',
      };
    } else {
      request = req.body;
    }

    // Validate request
    const validationResult = validateTimezoneDifferenceRequest(request);
    if (!validationResult.valid) {
      return APIErrorHandler.handleBadRequest(
        res,
        validationResult.message || 'Invalid request',
        validationResult.details
      );
    }

    // Calculate timezone difference
    const result = await calculateTimezoneDifference(request);

    const response: TimezoneDifferenceResponse = {
      success: true,
      data: result,
    };

    APIErrorHandler.sendSuccess(res, response, {
      processingTime: Date.now() - startTime,
      itemCount: 1,
      cacheHit: false,
    });
  } catch (error) {
    console.error('Timezone difference error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'timezone-difference',
    });
  }
}

function validateTimezoneDifferenceRequest(request: TimezoneDifferenceRequest): {
  valid: boolean;
  message?: string;
  details?: any;
} {
  if (!request.timezone1) {
    return {
      valid: false,
      message: 'timezone1 is required',
      details: { field: 'timezone1', type: 'string' },
    };
  }

  if (!request.timezone2) {
    return {
      valid: false,
      message: 'timezone2 is required',
      details: { field: 'timezone2', type: 'string' },
    };
  }

  if (
    request.timestamp &&
    (typeof request.timestamp !== 'number' ||
      isNaN(request.timestamp) ||
      !isFinite(request.timestamp))
  ) {
    return {
      valid: false,
      message: 'timestamp must be a valid number',
      details: {
        field: 'timestamp',
        received: typeof request.timestamp,
        value: request.timestamp,
      },
    };
  }

  return { valid: true };
}

async function calculateTimezoneDifference(request: TimezoneDifferenceRequest): Promise<any> {
  // Normalize timezone identifiers
  const timezone1 = normalizeTimezone(request.timezone1);
  const timezone2 = normalizeTimezone(request.timezone2);

  // Use current time if no timestamp provided
  const timestamp = request.timestamp || Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000);

  // Get timezone information
  const tz1Info = getTimezoneInfo(timezone1, date);
  const tz2Info = getTimezoneInfo(timezone2, date);

  // Calculate difference
  const totalMinutes = tz2Info.offset - tz1Info.offset;
  const hours = Math.floor(Math.abs(totalMinutes) / 60);
  const minutes = Math.abs(totalMinutes) % 60;

  // Create description
  let description: string;
  if (totalMinutes === 0) {
    description = `${timezone1} and ${timezone2} are in the same timezone`;
  } else if (totalMinutes > 0) {
    description = `${timezone2} is ${hours}h ${minutes}m ahead of ${timezone1}`;
  } else {
    description = `${timezone2} is ${hours}h ${minutes}m behind ${timezone1}`;
  }

  const result: any = {
    timezone1: tz1Info,
    timezone2: tz2Info,
    difference: {
      hours: Math.floor(Math.abs(totalMinutes) / 60),
      minutes: Math.abs(totalMinutes) % 60,
      totalMinutes,
      description,
    },
    timestamp,
  };

  // Add detailed information if requested
  if (request.includeDetails) {
    const tz1Time = date.toLocaleString('en-US', {
      timeZone: timezone1,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });

    const tz2Time = date.toLocaleString('en-US', {
      timeZone: timezone2,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });

    const utcTime = date.toISOString();

    let comparison: string;
    if (totalMinutes === 0) {
      comparison = 'Both timezones show the same time';
    } else {
      const tz1Date = new Date(date.toLocaleString('en-US', { timeZone: timezone1 }));
      const tz2Date = new Date(date.toLocaleString('en-US', { timeZone: timezone2 }));

      if (tz2Date > tz1Date) {
        comparison = `When it's ${tz1Date.toLocaleTimeString()} in ${timezone1}, it's ${tz2Date.toLocaleTimeString()} in ${timezone2}`;
      } else {
        comparison = `When it's ${tz2Date.toLocaleTimeString()} in ${timezone2}, it's ${tz1Date.toLocaleTimeString()} in ${timezone1}`;
      }
    }

    result.details = {
      timezone1Time: tz1Time,
      timezone2Time: tz2Time,
      utcTime,
      comparison,
    };
  }

  return result;
}

function normalizeTimezone(timezone: string): string {
  // Check if it's an alias
  const alias = TIMEZONE_ALIASES[timezone.toUpperCase()];
  if (alias) {
    return alias;
  }

  // Return as-is if it looks like a valid IANA timezone
  if (timezone.includes('/') || timezone === 'UTC') {
    return timezone;
  }

  // Handle UTC variations
  const upperTimezone = timezone.toUpperCase();
  if (['UTC', 'GMT', 'Z'].includes(upperTimezone)) {
    return 'UTC';
  }

  // Default to treating as IANA timezone identifier
  return timezone;
}

function getTimezoneInfo(timezone: string, date: Date): any {
  try {
    // Get timezone offset at the specific date
    const offset = getTimezoneOffset(timezone, date);

    // Check if DST is in effect
    const isDST = isDaylightSavingTime(timezone, date);

    // Get display name
    const displayName = getTimezoneDisplayName(timezone);

    return {
      identifier: timezone,
      displayName,
      offset,
      isDST,
    };
  } catch (error) {
    // Fallback for invalid timezones
    return {
      identifier: timezone,
      displayName: timezone,
      offset: 0,
      isDST: false,
    };
  }
}

function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    // Create a date in the target timezone (intermediate kept for clarity)
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    void utcTime; // avoid TS6133 when not used directly
    // Compute target time if needed in future debugging
    // const __targetTime = new Date(utcTime + getTimezoneOffsetMinutes(timezone, date) * 60000);

    // Calculate offset in minutes from UTC
    return getTimezoneOffsetMinutes(timezone, date);
  } catch (error) {
    return 0;
  }
}

function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  try {
    // Use Intl.DateTimeFormat to get the offset
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });

    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find(part => part.type === 'timeZoneName');

    if (offsetPart && offsetPart.value.match(/GMT[+-]\d+/)) {
      const offsetString = offsetPart.value.replace('GMT', '');
      const hours = parseInt(offsetString);
      return hours * 60;
    }

    // Fallback method
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  } catch (error) {
    return 0;
  }
}

function isDaylightSavingTime(timezone: string, date: Date): boolean {
  try {
    // Compare offset with January and July to detect DST
    const januaryDate = new Date(date.getFullYear(), 0, 1);
    const julyDate = new Date(date.getFullYear(), 6, 1);

    const januaryOffset = getTimezoneOffsetMinutes(timezone, januaryDate);
    const julyOffset = getTimezoneOffsetMinutes(timezone, julyDate);
    const currentOffset = getTimezoneOffsetMinutes(timezone, date);

    // DST is in effect if current offset differs from standard time
    const standardOffset = Math.max(januaryOffset, julyOffset);
    return currentOffset !== standardOffset;
  } catch (error) {
    return false;
  }
}

function getTimezoneDisplayName(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'long',
    });

    const parts = formatter.formatToParts(new Date());
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');

    return timeZonePart?.value || timezone;
  } catch (error) {
    return timezone;
  }
}
