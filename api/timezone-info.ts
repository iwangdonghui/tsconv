import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Timezone Info API Endpoint
 *
 * Get detailed information about a specific timezone
 *
 * GET /api/timezone-info?timezone=America/New_York
 * GET /api/timezone-info?timezone=America/New_York&timestamp=1640995200
 *
 * Query Parameters:
 * - timezone: IANA timezone identifier (required)
 * - timestamp: Unix timestamp for specific time info (optional, defaults to current time)
 * - includeHistory: Include DST transition history (optional, boolean)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET method is allowed',
    });
  }

  try {
    const startTime = Date.now();
    const { timezone, timestamp, includeHistory } = req.query;

    // Validate timezone parameter
    if (!timezone) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'timezone parameter is required',
        required: ['timezone'],
      });
    }

    const tz = timezone as string;
    const ts = timestamp ? parseInt(timestamp as string) : Math.floor(Date.now() / 1000);
    const includeHist = includeHistory === 'true';

    // Validate timestamp
    if (timestamp && isNaN(ts)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'timestamp must be a valid number',
      });
    }

    // Get timezone information
    const result = getTimezoneInfo(tz, ts, includeHist);

    return res.status(200).json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
  } catch (error) {
    console.error('Timezone info error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

function getTimezoneInfo(timezone: string, timestamp: number, includeHistory: boolean) {
  try {
    const date = new Date(timestamp * 1000);

    // Get basic timezone information
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'long',
    });

    const parts = formatter.formatToParts(date);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || timezone;

    // Get current time in timezone
    const currentTime = date.toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });

    // Get offset information
    const offset = getTimezoneOffset(timezone, date);
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const offsetString = `${offset >= 0 ? '+' : '-'}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;

    // Check if DST is in effect
    const isDST = isDaylightSavingTime(timezone, date);

    // Get abbreviation
    const abbreviation = getTimezoneAbbreviation(timezone, date);

    const result: any = {
      timezone: {
        identifier: timezone,
        name: timeZoneName,
        abbreviation,
        offset: {
          minutes: offset,
          hours: offset / 60,
          string: offsetString,
          utc: `UTC${offsetString}`,
        },
      },
      current: {
        timestamp,
        utc: date.toISOString(),
        local: currentTime,
        isDST,
        dstOffset: isDST ? getDSTOffset(timezone, date) : 0,
      },
      location: getTimezoneLocation(timezone),
    };

    // Add DST transition history if requested
    if (includeHistory) {
      result.dstHistory = getDSTTransitions(timezone, date.getFullYear());
    }

    return result;
  } catch (error) {
    throw new Error(
      `Failed to get timezone info: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / (1000 * 60));
  } catch (error) {
    return 0;
  }
}

function isDaylightSavingTime(timezone: string, date: Date): boolean {
  try {
    const januaryOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 0, 1));
    const julyOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 6, 1));
    const currentOffset = getTimezoneOffset(timezone, date);

    const standardOffset = Math.min(januaryOffset, julyOffset);
    return currentOffset !== standardOffset;
  } catch (error) {
    return false;
  }
}

function getTimezoneAbbreviation(timezone: string, date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'short',
    });

    const parts = formatter.formatToParts(date);
    return parts.find(part => part.type === 'timeZoneName')?.value || timezone;
  } catch (error) {
    return timezone;
  }
}

function getDSTOffset(timezone: string, date: Date): number {
  try {
    const januaryOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 0, 1));
    const julyOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 6, 1));
    const currentOffset = getTimezoneOffset(timezone, date);

    const standardOffset = Math.min(januaryOffset, julyOffset);
    return currentOffset - standardOffset;
  } catch (error) {
    return 0;
  }
}

function getTimezoneLocation(timezone: string) {
  const parts = timezone.split('/');
  if (parts.length >= 2) {
    return {
      continent: parts[0],
      city: parts[1].replace(/_/g, ' '),
      region: parts.length > 2 ? parts[2].replace(/_/g, ' ') : null,
    };
  }
  return {
    continent: null,
    city: timezone,
    region: null,
  };
}

function getDSTTransitions(timezone: string, year: number) {
  // This is a simplified implementation
  // In a real application, you would use a proper timezone database
  try {
    const transitions: any[] = [];

    // Check each month for DST transitions
    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const firstOffset = getTimezoneOffset(timezone, firstDay);
      const lastOffset = getTimezoneOffset(timezone, lastDay);

      if (firstOffset !== lastOffset) {
        transitions.push({
          month: month + 1,
          type: lastOffset > firstOffset ? 'spring_forward' : 'fall_back',
          offsetChange: lastOffset - firstOffset,
        });
      }
    }

    return transitions;
  } catch (error) {
    return [];
  }
}
