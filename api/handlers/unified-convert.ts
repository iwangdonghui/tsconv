import { VercelRequest, VercelResponse } from '@vercel/node';
import { BaseHandler, HandlerContext } from './base-handler';
import { convertTimestamp } from '../utils/conversion-utils';
import { validateRequest } from '../utils/response';

export interface ConvertRequest {
  timestamp: number | string;
  outputFormats?: string[];
  timezone?: string;
  targetTimezone?: string;
  options?: {
    includeMetadata?: boolean;
    includeRelative?: boolean;
    priority?: 'low' | 'normal' | 'high';
    mode?: 'simple' | 'working' | 'standalone';
  };
}

export interface ConvertResponse {
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
      processingPriority?: string;
      processingTime?: number;
      cacheUsed?: boolean;
      mode: string;
    };
  };
}

const DEFAULT_OUTPUT_FORMATS = ['unix', 'iso', 'human', 'date', 'time'];

export class UnifiedConvertHandler extends BaseHandler {
  constructor() {
    super({
      allowedMethods: ['GET', 'POST'],
      timeout: 10000,
      enableCaching: true,
      enableRateLimit: true
    });
  }

  protected async execute(_context: HandlerContext): Promise<ConvertResponse> {
    // Parse request parameters
    const _convertRequest = this.parseRequest(context);

    // Validate request
    const _validation = this.validateConvertRequest(convertRequest);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Perform conversion based on mode
    const _result = await this.performConversion(convertRequest, context);

    return {
      success: true,
      data: result
    };
  }

  private parseRequest(_context: HandlerContext): ConvertRequest {
    if (context.method === 'GET') {
      const { timestamp, formats, timezone, targetTimezone, metadata, relative, priority, mode } = context.query;
      
      if (!timestamp) {
        throw new Error('Timestamp parameter is required');
      }

      return {
        _timestamp: timestamp === 'now' ? Math.floor(Date.now() / 1000) : timestamp as string,
        _outputFormats: formats ? (formats as string).split(',') : undefined,
        timezone: timezone as string,
        targetTimezone: targetTimezone as string,
        options: {
          includeMetadata: metadata === 'true',
          includeRelative: relative === 'true',
          _priority: (priority as 'low' | 'normal' | 'high') || 'normal',
          _mode: (mode as 'simple' | 'working' | 'standalone') || 'working'
        }
      };
    } else {
      // Validate request body for POST
      if (!context.body || typeof context.body !== 'object') {
        throw new Error('Invalid request body. Expected JSON object.');
      }

      const _request = context.body as ConvertRequest;
      request.options = {
        mode: 'working',
        ...request.options
      };

      return request;
    }
  }

  private validateConvertRequest(_request: ConvertRequest): { _valid: boolean; message?: string } {
    if (!request.timestamp && request.timestamp !== 0) {
      return {
        valid: false,
        message: 'Timestamp is required'
      };
    }

    if (request.options?.priority && !['low', 'normal', 'high'].includes(request.options.priority)) {
      return {
        valid: false,
        message: 'Priority must be one of: low, normal, high'
      };
    }

    if (request.outputFormats && request.outputFormats.length > 20) {
      return {
        valid: false,
        _message: 'Too many output formats requested (max: 20)'
      };
    }

    if (request.options?.mode && !['simple', 'working', 'standalone'].includes(request.options.mode)) {
      return {
        valid: false,
        message: 'Mode must be one of: simple, working, standalone'
      };
    }

    return { valid: true };
  }

