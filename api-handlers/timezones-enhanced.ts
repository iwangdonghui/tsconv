// Enhanced timezones API with search and detailed information

import { recordAnalyticsMiddleware } from './analytics-api';
import { CacheManager } from './cache-utils';
import { RATE_LIMITS, SecurityManager } from './security';
import { logError } from './utils/logger';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  REDIS_ENABLED?: string;
}

interface TimezoneInfo {
  id: string;
  name: string;
  abbreviation: string;
  offset: string;
  offsetMinutes: number;
  country: string;
  region: string;
  city: string;
  isDST: boolean;
  utcOffset: string;
}

interface ConversionResult {
  originalTimestamp: number;
  convertedTimestamp: number;
  fromTimezone: TimezoneInfo;
  toTimezone: TimezoneInfo;
  offsetDifference: number;
  originalDate: string;
  convertedDate: string;
}

interface ConversionResponse {
  success: boolean;
  result?: ConversionResult;
  error?: string;
}

// Comprehensive timezone data (subset for demo)
const TIMEZONE_DATA: TimezoneInfo[] = [
  {
    id: 'America/New_York',
    name: 'Eastern Time',
    abbreviation: 'EST/EDT',
    offset: '-05:00',
    offsetMinutes: -300,
    country: 'US',
    region: 'America',
    city: 'New York',
    isDST: false,
    utcOffset: 'UTC-5',
  },
  {
    id: 'America/Los_Angeles',
    name: 'Pacific Time',
    abbreviation: 'PST/PDT',
    offset: '-08:00',
    offsetMinutes: -480,
    country: 'US',
    region: 'America',
    city: 'Los Angeles',
    isDST: false,
    utcOffset: 'UTC-8',
  },
  {
    id: 'Europe/London',
    name: 'Greenwich Mean Time',
    abbreviation: 'GMT/BST',
    offset: '+00:00',
    offsetMinutes: 0,
    country: 'GB',
    region: 'Europe',
    city: 'London',
    isDST: false,
    utcOffset: 'UTC+0',
  },
  {
    id: 'Europe/Paris',
    name: 'Central European Time',
    abbreviation: 'CET/CEST',
    offset: '+01:00',
    offsetMinutes: 60,
    country: 'FR',
    region: 'Europe',
    city: 'Paris',
    isDST: false,
    utcOffset: 'UTC+1',
  },
  {
    id: 'Asia/Tokyo',
    name: 'Japan Standard Time',
    abbreviation: 'JST',
    offset: '+09:00',
    offsetMinutes: 540,
    country: 'JP',
    region: 'Asia',
    city: 'Tokyo',
    isDST: false,
    utcOffset: 'UTC+9',
  },
  {
    id: 'Asia/Shanghai',
    name: 'China Standard Time',
    abbreviation: 'CST',
    offset: '+08:00',
    offsetMinutes: 480,
    country: 'CN',
    region: 'Asia',
    city: 'Shanghai',
    isDST: false,
    utcOffset: 'UTC+8',
  },
  {
    id: 'Australia/Sydney',
    name: 'Australian Eastern Time',
    abbreviation: 'AEST/AEDT',
    offset: '+10:00',
    offsetMinutes: 600,
    country: 'AU',
    region: 'Australia',
    city: 'Sydney',
    isDST: false,
    utcOffset: 'UTC+10',
  },
  {
    id: 'UTC',
    name: 'Coordinated Universal Time',
    abbreviation: 'UTC',
    offset: '+00:00',
    offsetMinutes: 0,
    country: '',
    region: 'UTC',
    city: '',
    isDST: false,
    utcOffset: 'UTC+0',
  },
];

