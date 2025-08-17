import { VercelRequest, VercelResponse } from '@vercel/node';
import { convertTimestamp } from '../utils/conversion-utils';
import { BaseHandler, HandlerContext } from './base-handler';
// import { validateRequest } from '../utils/response'; // Currently unused

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
      enableRateLimit: true,
    });
  }

  protected async execute(_context: HandlerContext): Promise<ConvertResponse> {
    // Parse request parameters
    const _convertRequest = this.parseRequest(_context);

    // Validate request
    const _validation = this.validateConvertRequest(_convertRequest);
    if (!_validation.valid) {
      throw new Error(_validation.message);
    }

    // Perform conversion based on mode
    const _result = await this.performConversion(_convertRequest, _context);

    return {
      success: true,
      data: _result,
    };
  }

  private parseRequest(_context: HandlerContext): ConvertRequest {
    if (_context.method === 'GET') {
      const { timestamp, formats, timezone, targetTimezone, metadata, relative, priority, mode } =
        _context.query;

      if (!timestamp) {
        throw new Error('Timestamp parameter is required');
      }

      return {
        timestamp: timestamp === 'now' ? Math.floor(Date.now() / 1000) : (timestamp as string),
        outputFormats: formats ? (formats as string).split(',') : undefined,
        timezone: timezone as string,
        targetTimezone: targetTimezone as string,
        options: {
          includeMetadata: metadata === 'true',
          includeRelative: relative === 'true',
          priority: (priority as 'low' | 'normal' | 'high') || 'normal',
          mode: (mode as 'simple' | 'working' | 'standalone') || 'working',
        },
      };
    } else {
      // Validate request body for POST
      if (!_context.body || typeof _context.body !== 'object') {
        throw new Error('Invalid request body. Expected JSON object.');
      }

      const _request = _context.body as ConvertRequest;
      _request.options = {
        mode: 'working',
        ..._request.options,
      };

      return _request;
    }
  }

  private validateConvertRequest(_request: ConvertRequest): { valid: boolean; message?: string } {
    if (!_request.timestamp && _request.timestamp !== 0) {
      return {
        valid: false,
        message: 'Timestamp is required',
      };
    }

    if (
      _request.options?.priority &&
      !['low', 'normal', 'high'].includes(_request.options.priority)
    ) {
      return {
        valid: false,
        message: 'Priority must be one of: low, normal, high',
      };
    }

    if (_request.outputFormats && _request.outputFormats.length > 20) {
      return {
        valid: false,
        message: 'Too many output formats requested (max: 20)',
      };
    }

    if (
      _request.options?.mode &&
      !['simple', 'working', 'standalone'].includes(_request.options.mode)
    ) {
      return {
        valid: false,
        message: 'Mode must be one of: simple, working, standalone',
      };
    }

    return { valid: true };
  }

  private async performConversion(
    _request: ConvertRequest,
    _context: HandlerContext
  ): Promise<any> {
    const _mode = _request.options?.mode || 'working';
    const _priority = _request.options?.priority || 'normal';
    const _includeMetadata = _request.options?.includeMetadata ?? _mode !== 'simple';
    const _includeRelative = _request.options?.includeRelative ?? false;

    // Add processing delay based on priority (for working mode)
    if (_mode === 'working') {
      const _processingDelay = _priority === 'high' ? 0 : _priority === 'normal' ? 25 : 100;
      if (_processingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, _processingDelay));
      }
    }

    // Parse and validate timestamp
    const _timestamp = this.parseTimestamp(_request.timestamp);
    const _timezone = _request.timezone || 'UTC';
    const _targetTimezone = _request.targetTimezone;
    const outputFormats = _request.outputFormats || DEFAULT_OUTPUT_FORMATS;

    // Perform the conversion using existing utility
    const _conversionResult = await convertTimestamp(
      _timestamp,
      outputFormats,
      _timezone,
      _targetTimezone
    );

    // Add relative time if requested
    let relative: string | undefined;
    if (_includeRelative) {
      relative = this.calculateRelativeTime(_timestamp);
    }

    // Build metadata based on mode
    let metadata: Record<string, unknown> | undefined = undefined;
    if (_includeMetadata) {
      metadata = {
        originalTimezone: _timezone,
        targetTimezone: _targetTimezone,
        offsetDifference: _targetTimezone
          ? this.calculateOffsetDifference(_timezone, _targetTimezone, _timestamp)
          : undefined,
        isDST: this.isDaylightSavingTime(_targetTimezone || _timezone, _timestamp),
        processingPriority: _priority,
        processingTime: Date.now() - _context.startTime,
        cacheUsed: Math.random() > 0.7, // Simulate cache hit
        mode: _mode,
      };
    }

    return {
      input: _request.timestamp,
      timestamp: _timestamp,
      formats: _conversionResult.formats,
      timezone: _timezone,
      targetTimezone: _targetTimezone,
      relative,
      metadata,
    };
  }

  private parseTimestamp(_input: number | string): number {
    if (typeof _input === 'number') {
      // Handle both seconds and milliseconds
      return _input > 1e10 ? Math.floor(_input / 1000) : _input;
    }

    if (typeof _input === 'string') {
      // Handle special values
      if (_input.toLowerCase() === 'now') {
        return Math.floor(Date.now() / 1000);
      }

      // Try parsing as number first
      const _asNumber = parseFloat(_input);
      if (!isNaN(_asNumber) && isFinite(_asNumber)) {
        return _asNumber > 1e10 ? Math.floor(_asNumber / 1000) : _asNumber;
      }

      // Try parsing as date string
      const _date = new Date(_input);
      if (!isNaN(_date.getTime())) {
        return Math.floor(_date.getTime() / 1000);
      }

      throw new Error(`Invalid timestamp format: ${_input}`);
    }

    throw new Error(`Invalid timestamp type: ${typeof _input}`);
  }

  private calculateRelativeTime(_timestamp: number): string {
    const _now = Math.floor(Date.now() / 1000);
    const _diff = _now - _timestamp;
    const _absDiff = Math.abs(_diff);

    if (_absDiff < 60) {
      return _diff === 0 ? 'now' : _diff > 0 ? `${_diff} seconds ago` : `in ${_absDiff} seconds`;
    } else if (_absDiff < 3600) {
      const _minutes = Math.floor(_absDiff / 60);
      return _diff > 0 ? `${_minutes} minutes ago` : `in ${_minutes} minutes`;
    } else if (_absDiff < 86400) {
      const _hours = Math.floor(_absDiff / 3600);
      return _diff > 0 ? `${_hours} hours ago` : `in ${_hours} hours`;
    } else {
      const _days = Math.floor(_absDiff / 86400);
      return _diff > 0 ? `${_days} days ago` : `in ${_days} days`;
    }
  }

  private calculateOffsetDifference(
    _fromTimezone: string,
    _toTimezone: string,
    _timestamp: number
  ): number {
    try {
      const _date = new Date(_timestamp * 1000);
      const _fromOffset = this.getTimezoneOffset(_fromTimezone, _date);
      const _toOffset = this.getTimezoneOffset(_toTimezone, _date);
      return _toOffset - _fromOffset;
    } catch (error) {
      return 0;
    }
  }

  private getTimezoneOffset(_timezone: string, _date: Date): number {
    try {
      const _utcDate = new Date(_date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const _tzDate = new Date(_date.toLocaleString('en-US', { timeZone: _timezone }));
      return (_tzDate.getTime() - _utcDate.getTime()) / (1000 * 60); // in minutes
    } catch (error) {
      return 0;
    }
  }

  private isDaylightSavingTime(_timezone: string, _timestamp: number): boolean {
    try {
      const _date = new Date(_timestamp * 1000);
      const _januaryOffset = this.getTimezoneOffset(_timezone, new Date(_date.getFullYear(), 0, 1));
      const _julyOffset = this.getTimezoneOffset(_timezone, new Date(_date.getFullYear(), 6, 1));
      const _currentOffset = this.getTimezoneOffset(_timezone, _date);

      return _currentOffset !== Math.max(_januaryOffset, _julyOffset);
    } catch (error) {
      return false;
    }
  }
}

// Export the handler function for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _convertHandler = new UnifiedConvertHandler();
  await _convertHandler.handle(req, res);
}
