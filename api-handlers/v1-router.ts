console.log('Loading v1-router.ts handler...');
// Cloudflare Pages adapter for v1 API routes

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

export async function handleV1Routes(
  request: Request,
  env: Env,
  path: string[]
): Promise<Response> {
  const endpoint = path[0] || '';

  switch (endpoint) {
    case 'convert':
      return handleV1Convert(request, env);
    case 'batch':
      return handleV1Batch(request, env);
    case 'formats':
      return handleV1Formats(request, env);
    case 'timezones':
      return handleV1Timezones(request, env);
    case 'health':
      return handleV1Health(request, env);
    default:
      return new Response(
        JSON.stringify({
          error: 'Not Found',
          message: `V1 API endpoint /${path.join('/')} not found`,
          availableEndpoints: ['convert', 'batch', 'formats', 'timezones', 'health'],
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
  }
}

async function handleV1Convert(request: Request, _env: Env): Promise<Response> {
  // Enhanced convert with more features
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only POST method is supported for v1/convert',
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json();
    const {
      timestamp,
      outputFormats = [],
      _timezone,
      targetTimezone,
      includeMetadata = false,
    } = body;

    if (!timestamp || isNaN(timestamp)) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Valid timestamp is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const date = new Date(timestamp * 1000);

    const result: any = {
      input: { timestamp, _timezone, targetTimezone },
      output: {
        timestamp,
        iso: date.toISOString(),
        utc: date.toUTCString(),
        local: date.toLocaleString(),
        unix: timestamp,
        milliseconds: timestamp * 1000,
      },
    };

    // Add custom formats
    if (outputFormats.length > 0) {
      result.output.formats = {};
      for (const format of outputFormats) {
        try {
          result.output.formats[format] = date.toLocaleString('en-US', { timeZone: format });
        } catch (error) {
          result.output.formats[format] = 'Invalid format';
        }
      }
    }

    if (includeMetadata) {
      result.metadata = {
        processingTime: `${Date.now() % 1000}ms`,
        timestamp: new Date().toISOString(),
        version: 'v1',
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleV1Batch(request: Request, _env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only POST method is supported for v1/batch',
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json();
    const { timestamps, _outputFormats = [] } = body;

    if (!Array.isArray(timestamps) || timestamps.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Array of timestamps is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (timestamps.length > 100) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Maximum 100 timestamps allowed per batch',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const results = timestamps.map((timestamp: number) => {
      if (!timestamp || isNaN(timestamp)) {
        return { error: 'Invalid timestamp', timestamp };
      }

      const date = new Date(timestamp * 1000);
      return {
        timestamp,
        iso: date.toISOString(),
        utc: date.toUTCString(),
        local: date.toLocaleString(),
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results,
          count: results.length,
          processed: results.filter(r => !r.error).length,
          errors: results.filter(r => r.error).length,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleV1Formats(_request: Request, _env: Env): Promise<Response> {
  const formats = {
    timestamp: 'Unix timestamp (seconds since epoch)',
    milliseconds: 'Milliseconds since epoch',
    iso: 'ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
    utc: 'UTC string format',
    local: 'Local string format',
    custom: 'Custom timezone-specific format',
  };

  return new Response(
    JSON.stringify({
      success: true,
      data: { formats },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

async function handleV1Timezones(_request: Request, _env: Env): Promise<Response> {
  // Basic timezone list (you can expand this)
  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  return new Response(
    JSON.stringify({
      success: true,
      data: { timezones, count: timezones.length },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

async function handleV1Health(_request: Request, _env: Env): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      version: 'v1',
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
