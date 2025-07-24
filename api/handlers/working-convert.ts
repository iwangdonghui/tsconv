import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders, validateRequest } from '../utils/response';
import { convertTimestamp } from '../utils/conversion-utils';

interface WorkingConvertRequest {
  timestamp: number | string;
  outputFormats?: string[];
  timezone?: string;
  targetTimezone?: string;
  options?: {
    includeMetadata?: boolean;
    includeRelative?: boolean;
    priority?: 'low' | 'normal' | 'high';
    timeout?: number;
  };
}

interface WorkingConvertResponse {
  success: boolean;
  data: {
    input: number | string;
    timestamp: number;
    formats: Record<string, string>;
    timezone: string;
    targetTimezone?: string;
    relative?: string;
    metadata?: {
      originalTimezone?: string;
      offsetDifference?: number;
      isDST?: boolean;
      processingPriority: string;
      processingTime: number;
      cacheUsed: boolean;
    };
  };
}

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_OUTPUT_FORMATS = ['unix', 'iso', 'human', 'date', 'time'];

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

  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return APIErrorHandler.handleMethodNotAllowed(res, 'Only GET and POST methods are allowed');
  }

  try {
    const startTime = Date.now();

    // Parse request parameters
    let convertRequest: WorkingConvertRequest;

    if (req.method === 'GET') {
      const { timestamp, formats, timezone, targetTimezone, metadata, relative, priority } = req.query;
      
      if (!timestamp) {
        return APIErrorHandler.handleBadRequest(res, 'Timestamp parameter is required', {
          parameter: 'timestamp',
          examples: ['1705315845', '2024-01-15T10:30:45Z', 'now']
        });
      }

      convertRequest = {
        timestamp: timestamp === 'now' ? Math.floor(Date.now() / 1000) : timestamp as string,
        outputFormats: formats ? (formats as string).split(',') : undefined,
        timezone: timezone as string,
        targetTimezone: targetTimezone as string,
        options: {
          includeMetadata: metadata === 'true',
          includeRelative: relative === 'true',
          priority: (priority as 'low' | 'normal' | 'high') || 'normal'
        }
      };
    } else {
      // Validate request body for POST
      const validation = validateRequest(req);
      if (!validation.valid) {
        return APIErrorHandler.handleValidationError(res, validation);
      }

      convertRequest = req.body;
    }

    // Validate working convert request
    const validationResult = validateWorkingConvertRequest(convertRequest);
    if (!validationResult.valid) {
      return APIErrorHandler.handleBadRequest(res, validationResult.message, validationResult.details);
    }

    // Set timeout for the operation
    const timeout = convertRequest.options?.timeout || DEFAULT_TIMEOUT;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Conversion timeout')), timeout);
    });

    // Perform working conversion with timeout
    const conversionPromise = performWorkingConversion(convertRequest, startTime);
    
    const result = await Promise.race([conversionPromise, timeoutPromise]) as any;
    
    const response: WorkingConvertResponse = {
      success: true,
      data: result
    };

    APIErrorHandler.sendSuccess(res, response, {
      processingTime: Date.now() - startTime,
      itemCount: 1,
      cacheHit: result.metadata?.cacheUsed || false
    });

  } catch (error) {
    console.error('Working convert error:', error);
    
    if ((error as Error).message === 'Conversion timeout') {
      return APIErrorHandler.sendError(res, APIErrorHandler.createError(
        'TIMEOUT_ERROR',
        'Conversion exceeded timeout limit',
        408,
        { timeout: req.body?.options?.timeout || DEFAULT_TIMEOUT }
      ), 408);
    }

    if ((error as Error).message.includes('Invalid timestamp')) {
      return APIErrorHandler.handleBadRequest(res, (error as Error).message, {
        supportedFormats: [
          'Unix timestamp (seconds): 1705315845',
          'Unix timestamp (milliseconds): 1705315845123',
          'ISO string: 2024-01-15T10:30:45Z',
          'Date string: 2024-01-15',
          'Special value: now'
        ]
      });
    }

    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'working-convert'
    });
  }
}

function validateWorkingConvertRequest(request: WorkingConvertRequest): { valid: boolean; message?: string; details?: any } {
  if (!request.timestamp && request.timestamp !== 0) {
    return {
      valid: false,
      message: 'Timestamp is required',
      details: { field: 'timestamp' }
    };
  }

  if (request.options?.timeout && (request.options.timeout < 1000 || request.options.timeout > 30000)) {
    return {
      valid: false,
      message: 'Timeout must be between 1000ms and 30000ms',
      details: {
        minTimeout: 1000,
        maxTimeout: 30000,
        received: request.options.timeout
      }
    };
  }

  if (request.options?.priority && !['low', 'normal', 'high'].includes(request.options.priority)) {
    return {
      valid: false,
      message: 'Priority must be one of: low, normal, high',
      details: {
        validPriorities: ['low', 'normal', 'high'],
        received: request.options.priority
      }
    };
  }

  if (request.outputFormats && request.outputFormats.length > 20) {
    return {
      valid: false,
      message: 'Too many output formats requested',
      details: {
        maxFormats: 20,
        received: request.outputFormats.length
      }
    };
  }

  return { valid: true };
}

