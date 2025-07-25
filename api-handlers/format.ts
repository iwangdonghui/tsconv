// Custom format template API

import { CacheManager } from './cache-utils';
import { SecurityManager, RATE_LIMITS } from './security';
import { recordAnalyticsMiddleware } from './analytics-api';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  REDIS_ENABLED?: string;
}

interface FormatRequest {
  timestamp?: number;
  date?: string;
  format: string;
  timezone?: string;
  locale?: string;
}

// Predefined format templates
const FORMAT_TEMPLATES = {
  'iso': 'YYYY-MM-DDTHH:mm:ss.sssZ',
  'iso-date': 'YYYY-MM-DD',
  'iso-time': 'HH:mm:ss',
  'us-date': 'MM/DD/YYYY',
  'us-datetime': 'MM/DD/YYYY HH:mm:ss',
  'eu-date': 'DD/MM/YYYY',
  'eu-datetime': 'DD/MM/YYYY HH:mm:ss',
  'readable': 'MMMM Do, YYYY',
  'readable-full': 'dddd, MMMM Do, YYYY [at] h:mm A',
  'compact': 'YYYYMMDD',
  'compact-time': 'YYYYMMDDHHmmss',
  'unix': 'X',
  'unix-ms': 'x',
  'rfc2822': 'ddd, DD MMM YYYY HH:mm:ss ZZ',
  'sql': 'YYYY-MM-DD HH:mm:ss',
  'filename': 'YYYY-MM-DD_HH-mm-ss',
  'log': 'YYYY-MM-DD HH:mm:ss.SSS'
};

export async function handleFormat(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();
  const securityManager = new SecurityManager(env);
  const cacheManager = new CacheManager(env);

  // Apply security middleware
  const securityCheck = await securityManager.checkRateLimit(request, RATE_LIMITS.API_GENERAL);
  if (!securityCheck.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.'
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method Not Allowed',
      message: 'Only GET and POST methods are supported'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let params: FormatRequest;

    if (request.method === 'GET') {
      const url = new URL(request.url);
      
      // Special endpoint to list available templates
      if (url.pathname.endsWith('/templates')) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            templates: FORMAT_TEMPLATES,
            examples: generateTemplateExamples()
          },
          metadata: {
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime + 'ms'
          }
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      params = {
        timestamp: url.searchParams.get('timestamp') ? parseInt(url.searchParams.get('timestamp')!) : undefined,
        date: url.searchParams.get('date') || undefined,
        format: url.searchParams.get('format') || 'iso',
        timezone: url.searchParams.get('timezone') || undefined,
        locale: url.searchParams.get('locale') || 'en'
      };
    } else {
      const body = await request.json();
      params = {
        format: 'iso',
        locale: 'en',
        ...body
      };
    }

    // Validate input
    const validation = securityManager.validateInput(params, {
      format: { required: true, type: 'string', maxLength: 100 },
      timezone: { type: 'string', maxLength: 50 },
      locale: { type: 'string', maxLength: 10 }
    });

    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid input parameters',
        details: validation.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!params.timestamp && !params.date) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'Either timestamp or date parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate cache key
    const cacheKey = JSON.stringify(params);
    
    // Try to get cached result
    const cachedResult = await cacheManager.get('CONVERT_API', cacheKey);
    if (cachedResult) {
      const response = new Response(JSON.stringify({
        success: true,
        data: cachedResult,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime + 'ms',
          cached: true
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

      recordAnalyticsMiddleware(request, response, env, startTime);
      return response;
    }

    // Format the date
    const result = formatDate(params);

    // Cache the result
    try {
      await cacheManager.set('CONVERT_API', cacheKey, result);
    } catch (error) {
      console.error('Failed to cache format result:', error);
    }

    const response = new Response(JSON.stringify({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime + 'ms',
        cached: false
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

    recordAnalyticsMiddleware(request, response, env, startTime);
    return response;

  } catch (error) {
    console.error('Format API error:', error);
    
    const response = new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });

    recordAnalyticsMiddleware(request, response, env, startTime);
    return response;
  }
}

function formatDate(params: FormatRequest): any {
  // Get the date object
  let date: Date;
  
  if (params.timestamp) {
    date = new Date(params.timestamp * 1000);
  } else if (params.date) {
    date = new Date(params.date);
  } else {
    throw new Error('No date provided');
  }

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }

  // Get format template
  let formatString = params.format;
  if (FORMAT_TEMPLATES[params.format as keyof typeof FORMAT_TEMPLATES]) {
    formatString = FORMAT_TEMPLATES[params.format as keyof typeof FORMAT_TEMPLATES];
  }

  // Apply basic formatting (simplified implementation)
  const formatted = applyFormat(date, formatString, params.timezone, params.locale);

  return {
    input: {
      timestamp: params.timestamp,
      date: params.date,
      format: params.format,
      timezone: params.timezone,
      locale: params.locale
    },
    output: {
      formatted,
      formatString,
      originalDate: date.toISOString()
    },
    template: FORMAT_TEMPLATES[params.format as keyof typeof FORMAT_TEMPLATES] ? {
      name: params.format,
      pattern: FORMAT_TEMPLATES[params.format as keyof typeof FORMAT_TEMPLATES]
    } : null
  };
}

function applyFormat(date: Date, format: string, timezone?: string, locale?: string): string {
  // This is a simplified implementation
  // In a real application, you'd use a library like moment.js or date-fns
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  // Basic replacements
  let result = format
    .replace(/YYYY/g, year.toString())
    .replace(/MM/g, month.toString().padStart(2, '0'))
    .replace(/DD/g, day.toString().padStart(2, '0'))
    .replace(/HH/g, hours.toString().padStart(2, '0'))
    .replace(/mm/g, minutes.toString().padStart(2, '0'))
    .replace(/ss/g, seconds.toString().padStart(2, '0'))
    .replace(/SSS/g, milliseconds.toString().padStart(3, '0'))
    .replace(/sss/g, milliseconds.toString().padStart(3, '0'));

  // Handle special cases
  if (format === 'X') {
    return Math.floor(date.getTime() / 1000).toString();
  }
  if (format === 'x') {
    return date.getTime().toString();
  }

  // Handle timezone offset
  if (result.includes('Z')) {
    result = result.replace(/Z/g, 'Z');
  }

  return result;
}

function generateTemplateExamples(): Record<string, string> {
  const now = new Date();
  const examples: Record<string, string> = {};

  for (const [name, template] of Object.entries(FORMAT_TEMPLATES)) {
    try {
      examples[name] = applyFormat(now, template);
    } catch (error) {
      examples[name] = 'Error formatting';
    }
  }

  return examples;
}
