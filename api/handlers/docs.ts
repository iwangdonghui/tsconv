import { VercelRequest, VercelResponse } from '@vercel/node';
import { ResponseBuilder, withCors } from '../utils/response';
import { createCacheMiddleware } from '../middleware/cache';
import { createRateLimitMiddleware } from '../middleware/rate-limit';

interface APIEndpoint {
  path: string;
  methods: string[];
  description: string;
  parameters?: Record<string, {
    type: string;
    required: boolean;
    description: string;
  }>;
  example?: string;
}

async function apiDocsHandler(req: VercelRequest, res: VercelResponse) {
  withCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Define API documentation
    const apiEndpoints: APIEndpoint[] = [
      {
        path: '/api/convert',
        methods: ['GET', 'POST'],
        description: 'Convert a single timestamp or date string to various formats',
        parameters: {
          timestamp: {
            type: 'number',
            required: false,
            description: 'Unix timestamp to convert'
          },
          date: {
            type: 'string',
            required: false,
            description: 'Date string to convert (ISO 8601 format recommended)'
          },
          format: {
            type: 'string',
            required: false,
            description: 'Custom format to apply'
          },
          timezone: {
            type: 'string',
            required: false,
            description: 'Source timezone identifier (e.g., "America/New_York")'
          },
          targetTimezone: {
            type: 'string',
            required: false,
            description: 'Target timezone for conversion'
          },
          includeFormats: {
            type: 'boolean',
            required: false,
            description: 'Include additional format variations in response'
          }
        },
        example: '/api/convert?timestamp=1642248600&timezone=UTC&targetTimezone=America/New_York'
      },
      {
        path: '/api/batch-convert',
        methods: ['POST'],
        description: 'Convert multiple timestamps or date strings in a single request',
        parameters: {
          items: {
            type: 'array',
            required: true,
            description: 'Array of timestamps or date strings to convert'
          },
          outputFormats: {
            type: 'array',
            required: false,
            description: 'Array of format names to include in the response'
          },
          timezone: {
            type: 'string',
            required: false,
            description: 'Source timezone identifier'
          },
          targetTimezone: {
            type: 'string',
            required: false,
            description: 'Target timezone for conversion'
          },
          options: {
            type: 'object',
            required: false,
            description: 'Additional options (continueOnError, maxItems)'
          }
        },
        example: '/api/batch-convert with POST body: {"items": [1642248600, "2022-01-15T12:00:00Z"]}'
      },
      {
        path: '/api/timezone-info',
        methods: ['GET'],
        description: 'Get information about a specific timezone or list common timezones',
        parameters: {
          timezone: {
            type: 'string',
            required: false,
            description: 'Timezone identifier to get information for'
          },
          list: {
            type: 'boolean',
            required: false,
            description: 'Set to true to get a list of common timezones'
          }
        },
        example: '/api/timezone-info?timezone=America/New_York'
      },
      {
        path: '/api/timezone-convert',
        methods: ['GET', 'POST'],
        description: 'Convert a timestamp between two timezones',
        parameters: {
          timestamp: {
            type: 'number',
            required: false,
            description: 'Unix timestamp to convert'
          },
          date: {
            type: 'string',
            required: false,
            description: 'Date string to convert'
          },
          fromTimezone: {
            type: 'string',
            required: true,
            description: 'Source timezone identifier'
          },
          toTimezone: {
            type: 'string',
            required: true,
            description: 'Target timezone identifier'
          }
        },
        example: '/api/timezone-convert?timestamp=1642248600&fromTimezone=UTC&toTimezone=America/New_York'
      },
      {
        path: '/api/formats',
        methods: ['GET'],
        description: 'Get information about supported date/time formats',
        parameters: {
          category: {
            type: 'string',
            required: false,
            description: 'Filter formats by category'
          },
          format: {
            type: 'string',
            required: false,
            description: 'Get details for a specific format'
          }
        },
        example: '/api/formats?category=standard'
      },
      {
        path: '/api/health',
        methods: ['GET'],
        description: 'Check the health status of the API and its services',
        example: '/api/health'
      }
    ];

    // Add version information
    const apiInfo = {
      name: 'Timestamp Converter API',
      version: '1.0.0',
      description: 'API for converting timestamps between formats and timezones',
      baseUrl: process.env.API_BASE_URL || 'https://api.example.com',
      endpoints: apiEndpoints,
      documentation: {
        openapi: '/api/openapi.json',
        swagger: '/api/swagger.json'
      }
    };

    // Send response
    const builder = new ResponseBuilder().setData(apiInfo);
    builder.send(res);

  } catch (error) {
    console.error('API docs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate API documentation'
      }
    });
  }
}

// Enhanced API docs with caching and rate limiting
const enhancedApiDocsHandler = createRateLimitMiddleware()(
  createCacheMiddleware({
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    cacheControlHeader: 'public, max-age=86400, stale-while-revalidate=172800'
  })(apiDocsHandler)
);

export default enhancedApiDocsHandler;