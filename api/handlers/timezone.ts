import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders, validateRequest } from '../utils/response';

interface TimezoneRequest {
  action: 'convert' | 'info' | 'list' | 'difference' | 'current';
  timezone?: string;
  timestamp?: number;
  fromTimezone?: string;
  toTimezone?: string;
  region?: string;
  search?: string;
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
    let timezoneRequest: TimezoneRequest;

    if (req.method === 'GET') {
      timezoneRequest = {
        action: (['info', 'current', 'list', 'convert', 'difference'].includes(req.query.action as string)) 
          ? req.query.action as 'info' | 'current' | 'list' | 'convert' | 'difference' 
          : 'current',
        timezone: req.query.timezone as string,
        timestamp: req.query.timestamp ? parseInt(req.query.timestamp as string) : undefined,
        fromTimezone: req.query.from as string,
        toTimezone: req.query.to as string,
        region: req.query.region as string,
        search: req.query.search as string
      };
    } else {
      // Validate request body for POST
      const validation = validateRequest(req);
      if (!validation.valid) {
        return APIErrorHandler.handleValidationError(res, validation);
      }

      timezoneRequest = req.body;
    }

    // Validate timezone request
    const validationResult = validateTimezoneRequest(timezoneRequest);
    if (!validationResult.valid) {
      return APIErrorHandler.handleBadRequest(res, validationResult.message || 'Invalid request', validationResult.details);
    }

    // Process timezone request based on action
    const result = await processTimezoneRequest(timezoneRequest);

    APIErrorHandler.sendSuccess(res, result, {
      processingTime: Date.now() - startTime,
      itemCount: Array.isArray(result.data) ? result.data.length : 1,
      cacheHit: false
    });

  } catch (error) {
    console.error('Timezone handler error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'timezone',
      action: req.body?.action || req.query?.action
    });
  }
}

function validateTimezoneRequest(request: TimezoneRequest): { valid: boolean; message?: string; details?: any } {
  const validActions = ['convert', 'info', 'list', 'difference', 'current'];
  
  if (!request.action || !validActions.includes(request.action)) {
    return {
      valid: false,
      message: 'Invalid or missing action',
      details: {
        validActions,
        received: request.action
      }
    };
  }

  // Validate action-specific requirements
  switch (request.action) {
    case 'convert':
      if (!request.fromTimezone || !request.toTimezone) {
        return {
          valid: false,
          message: 'Convert action requires fromTimezone and toTimezone',
          details: {
            required: ['fromTimezone', 'toTimezone'],
            received: {
              fromTimezone: !!request.fromTimezone,
              toTimezone: !!request.toTimezone
            }
          }
        };
      }
      break;

    case 'info':
      if (!request.timezone) {
        return {
          valid: false,
          message: 'Info action requires timezone parameter',
          details: { required: ['timezone'] }
        };
      }
      break;

    case 'difference':
      if (!request.fromTimezone || !request.toTimezone) {
        return {
          valid: false,
          message: 'Difference action requires fromTimezone and toTimezone',
          details: {
            required: ['fromTimezone', 'toTimezone'],
            received: {
              fromTimezone: !!request.fromTimezone,
              toTimezone: !!request.toTimezone
            }
          }
        };
      }
      break;
  }

  // Validate timestamp if provided
  if (request.timestamp && (typeof request.timestamp !== 'number' || isNaN(request.timestamp) || !isFinite(request.timestamp))) {
    return {
      valid: false,
      message: 'timestamp must be a valid number',
      details: {
        field: 'timestamp',
        received: typeof request.timestamp,
        value: request.timestamp
      }
    };
  }

  return { valid: true };
}

