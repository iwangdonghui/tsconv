/**
 * Intelligent Format Detector
 * Advanced format detection with machine learning-inspired algorithms
 */

export interface DetectionPattern {
  id: string;
  name: string;
  regex: RegExp;
  confidence: number;
  category: string;
  examples: string[];
  validator?: (input: string) => boolean;
  extractor?: (input: string) => { [key: string]: string | number };
}

export interface DetectionResult {
  detected_format: string;
  confidence: number;
  alternatives: Array<{
    format: string;
    confidence: number;
    reason: string;
  }>;
  metadata: {
    input_length: number;
    character_analysis: {
      digits: number;
      letters: number;
      symbols: number;
      spaces: number;
    };
    pattern_matches: string[];
    ambiguity_score: number;
    processing_time_ms: number;
  };
  suggestions: string[];
  warnings: string[];
}

export interface FormatStatistics {
  total_detections: number;
  format_frequency: Record<string, number>;
  confidence_distribution: {
    high: number; // > 0.8
    medium: number; // 0.5 - 0.8
    low: number; // < 0.5
  };
  common_patterns: Array<{
    pattern: string;
    frequency: number;
    examples: string[];
  }>;
  error_patterns: Array<{
    input: string;
    attempted_formats: string[];
    error_reason: string;
  }>;
}

/**
 * Intelligent Format Detector
 */
export class IntelligentFormatDetector {
  private static instance: IntelligentFormatDetector;
  private patterns: DetectionPattern[] = [];
  private statistics: FormatStatistics;
  private detectionHistory: Array<{
    input: string;
    result: DetectionResult;
    timestamp: number;
  }> = [];

  constructor() {
    this.statistics = this.initializeStatistics();
    this.initializePatterns();
  }

  static getInstance(): IntelligentFormatDetector {
    if (!IntelligentFormatDetector.instance) {
      IntelligentFormatDetector.instance = new IntelligentFormatDetector();
    }
    return IntelligentFormatDetector.instance;
  }

  /**
   * Initialize detection patterns
   */
  private initializePatterns(): void {
    this.patterns = [
      // Unix timestamps
      {
        id: 'unix_seconds',
        name: 'Unix Timestamp (Seconds)',
        regex: /^\d{10}$/,
        confidence: 0.95,
        category: 'timestamp',
        examples: ['1705315845', '1640995200'],
        validator: input => {
          const num = parseInt(input);
          return num >= 946684800 && num <= 2147483647; // 2000-01-01 to 2038-01-19
        },
      },

      {
        id: 'unix_milliseconds',
        name: 'Unix Timestamp (Milliseconds)',
        regex: /^\d{13}$/,
        confidence: 0.95,
        category: 'timestamp',
        examples: ['1705315845123', '1640995200000'],
        validator: input => {
          const num = parseInt(input);
          return num >= 946684800000 && num <= 2147483647000;
        },
      },

      // ISO formats
      {
        id: 'iso8601_full',
        name: 'ISO 8601 Full',
        regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)$/,
        confidence: 0.98,
        category: 'iso',
        examples: ['2024-01-15T10:30:45.123Z', '2024-01-15T10:30:45+05:30'],
        extractor: input => {
          const match = input.match(
            /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{3})?(.+)$/
          );
          if (match) {
            return {
              year: parseInt(match[1] || '0'),
              month: parseInt(match[2] || '0'),
              day: parseInt(match[3] || '0'),
              hour: parseInt(match[4] || '0'),
              minute: parseInt(match[5] || '0'),
              second: parseInt(match[6] || '0'),
              timezone: match[8],
            };
          }
          return {};
        },
      },

      {
        id: 'iso8601_date',
        name: 'ISO 8601 Date Only',
        regex: /^\d{4}-\d{2}-\d{2}$/,
        confidence: 0.9,
        category: 'iso',
        examples: ['2024-01-15', '2023-12-31'],
      },

      {
        id: 'iso8601_datetime',
        name: 'ISO 8601 DateTime (No Timezone)',
        regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
        confidence: 0.85,
        category: 'iso',
        examples: ['2024-01-15T10:30:45'],
      },

