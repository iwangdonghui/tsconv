/**
 * Enhanced Format Convert API
 * Advanced time format conversion with intelligent detection and comprehensive format support
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createCacheMiddleware } from './middleware/cache';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { EnhancedFormatEngine } from './services/format-engine/enhanced-format-engine';
import { IntelligentFormatDetector } from './services/format-engine/intelligent-format-detector';
import { createSecurityMiddleware } from './services/security/unified-security-middleware';
import { createError, ErrorType, handleError } from './services/unified-error-handler';
import { withCors } from './utils/response';

interface EnhancedFormatRequest {
  input: string | number;
  inputFormat?: string;
  outputFormats: string[];
  timezone?: string;
  targetTimezone?: string;
  locale?: string;
  options?: {
    autoDetect?: boolean;
    includeAlternatives?: boolean;
    includeMetadata?: boolean;
    includeValidation?: boolean;
    strictMode?: boolean;
    fallbackToDefault?: boolean;
  };
}

interface EnhancedFormatResponse {
  success: boolean;
  data: {
    input: {
      value: string | number;
      detected_format?: {
        id: string;
        name: string;
        confidence: number;
        category: string;
      };
      parsed_date: string;
      validation: {
        is_valid: boolean;
        warnings: string[];
        suggestions: string[];
      };
    };
    output: {
      formats: Record<
        string,
        {
          value: string;
          format_info: {
            id: string;
            name: string;
            pattern: string;
            category: string;
          };
          metadata: {
            timezone_used: string;
            locale_used: string;
            precision_level: string;
            formatting_time_ms: number;
          };
        }
      >;
      alternatives?: Record<string, string[]>;
    };
    conversion: {
      timestamp: number;
      iso_date: string;
      timezone_info: {
        source: string;
        target: string;
        offset_hours: number;
      };
      processing_stats: {
        total_time_ms: number;
        detection_time_ms: number;
        parsing_time_ms: number;
        formatting_time_ms: number;
        cache_hits: number;
      };
    };
    intelligence: {
      format_suggestions: Array<{
        format: string;
        reason: string;
        use_case: string;
      }>;
      optimization_tips: string[];
      related_formats: string[];
      ambiguity_warnings: string[];
    };
  };
  metadata: {
    api_version: string;
    processing_time: number;
    cache_hit: boolean;
    request_id: string;
    supported_formats_count: number;
    detection_confidence: number;
  };
}

// Initialize components
const formatEngine = EnhancedFormatEngine.getInstance();
const formatDetector = IntelligentFormatDetector.getInstance();

/**
 * Main enhanced format conversion handler
 */
