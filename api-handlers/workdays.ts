// Workdays calculation API

import { CacheManager } from './cache-utils';
import { SecurityManager, RATE_LIMITS } from './security';
import { recordAnalyticsMiddleware } from './analytics-api';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  REDIS_ENABLED?: string;
}

interface WorkdaysRequest {
  startDate: string;
  endDate?: string;
  days?: number;
  excludeWeekends?: boolean;
  excludeHolidays?: boolean;
  holidays?: string[];
  country?: string;
  includeStartDate?: boolean;
  includeEndDate?: boolean;
}

interface _WorkdaysResponse {
  success: boolean;
  data: {
    startDate: string;
    endDate: string;
    totalDays: number;
    workdays: number;
    weekends: number;
    holidays: number;
    excludedDates: string[];
    businessDaysOnly: number;
  };
  metadata: {
    timestamp: string;
    processingTime: string;
    cached: boolean;
  };
}

// Common holidays by country (simplified)
const COMMON_HOLIDAYS: Record<string, string[]> = {
  US: [
    '2024-01-01',
    '2024-07-04',
    '2024-12-25', // New Year, Independence Day, Christmas
    '2025-01-01',
    '2025-07-04',
    '2025-12-25',
  ],
  UK: [
    '2024-01-01',
    '2024-12-25',
    '2024-12-26', // New Year, Christmas, Boxing Day
    '2025-01-01',
    '2025-12-25',
    '2025-12-26',
  ],
  CN: [
    '2024-01-01',
    '2024-02-10',
    '2024-10-01', // New Year, Spring Festival, National Day
    '2025-01-01',
    '2025-01-29',
    '2025-10-01',
  ],
};

export async function handleWorkdays(request: Request, env: Env): Promise<Response> {
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
    let params: WorkdaysRequest;

    if (request.method === 'GET') {
      const url = new URL(request.url);
      params = {
        startDate: url.searchParams.get('startDate') || '',
        endDate: url.searchParams.get('endDate') || undefined,
        days: url.searchParams.get('days') ? parseInt(url.searchParams.get('days')!) : undefined,
        excludeWeekends: url.searchParams.get('excludeWeekends') !== 'false',
        excludeHolidays: url.searchParams.get('excludeHolidays') === 'true',
        country: url.searchParams.get('country') || undefined,
        includeStartDate: url.searchParams.get('includeStartDate') !== 'false',
        includeEndDate: url.searchParams.get('includeEndDate') !== 'false',
      };
    } else {
      const body = await request.json();
      params = {
        excludeWeekends: true,
        excludeHolidays: false,
        includeStartDate: true,
        includeEndDate: true,
        ...body,
      };
    }

    // Validate input
    const validation = securityManager.validateInput(params, {
      startDate: { required: true, type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/ },
      endDate: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/ },
      days: { type: 'number', min: 1, max: 3650 }, // Max 10 years
      country: { type: 'string', maxLength: 2 },
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

      // Record analytics
      recordAnalyticsMiddleware(_request, response, _env, startTime);
      return response;
    }

    // Calculate workdays
    const result = calculateWorkdays(params);

    // Cache the result
    try {
      await cacheManager.set('CONVERT_API', cacheKey, result);
    } catch (error) {
      console.error('Failed to cache workdays result:', error);
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

    // Record analytics
    recordAnalyticsMiddleware(_request, response, _env, startTime);
    return response;
  } catch (error) {
    console.error('Workdays API error:', error);

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

function calculateWorkdays(params: WorkdaysRequest): any {
  const startDate = new Date(params.startDate);
  let endDate: Date;

  // Determine end date
  if (params.endDate) {
    endDate = new Date(params.endDate);
  } else if (params.days) {
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + params.days - 1);
  } else {
    throw new Error('Either endDate or days parameter is required');
  }

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format');
  }

  if (endDate < startDate) {
    throw new Error('End date must be after start date');
  }

  // Get holidays
  const holidays =
    params.holidays || (params.country ? COMMON_HOLIDAYS[params.country.toUpperCase()] || [] : []);
  const holidaySet = new Set(holidays);

  // Calculate days
  let totalDays = 0;
  let workdays = 0;
  let weekends = 0;
  let holidayCount = 0;
  const excludedDates: string[] = [];

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

    totalDays++;

    let isExcluded = false;

    // Check if weekend
    if (params.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      weekends++;
      isExcluded = true;
      excludedDates.push(`${dateStr} (weekend)`);
    }

    // Check if holiday
    if (params.excludeHolidays && holidaySet.has(dateStr)) {
      holidayCount++;
      isExcluded = true;
      excludedDates.push(`${dateStr} (holiday)`);
    }

    // Count as workday if not excluded
    if (!isExcluded) {
      workdays++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate business days (excluding weekends only)
  let businessDaysOnly = 0;
  const businessDate = new Date(startDate);
  while (businessDate <= endDate) {
    const dayOfWeek = businessDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysOnly++;
    }
    businessDate.setDate(businessDate.getDate() + 1);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    totalDays,
    workdays,
    weekends,
    holidays: holidayCount,
    excludedDates,
    businessDaysOnly,
  };
}
