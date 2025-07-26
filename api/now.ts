import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Current Time API Endpoint
 *
 * GET /api/now - Get current timestamp in multiple formats
 * GET /api/now?timezone=America/New_York - Get current time in specific timezone
 *
 * Query Parameters:
 * - timezone: IANA timezone identifier (optional, defaults to UTC)
 * - format: Specific format to return (optional)
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
      message: 'Only GET method is allowed'
    });
  }

  try {
    const startTime = Date.now();
    const { timezone, format } = req.query;

    const now = new Date();
    const timestamp = Math.floor(now.getTime() / 1000);
    const timestampMs = now.getTime();

    // Get time in specified timezone
    const tz = (timezone as string) || 'UTC';
    let localTime: string;
    let timezoneInfo: any = {};

    try {
      localTime = now.toLocaleString('en-US', {
        timeZone: tz,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });

      // Get timezone offset
      const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const offsetMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / (1000 * 60));
      const offsetHours = offsetMinutes / 60;
      const offsetString = `${offsetHours >= 0 ? '+' : ''}${offsetHours.toFixed(2)}`;

      timezoneInfo = {
        timezone: tz,
        offset: offsetMinutes,
        offsetHours,
        offsetString: `UTC${offsetString}`,
        localTime
      };
    } catch (error) {
      localTime = now.toLocaleString();
      timezoneInfo = {
        timezone: 'UTC',
        offset: 0,
        offsetHours: 0,
        offsetString: 'UTC+0.00',
        localTime: now.toISOString(),
        error: 'Invalid timezone'
      };
    }

    const formats = {
      iso8601: now.toISOString(),
      utc: now.toUTCString(),
      timestamp,
      timestampMs,
      local: localTime,
      unix: timestamp,
      readable: now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time24: now.toLocaleTimeString('en-US', { hour12: false }),
      time12: now.toLocaleTimeString('en-US', { hour12: true })
    };

    // If specific format requested, return just that
    if (format && formats[format as keyof typeof formats]) {
      return res.status(200).json({
        success: true,
        data: {
          format: format,
          value: formats[format as keyof typeof formats],
          timestamp
        },
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: Math.floor(Date.now() / 1000)
        }
      });
    }

    // Return all formats
    res.status(200).json({
      success: true,
      data: {
        current: {
          timestamp,
          timestampMs,
          date: now.toISOString(),
          formats
        },
        timezone: timezoneInfo,
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: Math.floor(Date.now() / 1000),
          requestedTimezone: tz
        }
      }
    });

  } catch (error) {
    console.error('Now API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}


