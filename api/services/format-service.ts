import { CustomFormat, FormatValidationResult, SupportedFormat, FormattedResult, FormatService } from '../types/api';

class FormatServiceImpl implements FormatService {
  private customFormats: Map<string, CustomFormat> = new Map();
  private formatPatterns: Map<string, RegExp> = new Map();

  constructor() {
    this.initializeStandardFormats();
  }

  private initializeStandardFormats(): void {
    // Standard ISO formats
    this.registerFormat('iso8601', {
      name: 'ISO 8601',
      pattern: 'YYYY-MM-DDTHH:mm:ss.sssZ',
      description: 'ISO 8601 format with timezone',
      example: '2024-01-15T14:30:00.000Z',
      category: 'standard'
    });

    this.registerFormat('iso8601-date', {
      name: 'ISO 8601 Date',
      pattern: 'YYYY-MM-DD',
      description: 'ISO 8601 date only',
      example: '2024-01-15',
      category: 'standard'
    });

    this.registerFormat('iso8601-time', {
      name: 'ISO 8601 Time',
      pattern: 'HH:mm:ss',
      description: 'ISO 8601 time only',
      example: '14:30:00',
      category: 'standard'
    });

    // Common formats
    this.registerFormat('rfc2822', {
      name: 'RFC 2822',
      pattern: 'ddd, DD MMM YYYY HH:mm:ss ZZ',
      description: 'RFC 2822 format used in email headers',
      example: 'Mon, 15 Jan 2024 14:30:00 +0000',
      category: 'standard'
    });

    this.registerFormat('unix-timestamp', {
      name: 'Unix Timestamp',
      pattern: 'X',
      description: 'Unix timestamp in seconds',
      example: '1642248600',
      category: 'standard'
    });

    this.registerFormat('millis-timestamp', {
      name: 'Milliseconds Timestamp',
      pattern: 'x',
      description: 'Unix timestamp in milliseconds',
      example: '1642248600000',
      category: 'standard'
    });

    // Human-readable formats
    this.registerFormat('relative', {
      name: 'Relative Time',
      pattern: 'relative',
      description: 'Human-readable relative time',
      example: '2 hours ago',
      category: 'human'
    });

    this.registerFormat('calendar', {
      name: 'Calendar',
      pattern: 'calendar',
      description: 'Calendar-style format',
      example: 'Today at 2:30 PM',
      category: 'human'
    });

    // US formats
    this.registerFormat('us-date', {
      name: 'US Date',
      pattern: 'MM/DD/YYYY',
      description: 'US date format',
      example: '01/15/2024',
      category: 'regional'
    });

    this.registerFormat('us-datetime', {
      name: 'US DateTime',
      pattern: 'MM/DD/YYYY h:mm A',
      description: 'US datetime format',
      example: '01/15/2024 2:30 PM',
      category: 'regional'
    });

    // European formats
    this.registerFormat('eu-date', {
      name: 'European Date',
      pattern: 'DD/MM/YYYY',
      description: 'European date format',
      example: '15/01/2024',
      category: 'regional'
    });

    this.registerFormat('eu-datetime', {
      name: 'European DateTime',
      pattern: 'DD/MM/YYYY HH:mm',
      description: 'European datetime format',
      example: '15/01/2024 14:30',
      category: 'regional'
    });

    // Asian formats
    this.registerFormat('ja-date', {
      name: 'Japanese Date',
      pattern: 'YYYY年MM月DD日',
      description: 'Japanese date format',
      example: '2024年01月15日',
      category: 'regional'
    });

    this.registerFormat('zh-date', {
      name: 'Chinese Date',
      pattern: 'YYYY年MM月DD日',
      description: 'Chinese date format',
      example: '2024年01月15日',
      category: 'regional'
    });

    // Technical formats
    this.registerFormat('sql-datetime', {
      name: 'SQL DateTime',
      pattern: 'YYYY-MM-DD HH:mm:ss',
      description: 'SQL datetime format',
      example: '2024-01-15 14:30:00',
      category: 'technical'
    });

    this.registerFormat('log-timestamp', {
      name: 'Log Timestamp',
      pattern: 'YYYY-MM-DD HH:mm:ss.SSS',
      description: 'Log file timestamp format',
      example: '2024-01-15 14:30:00.123',
      category: 'technical'
    });

    // File name friendly
    this.registerFormat('filename-date', {
      name: 'Filename Date',
      pattern: 'YYYYMMDD',
      description: 'Date format suitable for filenames',
      example: '20240115',
      category: 'technical'
    });

    this.registerFormat('filename-datetime', {
      name: 'Filename DateTime',
      pattern: 'YYYYMMDD_HHmmss',
      description: 'Datetime format suitable for filenames',
      example: '20240115_143000',
      category: 'technical'
    });
  }

