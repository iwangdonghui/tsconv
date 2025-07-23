import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, ResponseBuilder, withCors } from './utils/response';
import { createCacheMiddleware } from './middleware/cache';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import formatService from './services/format-service';

/**
 * API endpoint for retrieving information about supported date/time formats
 */
async function formatsHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return APIErrorHandler.handleBadRequest(res, 'Only GET method is allowed');
  }

  try {
    const { category, format } = req.query;

    // If format parameter is provided, return details for that format
    if (format) {
      const formatStr = String(format);
      const formatDetails = formatService.getFormat(formatStr);
      
      if (!formatDetails) {
        return APIErrorHandler.handleNotFound(res, `Format '${formatStr}' not found`);
      }
      
      const builder = new ResponseBuilder().setData(formatDetails);
      return builder.send(res);
    }

    // If category parameter is provided, filter formats by category
    if (category) {
      const categoryStr = String(category);
      const formats = formatService.listFormatsByCategory(categoryStr);
      
      const builder = new ResponseBuilder()
        .setData(formats)
        .addMetadata('category', categoryStr)
        .addMetadata('count', formats.length);
      
      return builder.send(res);
    }

    // Otherwise, return all supported formats
    const formats = formatService.getSupportedFormats();
    
    // Group formats by category for better organization
    const groupedFormats = formats.reduce((acc, format) => {
      if (!acc[format.category]) {
        acc[format.category] = [];
      }
      acc[format.category].push(format);
      return acc;
    }, {} as Record<string, typeof formats>);
    
    const builder = new ResponseBuilder()
      .setData({
        formats: groupedFormats,
        categories: Object.keys(groupedFormats),
        totalCount: formats.length
      });
    
    builder.send(res);

  } catch (error) {
    console.error('Formats API error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

// Enhanced formats API with caching and rate limiting
const enhancedFormatsHandler = withCors(
  createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 24 * 60 * 60 * 1000, // 24 hours for format data
      cacheControlHeader: 'public, max-age=86400, stale-while-revalidate=172800'
    })(formatsHandler)
  )
);

export default enhancedFormatsHandler;