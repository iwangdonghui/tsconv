import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders, validateRequest } from '../utils/response';
import { TimezoneConversionRequest, TimezoneConversionResponse, TimezoneInfo } from '../types/api';

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
    let conversionRequest: TimezoneConversionRequest;

    if (req.method === 'GET') {
      const { timestamp, from, to, formats } = req.query;
      
      if (!timestamp || !from || !to) {
        return APIErrorHandler.handleBadRequest(res, 'Missing required parameters', {
          required: ['timestamp', 'from', 'to'],
          received: { timestamp: !!timestamp, from: !!from, to: !!to }
        });
      }

      conversionRequest = {
        timestamp: parseInt(timestamp as string),
        fromTimezone: from as string,
        toTimezone: to as string,
        formats: formats ? (formats as string).split(',') : undefined
      };
    } else {
      // Validate request body
      const validation = validateRequest(req);
      if (!validation.valid) {
        return APIErrorHandler.handleValidationError(res, validation);
      }

      conversionRequest = req.body;
    }

    // Validate conversion request
    const validationResult = validateTimezoneConversionRequest(conversionRequest);
    if (!validationResult.valid) {
      return APIErrorHandler.handleBadRequest(res, validationResult.message, validationResult.details);
    }

    // Perform timezone conversion
    const conversionResult = await performTimezoneConversion(conversionRequest);

    const response: TimezoneConversionResponse = {
      success: true,
      data: conversionResult
    };

    APIErrorHandler.sendSuccess(res, response, {
      processingTime: Date.now() - startTime,
      itemCount: 1,
      cacheHit: false
    });

  } catch (error) {
    console.error('Timezone conversion error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'timezone-convert'
    });
  }
}

function validateTimezoneConversionRequest(request: TimezoneConversionRequest): { valid: boolean; message?: string; details?: any } {
  if (!request.timestamp) {
    return {
      valid: false,
      message: 'Timestamp is required',
      details: { field: 'timestamp', type: 'number' }
    };
  }

  if (typeof request.timestamp !== 'number' || isNaN(request.timestamp) || !isFinite(request.timestamp)) {
    return {
      valid: false,
      message: 'Timestamp must be a valid number',
      details: { 
        field: 'timestamp', 
        received: typeof request.timestamp,
        value: request.timestamp
      }
    };
  }

  if (!request.fromTimezone) {
    return {
      valid: false,
      message: 'From timezone is required',
      details: { field: 'fromTimezone', type: 'string' }
    };
  }

  if (!request.toTimezone) {
    return {
      valid: false,
      message: 'To timezone is required',
      details: { field: 'toTimezone', type: 'string' }
    };
  }

  // Validate timestamp range (reasonable bounds)
  const minTimestamp = -2147483648; // 1901
  const maxTimestamp = 2147483647;  // 2038
  
  if (request.timestamp < minTimestamp || request.timestamp > maxTimestamp) {
    return {
      valid: false,
      message: 'Timestamp is outside valid range',
      details: {
        field: 'timestamp',
        minValue: minTimestamp,
        maxValue: maxTimestamp,
        received: request.timestamp
      }
    };
  }

  return { valid: true };
}

