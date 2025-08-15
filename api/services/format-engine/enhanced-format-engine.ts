/**
 * Enhanced Format Engine
 * Comprehensive time format support with intelligent parsing and formatting
 */

export interface FormatDefinition {
  id: string;
  name: string;
  pattern: string;
  example: string;
  description: string;
  category: 'standard' | 'locale' | 'iso' | 'custom' | 'business' | 'technical' | 'cultural';
  aliases: string[];
  inputPatterns: RegExp[];
  outputFormatter: (date: Date, timezone?: string, locale?: string) => string;
  inputParser?: (input: string) => Date | null;
  validation?: (input: string) => boolean;
  metadata: {
    region?: string;
    language?: string;
    use_case?: string;
    precision?: 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year';
    timezone_aware?: boolean;
    locale_dependent?: boolean;
  };
}

export interface ParseResult {
  success: boolean;
  date?: Date;
  format?: FormatDefinition;
  confidence: number;
  alternatives: Array<{
    format: FormatDefinition;
    confidence: number;
    parsed_date: Date;
  }>;
  warnings: string[];
  metadata: {
    input_type: 'timestamp' | 'iso' | 'locale' | 'custom' | 'relative';
    detected_timezone?: string;
    detected_locale?: string;
    ambiguous_parts?: string[];
  };
}

export interface FormatResult {
  success: boolean;
  formatted?: string;
  format: FormatDefinition;
  metadata: {
    timezone_used: string;
    locale_used: string;
    precision_level: string;
    formatting_time_ms: number;
  };
  alternatives?: Array<{
    format: FormatDefinition;
    formatted: string;
  }>;
}

/**
 * Enhanced Format Engine with comprehensive format support
 */
export class EnhancedFormatEngine {
  private static instance: EnhancedFormatEngine;
  private formats: Map<string, FormatDefinition> = new Map();
  private aliasMap: Map<string, string> = new Map();
  private categoryIndex: Map<string, string[]> = new Map();
  private parseCache: Map<string, ParseResult> = new Map();
  private formatCache: Map<string, FormatResult> = new Map();

  constructor() {
    this.initializeFormats();
    this.buildIndices();
  }

  static getInstance(): EnhancedFormatEngine {
    if (!EnhancedFormatEngine.instance) {
      EnhancedFormatEngine.instance = new EnhancedFormatEngine();
    }
    return EnhancedFormatEngine.instance;
  }

