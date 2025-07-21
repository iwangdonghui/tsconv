/**
 * Input validation utilities and types for timestamp converter
 */

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errorType?: 'format' | 'range' | 'syntax' | 'system';
  message?: string;
  suggestions?: string[];
  severity: 'error' | 'warning' | 'info';
}

// Error types for different validation scenarios
export type ValidationErrorType = 'format' | 'range' | 'syntax' | 'system';

// Validation severity levels
export type ValidationSeverity = 'error' | 'warning' | 'info';

// Timestamp format types
export type TimestampFormat = 'seconds' | 'milliseconds' | 'invalid';

// Manual date interface (reused from existing code)
export interface ManualDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

// Validation state for UI components
export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid' | 'warning';

/**
 * Core validation class for input validation
 */
export class InputValidator {
  
  /**
   * Validate timestamp input
   */
  validateTimestamp(input: string): ValidationResult {
    if (!input || !input.trim()) {
      return {
        isValid: false,
        errorType: 'format',
        message: 'Please enter a timestamp',
        suggestions: ['Try: 1640995200', 'Try: 1640995200000'],
        severity: 'error'
      };
    }

    const trimmed = input.trim();
    const cleanedNumber = trimmed.replace(/,/g, '');

    // Check if input contains only digits
    if (!/^\d+$/.test(cleanedNumber)) {
      return {
        isValid: false,
        errorType: 'format',
        message: 'Timestamp must contain only numbers',
        suggestions: this.getTimestampFormatSuggestions(trimmed),
        severity: 'error'
      };
    }

    const num = parseInt(cleanedNumber);
    
    // Validate timestamp ranges and formats
    if (num >= 100000000 && num <= 999999999) {
      // 9-digit timestamp (1973-2001)
      return {
        isValid: true,
        severity: 'info'
      };
    }
    
    if (num >= 1000000000 && num <= 9999999999) {
      // 10-digit timestamp (2001-2286)
      return {
        isValid: true,
        severity: 'info'
      };
    }
    
    if (num >= 1000000000000 && num <= 9999999999999) {
      // 13-digit timestamp (milliseconds)
      return {
        isValid: true,
        severity: 'info'
      };
    }

    // Handle out of range cases
    if (num < 100000000) {
      return {
        isValid: false,
        errorType: 'range',
        message: 'Timestamp too small (minimum: 100000000)',
        suggestions: ['Try a 9-digit timestamp: 946684800', 'Try a 10-digit timestamp: 1640995200'],
        severity: 'error'
      };
    }

    if (num > 9999999999999) {
      return {
        isValid: false,
        errorType: 'range',
        message: 'Timestamp too large',
        suggestions: ['Try a 10-digit timestamp: 1640995200', 'Try a 13-digit timestamp: 1640995200000'],
        severity: 'error'
      };
    }

    // Handle gaps between valid ranges
    if (num > 9999999999 && num < 1000000000000) {
      return {
        isValid: false,
        errorType: 'format',
        message: 'Invalid timestamp length (11-12 digits not supported)',
        suggestions: [
          `Try 10-digit: ${Math.floor(num / 100)}`,
          `Try 13-digit: ${num}000`
        ],
        severity: 'error'
      };
    }

    return {
      isValid: false,
      errorType: 'format',
      message: 'Invalid timestamp format',
      suggestions: this.getTimestampFormatSuggestions(trimmed),
      severity: 'error'
    };
  }