async function performTimezoneConversion(request: TimezoneConversionRequest): Promise<any> {
  // Normalize timezone identifiers
  const fromTimezone = normalizeTimezone(request.fromTimezone);
  const toTimezone = normalizeTimezone(request.toTimezone);

  // Get timezone information
  const fromTimezoneInfo = getTimezoneInfo(fromTimezone, request.timestamp);
  const toTimezoneInfo = getTimezoneInfo(toTimezone, request.timestamp);

  // Calculate the converted timestamp
  const originalDate = new Date(request.timestamp * 1000);
  
  // Create date in source timezone
  const fromDate = new Date(originalDate.toLocaleString('en-US', { timeZone: fromTimezone }));
  
  // Convert to target timezone
  const toDate = new Date(originalDate.toLocaleString('en-US', { timeZone: toTimezone }));
  
  // Calculate offset difference
  const offsetDifference = (toDate.getTime() - fromDate.getTime()) / (1000 * 60); // in minutes

  // Generate formats
  const formats = generateFormats(originalDate, toTimezone, request.formats);

  return {
    originalTimestamp: request.timestamp,
    convertedTimestamp: Math.floor(toDate.getTime() / 1000),
    fromTimezone: fromTimezoneInfo,
    toTimezone: toTimezoneInfo,
    offsetDifference,
    formats
  };
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

  // Try to match common patterns
  const upperTimezone = timezone.toUpperCase();
  
  // Handle UTC variations
  if (['UTC', 'GMT', 'Z'].includes(upperTimezone)) {
    return 'UTC';
  }

  // Handle offset formats like +05:30, -08:00
  const offsetMatch = timezone.match(/^([+-])(\d{1,2}):?(\d{2})?$/);
  if (offsetMatch) {
    // For now, return as-is - in a real implementation, you'd map to appropriate timezone
    return timezone;
  }

  // Default to treating as IANA timezone identifier
  return timezone;
}

function getTimezoneInfo(timezone: string, timestamp: number): TimezoneInfo {
  try {
    const date = new Date(timestamp * 1000);
    
    // Get timezone offset
    const tempDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const offset = (tempDate.getTime() - utcDate.getTime()) / (1000 * 60); // in minutes

    // Check if DST is in effect (simplified check)
    const januaryDate = new Date(date.getFullYear(), 0, 1);
    const julyDate = new Date(date.getFullYear(), 6, 1);
    const januaryOffset = getTimezoneOffset(timezone, januaryDate);
    const julyOffset = getTimezoneOffset(timezone, julyDate);
    const isDST = offset !== Math.max(januaryOffset, julyOffset);

    return {
      identifier: timezone,
      displayName: getTimezoneDisplayName(timezone),
      currentOffset: offset,
      isDST,
      aliases: getTimezoneAliases(timezone)
    };
  } catch (error) {
    // Fallback for invalid timezones
    return {
      identifier: timezone,
      displayName: timezone,
      currentOffset: 0,
      isDST: false
    };
  }
}

function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    const tempDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    return (tempDate.getTime() - utcDate.getTime()) / (1000 * 60);
  } catch (error) {
    return 0;
  }
}

function getTimezoneDisplayName(timezone: string): string {
  try {
    // Try to get a human-readable name
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

function getTimezoneAliases(timezone: string): string[] {
  const aliases: string[] = [];
  
  // Find aliases that map to this timezone
  for (const [alias, target] of Object.entries(TIMEZONE_ALIASES)) {
    if (target === timezone) {
      aliases.push(alias);
    }
  }
  
  return aliases;
}

function generateFormats(date: Date, timezone: string, requestedFormats?: string[]): Record<string, string> {
  const formats: Record<string, string> = {};
  const defaultFormats = ['iso', 'unix', 'human', 'local'];
  const formatsToGenerate = requestedFormats || defaultFormats;

  for (const format of formatsToGenerate) {
    try {
      switch (format) {
        case 'iso':
          formats[format] = date.toISOString();
          break;
        case 'unix':
          formats[format] = Math.floor(date.getTime() / 1000).toString();
          break;
        case 'human':
          formats[format] = date.toLocaleString('en-US', {
            timeZone: timezone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          break;
        case 'local':
          formats[format] = date.toLocaleString('en-US', { timeZone: timezone });
          break;
        case 'date':
          formats[format] = date.toLocaleDateString('en-US', { timeZone: timezone });
          break;
        case 'time':
          formats[format] = date.toLocaleTimeString('en-US', { timeZone: timezone });
          break;
        default:
          // Try to use the format as a locale option
          formats[format] = date.toLocaleString('en-US', { timeZone: timezone });
      }
    } catch (error) {
      formats[format] = `Error: ${(error as Error).message}`;
    }
  }

  return formats;
}