  /**
   * Initialize comprehensive format definitions
   */
  private initializeFormats(): void {
    const formats: FormatDefinition[] = [
      // Standard ISO formats
      {
        id: 'iso8601',
        name: 'ISO 8601',
        pattern: 'YYYY-MM-DDTHH:mm:ss.sssZ',
        example: '2024-01-15T10:30:45.123Z',
        description: 'ISO 8601 standard format with milliseconds and UTC timezone',
        category: 'standard',
        aliases: ['iso', 'iso8601', 'standard'],
        inputPatterns: [
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?[+-]\d{2}:\d{2}$/,
        ],
        outputFormatter: date => date.toISOString(),
        metadata: {
          precision: 'second',
          timezone_aware: true,
          locale_dependent: false,
        },
      },

      // Unix timestamps
      {
        id: 'unix_seconds',
        name: 'Unix Timestamp (Seconds)',
        pattern: 'X',
        example: '1705315845',
        description: 'Unix timestamp in seconds since epoch (January 1, 1970)',
        category: 'standard',
        aliases: ['unix', 'timestamp', 'epoch'],
        inputPatterns: [/^\d{10}$/],
        outputFormatter: date => Math.floor(date.getTime() / 1000).toString(),
        inputParser: input => new Date(parseInt(input) * 1000),
        validation: input => {
          const num = parseInt(input);
          return num >= 0 && num <= 2147483647; // Valid Unix timestamp range
        },
        metadata: {
          precision: 'second',
          timezone_aware: false,
          locale_dependent: false,
        },
      },

      {
        id: 'unix_milliseconds',
        name: 'Unix Timestamp (Milliseconds)',
        pattern: 'x',
        example: '1705315845123',
        description: 'Unix timestamp in milliseconds since epoch',
        category: 'standard',
        aliases: ['unix-ms', 'timestamp-ms', 'epoch-ms'],
        inputPatterns: [/^\d{13}$/],
        outputFormatter: date => date.getTime().toString(),
        inputParser: input => new Date(parseInt(input)),
        metadata: {
          precision: 'second',
          timezone_aware: false,
          locale_dependent: false,
        },
      },

      // Business formats
      {
        id: 'excel_date',
        name: 'Excel Date Serial',
        pattern: 'Excel Serial',
        example: '45310.4379861111',
        description: 'Excel date serial number (days since January 1, 1900)',
        category: 'business',
        aliases: ['excel', 'excel-serial', 'spreadsheet'],
        inputPatterns: [/^\d+(\.\d+)?$/],
        outputFormatter: date => {
          const excelEpoch = new Date(1900, 0, 1);
          const diffTime = date.getTime() - excelEpoch.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return (diffDays + 2).toString(); // Excel has a leap year bug for 1900
        },
        inputParser: input => {
          const serial = parseFloat(input);
          const excelEpoch = new Date(1900, 0, 1);
          return new Date(excelEpoch.getTime() + (serial - 2) * 24 * 60 * 60 * 1000);
        },
        metadata: {
          precision: 'day',
          timezone_aware: false,
          locale_dependent: false,
          use_case: 'spreadsheet',
        },
      },

      // Database formats
      {
        id: 'mysql_datetime',
        name: 'MySQL DATETIME',
        pattern: 'YYYY-MM-DD HH:mm:ss',
        example: '2024-01-15 10:30:45',
        description: 'MySQL DATETIME format',
        category: 'technical',
        aliases: ['mysql', 'sql-datetime', 'database'],
        inputPatterns: [/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/],
        outputFormatter: date => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        },
        metadata: {
          precision: 'second',
          timezone_aware: false,
          locale_dependent: false,
          use_case: 'database',
        },
      },

      // Cultural formats
      {
        id: 'chinese_traditional',
        name: 'Chinese Traditional',
        pattern: 'YYYY年MM月DD日 HH时mm分ss秒',
        example: '2024年01月15日 10时30分45秒',
        description: 'Traditional Chinese date format',
        category: 'cultural',
        aliases: ['chinese', 'zh-cn', 'traditional-chinese'],
        inputPatterns: [/^\d{4}年\d{1,2}月\d{1,2}日( \d{1,2}时\d{1,2}分\d{1,2}秒)?$/],
        outputFormatter: date => {
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const hours = date.getHours();
          const minutes = date.getMinutes();
          const seconds = date.getSeconds();
          return `${year}年${month}月${day}日 ${hours}时${minutes}分${seconds}秒`;
        },
        metadata: {
          precision: 'second',
          timezone_aware: false,
          locale_dependent: true,
          language: 'zh',
          region: 'CN',
        },
      },

      {
        id: 'japanese_era',
        name: 'Japanese Era',
        pattern: 'Reiwa YY年MM月DD日',
        example: '令和6年1月15日',
        description: 'Japanese era-based date format',
        category: 'cultural',
        aliases: ['japanese', 'ja-jp', 'era-japanese'],
        inputPatterns: [/^(令和|平成|昭和)\d{1,2}年\d{1,2}月\d{1,2}日$/],
        outputFormatter: date => {
          // Simplified Reiwa era calculation (started May 1, 2019)
          const reiwaStart = new Date(2019, 4, 1);
          if (date >= reiwaStart) {
            const reiwaYear = date.getFullYear() - 2018;
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `令和${reiwaYear}年${month}月${day}日`;
          }
          // Fallback to Gregorian
          return date.toLocaleDateString('ja-JP');
        },
        metadata: {
          precision: 'day',
          timezone_aware: false,
          locale_dependent: true,
          language: 'ja',
          region: 'JP',
        },
      },

      // Technical formats
      {
        id: 'rfc3339',
        name: 'RFC 3339',
        pattern: 'YYYY-MM-DDTHH:mm:ss.sssZ',
        example: '2024-01-15T10:30:45.123Z',
        description: 'RFC 3339 internet date/time format',
        category: 'technical',
        aliases: ['rfc3339', 'internet-datetime'],
        inputPatterns: [/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)$/],
        outputFormatter: date => date.toISOString(),
        metadata: {
          precision: 'second',
          timezone_aware: true,
          locale_dependent: false,
          use_case: 'internet',
        },
      },

      {
        id: 'log_format',
        name: 'Log Format',
        pattern: 'YYYY-MM-DD HH:mm:ss.SSS',
        example: '2024-01-15 10:30:45.123',
        description: 'Common log file timestamp format',
        category: 'technical',
        aliases: ['log', 'syslog', 'application-log'],
        inputPatterns: [/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/],
        outputFormatter: date => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          const ms = String(date.getMilliseconds()).padStart(3, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
        },
        metadata: {
          precision: 'second',
          timezone_aware: false,
          locale_dependent: false,
          use_case: 'logging',
        },
      },

