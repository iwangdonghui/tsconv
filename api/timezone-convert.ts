import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Timezone Convert API Endpoint
 *
 * Convert timestamps between different timezones
 *
 * GET /api/timezone-convert?timestamp=1640995200&from=UTC&to=America/New_York
 *
 * Query Parameters:
 * - timestamp: Unix timestamp to convert (required)
 * - from: Source timezone (required)
 * - to: Target timezone (required)
 * - format: Output format (optional)
 *
 * POST /api/timezone-convert
 * Body: {
 *   "timestamp": 1640995200,
 *   "from": "UTC",
 *   "to": "America/New_York",
 *   "format": "iso"
 * }
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
      message: 'Only GET and POST methods are allowed',
    });
  }

  try {
    const startTime = Date.now();

    // Parse request parameters
    let timestamp: number, from: string, to: string, format: string;

    if (req.method === 'GET') {
      const { timestamp: ts, from: fromTz, to: toTz, format: fmt } = req.query;

      if (!ts || !fromTz || !toTz) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'timestamp, from, and to parameters are required',
          required: ['timestamp', 'from', 'to'],
          received: { timestamp: !!ts, from: !!fromTz, to: !!toTz },
        });
      }

      timestamp = parseInt(ts as string);
      from = fromTz as string;
      to = toTz as string;
      format = (fmt as string) || 'iso';
    } else {
      const body = req.body;
      timestamp = body.timestamp;
      from = body.from;
      to = body.to;
      format = body.format || 'iso';
    }

    // Validate parameters
    if (!timestamp || !from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'timestamp, from, and to are required',
      });
    }

    if (isNaN(timestamp)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'timestamp must be a valid number',
      });
    }

    // Convert timezone
    const result = convertTimezone(timestamp, from, to, format);

    return res.status(200).json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
  } catch (error) {
    console.error('Timezone convert error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

function convertTimezone(timestamp: number, from: string, to: string, format: string) {
  try {
    // Create date object
    const date = new Date(timestamp * 1000);

    // Get time in source timezone
    const sourceTime = date.toLocaleString('en-US', {
      timeZone: from,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Get time in target timezone
    const targetTime = date.toLocaleString('en-US', {
      timeZone: to,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Format according to requested format
    const targetDate = new Date(date.toLocaleString('en-US', { timeZone: to }));
    let formattedTime: string;

    switch (format.toLowerCase()) {
      case 'iso':
        formattedTime = targetDate.toISOString();
        break;
      case 'utc':
        formattedTime = targetDate.toUTCString();
        break;
      case 'local':
        formattedTime = targetDate.toLocaleString();
        break;
      case 'timestamp':
        formattedTime = Math.floor(targetDate.getTime() / 1000).toString();
        break;
      default:
        formattedTime = targetDate.toISOString();
    }

    return {
      input: {
        timestamp,
        from,
        to,
        format,
      },
      source: {
        timezone: from,
        time: sourceTime,
        utc: date.toISOString(),
      },
      target: {
        timezone: to,
        time: targetTime,
        formatted: formattedTime,
        timestamp: Math.floor(targetDate.getTime() / 1000),
      },
      conversion: {
        description: `Converted from ${from} to ${to}`,
        originalTimestamp: timestamp,
        convertedTimestamp: Math.floor(targetDate.getTime() / 1000),
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to convert timezone: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
