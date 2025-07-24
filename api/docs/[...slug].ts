import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, withCors } from '../utils/response';

// Import documentation handlers
async function docsHandler(req: VercelRequest, res: VercelResponse) {
  const { default: handler } = await import('../handlers/docs') as { default: any };
  return handler(req, res);
}

async function swaggerHandler(req: VercelRequest, res: VercelResponse) {
  const { default: handler } = await import('../handlers/swagger') as { default: any };
  return handler(req, res);
}

async function openApiHandler(req: VercelRequest, res: VercelResponse) {
  const { default: handler } = await import('../handlers/openapi') as { default: any };
  return handler(req, res);
}

async function simpleApiHandler(req: VercelRequest, res: VercelResponse) {
  const { default: handler } = await import('../handlers/simple-api') as { default: any };
  return handler(req, res);
}

// Route mapping
const routes: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<any>> = {
  'docs': docsHandler,
  'swagger': swaggerHandler,
  'openapi': openApiHandler,
  'simple-api': simpleApiHandler,
  // Add aliases for common documentation paths
  'api-docs': docsHandler,
  'swagger-ui': swaggerHandler,
  'openapi.json': openApiHandler,
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
      return APIErrorHandler.handleNotFound(res, `Documentation route /api/docs/${route} not found`);
    }

    const routeHandler = routes[route];
    return await routeHandler(req, res);
    
  } catch (error) {
    console.error('Documentation route error:', error);
    return APIErrorHandler.handleServerError(res, error as Error);
  }
}
