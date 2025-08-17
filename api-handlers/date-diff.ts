// Date difference calculation API

import { CacheManager } from './cache-utils';
import { SecurityManager, RATE_LIMITS } from './security';
import { recordAnalyticsMiddleware } from './analytics-api';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  REDIS_ENABLED?: string;
}

interface DateDiffRequest {
  startDate: string;
  endDate: string;
  unit?:
    | 'milliseconds'
    | 'seconds'
    | 'minutes'
    | 'hours'
    | 'days'
    | 'weeks'
    | 'months'
    | 'years'
    | 'all';
  absolute?: boolean;
  includeTime?: boolean;
}

interface _DateDiffResponse {
  success: boolean;
  data: {
    startDate: string;
    endDate: string;
    difference: {
      milliseconds: number;
      seconds: number;
      minutes: number;
      hours: number;
      days: number;
      weeks: number;
      months: number;
      years: number;
    };
    humanReadable: string;
    direction: 'future' | 'past';
    absolute: boolean;
  };
  metadata: {
    timestamp: string;
    processingTime: string;
    cached: boolean;
  };
}

export async function handleDateDiff(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();
  const securityManager = new SecurityManager(_env);
  const cacheManager = new CacheManager(_env);

  // Apply security middleware
  const securityCheck = await securityManager.checkRateLimit(_request, RATE_LIMITS.API_GENERAL);
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

  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only GET and POST methods are supported',
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    let params: DateDiffRequest;

    if (request.method === 'GET') {
      const url = new URL(request.url);
      params = {
        startDate: url.searchParams.get('startDate') || '',
        endDate: url.searchParams.get('endDate') || '',
        unit: (url.searchParams.get('unit') as any) || 'all',
        absolute: url.searchParams.get('absolute') !== 'false',
        includeTime: url.searchParams.get('includeTime') === 'true',
      };
    } else {
      const body = await request.json();
      params = {
        unit: 'all',
        absolute: true,
        includeTime: false,
        ...body,
      };
    }

    // Validate input
    const validation = securityManager.validateInput(params, {
      startDate: { required: true, type: 'string' },
      endDate: { required: true, type: 'string' },
      unit: { type: 'string' },
    });

    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid input parameters',
          details: validation.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate cache key
    const cacheKey = JSON.stringify(params);

    // Try to get cached result
    const cachedResult = await cacheManager.get('CONVERT_API', cacheKey);
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

      recordAnalyticsMiddleware(_request, response, _env, startTime);
      return response;
    }

    // Calculate date difference
    const result = calculateDateDifference(params);

    // Cache the result
    try {
      await cacheManager.set('CONVERT_API', cacheKey, result);
    } catch (error) {
      console.error('Failed to cache date diff result:', error);
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

    recordAnalyticsMiddleware(_request, response, _env, startTime);
    return response;
  } catch (error) {
    console.error('Date diff API error:', error);

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

    recordAnalyticsMiddleware(_request, response, _env, startTime);
    return response;
  }
}

function calculateDateDifference(params: DateDiffRequest): any {
  // Parse dates
  let startDate: Date;
  let endDate: Date;

  try {
    startDate = new Date(params.startDate);
    endDate = new Date(params.endDate);
  } catch (error) {
    throw new Error('Invalid date format');
  }

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format');
  }

  // Calculate raw difference in milliseconds
  const rawDiff = endDate.getTime() - startDate.getTime();
  const absoluteDiff = Math.abs(rawDiff);
  const direction = rawDiff >= 0 ? 'future' : 'past';

  // Use absolute value if requested
  const diff = params.absolute ? absoluteDiff : rawDiff;

  // Calculate all units
  const milliseconds = diff;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);

  // Calculate months and years more accurately
  let months = 0;
  let years = 0;

  if (params.includeTime) {
    // Simple calculation for months and years
    months = Math.floor(days / 30.44); // Average days per month
    years = Math.floor(days / 365.25); // Average days per year
  } else {
    // More accurate calculation using date arithmetic
    const tempStart = new Date(startDate);
    const tempEnd = new Date(endDate);

    // Calculate years
    years = tempEnd.getFullYear() - tempStart.getFullYear();

    // Calculate months
    months =
      (tempEnd.getFullYear() - tempStart.getFullYear()) * 12 +
      (tempEnd.getMonth() - tempStart.getMonth());

    // Adjust if end day is before start day in the month
    if (tempEnd.getDate() < tempStart.getDate()) {
      months--;
    }

    // Adjust years based on months
    years = Math.floor(months / 12);
  }

  // Generate human readable string
  const humanReadable = generateHumanReadable(absoluteDiff, direction, params.absolute);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    difference: {
      milliseconds,
      seconds,
      minutes,
      hours,
      days,
      weeks,
      months: Math.abs(months),
      years: Math.abs(years),
    },
    humanReadable,
    direction,
    absolute: params.absolute || false,
  };
}

function generateHumanReadable(diff: number, direction: string, absolute: boolean): string {
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  }
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }
  if (seconds > 0 && parts.length < 2) {
    // Only show seconds if not too many other units
    parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'Less than a second';
  }

  let result = parts.slice(0, 2).join(', '); // Show max 2 units

  if (!absolute && direction === 'past') {
    result += ' ago';
  } else if (!absolute && direction === 'future') {
    result = `in ${result}`;
  }

  return result;
}