      // US formats
      {
        id: 'us_date_slash',
        name: 'US Date (MM/DD/YYYY)',
        regex: /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}$/,
        confidence: 0.75,
        category: 'locale',
        examples: ['01/15/2024', '12/31/2023', '1/1/2024'],
        validator: input => {
          const [month, day, year] = input.split('/').map(Number);
          return month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900;
        },
      },

      {
        id: 'us_datetime_slash',
        name: 'US DateTime (MM/DD/YYYY HH:mm:ss)',
        regex:
          /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?$/i,
        confidence: 0.8,
        category: 'locale',
        examples: ['01/15/2024 10:30:45', '12/31/2023 11:59 PM'],
      },

      // European formats
      {
        id: 'eu_date_slash',
        name: 'European Date (DD/MM/YYYY)',
        regex: /^(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/\d{4}$/,
        confidence: 0.7, // Lower confidence due to ambiguity with US format
        category: 'locale',
        examples: ['15/01/2024', '31/12/2023'],
      },

      {
        id: 'eu_date_dot',
        name: 'European Date (DD.MM.YYYY)',
        regex: /^(0?[1-9]|[12]\d|3[01])\.(0?[1-9]|1[0-2])\.\d{4}$/,
        confidence: 0.85,
        category: 'locale',
        examples: ['15.01.2024', '31.12.2023'],
      },

      // Database formats
      {
        id: 'mysql_datetime',
        name: 'MySQL DATETIME',
        regex: /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/,
        confidence: 0.9,
        category: 'database',
        examples: ['2024-01-15 10:30:45', '2023-12-31 23:59:59'],
      },

      {
        id: 'mysql_timestamp',
        name: 'MySQL TIMESTAMP',
        regex: /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{6}$/,
        confidence: 0.95,
        category: 'database',
        examples: ['2024-01-15 10:30:45.123456'],
      },

      // RFC formats
      {
        id: 'rfc2822',
        name: 'RFC 2822',
        regex: /^[A-Za-z]{3},\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+[+-]\d{4}$/,
        confidence: 0.95,
        category: 'rfc',
        examples: ['Mon, 15 Jan 2024 10:30:45 +0000'],
      },

      // Log formats
      {
        id: 'apache_log',
        name: 'Apache Log Format',
        regex: /^\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s+[+-]\d{4}$/,
        confidence: 0.9,
        category: 'log',
        examples: ['15/Jan/2024:10:30:45 +0000'],
      },

      {
        id: 'syslog',
        name: 'Syslog Format',
        regex: /^[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}$/,
        confidence: 0.85,
        category: 'log',
        examples: ['Jan 15 10:30:45'],
      },

      // Relative time
      {
        id: 'relative_ago',
        name: 'Relative Time (Ago)',
        regex: /^\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i,
        confidence: 0.95,
        category: 'relative',
        examples: ['2 hours ago', '3 days ago', '1 week ago'],
      },

      {
        id: 'relative_in',
        name: 'Relative Time (Future)',
        regex: /^in\s+\d+\s+(second|minute|hour|day|week|month|year)s?$/i,
        confidence: 0.95,
        category: 'relative',
        examples: ['in 2 hours', 'in 3 days', 'in 1 week'],
      },

      // Excel formats
      {
        id: 'excel_serial',
        name: 'Excel Serial Date',
        regex: /^\d{5}\.\d+$/,
        confidence: 0.7,
        category: 'business',
        examples: ['45310.4379861111'],
        validator: input => {
          const num = parseFloat(input);
          return num >= 1 && num <= 2958465; // Valid Excel date range
        },
      },

      // Cultural formats
      {
        id: 'chinese_traditional',
        name: 'Chinese Traditional',
        regex: /^\d{4}年\d{1,2}月\d{1,2}日(\s+\d{1,2}时\d{1,2}分\d{1,2}秒)?$/,
        confidence: 0.95,
        category: 'cultural',
        examples: ['2024年1月15日', '2024年1月15日 10时30分45秒'],
      },

      {
        id: 'japanese_era',
        name: 'Japanese Era',
        regex: /^(令和|平成|昭和)\d{1,2}年\d{1,2}月\d{1,2}日$/,
        confidence: 0.95,
        category: 'cultural',
        examples: ['令和6年1月15日', '平成35年12月31日'],
      },
    ];
  }

  /**
   * Detect format of input string
   */
  detectFormat(input: string): DetectionResult {
    const startTime = Date.now();
    const trimmedInput = input.trim();

    // Character analysis
    const charAnalysis = this.analyzeCharacters(trimmedInput);

    // Find matching patterns
    const matches: Array<{
      pattern: DetectionPattern;
      confidence: number;
      reason: string;
    }> = [];

    for (const pattern of this.patterns) {
      if (pattern.regex.test(trimmedInput)) {
        let confidence = pattern.confidence;
        let reason = `Matches ${pattern.name} pattern`;

        // Apply validator if available
        if (pattern.validator) {
          if (pattern.validator(trimmedInput)) {
            confidence += 0.05;
            reason += ' (validated)';
          } else {
            confidence -= 0.2;
            reason += ' (validation failed)';
          }
        }

        // Adjust confidence based on character analysis
        confidence = this.adjustConfidenceByCharacters(confidence, pattern, charAnalysis);

        matches.push({
          pattern,
          confidence: Math.max(0, Math.min(1, confidence)),
          reason,
        });
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    // Calculate ambiguity score
    const ambiguityScore = this.calculateAmbiguityScore(matches);

    // Generate suggestions and warnings
    const suggestions = this.generateSuggestions(trimmedInput, matches, charAnalysis);
    const warnings = this.generateWarnings(trimmedInput, matches, ambiguityScore);

    const result: DetectionResult = {
      detected_format: matches.length > 0 ? matches[0].pattern.id : 'unknown',
      confidence: matches.length > 0 ? matches[0].confidence : 0,
      alternatives: matches.slice(1, 4).map(match => ({
        format: match.pattern.id,
        confidence: match.confidence,
        reason: match.reason,
      })),
      metadata: {
        input_length: trimmedInput.length,
        character_analysis: charAnalysis,
        pattern_matches: matches.map(m => m.pattern.id),
        ambiguity_score: ambiguityScore,
        processing_time_ms: Date.now() - startTime,
      },
      suggestions,
      warnings,
    };

    // Update statistics
    this.updateStatistics(trimmedInput, result);

    // Store in history
    this.detectionHistory.push({
      input: trimmedInput,
      result,
      timestamp: Date.now(),
    });

    // Cleanup old history
    if (this.detectionHistory.length > 1000) {
      this.detectionHistory = this.detectionHistory.slice(-500);
    }

    return result;
  }

  /**
   * Analyze character composition
   */
  private analyzeCharacters(input: string): {
    digits: number;
    letters: number;
    symbols: number;
    spaces: number;
  } {
    const analysis = { digits: 0, letters: 0, symbols: 0, spaces: 0 };

    for (const char of input) {
      if (/\d/.test(char)) {
        analysis.digits++;
      } else if (/[a-zA-Z]/.test(char)) {
        analysis.letters++;
      } else if (char === ' ') {
        analysis.spaces++;
      } else {
        analysis.symbols++;
      }
    }

    return analysis;
  }

  /**
   * Adjust confidence based on character analysis
   */
  private adjustConfidenceByCharacters(
    baseConfidence: number,
    pattern: DetectionPattern,
    charAnalysis: { digits: number; letters: number; symbols: number; spaces: number }
  ): number {
    let adjustment = 0;

    // Timestamp patterns should be mostly digits
    if (pattern.category === 'timestamp') {
      const digitRatio =
        charAnalysis.digits /
        (charAnalysis.digits + charAnalysis.letters + charAnalysis.symbols + charAnalysis.spaces);
      if (digitRatio > 0.9) {
        adjustment += 0.1;
      } else if (digitRatio < 0.7) {
        adjustment -= 0.2;
      }
    }

    // ISO patterns should have specific symbol patterns
    if (pattern.category === 'iso') {
      if (charAnalysis.symbols >= 2) {
        // At least dashes and colons
        adjustment += 0.05;
      }
    }

    // Cultural patterns should have letters
    if (pattern.category === 'cultural') {
      if (charAnalysis.letters > 0) {
        adjustment += 0.1;
      }
    }

    return baseConfidence + adjustment;
  }

  /**
   * Calculate ambiguity score
   */
  private calculateAmbiguityScore(
    matches: Array<{ pattern: DetectionPattern; confidence: number }>
  ): number {
    if (matches.length <= 1) {
      return 0;
    }

    // Check confidence spread
    const topConfidence = matches[0].confidence;
    const secondConfidence = matches[1].confidence;
    const confidenceDiff = topConfidence - secondConfidence;

    // High ambiguity if top matches are close in confidence
    if (confidenceDiff < 0.1) {
      return 0.9;
    } else if (confidenceDiff < 0.2) {
      return 0.6;
    } else if (confidenceDiff < 0.3) {
      return 0.3;
    }

    return 0.1;
  }

  /**
   * Generate suggestions
   */
  private generateSuggestions(
    input: string,
    matches: Array<{ pattern: DetectionPattern; confidence: number }>,
    charAnalysis: { digits: number; letters: number; symbols: number; spaces: number }
  ): string[] {
    const suggestions: string[] = [];

    if (matches.length === 0) {
      suggestions.push('No format detected. Try using a standard format like ISO 8601.');

      if (charAnalysis.digits > 8 && charAnalysis.letters === 0) {
        suggestions.push("Input appears to be numeric. Consider if it's a Unix timestamp.");
      }

      if (charAnalysis.letters > 0) {
        suggestions.push(
          "Input contains letters. Consider if it's a relative time or cultural format."
        );
      }
    } else if (matches.length > 1 && matches[0].confidence - matches[1].confidence < 0.2) {
      suggestions.push(
        'Multiple formats detected with similar confidence. Consider providing more context.'
      );
      suggestions.push(
        `Top candidates: ${matches
          .slice(0, 3)
          .map(m => m.pattern.name)
          .join(', ')}`
      );
    }

    // Specific suggestions based on patterns
    if (input.includes('/') && matches.some(m => m.pattern.category === 'locale')) {
      suggestions.push(
        'Date contains slashes. US format (MM/DD/YYYY) vs European (DD/MM/YYYY) ambiguity possible.'
      );
    }

    if (/^\d+$/.test(input) && input.length !== 10 && input.length !== 13) {
      suggestions.push(
        'Numeric input with unusual length. Standard Unix timestamps are 10 (seconds) or 13 (milliseconds) digits.'
      );
    }

    return suggestions;
  }

  /**
   * Generate warnings
   */
  private generateWarnings(
    input: string,
    matches: Array<{ pattern: DetectionPattern; confidence: number }>,
    ambiguityScore: number
  ): string[] {
    const warnings: string[] = [];

    if (ambiguityScore > 0.7) {
      warnings.push('High ambiguity detected. Multiple formats match with similar confidence.');
    }

    if (matches.length > 0 && matches[0].confidence < 0.6) {
      warnings.push(
        'Low confidence detection. Format may not be standard or input may be malformed.'
      );
    }

    // Check for common issues
    if (input.includes('24:') || input.includes(':60')) {
      warnings.push('Invalid time components detected (hour >= 24 or minute >= 60).');
    }

    if (/\d{4}-\d{2}-\d{2}/.test(input)) {
      const dateMatch = input.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const month = parseInt(dateMatch[2]);
        const day = parseInt(dateMatch[3]);
        if (month > 12) {
          warnings.push('Invalid month detected (> 12).');
        }
        if (day > 31) {
          warnings.push('Invalid day detected (> 31).');
        }
      }
    }

    return warnings;
  }

  /**
   * Update statistics
   */
  private updateStatistics(input: string, result: DetectionResult): void {
    this.statistics.total_detections++;

    // Update format frequency
    if (result.detected_format !== 'unknown') {
      this.statistics.format_frequency[result.detected_format] =
        (this.statistics.format_frequency[result.detected_format] || 0) + 1;
    }

    // Update confidence distribution
    if (result.confidence > 0.8) {
      this.statistics.confidence_distribution.high++;
    } else if (result.confidence >= 0.5) {
      this.statistics.confidence_distribution.medium++;
    } else {
      this.statistics.confidence_distribution.low++;
    }
  }

  /**
   * Get detection statistics
   */
  getStatistics(): FormatStatistics {
    // Calculate common patterns from recent history
    const recentHistory = this.detectionHistory.slice(-100);
    const patternFreq = new Map<string, number>();

    recentHistory.forEach(entry => {
      if (entry.result.detected_format !== 'unknown') {
        patternFreq.set(
          entry.result.detected_format,
          (patternFreq.get(entry.result.detected_format) || 0) + 1
        );
      }
    });

    const commonPatterns = Array.from(patternFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, frequency]) => ({
        pattern,
        frequency,
        examples: recentHistory
          .filter(entry => entry.result.detected_format === pattern)
          .slice(0, 3)
          .map(entry => entry.input),
      }));

    return {
      ...this.statistics,
      common_patterns: commonPatterns,
    };
  }

  /**
   * Initialize statistics
   */
  private initializeStatistics(): FormatStatistics {
    return {
      total_detections: 0,
      format_frequency: {},
      confidence_distribution: {
        high: 0,
        medium: 0,
        low: 0,
      },
      common_patterns: [],
      error_patterns: [],
    };
  }

  /**
   * Get supported patterns
   */
  getSupportedPatterns(): DetectionPattern[] {
    return [...this.patterns];
  }

  /**
   * Add custom pattern
   */
  addCustomPattern(pattern: DetectionPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Clear detection history
   */
  clearHistory(): void {
    this.detectionHistory = [];
    this.statistics = this.initializeStatistics();
  }
}

export default IntelligentFormatDetector;
