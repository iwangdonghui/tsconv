import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Formats API Endpoint
 * 
 * Get available date/time formats and format timestamps
 * 
 * GET /api/formats - List all available formats
 * GET /api/formats?timestamp=1640995200&format=iso - Format a timestamp
 * 
 * Query Parameters:
 * - timestamp: Unix timestamp to format (optional)
 * - format: Format name or pattern (optional)
 * - timezone: Timezone for formatting (optional, defaults to UTC)
 */

const PREDEFINED_FORMATS = {
  'iso': {
    name: 'ISO 8601',
    pattern: 'YYYY-MM-DDTHH:mm:ss.sssZ',
    description: 'ISO 8601 standard format',
    example: '2022-01-01T00:00:00.000Z'
  },
  'iso-date': {
    name: 'ISO Date',
    pattern: 'YYYY-MM-DD',
    description: 'ISO date only',
    example: '2022-01-01'
  },
  'iso-time': {
    name: 'ISO Time',
    pattern: 'HH:mm:ss',
    description: 'ISO time only',
    example: '00:00:00'
  },
  'us-date': {
    name: 'US Date',
    pattern: 'MM/DD/YYYY',
    description: 'US date format',
    example: '01/01/2022'
  },
  'us-datetime': {
    name: 'US Date Time',
    pattern: 'MM/DD/YYYY HH:mm:ss',
    description: 'US date and time',
    example: '01/01/2022 00:00:00'
  },
  'eu-date': {
    name: 'European Date',
    pattern: 'DD/MM/YYYY',
    description: 'European date format',
    example: '01/01/2022'
  },
  'eu-datetime': {
    name: 'European Date Time',
    pattern: 'DD/MM/YYYY HH:mm:ss',
    description: 'European date and time',
    example: '01/01/2022 00:00:00'
  },
  'readable': {
    name: 'Readable',
    pattern: 'MMM DD, YYYY',
    description: 'Human readable date',
    example: 'Jan 01, 2022'
  },
  'readable-full': {
    name: 'Readable Full',
    pattern: 'MMMM DD, YYYY HH:mm:ss',
    description: 'Full readable date and time',
    example: 'January 01, 2022 00:00:00'
  },
  'unix': {
    name: 'Unix Timestamp',
    pattern: 'X',
    description: 'Unix timestamp in seconds',
    example: '1640995200'
  },
  'unix-ms': {
    name: 'Unix Timestamp (ms)',
    pattern: 'x',
    description: 'Unix timestamp in milliseconds',
    example: '1640995200000'
  },
  'rfc2822': {
    name: 'RFC 2822',
    pattern: 'ddd, DD MMM YYYY HH:mm:ss ZZ',
    description: 'RFC 2822 format',
    example: 'Sat, 01 Jan 2022 00:00:00 +0000'
  },
  'sql': {
    name: 'SQL DateTime',
    pattern: 'YYYY-MM-DD HH:mm:ss',
    description: 'SQL datetime format',
    example: '2022-01-01 00:00:00'
  },
  'compact': {
    name: 'Compact',
    pattern: 'YYYYMMDDHHMMSS',
    description: 'Compact format without separators',
    example: '20220101000000'
  },
  'log': {
    name: 'Log Format',
    pattern: 'YYYY-MM-DD HH:mm:ss.SSS',
    description: 'Common log file format',
    example: '2022-01-01 00:00:00.000'
  }
};

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
    const { timestamp, format, timezone } = req.query;

    // If no timestamp provided, return list of available formats
    if (!timestamp) {
      return res.status(200).json({
        success: true,
        data: {
          formats: PREDEFINED_FORMATS,
          count: Object.keys(PREDEFINED_FORMATS).length,
          usage: {
            listFormats: '/api/formats',
            formatTimestamp: '/api/formats?timestamp=1640995200&format=iso',
            customTimezone: '/api/formats?timestamp=1640995200&format=iso&timezone=America/New_York'
          }
        },
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: Math.floor(Date.now() / 1000)
        }
      });
    }

    // Parse timestamp
    const ts = parseInt(timestamp as string);
    if (isNaN(ts)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'timestamp must be a valid number'
      });
    }

    // Format timestamp
    const result = formatTimestamp(ts, format as string, timezone as string);

    res.status(200).json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: Math.floor(Date.now() / 1000)
      }
    });

  } catch (error) {
    console.error('Formats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

function formatTimestamp(timestamp: number, format?: string, timezone?: string) {
  const date = new Date(timestamp * 1000);
  const tz = timezone || 'UTC';
  const fmt = format || 'iso';

  // Get the format definition
  const formatDef = PREDEFINED_FORMATS[fmt as keyof typeof PREDEFINED_FORMATS];

  let formatted: string;
  let formatUsed: string;

  if (formatDef) {
    // Use predefined format
    formatted = applyPredefinedFormat(date, fmt, tz);
    formatUsed = formatDef.pattern;
  } else {
    // Treat as custom format pattern
    formatted = applyCustomFormat(date, fmt, tz);
    formatUsed = fmt;
  }

  return {
    input: {
      timestamp,
      format: fmt,
      timezone: tz
    },
    output: {
      formatted,
      formatUsed,
      timezone: tz
    },
    alternatives: generateAlternatives(date, tz),
    formatInfo: formatDef || {
      name: 'Custom Format',
      pattern: fmt,
      description: 'Custom format pattern',
      example: formatted
    }
  };
}

function applyPredefinedFormat(date: Date, format: string, timezone: string): string {
  const options: Intl.DateTimeFormatOptions = { timeZone: timezone };

  switch (format) {
    case 'iso':
      return date.toISOString();
    case 'iso-date':
      return date.toISOString().split('T')[0];
    case 'iso-time':
      return date.toISOString().split('T')[1].split('.')[0];
    case 'us-date':
      return date.toLocaleDateString('en-US', { ...options, month: '2-digit', day: '2-digit', year: 'numeric' });
    case 'us-datetime':
      return date.toLocaleString('en-US', { ...options, month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    case 'eu-date':
      return date.toLocaleDateString('en-GB', { ...options, day: '2-digit', month: '2-digit', year: 'numeric' });
    case 'eu-datetime':
      return date.toLocaleString('en-GB', { ...options, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    case 'readable':
      return date.toLocaleDateString('en-US', { ...options, month: 'short', day: '2-digit', year: 'numeric' });
    case 'readable-full':
      return date.toLocaleString('en-US', { ...options, month: 'long', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    case 'unix':
      return Math.floor(date.getTime() / 1000).toString();
    case 'unix-ms':
      return date.getTime().toString();
    case 'rfc2822':
      return date.toUTCString();
    case 'sql':
      return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    case 'compact':
      return date.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    case 'log':
      return date.toISOString().replace('T', ' ').replace('Z', '');
    default:
      return date.toISOString();
  }
}

function applyCustomFormat(date: Date, pattern: string, timezone: string): string {
  // Simple custom format implementation
  // In a real application, you would use a proper date formatting library
  try {
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    return pattern
      .replace(/YYYY/g, tzDate.getFullYear().toString())
      .replace(/MM/g, (tzDate.getMonth() + 1).toString().padStart(2, '0'))
      .replace(/DD/g, tzDate.getDate().toString().padStart(2, '0'))
      .replace(/HH/g, tzDate.getHours().toString().padStart(2, '0'))
      .replace(/mm/g, tzDate.getMinutes().toString().padStart(2, '0'))
      .replace(/ss/g, tzDate.getSeconds().toString().padStart(2, '0'));
  } catch (error) {
    return date.toISOString();
  }
}

function generateAlternatives(date: Date, timezone: string) {
  return {
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString('en-US', { timeZone: timezone }),
    timestamp: Math.floor(date.getTime() / 1000),
    timestampMs: date.getTime()
  };
}
