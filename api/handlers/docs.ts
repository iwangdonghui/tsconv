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
        description: 'Convert multiple timestamps or date strings in a single request (max 100 items)',
        parameters: {
          timestamps: {
            type: 'array',
            required: false,
            description: 'Array of Unix timestamps to convert'
          },
          dates: {
            type: 'array',
            required: false,
            description: 'Array of date strings to convert'
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
          format: {
            type: 'string',
            required: false,
            description: 'Output format (iso, utc, local, timestamp)'
          }
        },
        example: '/api/batch-convert with POST body: {"timestamps": [1642248600, 1642335000], "format": "iso"}'
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
        path: '/api/workdays',
        methods: ['GET', 'POST'],
        description: 'Calculate business days between dates or add workdays to a date',
        parameters: {
          mode: {
            type: 'string',
            required: false,
            description: 'Calculation mode: "range" or "add" (default: range)'
          },
          startDate: {
            type: 'string',
            required: true,
            description: 'Start date (YYYY-MM-DD format)'
          },
          endDate: {
            type: 'string',
            required: false,
            description: 'End date for range mode (YYYY-MM-DD format)'
          },
          days: {
            type: 'number',
            required: false,
            description: 'Number of workdays to add (for add mode)'
          },
          excludeWeekends: {
            type: 'boolean',
            required: false,
            description: 'Exclude weekends from calculation (default: true)'
          },
          excludeHolidays: {
            type: 'boolean',
            required: false,
            description: 'Exclude holidays from calculation (default: false)'
          },
          country: {
            type: 'string',
            required: false,
            description: 'Country code for holidays (US, UK, CN)'
          }
        },
        example: '/api/workdays?startDate=2022-01-01&endDate=2022-01-31&excludeWeekends=true'
      },
      {
        path: '/api/date-diff',
        methods: ['GET', 'POST'],
        description: 'Calculate the difference between two dates in various units',
        parameters: {
          startDate: {
            type: 'string',
            required: true,
            description: 'Start date (YYYY-MM-DD or ISO format)'
          },
          endDate: {
            type: 'string',
            required: true,
            description: 'End date (YYYY-MM-DD or ISO format)'
          },
          includeTime: {
            type: 'boolean',
            required: false,
            description: 'Include time components in calculation (default: false)'
          },
          absolute: {
            type: 'boolean',
            required: false,
            description: 'Return absolute difference (default: false)'
          }
        },
        example: '/api/date-diff?startDate=2022-01-01&endDate=2022-12-31&includeTime=false'
      },
      {
        path: '/api/format',
        methods: ['GET', 'POST'],
        description: 'Format timestamps using predefined or custom patterns',
        parameters: {
          timestamp: {
            type: 'number',
            required: false,
            description: 'Unix timestamp to format (defaults to current time)'
          },
          date: {
            type: 'string',
            required: false,
            description: 'Date string to format'
          },
          format: {
            type: 'string',
            required: false,
            description: 'Format name or custom pattern (default: iso)'
          },
          timezone: {
            type: 'string',
            required: false,
            description: 'Timezone for formatting (default: UTC)'
          }
        },
        example: '/api/format?timestamp=1642248600&format=us-datetime&timezone=America/New_York'
      },
      {
        path: '/api/format/templates',
        methods: ['GET'],
        description: 'Get available format templates and patterns',
        example: '/api/format/templates'
      },
      {
        path: '/api/timezones',
        methods: ['GET'],
        description: 'Search and filter world timezones with real-time information',
        parameters: {
          search: {
            type: 'string',
            required: false,
            description: 'Search query for timezone names'
          },
          region: {
            type: 'string',
            required: false,
            description: 'Filter by region (America, Europe, Asia, etc.)'
          },
          country: {
            type: 'string',
            required: false,
            description: 'Filter by country'
          },
          offset: {
            type: 'string',
            required: false,
            description: 'Filter by UTC offset (e.g., "+05:00")'
          }
        },
        example: '/api/timezones?region=America&country=United States'
      },
      {
        path: '/api/timezone-difference',
        methods: ['GET', 'POST'],
        description: 'Calculate time difference between two timezones',
        parameters: {
          timezone1: {
            type: 'string',
            required: true,
            description: 'First timezone (or use "from" parameter)'
          },
          timezone2: {
            type: 'string',
            required: true,
            description: 'Second timezone (or use "to" parameter)'
          },
          timestamp: {
            type: 'number',
            required: false,
            description: 'Unix timestamp for calculation (defaults to current time)'
          },
          details: {
            type: 'boolean',
            required: false,
            description: 'Include detailed time information'
          }
        },
        example: '/api/timezone-difference?from=UTC&to=America/New_York&details=true'
      },
      {
        path: '/api/visualization',
        methods: ['GET'],
        description: 'Generate data for charts and visualizations',
        parameters: {
          type: {
            type: 'string',
            required: true,
            description: 'Visualization type (timezone-chart, time-series, offset-map, dst-calendar)'
          },
          start: {
            type: 'number',
            required: false,
            description: 'Start timestamp for time-series'
          },
          end: {
            type: 'number',
            required: false,
            description: 'End timestamp for time-series'
          },
          interval: {
            type: 'number',
            required: false,
            description: 'Interval in seconds for time-series'
          },
          timezone: {
            type: 'string',
            required: false,
            description: 'Timezone for data generation'
          }
        },
        example: '/api/visualization?type=timezone-chart'
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