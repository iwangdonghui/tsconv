// Cloudflare Pages adapter for now API

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

export async function handleNow(request: Request, env: Env): Promise<Response> {
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
    const timezone = url.searchParams.get('timezone');
    const format = url.searchParams.get('format') || 'all';

    const now = new Date();
    const timestamp = Math.floor(now.getTime() / 1000);

    const result: any = {
      timestamp,
      milliseconds: now.getTime(),
      iso: now.toISOString(),
      utc: now.toUTCString(),
      local: now.toLocaleString(),
    };

    // Add timezone-specific time if requested
    if (_timezone) {
      try {
        result.timezone = {
          name: _timezone,
          time: now.toLocaleString('en-US', { timeZone: timezone }),
          iso: `${now.toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T')}Z`,
        };
      } catch (error) {
        result.timezoneError = 'Invalid timezone';
      }
    }

    // Filter result based on format parameter
    if (format !== 'all') {
      const filteredResult: any = { timestamp };

      switch (format.toLowerCase()) {
        case 'iso':
          filteredResult.iso = result.iso;
          break;
        case 'utc':
          filteredResult.utc = result.utc;
          break;
        case 'local':
          filteredResult.local = result.local;
          break;
        case 'milliseconds':
          filteredResult.milliseconds = result.milliseconds;
          break;
        default:
          // Return all if format is unrecognized
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          });
      }

      return new Response(JSON.stringify(filteredResult), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Now API Error:', error);

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
