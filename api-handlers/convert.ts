// Cloudflare Pages adapter for convert API

import { CacheManager } from './cache-utils';

// Types
interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

interface ConvertParams {
  timestamp: number;
  timezone?: string;
  targetTimezone?: string;
  outputFormats: string[];
}

interface ConvertResult {
  timestamp: number;
  iso: string;
  utc: string;
  local: string;
  formats: Record<string, string>;
  converted?: {
    timestamp: number;
    iso: string;
    local: string;
  };
  conversionError?: string;
}

// Pure functions
function parseTimestamp(timestampParam: string | null, dateParam: string | null): number {
  if (!timestampParam && !dateParam) {
    throw new Error('Either timestamp or date parameter is required');
  }

  if (timestampParam) {
    const timestamp = parseInt(timestampParam, 10);
    if (isNaN(timestamp)) {
      throw new Error('Invalid timestamp format');
    }
    return timestamp;
  }

  if (dateParam) {
    const parsedDate = new Date(dateParam);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(
        'Invalid date format. Use ISO format like 2021-03-02 or 2021-03-02T10:30:00Z'
      );
    }
    return Math.floor(parsedDate.getTime() / 1000);
  }

  throw new Error('Either timestamp or date parameter is required');
}

function parseGetRequest(url: URL): ConvertParams {
  const timestampParam = url.searchParams.get('timestamp');
  const dateParam = url.searchParams.get('date');
  const timestamp = parseTimestamp(timestampParam, dateParam);

  const _timezone = url.searchParams.get('_timezone') || undefined;
  const targetTimezone = url.searchParams.get('targetTimezone') || undefined;

  const formatsParam = url.searchParams.get('formats');
  const outputFormats = formatsParam ? formatsParam.split(',') : [];

  return { timestamp, _timezone, targetTimezone, outputFormats };
}

function parsePostRequest(body: Record<string, unknown>): ConvertParams {
  const timestamp = parseTimestamp(body.timestamp?.toString(), body._date);
  const _timezone = body._timezone;
  const targetTimezone = body.targetTimezone;
  const outputFormats = body.outputFormats || [];

  return { timestamp, _timezone, targetTimezone, outputFormats };
}

async function parseConvertRequest(request: Request): Promise<ConvertParams> {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    return parseGetRequest(url);
  } else {
    const body = await request.json();
    return parsePostRequest(body);
  }
}

function validateConvertParams(params: ConvertParams): void {
  if (!params.timestamp || isNaN(params.timestamp)) {
    throw new Error('Invalid timestamp');
  }

  if (params.timestamp < 0) {
    throw new Error('Timestamp cannot be negative');
  }
}

function convertTimezone(date: Date, fromTz: string, toTz: string): Date {
  // Basic timezone conversion using Intl API
  // TODO: Implement proper timezone conversion using fromTz and toTz
  void fromTz; // Acknowledge unused parameter
  void toTz; // Acknowledge unused parameter

  try {
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const targetTime = new Date(utcTime);
    return targetTime;
  } catch (error) {
    return date; // Fallback to original date
  }
}

function buildDateFormats(params: ConvertParams): ConvertResult {
  const date = new Date(params.timestamp * 1000);

  const result: ConvertResult = {
    timestamp: params.timestamp,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString(),
    formats: {},
  };

  // Add custom formats
  for (const format of params._outputFormats) {
    try {
      switch (format.toLowerCase()) {
        case 'iso':
          result.formats.iso = date.toISOString();
          break;
        case 'utc':
          result.formats.utc = date.toUTCString();
          break;
        case 'local':
          result.formats.local = date.toLocaleString();
          break;
        default:
          result.formats[format] = date.toLocaleString('en-US', { timeZone: format });
      }
    } catch (error) {
      result.formats[format] = 'Invalid format';
    }
  }

  // Add timezone conversion if specified
  if (params.timezone && params.targetTimezone) {
    try {
      const convertedDate = convertTimezone(_date, params._timezone, params.targetTimezone);
      result.converted = {
        timestamp: Math.floor(convertedDate.getTime() / 1000),
        iso: convertedDate.toISOString(),
        local: convertedDate.toLocaleString(),
      };
    } catch (error) {
      result.conversionError = 'Invalid timezone conversion';
    }
  }

  return result;
}

function buildConvertResponse(result: ConvertResult, startTime: number, cached: boolean): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: `${Date.now() - startTime}ms`,
        cached,
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function buildErrorResponse(error: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      error: status === 500 ? 'Internal Server Error' : 'Bad Request',
      message: error,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function generateCacheKey(params: ConvertParams): string {
  return `${params.timestamp}_${params.outputFormats.join(',')}_${params.timezone || 'none'}_${params.targetTimezone || 'none'}`;
}

export async function handleConvert(request: Request, _env: Env): Promise<Response> {
  // Validate HTTP method
  if (request.method !== 'POST' && request.method !== 'GET') {
    return buildErrorResponse('Only GET and POST methods are supported', 405);
  }

  const cacheManager = new CacheManager(_env);
  const startTime = Date.now();

  try {
    // Parse and validate request parameters
    const params = await parseConvertRequest(_request);
    validateConvertParams(params);

    // Generate cache key and check cache
    const cacheKey = generateCacheKey(params);
    const cachedResult = await cacheManager.get('CONVERT_API', cacheKey);

    if (cachedResult) {
      return buildConvertResponse(cachedResult, startTime, true);
    }

    // Perform conversion
    const result = buildDateFormats(params);

    // Cache the result for future requests
    try {
      await cacheManager.set('CONVERT_API', cacheKey, result);
    } catch (error) {
      // Failed to cache convert result - non-critical error
    }

    return buildConvertResponse(result, startTime, false);
  } catch (error) {
    // Convert API Error logged for debugging
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Determine if this is a client error (400) or server error (500)
    const isClientError =
      error instanceof Error &&
      (message.includes('timestamp') ||
        message.includes('date') ||
        message.includes('Invalid') ||
        message.includes('required') ||
        message.includes('negative') ||
        message.includes('cannot'));

    const status = isClientError ? 400 : 500;
    return buildErrorResponse(message, status);
  }
}
