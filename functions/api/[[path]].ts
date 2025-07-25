// Cloudflare Pages Function - Universal API Handler
// This single function handles all API routes to avoid function count limits

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  RATE_LIMITING_ENABLED?: string;
  CACHING_ENABLED?: string;
}

// Import core handlers (we'll need to adapt these for Cloudflare)
import { handleConvert } from '../../api-handlers/convert';
import { handleNow } from '../../api-handlers/now';
import { handleHealth } from '../../api-handlers/health';
import { handleV1Routes } from '../../api-handlers/v1-router';
import { handleAdminRoutes } from '../../api-handlers/admin-router';

export async function onRequest(context: {
  request: Request;
  env: Env;
  params: { path: string[] };
}): Promise<Response> {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = params.path || [];
  
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
    if (path.length === 0) {
      // Root API endpoint
      response = new Response(JSON.stringify({
        message: 'Timestamp Converter API',
        version: '1.0.0',
        endpoints: ['/convert', '/now', '/health', '/v1/*', '/admin/*']
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (path[0] === 'convert') {
      response = await handleConvert(request, env);
    } else if (path[0] === 'now') {
      response = await handleNow(request, env);
    } else if (path[0] === 'health') {
      response = await handleHealth(request, env);
    } else if (path[0] === 'v1') {
      response = await handleV1Routes(request, env, path.slice(1));
    } else if (path[0] === 'admin') {
      response = await handleAdminRoutes(request, env, path.slice(1));
    } else {
      response = new Response(JSON.stringify({
        error: 'Not Found',
        message: `API endpoint /${path.join('/')} not found`
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