async function processTimezoneRequest(request: TimezoneRequest): Promise<any> {
  const timestamp = request.timestamp || Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000);

  switch (request.action) {
    case 'current':
      return await getCurrentTimezoneInfo(date);

    case 'info':
      return await getTimezoneInfo(request.timezone!, date);

    case 'list':
      return await getTimezoneList(request.region, request.search);

    case 'convert':
      return await convertBetweenTimezones(
        timestamp,
        request.fromTimezone!,
        request.toTimezone!
      );

    case 'difference':
      return await calculateTimezoneDifference(
        request.fromTimezone!,
        request.toTimezone!,
        timestamp
      );

    default:
      throw new Error(`Unsupported action: ${request.action}`);
  }
}

async function getCurrentTimezoneInfo(date: Date): Promise<any> {
  // Get system timezone
  const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return {
    action: 'current',
    data: {
      systemTimezone,
      utcTime: date.toISOString(),
      localTime: date.toLocaleString(),
      timestamp: Math.floor(date.getTime() / 1000),
      offset: -date.getTimezoneOffset(), // Convert to minutes from UTC
      offsetString: formatOffset(-date.getTimezoneOffset())
    }
  };
}

async function getTimezoneInfo(timezone: string, date: Date): Promise<any> {
  try {
    const normalizedTimezone = normalizeTimezone(timezone);
    const offset = getTimezoneOffset(normalizedTimezone, date);
    const isDST = isDaylightSavingTime(normalizedTimezone, date);
    const displayName = getTimezoneDisplayName(normalizedTimezone);

    const tzTime = date.toLocaleString('en-US', { 
      timeZone: normalizedTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    return {
      action: 'info',
      data: {
        timezone: normalizedTimezone,
        displayName,
        currentTime: tzTime,
        offset,
        offsetString: formatOffset(offset),
        isDST,
        utcTime: date.toISOString(),
        timestamp: Math.floor(date.getTime() / 1000)
      }
    };
  } catch (error) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

async function getTimezoneList(region?: string, search?: string): Promise<any> {
  // Common timezones grouped by region
  const timezones = {
    'North America': [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Phoenix',
      'America/Anchorage',
      'Pacific/Honolulu'
    ],
    'Europe': [
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Rome',
      'Europe/Madrid',
      'Europe/Amsterdam',
      'Europe/Moscow'
    ],
    'Asia': [
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Kolkata',
      'Asia/Dubai',
      'Asia/Singapore',
      'Asia/Seoul'
    ],
    'Australia': [
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Perth'
    ],
    'UTC': ['UTC']
  };

  let filteredTimezones = { ...timezones };

  // Filter by region
  if (region) {
    const regionKey = Object.keys(timezones).find(
      key => key.toLowerCase().includes(region.toLowerCase())
    );
    if (regionKey && regionKey in timezones) {
      filteredTimezones = { 
        [regionKey]: timezones[regionKey as keyof typeof timezones] 
      } as typeof timezones;
    } else {
      filteredTimezones = {
        'North America': [],
        'Europe': [],
        'Asia': [],
        'Australia': [],
        'UTC': []
      };
    }
  }

  // Filter by search term
  if (search) {
    const searchLower = search.toLowerCase();
    Object.keys(filteredTimezones).forEach(regionKey => {
      filteredTimezones[regionKey as keyof typeof filteredTimezones] = 
        filteredTimezones[regionKey as keyof typeof filteredTimezones].filter(tz =>
          tz.toLowerCase().includes(searchLower)
        );
      
      // Remove empty regions
      if (filteredTimezones[regionKey as keyof typeof filteredTimezones].length === 0) {
        delete filteredTimezones[regionKey as keyof typeof filteredTimezones];
      }
    });
  }

  // Add current time for each timezone
  const now = new Date();
  const enrichedTimezones: any = {};

  for (const [regionKey, tzList] of Object.entries(filteredTimezones)) {
    enrichedTimezones[regionKey] = tzList.map(tz => ({
      identifier: tz,
      displayName: getTimezoneDisplayName(tz),
      currentTime: now.toLocaleString('en-US', { timeZone: tz }),
      offset: getTimezoneOffset(tz, now),
      offsetString: formatOffset(getTimezoneOffset(tz, now)),
      isDST: isDaylightSavingTime(tz, now)
    }));
  }

  return {
    action: 'list',
    data: enrichedTimezones,
    metadata: {
      totalRegions: Object.keys(enrichedTimezones).length,
      totalTimezones: Object.values(enrichedTimezones).reduce((sum: number, tzList) => sum + (Array.isArray(tzList) ? tzList.length : 0), 0),
      filters: { region, search }
    }
  };
}

async function convertBetweenTimezones(timestamp: number, fromTimezone: string, toTimezone: string): Promise<any> {
  const date = new Date(timestamp * 1000);
  const normalizedFrom = normalizeTimezone(fromTimezone);
  const normalizedTo = normalizeTimezone(toTimezone);

  const fromTime = date.toLocaleString('en-US', { timeZone: normalizedFrom });
  const toTime = date.toLocaleString('en-US', { timeZone: normalizedTo });

  const fromOffset = getTimezoneOffset(normalizedFrom, date);
  const toOffset = getTimezoneOffset(normalizedTo, date);
  const offsetDifference = toOffset - fromOffset;

  return {
    action: 'convert',
    data: {
      originalTimestamp: timestamp,
      fromTimezone: {
        identifier: normalizedFrom,
        time: fromTime,
        offset: fromOffset,
        offsetString: formatOffset(fromOffset)
      },
      toTimezone: {
        identifier: normalizedTo,
        time: toTime,
        offset: toOffset,
        offsetString: formatOffset(toOffset)
      },
      difference: {
        minutes: offsetDifference,
        hours: Math.floor(Math.abs(offsetDifference) / 60),
        description: offsetDifference === 0 
          ? 'Same timezone'
          : offsetDifference > 0 
            ? `${Math.floor(Math.abs(offsetDifference) / 60)}h ${Math.abs(offsetDifference) % 60}m ahead`
            : `${Math.floor(Math.abs(offsetDifference) / 60)}h ${Math.abs(offsetDifference) % 60}m behind`
      }
    }
  };
}

async function calculateTimezoneDifference(timezone1: string, timezone2: string, timestamp: number): Promise<any> {
  const date = new Date(timestamp * 1000);
  const tz1 = normalizeTimezone(timezone1);
  const tz2 = normalizeTimezone(timezone2);

  const offset1 = getTimezoneOffset(tz1, date);
  const offset2 = getTimezoneOffset(tz2, date);
  const difference = offset2 - offset1;

  return {
    action: 'difference',
    data: {
      timezone1: {
        identifier: tz1,
        offset: offset1,
        offsetString: formatOffset(offset1)
      },
      timezone2: {
        identifier: tz2,
        offset: offset2,
        offsetString: formatOffset(offset2)
      },
      difference: {
        minutes: difference,
        hours: Math.floor(Math.abs(difference) / 60),
        description: difference === 0 
          ? 'Same timezone'
          : difference > 0 
            ? `${tz2} is ${Math.floor(Math.abs(difference) / 60)}h ${Math.abs(difference) % 60}m ahead of ${tz1}`
            : `${tz2} is ${Math.floor(Math.abs(difference) / 60)}h ${Math.abs(difference) % 60}m behind ${tz1}`
      },
      timestamp
    }
  };
}

// Helper functions
function normalizeTimezone(timezone: string): string {
  const aliases: Record<string, string> = {
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

  return aliases[timezone.toUpperCase()] || timezone;
}

function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  } catch (error) {
    return 0;
  }
}

function isDaylightSavingTime(timezone: string, date: Date): boolean {
  try {
    const januaryOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 0, 1));
    const julyOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 6, 1));
    const currentOffset = getTimezoneOffset(timezone, date);
    
    return currentOffset !== Math.max(januaryOffset, julyOffset);
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

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}