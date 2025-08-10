import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders } from '../utils/response';
import { SupportedFormat } from '../types/api';

const SUPPORTED_FORMATS: SupportedFormat[] = [
  // Standard formats
  {
    name: 'iso',
    pattern: 'YYYY-MM-DDTHH:mm:ss.sssZ',
    example: '2024-01-15T10:30:45.123Z',
    description: 'ISO 8601 standard format with milliseconds and UTC timezone',
    category: 'standard',
  },
  {
    name: 'unix',
    pattern: 'X',
    example: '1705315845',
    description: 'Unix timestamp in seconds since epoch',
    category: 'standard',
  },
  {
    name: 'unix-ms',
    pattern: 'x',
    example: '1705315845123',
    description: 'Unix timestamp in milliseconds since epoch',
    category: 'standard',
  },
  {
    name: 'human',
    pattern: 'MMMM Do, YYYY [at] h:mm:ss A',
    example: 'January 15th, 2024 at 10:30:45 AM',
    description: 'Human-readable format with ordinal date',
    category: 'standard',
  },
  {
    name: 'relative',
    pattern: 'relative',
    example: '2 hours ago',
    description: 'Relative time from now (e.g., "2 hours ago", "in 3 days")',
    category: 'standard',
  },

  // Locale-specific formats
  {
    name: 'us',
    pattern: 'MM/DD/YYYY h:mm:ss A',
    example: '01/15/2024 10:30:45 AM',
    description: 'US date format (MM/DD/YYYY)',
    category: 'locale',
  },
  {
    name: 'eu',
    pattern: 'DD/MM/YYYY HH:mm:ss',
    example: '15/01/2024 10:30:45',
    description: 'European date format (DD/MM/YYYY)',
    category: 'locale',
  },
  {
    name: 'uk',
    pattern: 'DD/MM/YYYY HH:mm:ss',
    example: '15/01/2024 10:30:45',
    description: 'UK date format (DD/MM/YYYY)',
    category: 'locale',
  },

  // ISO variants
  {
    name: 'iso-date',
    pattern: 'YYYY-MM-DD',
    example: '2024-01-15',
    description: 'ISO date only (no time)',
    category: 'iso',
  },
  {
    name: 'iso-time',
    pattern: 'HH:mm:ss',
    example: '10:30:45',
    description: 'ISO time only (no date)',
    category: 'iso',
  },
  {
    name: 'iso-datetime',
    pattern: 'YYYY-MM-DD HH:mm:ss',
    example: '2024-01-15 10:30:45',
    description: 'ISO datetime without timezone',
    category: 'iso',
  },
  {
    name: 'iso-week',
    pattern: 'YYYY-[W]WW',
    example: '2024-W03',
    description: 'ISO week date format',
    category: 'iso',
  },

  // Custom formats
  {
    name: 'compact',
    pattern: 'YYYYMMDD_HHmmss',
    example: '20240115_103045',
    description: 'Compact format suitable for filenames',
    category: 'custom',
  },
  {
    name: 'log',
    pattern: 'YYYY-MM-DD HH:mm:ss.SSS',
    example: '2024-01-15 10:30:45.123',
    description: 'Log format with milliseconds',
    category: 'custom',
  },
  {
    name: 'rfc2822',
    pattern: 'ddd, DD MMM YYYY HH:mm:ss ZZ',
    example: 'Mon, 15 Jan 2024 10:30:45 +0000',
    description: 'RFC 2822 format used in email headers',
    category: 'custom',
  },
  {
    name: 'cookie',
    pattern: 'ddd, DD-MMM-YYYY HH:mm:ss [GMT]',
    example: 'Mon, 15-Jan-2024 10:30:45 GMT',
    description: 'HTTP cookie expiration format',
    category: 'custom',
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const corsHeaders = createCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests for formats
  if (req.method !== 'GET') {
    return APIErrorHandler.handleMethodNotAllowed(res, 'Only GET method is allowed for formats');
  }

  try {
    const startTime = Date.now();

    // Parse query parameters
    const category = req.query.category as string;
    const search = req.query.search as string;
    const includeExamples = req.query.examples !== 'false';
    const includePatterns = req.query.patterns !== 'false';

    let formats = [...SUPPORTED_FORMATS];

    // Filter by category if specified
    if (category) {
      const validCategories = ['standard', 'locale', 'iso', 'custom'];
      if (!validCategories.includes(category)) {
        return APIErrorHandler.handleBadRequest(res, `Invalid category: ${category}`, {
          validCategories,
          receivedCategory: category,
        });
      }
      formats = formats.filter(f => f.category === category);
    }

    // Filter by search term if specified
    if (search) {
      const searchLower = search.toLowerCase();
      formats = formats.filter(
        f =>
          f.name.toLowerCase().includes(searchLower) ||
          f.description.toLowerCase().includes(searchLower) ||
          f.example.toLowerCase().includes(searchLower)
      );
    }

    // Optionally remove examples and patterns to reduce response size
    if (!includeExamples || !includePatterns) {
      formats = formats.map(f => ({
        ...f,
        ...(includeExamples ? {} : { example: undefined }),
        ...(includePatterns ? {} : { pattern: undefined }),
      }));
    }

    // Group formats by category
    const groupedFormats = formats.reduce(
      (acc, format) => {
        if (!acc[format.category]) {
          acc[format.category] = [];
        }
        acc[format.category]!.push(format);
        return acc;
      },
      {} as Record<string, SupportedFormat[]>
    );

    const response = {
      formats,
      groupedFormats,
      metadata: {
        totalFormats: formats.length,
        categories: Object.keys(groupedFormats),
        categoryCount: Object.keys(groupedFormats).length,
        filters: {
          category: category || null,
          search: search || null,
          includeExamples,
          includePatterns,
        },
      },
    };

    APIErrorHandler.sendSuccess(res, response, {
      processingTime: Date.now() - startTime,
      itemCount: formats.length,
      cacheHit: false,
    });
  } catch (error) {
    console.error('Formats handler error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'formats',
    });
  }
}

// Helper function to validate format name
export function isValidFormatName(formatName: string): boolean {
  return SUPPORTED_FORMATS.some(f => f.name === formatName);
}

// Helper function to get format by name
export function getFormatByName(formatName: string): SupportedFormat | null {
  return SUPPORTED_FORMATS.find(f => f.name === formatName) || null;
}

// Helper function to get formats by category
export function getFormatsByCategory(category: string): SupportedFormat[] {
  return SUPPORTED_FORMATS.filter(f => f.category === category);
}