  /**
   * Validate date string input
   */
  validateDateString(input: string): ValidationResult {
    if (!input || !input.trim()) {
      return {
        isValid: false,
        errorType: 'format',
        message: 'Please enter a date',
        suggestions: ['Try: 2022-01-01', 'Try: Jan 1, 2022', 'Try: 01/01/2022'],
        severity: 'error'
      };
    }

    const trimmed = input.trim();
    const date = new Date(trimmed);

    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        errorType: 'format',
        message: 'Invalid date format',
        suggestions: this.getDateFormatSuggestions(trimmed),
        severity: 'error'
      };
    }

    // Check for reasonable date ranges
    const year = date.getFullYear();
    if (year < 1970) {
      return {
        isValid: false,
        errorType: 'range',
        message: 'Date is before Unix epoch (1970-01-01)',
        suggestions: ['Try a date after 1970-01-01'],
        severity: 'error'
      };
    }

    if (year > 2038) {
      return {
        isValid: true,
        message: 'Date is beyond 32-bit Unix timestamp limit (2038-01-19)',
        suggestions: ['This date will work but may have compatibility issues'],
        severity: 'warning'
      };
    }

    // Check if date is in the future
    const now = new Date();
    if (date.getTime() > now.getTime()) {
      const daysDiff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        isValid: true,
        message: `This date is ${daysDiff} day${daysDiff !== 1 ? 's' : ''} in the future`,
        severity: 'warning'
      };
    }

    return {
      isValid: true,
      severity: 'info'
    };
  }

  /**
   * Validate manual date components
   */
  validateManualDate(dateComponents: ManualDate): ValidationResult {
    const { year, month, day, hour, minute, second } = dateComponents;

    // Validate year
    if (year < 1970 || year > 3000) {
      return {
        isValid: false,
        errorType: 'range',
        message: 'Year must be between 1970 and 3000',
        suggestions: [`Try year: ${new Date().getFullYear()}`],
        severity: 'error'
      };
    }

    // Validate month
    if (month < 1 || month > 12) {
      return {
        isValid: false,
        errorType: 'range',
        message: 'Month must be between 1 and 12',
        suggestions: ['January = 1, December = 12'],
        severity: 'error'
      };
    }

    // Validate day
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      return {
        isValid: false,
        errorType: 'range',
        message: `Day must be between 1 and ${daysInMonth} for ${this.getMonthName(month)} ${year}`,
        suggestions: [`${this.getMonthName(month)} ${year} has ${daysInMonth} days`],
        severity: 'error'
      };
    }

    // Validate hour
    if (hour < 0 || hour > 23) {
      return {
        isValid: false,
        errorType: 'range',
        message: 'Hour must be between 0 and 23 (24-hour format)',
        suggestions: ['Use 24-hour format: 0 = midnight, 12 = noon, 23 = 11 PM'],
        severity: 'error'
      };
    }

    // Validate minute
    if (minute < 0 || minute > 59) {
      return {
        isValid: false,
        errorType: 'range',
        message: 'Minute must be between 0 and 59',
        suggestions: ['Minutes range from 0 to 59'],
        severity: 'error'
      };
    }

    // Validate second
    if (second < 0 || second > 59) {
      return {
        isValid: false,
        errorType: 'range',
        message: 'Second must be between 0 and 59',
        suggestions: ['Seconds range from 0 to 59'],
        severity: 'error'
      };
    }

    // Check if the resulting date is valid
    const date = new Date(year, month - 1, day, hour, minute, second);
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        errorType: 'format',
        message: 'Invalid date combination',
        suggestions: ['Check if the date components form a valid date'],
        severity: 'error'
      };
    }

    return {
      isValid: true,
      severity: 'info'
    };
  }

  /**
   * Generate suggestions for timestamp format errors
   */
  private getTimestampFormatSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    
    // Remove non-digits to see what we're working with
    const digitsOnly = input.replace(/\D/g, '');
    
    if (digitsOnly.length === 0) {
      return [
        'Try: 1640995200 (10-digit timestamp)',
        'Try: 1640995200000 (13-digit timestamp)',
        'Or enter a date like: 2022-01-01'
      ];
    }

    // Suggest corrections based on length
    if (digitsOnly.length < 9) {
      suggestions.push(`Try padding with zeros: ${digitsOnly.padStart(10, '0')}`);
    } else if (digitsOnly.length === 11 || digitsOnly.length === 12) {
      suggestions.push(`Try 10-digit: ${digitsOnly.substring(0, 10)}`);
      suggestions.push(`Try 13-digit: ${digitsOnly.padEnd(13, '0')}`);
    } else if (digitsOnly.length > 13) {
      suggestions.push(`Try 13-digit: ${digitsOnly.substring(0, 13)}`);
      suggestions.push(`Try 10-digit: ${digitsOnly.substring(0, 10)}`);
    }

    // Always include format examples
    suggestions.push('Example: 1640995200 (Jan 1, 2022)');
    suggestions.push('Example: 1640995200000 (with milliseconds)');

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Generate suggestions for date format errors
   */
  private getDateFormatSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    
    // Common date format examples
    suggestions.push('Try: YYYY-MM-DD format (2022-01-01)');
    suggestions.push('Try: Month DD, YYYY format (Jan 1, 2022)');
    suggestions.push('Try: MM/DD/YYYY format (01/01/2022)');

    // Try to detect what the user might have meant
    if (input.includes('/')) {
      suggestions.unshift('Check MM/DD/YYYY or DD/MM/YYYY format');
    } else if (input.includes('-')) {
      suggestions.unshift('Check YYYY-MM-DD format');
    } else if (input.includes(' ')) {
      suggestions.unshift('Try "Month DD, YYYY" format');
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Get month name from number
   */
  private getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  }

  /**
   * Detect timestamp format
   */
  getTimestampFormat(input: string): TimestampFormat {
    const trimmed = input.trim().replace(/,/g, '');
    
    if (!/^\d+$/.test(trimmed)) {
      return 'invalid';
    }

    const num = parseInt(trimmed);
    
    if ((num >= 100000000 && num <= 9999999999)) {
      return 'seconds';
    }
    
    if (num >= 1000000000000 && num <= 9999999999999) {
      return 'milliseconds';
    }
    
    return 'invalid';
  }

  /**
   * Get suggestions for common input errors
   */
  getSuggestions(input: string, errorType: ValidationErrorType): string[] {
    switch (errorType) {
      case 'format':
        // Try to determine if it's a timestamp or date attempt
        if (/^\d+$/.test(input.replace(/,/g, ''))) {
          return this.getTimestampFormatSuggestions(input);
        } else {
          return this.getDateFormatSuggestions(input);
        }
      
      case 'range':
        return [
          'Unix timestamps range from 1970 to 2038',
          'Try a more recent date',
          'Check if you meant a different format'
        ];
      
      case 'syntax':
        return [
          'Remove special characters except hyphens and slashes',
          'Use numbers only for timestamps',
          'Use standard date formats'
        ];
      
      case 'system':
        return [
          'Try refreshing the page',
          'Check your internet connection',
          'Try a different input format'
        ];
      
      default:
        return [
          'Try: 1640995200 (timestamp)',
          'Try: 2022-01-01 (date)',
          'Try: Jan 1, 2022 (natural date)'
        ];
    }
  }
}