  registerFormat(name: string, format: CustomFormat): void {
    this.customFormats.set(name, format);
    this.compilePattern(name, format.pattern);
  }

  private compilePattern(name: string, pattern: string): void {
    try {
      // Special cases for formats that don't need regex validation
      if (pattern === 'relative' || pattern === 'calendar') {
        return;
      }

      // Hard-coded patterns with strict validation
      const hardcodedPatterns: Record<string, string> = {
        'YYYY-MM-DD': '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])',
        'YYYY-MM-DD HH:mm:ss': '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01]) ([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d',
        'MM/DD/YYYY': '(0[1-9]|1[0-2])/(0[1-9]|[12]\\d|3[01])/\\d{4}',
        'DD/MM/YYYY': '(0[1-9]|[12]\\d|3[01])/(0[1-9]|1[0-2])/\\d{4}',
        'HH:mm:ss': '([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d',
        'YYYY年MM月DD日': '\\d{4}年(0[1-9]|1[0-2])月(0[1-9]|[12]\\d|3[01])日',
        'YYYYMMDD': '\\d{8}',
        'YYYYMMDD_HHmmss': '\\d{8}_\\d{6}',
        'YYYY-MM-DD HH:mm:ss.SSS': '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01]) ([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{3}',
        'MM/DD/YYYY h:mm A': '(0[1-9]|1[0-2])/(0[1-9]|[12]\\d|3[01])/\\d{4} (0?[1-9]|1[0-2]):[0-5]\\d (AM|PM)',
        'DD/MM/YYYY HH:mm': '(0[1-9]|[12]\\d|3[01])/(0[1-9]|1[0-2])/\\d{4} ([01]\\d|2[0-3]):[0-5]\\d',
        'YYYY-MM-DDTHH:mm:ss.sssZ': '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])T([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{3}Z',
        'ddd, DD MMM YYYY HH:mm:ss ZZ': '(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (0[1-9]|[12]\\d|3[01]) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{4} ([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d [+-]\\d{4}',
        'X': '\\d{10}',
        'x': '\\d{13}'
      };

      if (hardcodedPatterns[pattern]) {
        const finalRegex = new RegExp(`^${hardcodedPatterns[pattern]}$`);
        this.formatPatterns.set(name, finalRegex);
        return;
      }

      // Fallback: don't set any pattern, let validation fall back to parseDate
      console.warn(`No hardcoded pattern for "${pattern}", using parseDate fallback`);
      
    } catch (error) {
      console.warn(`Failed to compile pattern for ${name}:`, error);
      // Store a fallback pattern that matches any string for graceful degradation
      this.formatPatterns.set(name, new RegExp('.*'));
    }
  }

  getFormat(name: string): CustomFormat | undefined {
    return this.customFormats.get(name);
  }

  listFormats(): CustomFormat[] {
    return Array.from(this.customFormats.values());
  }

  listFormatsByCategory(category: string): CustomFormat[] {
    return this.listFormats().filter(format => format.category === category);
  }

  getSupportedFormats(): SupportedFormat[] {
    return this.listFormats().map(format => ({
      name: format.name,
      pattern: format.pattern,
      example: format.example,
      description: format.description,
      category: format.category as 'standard' | 'locale' | 'custom' | 'iso'
    }));
  }

