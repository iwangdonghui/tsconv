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

import { handleConvert } from '../../api-handlers/convert';
import { handleHealth } from '../../api-handlers/health';
import { handleNow } from '../../api-handlers/now';
import { handleV1Routes } from '../../api-handlers/v1-router';

export async function onRequest(context: {
  request: Request;
  env: Env;
  params: { path: string[] };
}): Promise<Response> {
  const { request, env, params } = context;
  const path = params.path || [];

  if (path[0] === 'health') {
    return handleHealth(request, env);
  } else if (path[0] === 'now') {
    return handleNow(request, env);
  } else if (path[0] === 'convert') {
    return handleConvert(request, env);
  } else if (path[0] === 'v1') {
    return handleV1Routes(request, env, path.slice(1));
  }

  return new Response(
    JSON.stringify({
      message: '/api/health, /api/now, /api/convert, and /api/v1/* are active for debugging',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