async function enhancedFormatConvertHandler(req: VercelRequest, res: VercelResponse) {
  withCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    const error = createError({
      type: ErrorType.BAD_REQUEST_ERROR,
      message: 'Only POST method is allowed',
      statusCode: 405,
    });
    return handleError(error, req, res);
  }

  const startTime = Date.now();
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `fmt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Validate request body
    const formatRequest: EnhancedFormatRequest = req.body;

    if (!formatRequest.input) {
      return handleError(
        createError({ type: ErrorType.VALIDATION_ERROR, message: 'Input is required' }),
        req,
        res
      );
    }

    if (!formatRequest.outputFormats || !Array.isArray(formatRequest.outputFormats)) {
      return handleError(
        createError({
          type: ErrorType.VALIDATION_ERROR,
          message: 'Output formats array is required',
        }),
        req,
        res
      );
    }

    if (formatRequest.outputFormats.length === 0) {
      return handleError(
        createError({
          type: ErrorType.VALIDATION_ERROR,
          message: 'At least one output format is required',
        }),
        req,
        res
      );
    }

    if (formatRequest.outputFormats.length > 20) {
      return handleError(
        createError({
          type: ErrorType.VALIDATION_ERROR,
          message: 'Too many output formats requested',
        }),
        req,
        res
      );
    }

    // Set default options
    const options = {
      autoDetect: true,
      includeAlternatives: false,
      includeMetadata: true,
      includeValidation: true,
      strictMode: false,
      fallbackToDefault: true,
      ...formatRequest.options,
    };

    const inputString = formatRequest.input.toString();
    let detectionResult;
    let parseResult;
    let parsedDate: Date;

    // Step 1: Format Detection (if auto-detect enabled or no input format specified)
    const detectionStartTime = Date.now();

    if (options.autoDetect || !formatRequest.inputFormat) {
      detectionResult = formatDetector.detectFormat(inputString);

      if (detectionResult.confidence < 0.3 && options.strictMode) {
        return handleError(
          createError({
            type: ErrorType.VALIDATION_ERROR,
            message: 'Unable to detect input format with sufficient confidence',
          }),
          req,
          res
        );
      }
    }

    const detectionTime = Date.now() - detectionStartTime;

    // Step 2: Parse Input
    const parseStartTime = Date.now();

    if (detectionResult && detectionResult.confidence > 0.5) {
      // Use detected format
      parseResult = formatEngine.parseInput(inputString);
      if (parseResult.success && parseResult.date) {
        parsedDate = parseResult.date;
      } else {
        throw new Error(
          `Failed to parse input using detected format: ${detectionResult.detected_format}`
        );
      }
    } else if (formatRequest.inputFormat) {
      // Use specified input format
      const format = formatEngine.getFormat(formatRequest.inputFormat);
      if (!format) {
        const error = createError({
          type: ErrorType.VALIDATION_ERROR,
          message: `Unsupported input format: ${formatRequest.inputFormat}`,
        });
        return handleError(error, req, res);
      }

      parseResult = formatEngine.parseInput(inputString);
      if (parseResult.success && parseResult.date) {
        parsedDate = parseResult.date;
      } else {
        throw new Error(
          `Failed to parse input using specified format: ${formatRequest.inputFormat}`
        );
      }
    } else {
      // Fallback to standard parsing
      if (options.fallbackToDefault) {
        parsedDate = new Date(inputString);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Unable to parse input as date');
        }
      } else {
        throw new Error('No valid input format detected or specified');
      }
    }

    const parseTime = Date.now() - parseStartTime;

    // Step 3: Format Output
    const formatStartTime = Date.now();
    const outputFormats: Record<string, any> = {};
    const alternatives: Record<string, string[]> = {};
    let cacheHits = 0;

    for (const outputFormat of formatRequest.outputFormats) {
      const formatResult = formatEngine.formatDate(
        parsedDate,
        outputFormat,
        formatRequest.targetTimezone || formatRequest.timezone,
        formatRequest.locale
      );

      if (formatResult.success) {
        outputFormats[outputFormat] = {
          value: formatResult.formatted,
          format_info: {
            id: formatResult.format.id,
            name: formatResult.format.name,
            pattern: formatResult.format.pattern,
            category: formatResult.format.category,
          },
          metadata: formatResult.metadata,
        };

        // Check if this was a cache hit (simplified check)
        if (formatResult.metadata.formatting_time_ms < 1) {
          cacheHits++;
        }

        // Generate alternatives if requested
        if (options.includeAlternatives) {
          const relatedFormats = formatEngine.getSupportedFormats(formatResult.format.category);
          alternatives[outputFormat] = relatedFormats
            .filter(f => f.id !== formatResult.format.id)
            .slice(0, 3)
            .map(f => f.name);
        }
      } else {
        // Handle format failure
        outputFormats[outputFormat] = {
          value: null,
          error: `Failed to format using ${outputFormat}`,
          format_info: formatResult.format
            ? {
                id: formatResult.format.id,
                name: formatResult.format.name,
                pattern: formatResult.format.pattern,
                category: formatResult.format.category,
              }
            : null,
          metadata: formatResult.metadata,
        };
      }
    }

    const formatTime = Date.now() - formatStartTime;

    // Step 4: Generate Intelligence Insights
    const formatSuggestions = generateFormatSuggestions(formatRequest.outputFormats, parsedDate);
    const optimizationTips = generateOptimizationTips(detectionResult, parseResult, formatRequest);
    const relatedFormats = findRelatedFormats(formatRequest.outputFormats);
    const ambiguityWarnings = detectionResult?.warnings || [];

    // Step 5: Calculate timezone information
    const timezoneInfo = calculateTimezoneInfo(
      formatRequest.timezone,
      formatRequest.targetTimezone,
      parsedDate
    );

    // Build response
    const response: EnhancedFormatResponse = {
      success: true,
      data: {
        input: {
          value: formatRequest.input,
          detected_format: detectionResult
            ? {
                id: detectionResult.detected_format,
                name: detectionResult.detected_format,
                confidence: detectionResult.confidence,
                category: 'detected',
              }
            : undefined,
          parsed_date: parsedDate.toISOString(),
          validation: {
            is_valid: !isNaN(parsedDate.getTime()),
            warnings: detectionResult?.warnings || [],
            suggestions: detectionResult?.suggestions || [],
          },
        },
        output: {
          formats: outputFormats,
          alternatives: options.includeAlternatives ? alternatives : undefined,
        },
        conversion: {
          timestamp: Math.floor(parsedDate.getTime() / 1000),
          iso_date: parsedDate.toISOString(),
          timezone_info: timezoneInfo,
          processing_stats: {
            total_time_ms: Date.now() - startTime,
            detection_time_ms: detectionTime,
            parsing_time_ms: parseTime,
            formatting_time_ms: formatTime,
            cache_hits: cacheHits,
          },
        },
        intelligence: {
          format_suggestions: formatSuggestions,
          optimization_tips: optimizationTips,
          related_formats: relatedFormats,
          ambiguity_warnings: ambiguityWarnings,
        },
      },
      metadata: {
        api_version: '2.0.0',
        processing_time: Date.now() - startTime,
        cache_hit: cacheHits > 0,
        request_id: requestId,
        supported_formats_count: formatEngine.getSupportedFormats().length,
        detection_confidence: detectionResult?.confidence || 0,
      },
    };

    // Set response headers
    res.setHeader('X-Format-Engine-Version', '2.0.0');
    res.setHeader('X-Detection-Confidence', (detectionResult?.confidence || 0).toFixed(3));
    res.setHeader('X-Processing-Time', (Date.now() - startTime).toString());
    res.setHeader('X-Cache-Hits', cacheHits.toString());

    return res.status(200).json(response);
  } catch (error) {
    console.error('Enhanced format conversion error:', error);

    return handleError(error as Error, req, res);
  }
}

/**
 * Generate format suggestions
 */
function generateFormatSuggestions(
  outputFormats: string[],
  _date: Date
): Array<{
  format: string;
  reason: string;
  use_case: string;
}> {
  const suggestions = [];
  // const formatEngine = EnhancedFormatEngine.getInstance(); // Currently not used

  // Suggest ISO format if not already included
  if (!outputFormats.includes('iso8601') && !outputFormats.includes('iso')) {
    suggestions.push({
      format: 'iso8601',
      reason: 'Standard format with timezone information',
      use_case: 'APIs and data exchange',
    });
  }

  // Suggest Unix timestamp for programming
  if (!outputFormats.includes('unix_seconds') && !outputFormats.includes('unix')) {
    suggestions.push({
      format: 'unix_seconds',
      reason: 'Widely used in programming and databases',
      use_case: 'Programming and system timestamps',
    });
  }

  // Suggest human-readable format
  if (!outputFormats.some(f => f.includes('human') || f.includes('readable'))) {
    suggestions.push({
      format: 'relative_time',
      reason: 'Easy to understand for end users',
      use_case: 'User interfaces and notifications',
    });
  }

  return suggestions;
}

/**
 * Generate optimization tips
 */
function generateOptimizationTips(
  detectionResult: any,
  _parseResult: any,
  request: EnhancedFormatRequest
): string[] {
  const tips = [];

  if (detectionResult && detectionResult.confidence < 0.7) {
    tips.push(
      'Consider specifying the input format explicitly for better performance and accuracy'
    );
  }

  if (request.outputFormats.length > 10) {
    tips.push('Consider reducing the number of output formats to improve response time');
  }

  if (!request.timezone && !request.targetTimezone) {
    tips.push('Specify timezone information for more accurate time conversions');
  }

  if (request.options?.includeAlternatives) {
    tips.push('Disable alternatives if not needed to reduce response size');
  }

  return tips;
}

/**
 * Find related formats
 */
function findRelatedFormats(outputFormats: string[]): string[] {
  const formatEngine = EnhancedFormatEngine.getInstance();
  const related = new Set<string>();

  outputFormats.forEach(formatId => {
    const format = formatEngine.getFormat(formatId);
    if (format) {
      const categoryFormats = formatEngine.getSupportedFormats(format.category);
      categoryFormats.forEach(f => {
        if (f.id !== formatId) {
          related.add(f.id);
        }
      });
    }
  });

  return Array.from(related).slice(0, 5);
}

/**
 * Calculate timezone information
 */
function calculateTimezoneInfo(
  sourceTimezone?: string,
  targetTimezone?: string,
  date?: Date
): {
  source: string;
  target: string;
  offset_hours: number;
} {
  const source = sourceTimezone || 'UTC';
  const target = targetTimezone || sourceTimezone || 'UTC';

  // Simplified offset calculation
  let offsetHours = 0;
  if (date && source !== target) {
    try {
      const sourceDate = new Date(date.toLocaleString('en-US', { timeZone: source }));
      const targetDate = new Date(date.toLocaleString('en-US', { timeZone: target }));
      offsetHours = (targetDate.getTime() - sourceDate.getTime()) / (1000 * 60 * 60);
    } catch (error) {
      // Fallback to 0 offset
    }
  }

  return {
    source,
    target,
    offset_hours: offsetHours,
  };
}

// Enhanced format convert API with comprehensive middleware stack
const securityMiddleware = createSecurityMiddleware({
  policyLevel: process.env.NODE_ENV === 'production' ? 'strict' : 'standard',
  enableThreatDetection: true,
  enableRealTimeBlocking: process.env.NODE_ENV === 'production',
  loggerConfig: {
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  },
});

// Error handling is now handled by the unified error handler

const enhancedFormatHandler = async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Apply security middleware first
    await new Promise<void>((resolve, reject) => {
      securityMiddleware(req, res, () => {
        // Then apply rate limiting
        createRateLimitMiddleware({
          ruleSelector: _req => ({
            identifier: '/api/enhanced-format-convert',
            limit: 200, // Higher limit for format conversion
            window: 60000,
            type: 'ip',
          }),
        })(
          // Apply caching with format-specific cache keys
          createCacheMiddleware({
            ttl: 15 * 60 * 1000, // 15 minutes
            cacheControlHeader: 'public, max-age=900, stale-while-revalidate=1800',
            keyGenerator: req => {
              const body = req.body || {};
              const cacheKey = `format:${body.input}:${JSON.stringify(body.outputFormats)}:${body.timezone}:${body.locale}`;
              return Buffer.from(cacheKey).toString('base64').slice(0, 64);
            },
          })(async (req: VercelRequest, res: VercelResponse) => {
            try {
              await enhancedFormatConvertHandler(req, res);
              resolve();
            } catch (error) {
              reject(error);
            }
          })
        )(req, res);
      });
    });
  } catch (error) {
    // Handle errors with unified error middleware
    return handleError(error as Error, req, res);
  }
};

export default enhancedFormatHandler;
