import { VercelRequest, VercelResponse } from '@vercel/node';

// Common timezone mappings
const TIMEZONE_ALIASES: Record<string, string> = {
  'EST': 'America/New_York',
  'PST': 'America/Los_Angeles',
  'CST': 'America/Chicago',
  'MST': 'America/Denver',
  'GMT': 'UTC',
  'BST': 'Europe/London',
  'CET': 'Europe/Paris',
  'JST': 'Asia/Tokyo',
  'IST': 'Asia/Kolkata',
  'AEST': 'Australia/Sydney'
};

/**
 * Timezone Difference API Endpoint
 *
 * Calculate the time difference between two timezones
 *
 * GET /api/timezone-difference?timezone1=UTC&timezone2=America/New_York
 * GET /api/timezone-difference?from=UTC&to=America/New_York (alias support)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET and POST methods are allowed'
    });
  }

  try {
    const startTime = Date.now();

    // Parse request parameters
    let timezone1: string, timezone2: string, timestamp: number, includeDetails: boolean;

    if (req.method === 'GET') {
      const { timezone1: tz1, timezone2: tz2, from, to, timestamp: ts, details } = req.query;

      // Support both 'from/to' and 'timezone1/timezone2' parameter names
      timezone1 = (tz1 || from) as string;
      timezone2 = (tz2 || to) as string;

      if (!timezone1 || !timezone2) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Both timezone1/from and timezone2/to are required',
          required: ['timezone1/from', 'timezone2/to'],
          received: { timezone1: !!timezone1, timezone2: !!timezone2 }
        });
      }

      timestamp = ts ? parseInt(ts as string) : Math.floor(Date.now() / 1000);
      includeDetails = details === 'true';
    } else {
      const body = req.body;
      timezone1 = body.timezone1;
      timezone2 = body.timezone2;
      timestamp = body.timestamp || Math.floor(Date.now() / 1000);
      includeDetails = body.includeDetails || false;
    }

    // Validate timezones
    if (!timezone1 || !timezone2) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Both timezone1 and timezone2 are required'
      });
    }

    // Calculate timezone difference
    const result = await calculateTimezoneDifference(timezone1, timezone2, timestamp, includeDetails);

    return res.status(200).json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: Math.floor(Date.now() / 1000)
      }
    });

  } catch (error) {
    console.error('Timezone difference error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

async function calculateTimezoneDifference(timezone1: string, timezone2: string, timestamp: number, includeDetails: boolean) {
  // Normalize timezone identifiers
  const tz1 = normalizeTimezone(timezone1);
  const tz2 = normalizeTimezone(timezone2);

  // Create date object
  const date = new Date(timestamp * 1000);

  // Get timezone information
  const tz1Info = getTimezoneInfo(tz1, date);
  const tz2Info = getTimezoneInfo(tz2, date);

  // Calculate difference
  const totalMinutes = tz2Info.offset - tz1Info.offset;
  const hours = Math.floor(Math.abs(totalMinutes) / 60);
  const minutes = Math.abs(totalMinutes) % 60;

  // Create description
  let description: string;
  if (totalMinutes === 0) {
    description = `${tz1} and ${tz2} are in the same timezone`;
  } else if (totalMinutes > 0) {
    description = `${tz2} is ${hours}h ${minutes}m ahead of ${tz1}`;
  } else {
    description = `${tz2} is ${hours}h ${minutes}m behind ${tz1}`;
  }

  const result: any = {
    timezone1: tz1Info,
    timezone2: tz2Info,
    difference: {
      hours,
      minutes,
      totalMinutes,
      description
    },
    timestamp
  };

  // Add detailed information if requested
  if (includeDetails) {
    try {
      const tz1Time = date.toLocaleString('en-US', {
        timeZone: tz1,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });

      const tz2Time = date.toLocaleString('en-US', {
        timeZone: tz2,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });

      const utcTime = date.toISOString();

      result.details = {
        timezone1Time: tz1Time,
        timezone2Time: tz2Time,
        utcTime,
        comparison: totalMinutes === 0 ? 'Both timezones show the same time' :
          `${tz1} shows ${tz1Time.split(' at ')[1]}, ${tz2} shows ${tz2Time.split(' at ')[1]}`
      };
    } catch (error) {
      console.warn('Error generating detailed time info:', error);
    }
  }

  return result;
}

function normalizeTimezone(timezone: string): string {
  // Check if it's an alias
  if (TIMEZONE_ALIASES[timezone.toUpperCase()]) {
    return TIMEZONE_ALIASES[timezone.toUpperCase()];
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

function getTimezoneInfo(timezone: string, date: Date) {
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
      isDST
    };
  } catch (error) {
    // Fallback for invalid timezones
    return {
      identifier: timezone,
      displayName: timezone,
      offset: 0,
      isDST: false
    };
  }
}

function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    // Use a more reliable method to get timezone offset
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

    // Calculate offset in minutes
    const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
    return Math.round(offsetMinutes);
  } catch (error) {
    return 0;
  }
}

function isDaylightSavingTime(timezone: string, date: Date): boolean {
  try {
    // Compare offset with January and July to detect DST
    const januaryDate = new Date(date.getFullYear(), 0, 1);
    const julyDate = new Date(date.getFullYear(), 6, 1);

    const januaryOffset = getTimezoneOffset(timezone, januaryDate);
    const julyOffset = getTimezoneOffset(timezone, julyDate);
    const currentOffset = getTimezoneOffset(timezone, date);

    // DST is in effect if current offset differs from standard time
    const standardOffset = Math.min(januaryOffset, julyOffset);
    return currentOffset !== standardOffset;
  } catch (error) {
    return false;
  }
}

function getTimezoneDisplayName(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'long'
    });

    const parts = formatter.formatToParts(new Date());
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');

    return timeZonePart?.value || timezone;
  } catch (error) {
    return timezone;
  }
}