      // Relative formats
      {
        id: 'relative_time',
        name: 'Relative Time',
        pattern: 'relative',
        example: '2 hours ago',
        description: 'Human-readable relative time (e.g., "2 hours ago", "in 3 days")',
        category: 'standard',
        aliases: ['relative', 'ago', 'human-relative'],
        inputPatterns: [
          /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/,
          /^in\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?$/,
        ],
        outputFormatter: date => this.formatRelativeTime(date),
        inputParser: input => this.parseRelativeTime(input),
        metadata: {
          precision: 'minute',
          timezone_aware: false,
          locale_dependent: true,
        },
      },
    ];

    // Register all formats
    formats.forEach(format => {
      this.formats.set(format.id, format);

      // Register aliases
      format.aliases.forEach(alias => {
        this.aliasMap.set(alias.toLowerCase(), format.id);
      });
    });
  }

  /**
   * Build search indices
   */
  private buildIndices(): void {
    this.formats.forEach((format, id) => {
      // Category index
      if (!this.categoryIndex.has(format.category)) {
        this.categoryIndex.set(format.category, []);
      }
      this.categoryIndex.get(format.category)!.push(id);
    });
  }

  /**
   * Parse input string to detect format and extract date
   */
  parseInput(input: string): ParseResult {
    const cacheKey = `parse:${input}`;
    if (this.parseCache.has(cacheKey)) {
      return this.parseCache.get(cacheKey)!;
    }

    const result: ParseResult = {
      success: false,
      confidence: 0,
      alternatives: [],
      warnings: [],
      metadata: {
        input_type: 'custom',
      },
    };

    // Try each format
    const candidates: Array<{
      format: FormatDefinition;
      confidence: number;
      parsed_date: Date;
    }> = [];

    this.formats.forEach(format => {
      for (const pattern of format.inputPatterns) {
        if (pattern.test(input)) {
          try {
            let parsedDate: Date | null;

            if (format.inputParser) {
              parsedDate = format.inputParser(input);
            } else {
              parsedDate = new Date(input);
            }

            if (parsedDate && !isNaN(parsedDate.getTime())) {
              // Calculate confidence based on pattern specificity
              const confidence = this.calculateParseConfidence(input, format, pattern);

              candidates.push({
                format,
                confidence,
                parsed_date: parsedDate,
              });
            }
          } catch (error) {
            // Parsing failed for this format
          }
        }
      }
    });

    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    if (candidates.length > 0) {
      const best = candidates[0];
      if (best) {
        result.success = true;
        result.date = best.parsed_date;
        result.format = best.format;
        result.confidence = best.confidence;
      }
      result.alternatives = candidates.slice(1, 4); // Top 3 alternatives
      result.metadata.input_type = this.detectInputType(input);
    }

    // Cache result
    this.parseCache.set(cacheKey, result);
    return result;
  }

  /**
   * Format date using specified format
   */
  formatDate(date: Date, formatId: string, timezone?: string, locale?: string): FormatResult {
    const startTime = Date.now();
    const cacheKey = `format:${date.getTime()}:${formatId}:${timezone}:${locale}`;

    if (this.formatCache.has(cacheKey)) {
      return this.formatCache.get(cacheKey)!;
    }

    // Resolve format ID (handle aliases)
    const resolvedId = this.aliasMap.get(formatId.toLowerCase()) || formatId;
    const format = this.formats.get(resolvedId);

    if (!format) {
      return {
        success: false,
        format: {} as FormatDefinition,
        metadata: {
          timezone_used: timezone || 'UTC',
          locale_used: locale || 'en-US',
          precision_level: 'unknown',
          formatting_time_ms: Date.now() - startTime,
        },
      };
    }

    try {
      const formatted = format.outputFormatter(date, timezone, locale);

      const result: FormatResult = {
        success: true,
        formatted,
        format,
        metadata: {
          timezone_used: timezone || 'UTC',
          locale_used: locale || 'en-US',
          precision_level: format.metadata.precision || 'second',
          formatting_time_ms: Date.now() - startTime,
        },
      };

      // Cache result
      this.formatCache.set(cacheKey, result);
      return result;
    } catch (error) {
      return {
        success: false,
        format,
        metadata: {
          timezone_used: timezone || 'UTC',
          locale_used: locale || 'en-US',
          precision_level: format.metadata.precision || 'second',
          formatting_time_ms: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Get all supported formats
   */
  getSupportedFormats(category?: string): FormatDefinition[] {
    if (category) {
      const formatIds = this.categoryIndex.get(category) || [];
      return formatIds.map(id => this.formats.get(id)!).filter(Boolean);
    }

    return Array.from(this.formats.values());
  }

  /**
   * Get format by ID or alias
   */
  getFormat(identifier: string): FormatDefinition | null {
    const resolvedId = this.aliasMap.get(identifier.toLowerCase()) || identifier;
    return this.formats.get(resolvedId) || null;
  }

  /**
   * Calculate parse confidence
   */
  private calculateParseConfidence(
    input: string,
    format: FormatDefinition,
    pattern: RegExp
  ): number {
    let confidence = 0.5; // Base confidence

    // Pattern specificity bonus
    const patternComplexity = pattern.source.length;
    confidence += Math.min(patternComplexity / 100, 0.3);

    // Exact match bonus
    if (format.example === input) {
      confidence += 0.4;
    }

    // Format category bonus
    if (format.category === 'standard') {
      confidence += 0.1;
    }

    // Validation bonus
    if (format.validation && format.validation(input)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Detect input type
   */
  private detectInputType(input: string): 'timestamp' | 'iso' | 'locale' | 'custom' | 'relative' {
    if (/^\d+$/.test(input)) {
      return 'timestamp';
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(input)) {
      return 'iso';
    }

    if (/ago|in \d+/.test(input)) {
      return 'relative';
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(input)) {
      return 'locale';
    }

    return 'custom';
  }

  /**
   * Format relative time
   */
  private formatRelativeTime(date: Date, baseDate: Date = new Date()): string {
    const diffInSeconds = Math.floor((baseDate.getTime() - date.getTime()) / 1000);
    const absDiff = Math.abs(diffInSeconds);

    const units = [
      { name: 'year', seconds: 31536000 },
      { name: 'month', seconds: 2592000 },
      { name: 'week', seconds: 604800 },
      { name: 'day', seconds: 86400 },
      { name: 'hour', seconds: 3600 },
      { name: 'minute', seconds: 60 },
      { name: 'second', seconds: 1 },
    ];

    for (const unit of units) {
      const count = Math.floor(absDiff / unit.seconds);
      if (count >= 1) {
        const plural = count > 1 ? 's' : '';
        if (diffInSeconds > 0) {
          return `${count} ${unit.name}${plural} ago`;
        } else {
          return `in ${count} ${unit.name}${plural}`;
        }
      }
    }

    return 'just now';
  }

  /**
   * Parse relative time
   */
  private parseRelativeTime(input: string): Date | null {
    const now = new Date();

    // Parse "X units ago"
    const agoMatch = input.match(/^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/);
    if (agoMatch) {
      const amount = parseInt(agoMatch[1] || '0');
      const unit = agoMatch[2] || 'second';
      return this.subtractTime(now, amount, unit);
    }

    // Parse "in X units"
    const inMatch = input.match(/^in\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?$/);
    if (inMatch) {
      const amount = parseInt(inMatch[1] || '0');
      const unit = inMatch[2] || 'second';
      return this.addTime(now, amount, unit);
    }

    return null;
  }

  /**
   * Add time to date
   */
  private addTime(date: Date, amount: number, unit: string): Date {
    const result = new Date(date);

    switch (unit) {
      case 'second':
        result.setSeconds(result.getSeconds() + amount);
        break;
      case 'minute':
        result.setMinutes(result.getMinutes() + amount);
        break;
      case 'hour':
        result.setHours(result.getHours() + amount);
        break;
      case 'day':
        result.setDate(result.getDate() + amount);
        break;
      case 'week':
        result.setDate(result.getDate() + amount * 7);
        break;
      case 'month':
        result.setMonth(result.getMonth() + amount);
        break;
      case 'year':
        result.setFullYear(result.getFullYear() + amount);
        break;
    }

    return result;
  }

  /**
   * Subtract time from date
   */
  private subtractTime(date: Date, amount: number, unit: string): Date {
    return this.addTime(date, -amount, unit);
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.parseCache.clear();
    this.formatCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    parseCache: { size: number; hitRate: number };
    formatCache: { size: number; hitRate: number };
  } {
    return {
      parseCache: {
        size: this.parseCache.size,
        hitRate: 0, // Would need to track hits/misses
      },
      formatCache: {
        size: this.formatCache.size,
        hitRate: 0, // Would need to track hits/misses
      },
    };
  }
}

export default EnhancedFormatEngine;
