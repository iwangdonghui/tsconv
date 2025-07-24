import { VercelRequest, VercelResponse } from '@vercel/node';

// Standalone converter with minimal dependencies
// This handler is designed to work independently without external services

interface StandaloneConvertRequest {
  timestamp: number | string;
  outputFormats?: string[];
  timezone?: string;
}

interface StandaloneConvertResponse {
  success: boolean;
  data: {
    input: number | string;
    timestamp: number;
    formats: Record<string, string>;
    timezone: string;
    metadata: {
      processingTime: number;
      standalone: true;
    };
  };
  error?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Basic CORS headers
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
      error: 'Method not allowed. Use GET or POST.'
    });
  }

  const startTime = Date.now();

  try {
    // Parse request parameters
    let convertRequest: StandaloneConvertRequest;

    if (req.method === 'GET') {
      const { timestamp, formats, timezone } = req.query;
      
      if (!timestamp) {
        return res.status(400).json({
          success: false,
          error: 'Timestamp parameter is required',
          examples: ['?timestamp=1705315845', '?timestamp=now', '?timestamp=2024-01-15T10:30:45Z']
        });
      }

      convertRequest = {
        timestamp: timestamp === 'now' ? Math.floor(Date.now() / 1000) : timestamp as string,
        outputFormats: formats ? (formats as string).split(',') : undefined,
        timezone: timezone as string
      };
    } else {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body. Expected JSON object.'
        });
      }
      convertRequest = req.body;
    }

    // Perform standalone conversion
    const result = await performStandaloneConversion(convertRequest);

    const response: StandaloneConvertResponse = {
      success: true,
      data: {
        ...result,
        metadata: {
          processingTime: Date.now() - startTime,
          standalone: true
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Standalone convert error:', error);
    
    const errorResponse: StandaloneConvertResponse = {
      success: false,
      data: {
        input: '',
        timestamp: 0,
        formats: {},
        timezone: 'UTC',
        metadata: {
          processingTime: Date.now() - startTime,
          standalone: true
        }
      },
      error: (error as Error).message
    };

    res.status(400).json(errorResponse);
  }
}

async function performStandaloneConversion(request: StandaloneConvertRequest): Promise<any> {
  // Parse timestamp
  const timestamp = parseTimestamp(request.timestamp);
  const timezone = request.timezone || 'UTC';
  const outputFormats = request.outputFormats || ['unix', 'iso', 'human', 'date', 'time'];
  
  // Create date object
  const date = new Date(timestamp * 1000);
  
  // Validate date
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${request.timestamp}`);
  }

  // Generate requested formats
  const formats: Record<string, string> = {};

  for (const format of outputFormats) {
    try {
      formats[format] = formatTimestamp(date, format, timezone);
    } catch (error) {
      formats[format] = `Error: ${(error as Error).message}`;
    }
  }

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
    if (input > 1e10) {
      return Math.floor(input / 1000); // Convert milliseconds to seconds
    }
    return input;
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

function formatTimestamp(date: Date, format: string, timezone: string): string {
  switch (format.toLowerCase()) {
    case 'unix':
      return Math.floor(date.getTime() / 1000).toString();

    case 'unix-ms':
      return date.getTime().toString();

    case 'iso':
      return date.toISOString();

    case 'human':
      return formatHumanReadable(date, timezone);

    case 'date':
      return formatDate(date, timezone);

    case 'time':
      return formatTime(date, timezone);

    case 'us':
      return formatUSDate(date, timezone);

    case 'eu':
      return formatEUDate(date, timezone);

    case 'compact':
      return formatCompact(date, timezone);

    case 'relative':
      return formatRelative(date);

    case 'rfc2822':
      return date.toUTCString();

    case 'log':
      return formatLog(date, timezone);

    default:
      // Try to use the format as a custom pattern
      return formatCustom(date, format, timezone);
  }
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
      second: '2-digit'
    });
  } catch (error) {
    return date.toLocaleString('en-US');
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
    return date.toLocaleDateString('en-US');
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
    return date.toLocaleTimeString('en-US', { hour12: false });
  }
}

function formatUSDate(date: Date, timezone: string): string {
  try {
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    return date.toLocaleString('en-US');
  }
}

function formatEUDate(date: Date, timezone: string): string {
  try {
    return date.toLocaleString('en-GB', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    return date.toLocaleString('en-GB');
  }
}

function formatCompact(date: Date, timezone: string): string {
  try {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  } catch (error) {
    return date.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '');
  }
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (Math.abs(diffSeconds) < 60) {
    return diffSeconds === 0 ? 'now' : 
           diffSeconds > 0 ? `${diffSeconds} seconds ago` : `in ${Math.abs(diffSeconds)} seconds`;
  } else if (Math.abs(diffMinutes) < 60) {
    return diffMinutes > 0 ? `${diffMinutes} minutes ago` : `in ${Math.abs(diffMinutes)} minutes`;
  } else if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `${diffHours} hours ago` : `in ${Math.abs(diffHours)} hours`;
  } else {
    return diffDays > 0 ? `${diffDays} days ago` : `in ${Math.abs(diffDays)} days`;
  }
}

function formatLog(date: Date, timezone: string): string {
  try {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  } catch (error) {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }
}

function formatCustom(date: Date, pattern: string, timezone: string): string {
  // Simple pattern replacement for common tokens
  const tokens: Record<string, string> = {
    'YYYY': date.getFullYear().toString(),
    'MM': (date.getMonth() + 1).toString().padStart(2, '0'),
    'DD': date.getDate().toString().padStart(2, '0'),
    'HH': date.getHours().toString().padStart(2, '0'),
    'mm': date.getMinutes().toString().padStart(2, '0'),
    'ss': date.getSeconds().toString().padStart(2, '0'),
    'SSS': date.getMilliseconds().toString().padStart(3, '0')
  };

  let result = pattern;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(token, 'g'), value);
  }

  return result;
}