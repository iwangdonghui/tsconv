import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders } from '../utils/response';

interface SimpleConvertRequest {
  timestamp: number | string;
  format?: string;
  timezone?: string;
}

interface SimpleConvertResponse {
  success: boolean;
  data: {
    input: number | string;
    timestamp: number;
    formats: {
      unix: string;
      iso: string;
      human: string;
      date: string;
      time: string;
    };
    timezone: string;
  };
}

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
    let convertRequest: SimpleConvertRequest;

    if (req.method === 'GET') {
      const { timestamp, format, timezone } = req.query;
      
      if (!timestamp) {
        return APIErrorHandler.handleBadRequest(res, 'Timestamp parameter is required', {
          parameter: 'timestamp',
          examples: ['1705315845', '2024-01-15T10:30:45Z', 'now']
        });
      }

      convertRequest = {
        timestamp: timestamp === 'now' ? Date.now() / 1000 : timestamp as string,
        format: format as string,
        timezone: timezone as string
      };
    } else {
      convertRequest = req.body;
    }

    // Validate and convert
    const result = await performSimpleConversion(convertRequest);

    const response: SimpleConvertResponse = {
      success: true,
      data: result
    };

    APIErrorHandler.sendSuccess(res, response, {
      processingTime: Date.now() - startTime,
      itemCount: 1,
      cacheHit: false
    });

  } catch (error) {
    console.error('Simple convert error:', error);
    
    // Handle specific error types
    if ((error as Error).message.includes('Invalid timestamp')) {
      return APIErrorHandler.handleBadRequest(res, (error as Error).message, {
        supportedFormats: [
          'Unix timestamp (seconds): 1705315845',
          'Unix timestamp (milliseconds): 1705315845123',
          'ISO string: 2024-01-15T10:30:45Z',
          'Date string: 2024-01-15',
          'Special value: now'
        ]
      });
    }

    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'simple-convert'
    });
  }
}

async function performSimpleConversion(request: SimpleConvertRequest): Promise<any> {
  // Parse and validate timestamp
  const timestamp = parseTimestamp(request.timestamp);
  const timezone = request.timezone || 'UTC';
  
  // Create date object
  const date = new Date(timestamp * 1000);
  
  // Validate date
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${request.timestamp}`);
  }

  // Generate all common formats
  const formats = {
    unix: timestamp.toString(),
    iso: date.toISOString(),
    human: formatHumanReadable(date, timezone),
    date: formatDate(date, timezone),
    time: formatTime(date, timezone)
  };

  return {
    input: request.timestamp,
    timestamp,
    formats,
    timezone
  };
}

function parseTimestamp(input: number | string): number {
  if (typeof input === 'number') {
    // Handle both seconds and milliseconds
    return input > 1e10 ? Math.floor(input / 1000) : input;
  }

  if (typeof input === 'string') {
    // Handle special values
    if (input.toLowerCase() === 'now') {
      return Math.floor(Date.now() / 1000);
    }

    // Try parsing as number first
    const asNumber = parseFloat(input);
    if (!isNaN(asNumber) && isFinite(asNumber)) {
      return asNumber > 1e10 ? Math.floor(asNumber / 1000) : asNumber;
    }

    // Try parsing as date string
    const date = new Date(input);
    if (!isNaN(date.getTime())) {
      return Math.floor(date.getTime() / 1000);
    }

    throw new Error(`Invalid timestamp format: ${input}`);
  }

  throw new Error(`Invalid timestamp type: ${typeof input}`);
}

function formatHumanReadable(date: Date, timezone: string): string {
  try {
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    return date.toLocaleString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }
}

function formatDate(date: Date, timezone: string): string {
  try {
    return date.toLocaleDateString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}

function formatTime(date: Date, timezone: string): string {
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    return date.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
}