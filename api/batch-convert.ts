import { VercelRequest, VercelResponse } from '@vercel/node';

interface BatchConvertRequest {
  timestamps?: number[];
  dates?: string[];
  timezone?: string;
  targetTimezone?: string;
  format?: string;
}

/**
 * Batch Convert API Endpoint
 * 
 * Convert multiple timestamps or dates in a single request
 * 
 * POST /api/batch-convert
 * Body: {
 *   "timestamps": [1640995200, 1641081600],
 *   "timezone": "UTC",
 *   "targetTimezone": "America/New_York",
 *   "format": "iso"
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    const startTime = Date.now();
    const request: BatchConvertRequest = req.body;

    // Validate request
    if (!request.timestamps && !request.dates) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Either timestamps or dates array is required',
        required: ['timestamps OR dates']
      });
    }

    if (request.timestamps && request.dates) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Provide either timestamps or dates, not both'
      });
    }

    // Limit batch size
    const items = request.timestamps || request.dates || [];
    if (items.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Maximum 100 items allowed per batch request',
        limit: 100,
        received: items.length
      });
    }

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'At least one item is required'
      });
    }

    // Process batch conversion
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const item = items[i];
        let result;

        if (request.timestamps) {
          // Convert timestamp
          const timestamp = item as number;
          if (isNaN(timestamp)) {
            errors.push({
              index: i,
              item,
              error: 'Invalid timestamp'
            });
            continue;
          }
          result = convertTimestamp(timestamp, request.timezone, request.targetTimezone, request.format);
        } else {
          // Convert date string
          const dateStr = item as string;
          const timestamp = new Date(dateStr).getTime() / 1000;
          if (isNaN(timestamp)) {
            errors.push({
              index: i,
              item,
              error: 'Invalid date string'
            });
            continue;
          }
          result = convertTimestamp(timestamp, request.timezone, request.targetTimezone, request.format);
        }

        results.push({
          index: i,
          input: item,
          ...result
        });
      } catch (error) {
        errors.push({
          index: i,
          item: items[i],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          total: items.length,
          successful: results.length,
          failed: errors.length,
          processingTime: Date.now() - startTime
        }
      },
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: Math.floor(Date.now() / 1000),
        batchSize: items.length
      }
    });

  } catch (error) {
    console.error('Batch convert error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

function convertTimestamp(timestamp: number, timezone?: string, targetTimezone?: string, format?: string) {
  const date = new Date(timestamp * 1000);
  
  // Default format
  const fmt = format || 'iso';
  
  let result: any = {
    timestamp,
    utc: date.toUTCString(),
    iso8601: date.toISOString(),
    local: date.toLocaleString()
  };

  // Add timezone conversions if specified
  if (timezone && targetTimezone) {
    try {
      const sourceTime = date.toLocaleString('en-US', { timeZone: timezone });
      const targetTime = date.toLocaleString('en-US', { timeZone: targetTimezone });
      
      result.timezone = {
        source: {
          timezone,
          time: sourceTime
        },
        target: {
          timezone: targetTimezone,
          time: targetTime
        }
      };
    } catch (error) {
      result.timezoneError = 'Invalid timezone specified';
    }
  }

  // Add formatted output based on requested format
  switch (fmt.toLowerCase()) {
    case 'timestamp':
      result.formatted = timestamp;
      break;
    case 'iso':
      result.formatted = date.toISOString();
      break;
    case 'utc':
      result.formatted = date.toUTCString();
      break;
    case 'local':
      result.formatted = date.toLocaleString();
      break;
    default:
      result.formatted = date.toISOString();
  }

  return result;
}