export async function handleTimezonesEnhanced(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();
  const securityManager = new SecurityManager(env);
  const cacheManager = new CacheManager(env);

  // Apply security middleware
  const securityCheck = await securityManager.checkRateLimit(request, RATE_LIMITS.API_GENERAL);
  if (!securityCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate Limit Exceeded',
        message: 'Too many requests. Please try again later.',
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only GET method is supported',
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const region = url.searchParams.get('region') || '';
    const country = url.searchParams.get('country') || '';
    const offset = url.searchParams.get('offset') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const format = url.searchParams.get('format') || 'detailed';

    // Generate cache key
    const cacheKey = `timezones:${query}:${region}:${country}:${offset}:${limit}:${format}`;

    // Try to get cached result
    const cachedResult = await cacheManager.get('TIMEZONES', cacheKey);
    if (cachedResult) {
      const response = new Response(
        JSON.stringify({
          success: true,
          data: cachedResult,
          metadata: {
            timestamp: new Date().toISOString(),
            processingTime: `${Date.now() - startTime}ms`,
            cached: true,
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      recordAnalyticsMiddleware(request, response, env, startTime);
      return response;
    }

    // Filter and search timezones
    let filteredTimezones = TIMEZONE_DATA;

    // Apply filters
    if (query) {
      const searchTerm = query.toLowerCase();
      filteredTimezones = filteredTimezones.filter(
        tz =>
          tz.id.toLowerCase().includes(searchTerm) ||
          tz.name.toLowerCase().includes(searchTerm) ||
          tz.city.toLowerCase().includes(searchTerm) ||
          tz.abbreviation.toLowerCase().includes(searchTerm)
      );
    }

    if (region) {
      filteredTimezones = filteredTimezones.filter(
        tz => tz.region.toLowerCase() === region.toLowerCase()
      );
    }

    if (country) {
      filteredTimezones = filteredTimezones.filter(
        tz => tz.country.toLowerCase() === country.toLowerCase()
      );
    }

    if (offset) {
      filteredTimezones = filteredTimezones.filter(
        tz => tz.offset === offset || tz.utcOffset.toLowerCase().includes(offset.toLowerCase())
      );
    }

    // Limit results
    const limitedTimezones = filteredTimezones.slice(0, Math.min(limit, 100));

    // Format results
    let result;
    if (format === 'simple') {
      result = {
        timezones: limitedTimezones.map(tz => ({
          id: tz.id,
          name: tz.name,
          offset: tz.offset,
        })),
        total: limitedTimezones.length,
        filtered: filteredTimezones.length,
      };
    } else {
      result = {
        timezones: limitedTimezones,
        total: limitedTimezones.length,
        filtered: filteredTimezones.length,
        regions: getUniqueRegions(),
        countries: getUniqueCountries(),
        offsets: getUniqueOffsets(),
        search: {
          query,
          region,
          country,
          offset,
          limit,
        },
      };
    }

    // Cache the result
    try {
      await cacheManager.set('TIMEZONES', cacheKey, result);
    } catch (error) {
      logError(
        'Failed to cache timezones result',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    const response = new Response(
      JSON.stringify({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: `${Date.now() - startTime}ms`,
          cached: false,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    recordAnalyticsMiddleware(request, response, env, startTime);
    return response;
  } catch (error) {
    logError('Timezones API error', error instanceof Error ? error : new Error(String(error)));

    const response = new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    recordAnalyticsMiddleware(request, response, env, startTime);
    return response;
  }
}

function getUniqueRegions(): string[] {
  return [...new Set(TIMEZONE_DATA.map(tz => tz.region))].filter(Boolean).sort();
}

function getUniqueCountries(): string[] {
  return [...new Set(TIMEZONE_DATA.map(tz => tz.country))].filter(Boolean).sort();
}

function getUniqueOffsets(): string[] {
  return [...new Set(TIMEZONE_DATA.map(tz => tz.offset))].sort();
}

// Helper function to get timezone info by ID
export function getTimezoneById(id: string): TimezoneInfo | null {
  return TIMEZONE_DATA.find(tz => tz.id === id) || null;
}

// Helper function to convert time between timezones
export function convertBetweenTimezones(
  timestamp: number,
  fromTimezone: string,
  toTimezone: string
): ConversionResponse {
  try {
    const fromTz = getTimezoneById(fromTimezone);
    const toTz = getTimezoneById(toTimezone);

    if (!fromTz || !toTz) {
      return { success: false, error: 'Invalid timezone ID' };
    }

    // Simple conversion (in real implementation, use proper timezone library)
    const offsetDiff = toTz.offsetMinutes - fromTz.offsetMinutes;
    const convertedTimestamp = timestamp + offsetDiff * 60;

    return {
      success: true,
      result: {
        originalTimestamp: timestamp,
        convertedTimestamp,
        fromTimezone: fromTz,
        toTimezone: toTz,
        offsetDifference: offsetDiff,
        originalDate: new Date(timestamp * 1000).toISOString(),
        convertedDate: new Date(convertedTimestamp * 1000).toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
