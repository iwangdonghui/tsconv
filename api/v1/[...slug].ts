import {
  VercelRequest,
  VercelResponse,
  APIErrorHandler,
  withCors
} from '../_shared';

// Import handlers
import batchConvertHandler from '../handlers/batch-convert';
import enhancedBatchHandler from '../handlers/enhanced-batch';
import formatsHandler from '../handlers/formats';
import timezoneConvertHandler from '../handlers/timezone-convert';
import timezoneDifferenceHandler from '../handlers/timezone-difference';
import timezoneInfoHandler from '../handlers/timezone-info';
import timezoneHandler from '../handlers/timezone';
import visualizationHandler from '../handlers/visualization';

// Import simple handlers
async function simpleConvertHandler(req: VercelRequest, res: VercelResponse) {
  // Import the simple convert logic
  const { default: handler } = await import('../handlers/simple-convert') as { default: any };
  return handler(req, res);
}

async function simpleHealthHandler(req: VercelRequest, res: VercelResponse) {
  // Import the simple health logic
  const { default: handler } = await import('../handlers/simple-health') as { default: any };
  return handler(req, res);
}

async function standaloneConvertHandler(req: VercelRequest, res: VercelResponse) {
  // Import the standalone convert logic
  const { default: handler } = await import('../handlers/standalone-convert') as { default: any };
  return handler(req, res);
}

async function standaloneHealthHandler(req: VercelRequest, res: VercelResponse) {
  // Import the standalone health logic
  const { default: handler } = await import('../handlers/standalone-health') as { default: any };
  return handler(req, res);
}

async function workingBatchHandler(req: VercelRequest, res: VercelResponse) {
  // Import the working batch logic
  const { default: handler } = await import('../handlers/working-batch') as { default: any };
  return handler(req, res);
}

async function workingConvertHandler(req: VercelRequest, res: VercelResponse) {
  // Import the working convert logic
  const { default: handler } = await import('../handlers/working-convert') as { default: any };
  return handler(req, res);
}

async function workingHealthHandler(req: VercelRequest, res: VercelResponse) {
  // Import the working health logic
  const { default: handler } = await import('../handlers/working-health') as { default: any };
  return handler(req, res);
}

async function batchHandler(req: VercelRequest, res: VercelResponse) {
  // Import the batch logic
  const { default: handler } = await import('../handlers/batch') as { default: any };
  return handler(req, res);
}

// Route mapping
const routes: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<any>> = {
  'batch-convert': batchConvertHandler,
  'enhanced-batch': enhancedBatchHandler,
  'formats': formatsHandler,
  'timezone-convert': timezoneConvertHandler,
  'timezone-difference': timezoneDifferenceHandler,
  'timezone-info': timezoneInfoHandler,
  'timezone': timezoneHandler,
  'visualization': visualizationHandler,
  'simple-convert': simpleConvertHandler,
  'simple-health': simpleHealthHandler,
  'standalone-convert': standaloneConvertHandler,
  'standalone-health': standaloneHealthHandler,
  'working-batch': workingBatchHandler,
  'working-convert': workingConvertHandler,
  'working-health': workingHealthHandler,
  'batch': batchHandler,
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
      return APIErrorHandler.handleNotFound(res, `Route /api/v1/${route} not found`);
    }

    const routeHandler = routes[route];
    return await routeHandler(req, res);
    
  } catch (error) {
    console.error('Dynamic route error:', error);
    return APIErrorHandler.handleServerError(res, error as Error);
  }
}
