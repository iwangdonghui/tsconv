// Cloudflare Pages Function - Universal API Handler
// This single function handles all API routes to avoid function count limits

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  RATE_LIMITING_ENABLED?: string;
  CACHING_ENABLED?: string;
}

// Import core handlers

// Import new API handlers

// Import core handlers
import { handleHealth } from '../../api-handlers/health';

// Import new API handlers
import { handleDateDiff } from '../../api-handlers/date-diff';
import { handleFormat } from '../../api-handlers/format';
import { handleTimezonesEnhanced } from '../../api-handlers/timezones-enhanced';
import { handleWorkdays } from '../../api-handlers/workdays';

export async function onRequest(context: {
  request: Request;
  env: Env;
  params: { path: string[] };
}): Promise<Response> {
  const { request, env, params } = context;
  const path = params.path || [];

  // Route to appropriate handler based on path
  if (path[0] === 'health') {
    return handleHealth(request, env);
  } else if (path[0] === 'workdays') {
    return handleWorkdays(request, env);
  } else if (path[0] === 'date-diff') {
    return handleDateDiff(request, env);
  } else if (path[0] === 'format') {
    return handleFormat(request, env);
  } else if (path[0] === 'timezones') {
    return handleTimezonesEnhanced(request, env);
  }

  return new Response(JSON.stringify({ error: 'Endpoint not enabled for debugging' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
