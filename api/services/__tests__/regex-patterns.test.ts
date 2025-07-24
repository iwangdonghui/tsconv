import { describe, it, expect } from 'vitest';
import { formatService } from '../format-service.js';

describe('Regex Pattern Compilation - Comprehensive Tests', () => {
  describe('Pattern Validation Edge Cases', () => {
    it('should handle various ISO date formats correctly', () => {
      const testCases = [
        { format: 'iso8601-date', valid: ['2024-01-15', '2024-12-31', '2000-02-29'], invalid: ['24-01-15', '2024-13-01', '2024-01-32', 'invalid'] },
        { format: 'iso8601-time', valid: ['14:30:00', '00:00:00', '23:59:59'], invalid: ['24:00:00', '14:60:00', '14:30:60', 'invalid'] },
        { format: 'iso8601', valid: ['2024-01-15T14:30:00.000Z'], invalid: ['2024-01-15 14:30:00', 'invalid'] }
      ];

      for (const testCase of testCases) {
        // Test valid values
        for (const validValue of testCase.valid) {
          const result = formatService.validateFormatValue(validValue, testCase.format);
          expect(result.valid).toBe(true);
        }

        // Test invalid values
        for (const invalidValue of testCase.invalid) {
          const result = formatService.validateFormatValue(invalidValue, testCase.format);
          expect(result.valid).toBe(false);
        }
      }
    });

    it('should handle regional date formats correctly', () => {
      const testCases = [
        { format: 'us-date', valid: ['01/15/2024', '12/31/2024'], invalid: ['15/01/2024', '2024-01-15', '13/01/2024', '01/32/2024'] },
        { format: 'eu-date', valid: ['15/01/2024', '31/12/2024'], invalid: ['01/15/2024', '2024-01-15', '32/01/2024', '15/13/2024'] },
        { format: 'us-datetime', valid: ['01/15/2024 2:30 PM', '12/31/2024 11:59 AM'], invalid: ['15/01/2024 14:30', '01/15/2024 25:30 PM'] },
        { format: 'eu-datetime', valid: ['15/01/2024 14:30', '31/12/2024 23:59'], invalid: ['01/15/2024 2:30 PM', '15/01/2024 25:30'] }
      ];

      for (const testCase of testCases) {
        // Test valid values
        for (const validValue of testCase.valid) {
          const result = formatService.validateFormatValue(validValue, testCase.format);
          expect(result.valid).toBe(true);
        }

        // Test invalid values
        for (const invalidValue of testCase.invalid) {
          const result = formatService.validateFormatValue(invalidValue, testCase.format);
          expect(result.valid).toBe(false);
        }
      }
    });

    it('should handle Asian date formats with special characters', () => {
      const testCases = [
        { format: 'ja-date', valid: ['2024年01月15日', '2024年12月31日'], invalid: ['2024-01-15', '2024年13月01日', '2024年01月32日'] },
        { format: 'zh-date', valid: ['2024年01月15日', '2024年12月31日'], invalid: ['2024-01-15', '2024年13月01日', '2024年01月32日'] }
      ];

      for (const testCase of testCases) {
        // Test valid values
        for (const validValue of testCase.valid) {
          const result = formatService.validateFormatValue(validValue, testCase.format);
          expect(result.valid).toBe(true);
        }

        // Test invalid values
        for (const invalidValue of testCase.invalid) {
          const result = formatService.validateFormatValue(invalidValue, testCase.format);
          expect(result.valid).toBe(false);
        }
      }
    });

    it('should handle technical formats correctly', () => {
      const testCases = [
        { format: 'sql-datetime', valid: ['2024-01-15 14:30:00', '2024-12-31 23:59:59'], invalid: ['2024-01-15T14:30:00'] },
        { format: 'log-timestamp', valid: ['2024-01-15 14:30:00.123', '2024-12-31 23:59:59.999'], invalid: ['2024-01-15T14:30:00.123'] },
        { format: 'filename-date', valid: ['20240115', '20241231'], invalid: ['2024-01-15', '240115'] },
        { format: 'filename-datetime', valid: ['20240115_143000', '20241231_235959'], invalid: ['2024-01-15_14:30:00'] }
      ];

      for (const testCase of testCases) {
        // Test valid values
        for (const validValue of testCase.valid) {
          const result = formatService.validateFormatValue(validValue, testCase.format);
          expect(result.valid).toBe(true);
        }

        // Test invalid values
        for (const invalidValue of testCase.invalid) {
          const result = formatService.validateFormatValue(invalidValue, testCase.format);
          expect(result.valid).toBe(false);
        }
      }
    });

    it('should handle timestamp formats correctly', () => {
      const testCases = [
        { format: 'unix-timestamp', valid: ['1642248600', '1234567890'], invalid: ['164224860', '16422486000', 'invalid', '1642248600000'] },
        { format: 'millis-timestamp', valid: ['1642248600000', '1234567890123'], invalid: ['164224860000', '16422486000000', 'invalid', '1642248600'] }
      ];

      for (const testCase of testCases) {
        // Test valid values
        for (const validValue of testCase.valid) {
          const result = formatService.validateFormatValue(validValue, testCase.format);
          expect(result.valid).toBe(true);
        }

        // Test invalid values
        for (const invalidValue of testCase.invalid) {
          const result = formatService.validateFormatValue(invalidValue, testCase.format);
          expect(result.valid).toBe(false);
        }
      }
    });
  });

  describe('Regex Compilation Robustness', () => {
    it('should not throw errors during pattern compilation', () => {
      const formats = formatService.getSupportedFormats();
      
      for (const format of formats) {
        expect(() => {
          const formatName = format.name.toLowerCase().replace(/\s+/g, '-');
          formatService.validateFormat(formatName);
        }).not.toThrow();
      }
    });

    it('should handle malformed input gracefully', () => {
      const malformedInputs = [
        '', ' ', '\n', '\t', '\\', '/', '*', '+', '?', '^', '$', '{', '}', '(', ')', '[', ']', '|',
        'null', 'undefined', '0', '-1', 'NaN', 'Infinity'
      ];

      const formats = ['iso8601-date', 'us-date', 'eu-date', 'unix-timestamp'];

      for (const format of formats) {
        for (const input of malformedInputs) {
          expect(() => {
            const result = formatService.validateFormatValue(input, format);
            expect(result.valid).toBe(false);
          }).not.toThrow();
        }
      }
    });

    it('should handle unicode and special characters', () => {
      const unicodeInputs = [
        '２０２４年０１月１５日', // Full-width characters
        '2024年1月15日', // Mixed width
        '2024🎉01🎉15', // Emoji
        '2024\u200B01\u200B15', // Zero-width space
        '2024\u00A001\u00A015' // Non-breaking space
      ];

      for (const input of unicodeInputs) {
        expect(() => {
          const result = formatService.validateFormatValue(input, 'ja-date');
          // Most should be invalid, but shouldn't throw
          expect(typeof result.valid).toBe('boolean');
        }).not.toThrow();
      }
    });
  });

  describe('Performance with Complex Patterns', () => {
    it('should validate patterns efficiently even with complex regex', () => {
      const complexFormats = ['rfc2822', 'log-timestamp', 'us-datetime', 'eu-datetime'];
      const testValue = '2024-01-15 14:30:00.123';

      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        for (const format of complexFormats) {
          formatService.validateFormatValue(testValue, format);
        }
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete 400 validations in less than 50ms
      expect(duration).toBeLessThan(50);
    });
  });
});