  async format(timestamp: number, formats: string[], timezone?: string): Promise<FormattedResult[]> {
    const results: FormattedResult[] = [];
    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp: ${timestamp}`);
    }

    for (const formatName of formats) {
      try {
        const validation = this.validateFormat(formatName);
        if (!validation.valid) {
          results.push({
            format: formatName,
            result: '',
            success: false,
            error: validation.error
          });
          continue;
        }

        const formattedValue = this.formatDate(date, formatName, timezone);
        results.push({
          format: formatName,
          result: formattedValue,
          success: true
        });
      } catch (error) {
        results.push({
          format: formatName,
          result: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown formatting error'
        });
      }
    }

    return results;
  }

  validateFormat(formatName: string): FormatValidationResult {
    try {
      const format = this.getFormat(formatName);
      if (!format) {
        return {
          valid: false,
          error: `Format '${formatName}' not found`,
          suggestions: this.getSuggestions(formatName)
        };
      }

      return {
        valid: true,
        format: format.name
      };
    } catch (error) {
      return {
        valid: false,
        error: `Error validating format '${formatName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: this.getSuggestions(formatName)
      };
    }
  }

  private getSuggestions(input: string): string[] {
    const allFormats = this.listFormats();
    const suggestions = allFormats
      .filter(format => 
        format.name.toLowerCase().includes(input.toLowerCase()) ||
        format.category.toLowerCase().includes(input.toLowerCase())
      )
      .slice(0, 5)
      .map(format => format.name);

    return suggestions.length > 0 ? suggestions : ['iso8601', 'unix-timestamp', 'us-date'];
  }

  validateFormatValue(value: string, formatName: string): FormatValidationResult {
    try {
      const format = this.getFormat(formatName);
      if (!format) {
        return {
          valid: false,
          error: `Format '${formatName}' not found`,
          suggestions: this.getSuggestions(formatName)
        };
      }

      const pattern = this.formatPatterns.get(formatName);
      if (!pattern) {
        // If no pattern exists, try to parse the value
        try {
          this.parseDate(value, formatName);
          return {
            valid: true,
            format: format.name
          };
        } catch (error) {
          return {
            valid: false,
            error: `Unable to parse value '${value}' with format '${formatName}'`,
            suggestions: this.getSuggestions(formatName)
          };
        }
      }

      // First check if the pattern matches
      if (!pattern.test(value)) {
        return {
          valid: false,
          error: `Value '${value}' does not match format '${formatName}' pattern`,
          suggestions: this.getSuggestions(formatName)
        };
      }

      // For specific date formats, also validate that the date is actually valid
      if (formatName === 'iso8601-date') {
        try {
          const parts = value.split('-');
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          
          // Create a date and check if it matches the input
          const testDate = new Date(year, month - 1, day);
          if (testDate.getFullYear() !== year || 
              testDate.getMonth() !== month - 1 || 
              testDate.getDate() !== day) {
            return {
              valid: false,
              error: `Invalid date: '${value}' (date does not exist)`,
              suggestions: this.getSuggestions(formatName)
            };
          }
        } catch (error) {
          return {
            valid: false,
            error: `Invalid date: '${value}'`,
            suggestions: this.getSuggestions(formatName)
          };
        }
      }

      return {
        valid: true,
        format: format.name
      };
    } catch (error) {
      return {
        valid: false,
        error: `Error validating value: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: this.getSuggestions(formatName)
      };
    }
  }

  formatDate(date: Date, formatName: string, timezone?: string): string {
    const format = this.getFormat(formatName);
    if (!format) {
      throw new Error(`Format '${formatName}' not found`);
    }

    // Handle special formats
    if (formatName === 'relative') {
      return this.formatRelativeTime(date);
    }
    
    if (formatName === 'calendar') {
      return this.formatCalendarTime(date);
    }

    const targetDate = timezone ? this.applyTimezone(date, timezone) : date;
    return this.applyFormat(targetDate, format.pattern);
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

  private formatCalendarTime(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (diffDays === 0) return `Today at ${timeStr}`;
    if (diffDays === -1) return `Yesterday at ${timeStr}`;
    if (diffDays === 1) return `Tomorrow at ${timeStr}`;
    if (diffDays > -7 && diffDays < 0) return `${date.toLocaleDateString([], { weekday: 'long' })} at ${timeStr}`;
    
    return `${date.toLocaleDateString()} at ${timeStr}`;
  }

  private applyTimezone(date: Date, timezone: string): Date {
    try {
      const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      const tzDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
      return tzDate;
    } catch (error) {
      console.warn(`Invalid timezone '${timezone}', using original date`);
      return date; // Fallback to original date if timezone is invalid
    }
  }

  private applyFormat(date: Date, pattern: string): string {
    const replacements: Record<string, string> = {
      'YYYY': date.getFullYear().toString(),
      'MM': String(date.getMonth() + 1).padStart(2, '0'),
      'DD': String(date.getDate()).padStart(2, '0'),
      'HH': String(date.getHours()).padStart(2, '0'),
      'mm': String(date.getMinutes()).padStart(2, '0'),
      'ss': String(date.getSeconds()).padStart(2, '0'),
      'SSS': String(date.getMilliseconds()).padStart(3, '0'),
      'sss': String(date.getMilliseconds()).padStart(3, '0'),
      'h': (date.getHours() % 12 || 12).toString(),
      'hh': String(date.getHours() % 12 || 12).padStart(2, '0'),
      'A': date.getHours() >= 12 ? 'PM' : 'AM',
      'a': date.getHours() >= 12 ? 'pm' : 'am',
      'ddd': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
      'MMM': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()],
      'X': Math.floor(date.getTime() / 1000).toString(),
      'x': date.getTime().toString(),
      'ZZ': this.getTimezoneOffset(date),
      'Z': this.getTimezoneOffsetISO(date)
    };

    let result = pattern;
    // Sort by length descending to avoid partial replacements
    const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      const value = replacements[key];
      result = result.replace(new RegExp(key, 'g'), value);
    }

    return result;
  }

  private getTimezoneOffset(date: Date): string {
    const offset = -date.getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    return `${sign}${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`;
  }

  private getTimezoneOffsetISO(date: Date): string {
    const offset = -date.getTimezoneOffset();
    if (offset === 0) return 'Z';
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  parseDate(value: string, formatName: string): Date {
    const format = this.getFormat(formatName);
    if (!format) {
      throw new Error(`Format '${formatName}' not found`);
    }

    // For standard formats, use built-in parsing
    if (formatName === 'iso8601') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid ISO 8601 date: ${value}`);
      }
      return date;
    }
    
    if (formatName === 'iso8601-date') {
      // For date-only formats, parse manually to avoid timezone issues
      const parts = value.split('-');
      if (parts.length !== 3) {
        throw new Error(`Invalid ISO 8601 date: ${value}`);
      }
      
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const day = parseInt(parts[2]);
      
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error(`Invalid ISO 8601 date: ${value}`);
      }
      
      const date = new Date(year, month, day, 0, 0, 0, 0);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid ISO 8601 date: ${value}`);
      }
      return date;
    }
    
    if (formatName === 'unix-timestamp') {
      const timestamp = parseInt(value);
      if (isNaN(timestamp)) {
        throw new Error(`Invalid unix timestamp: ${value}`);
      }
      return new Date(timestamp * 1000);
    }
    
    if (formatName === 'millis-timestamp') {
      const timestamp = parseInt(value);
      if (isNaN(timestamp)) {
        throw new Error(`Invalid millisecond timestamp: ${value}`);
      }
      return new Date(timestamp);
    }

    // First validate the value against the format pattern
    const validationResult = this.validateFormatValue(value, formatName);
    if (!validationResult.valid) {
      throw new Error(`Value '${value}' does not match format '${formatName}': ${validationResult.error}`);
    }

    // Handle specific common formats manually for better accuracy
    if (formatName === 'sql-datetime') {
      // Parse SQL datetime format: YYYY-MM-DD HH:mm:ss
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
      if (!match) {
        throw new Error(`Value '${value}' does not match SQL datetime format`);
      }
      
      const [, year, month, day, hour, minute, second] = match;
      const parsedDate = new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second),
        0
      );
      
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date components in '${value}'`);
      }
      
      return parsedDate;
    }
    
    if (formatName === 'us-date') {
      // Parse US date format: MM/DD/YYYY
      const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) {
        throw new Error(`Value '${value}' does not match US date format`);
      }
      
      const [, month, day, year] = match;
      const parsedDate = new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        0, 0, 0, 0
      );
      
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date components in '${value}'`);
      }
      
      return parsedDate;
    }
    
    if (formatName === 'eu-date') {
      // Parse European date format: DD/MM/YYYY
      const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) {
        throw new Error(`Value '${value}' does not match European date format`);
      }
      
      const [, day, month, year] = match;
      const parsedDate = new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        0, 0, 0, 0
      );
      
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date components in '${value}'`);
      }
      
      return parsedDate;
    }
    
    if (formatName === 'ja-date' || formatName === 'zh-date') {
      // Parse Japanese/Chinese date format: YYYY年MM月DD日
      const match = value.match(/^(\d{4})年(\d{2})月(\d{2})日$/);
      if (!match) {
        throw new Error(`Value '${value}' does not match Asian date format`);
      }
      
      const [, year, month, day] = match;
      const parsedDate = new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        0, 0, 0, 0
      );
      
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date components in '${value}'`);
      }
      
      return parsedDate;
    }

    // For custom patterns, implement basic parsing
    const pattern = format.pattern;
    const regex = this.createParsingRegex(pattern);
    const match = value.match(regex);

    if (!match) {
      throw new Error(`Value '${value}' does not match format '${formatName}' pattern '${pattern}'`);
    }

    const groups = match.groups || {};
    const year = parseInt(groups.year || groups.YYYY || '0');
    const month = parseInt(groups.month || groups.MM || '1') - 1;
    const day = parseInt(groups.day || groups.DD || '1');
    const hour = parseInt(groups.hour || groups.HH || groups.h || '0');
    const minute = parseInt(groups.minute || groups.mm || '0');
    const second = parseInt(groups.second || groups.ss || '0');
    const millisecond = parseInt(groups.millisecond || groups.SSS || groups.sss || '0');

    const parsedDate = new Date(year, month, day, hour, minute, second, millisecond);
    
    // Validate the parsed date
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date components parsed from '${value}' with format '${formatName}'`);
    }

    return parsedDate;
  }

  private createParsingRegex(pattern: string): RegExp {
    try {
      const namedGroups: Record<string, string> = {
        'YYYY': '(?<year>\\d{4})',
        'MM': '(?<month>\\d{2})',
        'DD': '(?<day>\\d{2})',
        'HH': '(?<hour>\\d{2})',
        'h': '(?<hour>\\d{1,2})',
        'mm': '(?<minute>\\d{2})',
        'ss': '(?<second>\\d{2})',
        'SSS': '(?<millisecond>\\d{3})',
        'sss': '(?<millisecond>\\d{3})',
        'A': '(?<ampm>AM|PM)',
        'a': '(?<ampm>am|pm)',
        'ZZ': '(?<timezone>[+-]\\d{4})',
        'Z': '(?<timezone>[+-]\\d{2}:\\d{2}|[+-]\\d{4}|Z)',
        'X': '(?<timestamp>\\d+)',
        'x': '(?<millistimestamp>\\d+)',
        'ddd': '(?<weekday>Mon|Tue|Wed|Thu|Fri|Sat|Sun)',
        'MMM': '(?<monthname>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)',
        '年': '年',
        '月': '月',
        '日': '日'
      };

      let regexPattern = pattern;
      
      // Escape special regex characters in the pattern except for the placeholders
      regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Replace placeholders with their regex patterns (longest first to avoid conflicts)
      const sortedKeys = Object.keys(namedGroups).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        const value = namedGroups[key];
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regexPattern = regexPattern.replace(new RegExp(escapedKey, 'g'), value);
      }

      return new RegExp(`^${regexPattern}$`);
    } catch (error) {
      console.warn(`Failed to create parsing regex for pattern '${pattern}':`, error);
      // Return a fallback regex that captures the entire string
      return new RegExp('(.*)');
    }
  }

  exportFormats(): Record<string, any> {
    const formats = this.listFormats();
    return formats.reduce((acc, format) => {
      acc[format.name] = {
        pattern: format.pattern,
        description: format.description,
        example: format.example,
        category: format.category
      };
      return acc;
    }, {} as Record<string, any>);
  }
}

// Singleton instance
export const formatService = new FormatServiceImpl();
export default formatService;