// Export a default instance for convenience
export const inputValidator = new InputValidator();

// Utility functions for quick validation
export function validateTimestamp(input: string): ValidationResult {
  return inputValidator.validateTimestamp(input);
}

export function validateDateString(input: string): ValidationResult {
  return inputValidator.validateDateString(input);
}

export function validateManualDate(dateComponents: ManualDate): ValidationResult {
  return inputValidator.validateManualDate(dateComponents);
}

// Helper function to check if input is likely a timestamp vs date string
export function isLikelyTimestamp(input: string): boolean {
  const trimmed = input.trim().replace(/,/g, '');
  return /^\d{9,13}$/.test(trimmed);
}

// Helper function to get validation state for UI
export function getValidationState(result: ValidationResult | null): ValidationState {
  if (!result) return 'idle';
  
  if (result.isValid) {
    return result.severity === 'warning' ? 'warning' : 'valid';
  }
  
  return 'invalid';
}

// Main validation function that handles all input types
export function validateInput(input: string): ValidationResult {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      errorType: 'format',
      message: 'Please enter a timestamp or date',
      suggestions: ['Try: 1640995200', 'Try: 2022-01-01', 'Try: Jan 1, 2022'],
      severity: 'error'
    };
  }

  const trimmed = input.trim();
  
  // Check if it looks like a timestamp (only digits)
  if (/^\d+$/.test(trimmed.replace(/,/g, ''))) {
    return validateTimestamp(trimmed);
  }
  
  // Otherwise treat as date string
  return validateDateString(trimmed);
}