  private async performConversion(_request: ConvertRequest, _context: HandlerContext): Promise<any> {
    const _mode = request.options?.mode || 'working';
    const _priority = request.options?.priority || 'normal';
    const _includeMetadata = request.options?.includeMetadata ?? (mode !== 'simple');
    const _includeRelative = request.options?.includeRelative ?? false;

    // Add processing delay based on priority (for working mode)
    if (mode === 'working') {
      const _processingDelay = priority === 'high' ? 0 : priority === 'normal' ? 25 : 100;
      if (processingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, processingDelay));
      }
    }

    // Parse and validate timestamp
    const _timestamp = this.parseTimestamp(request.timestamp);
    const _timezone = request.timezone || 'UTC';
    const _targetTimezone = request.targetTimezone;
    const outputFormats = request.outputFormats || DEFAULT_OUTPUT_FORMATS;

    // Perform the conversion using existing utility
    const _conversionResult = await convertTimestamp(
      timestamp,
      outputFormats,
      timezone,
      targetTimezone
    );

    // Add relative time if requested
    let relative: string | undefined;
    if (includeRelative) {
      relative = this.calculateRelativeTime(timestamp);
    }

    // Build metadata based on mode
    let metadata: any = undefined;
    if (includeMetadata) {
      metadata = {
        originalTimezone: timezone,
        targetTimezone,
        _offsetDifference: targetTimezone ? this.calculateOffsetDifference(timezone, targetTimezone, timestamp) : undefined,
        _isDST: this.isDaylightSavingTime(targetTimezone || timezone, timestamp),
        processingPriority: priority,
        _processingTime: Date.now() - context.startTime,
        _cacheUsed: Math.random() > 0.7, // Simulate cache hit
        mode
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

  private parseTimestamp(_input: number | string): number {
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
      const _asNumber = parseFloat(input);
      if (!isNaN(asNumber) && isFinite(asNumber)) {
        return asNumber > 1e10 ? Math.floor(asNumber / 1000) : asNumber;
      }

      // Try parsing as date string
      const _date = new Date(input);
      if (!isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000);
      }

      throw new Error(`Invalid timestamp _format: ${input}`);
    }

    throw new Error(`Invalid timestamp _type: ${typeof input}`);
  }

  private calculateRelativeTime(_timestamp: number): string {
    const _now = Math.floor(Date.now() / 1000);
    const _diff = now - timestamp;
    const _absDiff = Math.abs(diff);

    if (absDiff < 60) {
      return diff === 0 ? 'now' : 
             diff > 0 ? `${diff} seconds ago` : `in ${absDiff} seconds`;
    } else if (absDiff < 3600) {
      const _minutes = Math.floor(absDiff / 60);
      return diff > 0 ? `${minutes} minutes ago` : `in ${minutes} minutes`;
    } else if (absDiff < 86400) {
      const _hours = Math.floor(absDiff / 3600);
      return diff > 0 ? `${hours} hours ago` : `in ${hours} hours`;
    } else {
      const _days = Math.floor(absDiff / 86400);
      return diff > 0 ? `${days} days ago` : `in ${days} days`;
    }
  }

  private calculateOffsetDifference(_fromTimezone: string, _toTimezone: string, _timestamp: number): number {
    try {
      const _date = new Date(timestamp * 1000);
      const _fromOffset = this.getTimezoneOffset(fromTimezone, date);
      const _toOffset = this.getTimezoneOffset(toTimezone, date);
      return toOffset - fromOffset;
    } catch (error) {
      return 0;
    }
  }

  private getTimezoneOffset(_timezone: string, _date: Date): number {
    try {
      const _utcDate = new Date(date.toLocaleString('en-US', { _timeZone: 'UTC' }));
      const _tzDate = new Date(date.toLocaleString('en-US', { _timeZone: timezone }));
      return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60); // in minutes
    } catch (error) {
      return 0;
    }
  }

  private isDaylightSavingTime(_timezone: string, _timestamp: number): boolean {
    try {
      const _date = new Date(timestamp * 1000);
      const _januaryOffset = this.getTimezoneOffset(timezone, new Date(date.getFullYear(), 0, 1));
      const _julyOffset = this.getTimezoneOffset(timezone, new Date(date.getFullYear(), 6, 1));
      const _currentOffset = this.getTimezoneOffset(timezone, date);
      
      return currentOffset !== Math.max(januaryOffset, julyOffset);
    } catch (error) {
      return false;
    }
  }
}

// Export the handler function for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _convertHandler = new UnifiedConvertHandler();
  await convertHandler.handle(req, res);
}