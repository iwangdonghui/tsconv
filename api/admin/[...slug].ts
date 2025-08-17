import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, withCors } from '../utils/response';

// Type for handler functions
type HandlerFunction = (
  req: VercelRequest,
  res: VercelResponse
) => Promise<void | VercelResponse> | void | VercelResponse;

// Import admin handlers
async function redisAdminHandler(req: VercelRequest, res: VercelResponse) {
  const { default: handler } = (await import('../handlers/redis-admin')) as {
    default: HandlerFunction;
  };
  return handler(req, res);
}

async function redisConfigHandler(req: VercelRequest, res: VercelResponse) {
  const { default: handler } = (await import('../handlers/redis-config')) as {
    default: HandlerFunction;
  };
  return handler(req, res);
}

async function metricsHandler(req: VercelRequest, res: VercelResponse) {
  const { default: handler } = (await import('../handlers/metrics')) as {
    default: HandlerFunction;
  };
  return handler(req, res);
}

async function testHandler(req: VercelRequest, res: VercelResponse) {
  const { default: handler } = (await import('../handlers/test')) as { default: HandlerFunction };
  return handler(req, res);
}

// Route mapping
const routes: Record<string, HandlerFunction> = {
  'redis-admin': redisAdminHandler,
  'redis-config': redisConfigHandler,
  metrics: metricsHandler,
  test: testHandler,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  withCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { slug } = req.query;
    const route = Array.isArray(slug) ? slug.join('/') : slug;

    if (!route || !routes[route]) {
      return APIErrorHandler.handleNotFound(res, `Admin route /api/admin/${route} not found`);
    }

    // Basic admin authentication check (you can enhance this)
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (!authHeader && !apiKey) {
      return APIErrorHandler.handleUnauthorized(res, 'Admin access requires authentication');
    }

    const routeHandler = routes[route];
    return await routeHandler(req, res);
  } catch (error) {
    console.error('Admin route error:', error);
    return APIErrorHandler.handleServerError(res, error as Error);
  }
}
