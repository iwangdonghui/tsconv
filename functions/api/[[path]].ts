// Cloudflare Pages Function - Universal API Handler
// This single function handles all API routes to avoid function count limits

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  RATE_LIMITING_ENABLED?: string;
  CACHING_ENABLED?: string;
}

// Import core handlers
import { handleConvert } from '../../api-handlers/convert';
import { handleNow } from '../../api-handlers/now';
import { handleHealth } from '../../api-handlers/health';
import { handleV1Routes } from '../../api-handlers/v1-router';
import { handleAdminRoutes } from '../../api-handlers/admin-router';

// Import new API handlers
import { handleWorkdays } from '../../api-handlers/workdays';
import { handleDateDiff } from '../../api-handlers/date-diff';
import { handleFormat } from '../../api-handlers/format';
import { handleTimezonesEnhanced } from '../../api-handlers/timezones-enhanced';

export async function onRequest(context: {
  request: Request;
  env: Env;
  params: { path: string[] };
}): Promise<Response> {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const hostname = url.hostname;
  const path = params.path || [];

  // Handle api.tsconv.com subdomain - remove /api prefix from path
  const isApiSubdomain = hostname === 'api.tsconv.com';
  const apiPath = isApiSubdomain ? path : path;
  
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let response: Response;

    // Route to appropriate handler based on path
    if (apiPath.length === 0) {
      // Root API endpoint
      response = new Response(JSON.stringify({
        message: 'Timestamp Converter API',
        version: '1.0.0',
        domain: hostname,
        endpoints: isApiSubdomain
          ? ['/convert', '/now', '/health', '/workdays', '/date-diff', '/format', '/timezones', '/timezone-convert', '/timezone-difference', '/timezone-info', '/batch-convert', '/formats', '/visualization', '/v1/*', '/admin/*']
          : ['/api/convert', '/api/now', '/api/health', '/api/workdays', '/api/date-diff', '/api/format', '/api/timezones', '/api/timezone-convert', '/api/timezone-difference', '/api/timezone-info', '/api/batch-convert', '/api/formats', '/api/visualization', '/api/v1/*', '/api/admin/*']
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (apiPath[0] === 'convert') {
      response = await handleConvert(request, env);
    } else if (apiPath[0] === 'now') {
      response = await handleNow(request, env);
    } else if (apiPath[0] === 'health') {
      response = await handleHealth(request, env);
    } else if (apiPath[0] === 'v1') {
      response = await handleV1Routes(request, env, apiPath.slice(1));
    } else if (apiPath[0] === 'admin') {
      response = await handleAdminRoutes(request, env, apiPath.slice(1));
    } else if (apiPath[0] === 'workdays') {
      response = await handleWorkdays(request, env);
    } else if (apiPath[0] === 'date-diff') {
      response = await handleDateDiff(request, env);
    } else if (apiPath[0] === 'format') {
      response = await handleFormat(request, env);
    } else if (apiPath[0] === 'timezones') {
      response = await handleTimezonesEnhanced(request, env);
    } else {
      response = new Response(JSON.stringify({
        error: 'Not Found',
        message: `API endpoint /${apiPath.join('/')} not found`,
        domain: hostname,
        availableEndpoints: isApiSubdomain
          ? ['/convert', '/now', '/health', '/v1/*', '/admin/*']
          : ['/api/convert', '/api/now', '/api/health', '/api/v1/*', '/api/admin/*']
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('API Error:', error);
    
    const errorResponse = new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

    return errorResponse;
  }
}
