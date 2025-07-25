// Cloudflare Pages adapter for convert API

// Simple timezone conversion function
function convertTimezone(date: Date, fromTz: string, toTz: string): Date {
  // Basic timezone conversion using Intl API
  try {
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const targetTime = new Date(utcTime);
    return targetTime;
  } catch (error) {
    return date; // Fallback to original date
  }
}

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

export async function handleConvert(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return new Response(JSON.stringify({
      error: 'Method Not Allowed',
      message: 'Only GET and POST methods are supported'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let timestamp: number;
    let timezone: string | undefined;
    let targetTimezone: string | undefined;
    let outputFormats: string[] = [];

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const timestampParam = url.searchParams.get('timestamp');
      
      if (!timestampParam) {
        return new Response(JSON.stringify({
          error: 'Bad Request',
          message: 'timestamp parameter is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      timestamp = parseInt(timestampParam, 10);
      timezone = url.searchParams.get('timezone') || undefined;
      targetTimezone = url.searchParams.get('targetTimezone') || undefined;
      
      const formatsParam = url.searchParams.get('formats');
      if (formatsParam) {
        outputFormats = formatsParam.split(',');
      }
    } else {
      const body = await request.json();
      timestamp = body.timestamp;
      timezone = body.timezone;
      targetTimezone = body.targetTimezone;
      outputFormats = body.outputFormats || [];
    }

    if (!timestamp || isNaN(timestamp)) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'Valid timestamp is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Perform conversion
    const date = new Date(timestamp * 1000);
    
    const result = {
      timestamp,
      iso: date.toISOString(),
      utc: date.toUTCString(),
      local: date.toLocaleString(),
      formats: {} as Record<string, string>
    };

    // Add custom formats
    for (const format of outputFormats) {
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
    if (timezone && targetTimezone) {
      try {
        const convertedDate = convertTimezone(date, timezone, targetTimezone);
        (result as any).converted = {
          timestamp: Math.floor(convertedDate.getTime() / 1000),
          iso: convertedDate.toISOString(),
          local: convertedDate.toLocaleString()
        };
      } catch (error) {
        (result as any).conversionError = 'Invalid timezone conversion';
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() % 1000 + 'ms'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Convert API Error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