async function performWorkingConversion(request: WorkingConvertRequest, startTime: number): Promise<any> {
  const priority = request.options?.priority || 'normal';
  const includeMetadata = request.options?.includeMetadata ?? true;
  const includeRelative = request.options?.includeRelative ?? false;
  
  // Add processing delay based on priority
  const processingDelay = priority === 'high' ? 0 : priority === 'normal' ? 25 : 100;
  if (processingDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, processingDelay));
  }

  // Parse and validate timestamp
  const timestamp = parseTimestamp(request.timestamp);
  const timezone = request.timezone || 'UTC';
  const targetTimezone = request.targetTimezone;
  const outputFormats = request.outputFormats || DEFAULT_OUTPUT_FORMATS;

  // Check cache first (simulated)
  const cacheKey = generateCacheKey(timestamp, outputFormats, timezone, targetTimezone);
  const cacheUsed = Math.random() > 0.7; // Simulate 30% cache hit rate

  if (cacheUsed && priority !== 'high') {
    // Simulate cache retrieval delay
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // Perform the conversion using existing utility
  const conversionResult = await convertTimestamp(timestamp, {
    outputFormats: outputFormats,
    timezone,
    targetTimezone,
    includeMetadata
  });

  // Add relative time if requested
  let relative: string | undefined;
  if (includeRelative) {
    relative = calculateRelativeTime(timestamp);
  }

  // Build metadata
  let metadata: any = undefined;
  if (includeMetadata) {
    metadata = {
      originalTimezone: timezone,
      targetTimezone,
      offsetDifference: targetTimezone ? calculateOffsetDifference(timezone, targetTimezone, timestamp) : undefined,
      isDST: isDaylightSavingTime(targetTimezone || timezone, timestamp),
      processingPriority: priority,
      processingTime: Date.now() - startTime,
      cacheUsed
    };
  }

  return {
    input: request.timestamp,
    timestamp,
    formats: conversionResult.formats,
    timezone,
    targetTimezone,
    relative,
    metadata
  };
}

function parseTimestamp(input: number | string): number {
  if (typeof input === 'number') {
    // Handle both seconds and milliseconds
    return input > 1e10 ? Math.floor(input / 1000) : input;
  }

  if (typeof input === 'string') {
    // Handle special values
    if (input.toLowerCase() === 'now') {
      return Math.floor(Date.now() / 1000);
    }

    // Try parsing as number first
    const asNumber = parseFloat(input);
    if (!isNaN(asNumber) && isFinite(asNumber)) {
      return asNumber > 1e10 ? Math.floor(asNumber / 1000) : asNumber;
    }

    // Try parsing as date string
    const date = new Date(input);
    if (!isNaN(date.getTime())) {
      return Math.floor(date.getTime() / 1000);
    }

    throw new Error(`Invalid timestamp format: ${input}`);
  }

  throw new Error(`Invalid timestamp type: ${typeof input}`);
}

function generateCacheKey(timestamp: number, formats: string[], timezone: string, targetTimezone?: string): string {
  const key = `working-convert:${timestamp}:${formats.join(',')}:${timezone}:${targetTimezone || 'none'}`;
  return Buffer.from(key).toString('base64');
}

function calculateRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  const absDiff = Math.abs(diff);

  if (absDiff < 60) {
    return diff === 0 ? 'now' : 
           diff > 0 ? `${diff} seconds ago` : `in ${absDiff} seconds`;
  } else if (absDiff < 3600) {
    const minutes = Math.floor(absDiff / 60);
    return diff > 0 ? `${minutes} minutes ago` : `in ${minutes} minutes`;
  } else if (absDiff < 86400) {
    const hours = Math.floor(absDiff / 3600);
    return diff > 0 ? `${hours} hours ago` : `in ${hours} hours`;
  } else {
    const days = Math.floor(absDiff / 86400);
    return diff > 0 ? `${days} days ago` : `in ${days} days`;
  }
}

function calculateOffsetDifference(fromTimezone: string, toTimezone: string, timestamp: number): number {
  try {
    const date = new Date(timestamp * 1000);
    const fromOffset = getTimezoneOffset(fromTimezone, date);
    const toOffset = getTimezoneOffset(toTimezone, date);
    return toOffset - fromOffset;
  } catch (error) {
    return 0;
  }
}

function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60); // in minutes
  } catch (error) {
    return 0;
  }
}

function isDaylightSavingTime(timezone: string, timestamp: number): boolean {
  try {
    const date = new Date(timestamp * 1000);
    const januaryOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 0, 1));
    const julyOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 6, 1));
    const currentOffset = getTimezoneOffset(timezone, date);
    
    return currentOffset !== Math.max(januaryOffset, julyOffset);
  } catch (error) {
    return false;
  }
}