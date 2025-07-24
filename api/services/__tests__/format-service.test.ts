import { describe, it, expect, beforeEach } from 'vitest';
import { formatService } from '../format-service';
import { FormatValidationResult } from '../../types/api';

describe('Format Service', () => {
  describe('Format Validation', () => {
    it('should validate standard formats correctly', () => {
      const validFormats = ['iso8601', 'unix-timestamp', 'rfc2822', 'us-date'];
      
      for (const format of validFormats) {
        const result = formatService.validateFormat(format);
        expect(result.valid).toBe(true);
        expect(result.format).toBeDefined();
      }
    });
    
    it('should reject invalid formats', () => {
      const invalidFormats = ['invalid-format', 'not-a-format', ''];
      
      for (const format of invalidFormats) {
        const result = formatService.validateFormat(format);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.suggestions).toBeDefined();
        expect(Array.isArray(result.suggestions)).toBe(true);
      }
    });
    
    it('should provide helpful suggestions for similar formats', () => {
      const result = formatService.validateFormat('iso');
      
      expect(result.valid).toBe(false);
      expect(result.suggestions).toBeDefined();
      // The implementation returns format names, not format identifiers
      expect(result.suggestions?.some(s => s.toLowerCase().includes('iso'))).toBe(true);
    });
  });
  
  describe('Format Listing', () => {
    it('should list all supported formats', () => {
      const formats = formatService.getSupportedFormats();
      
      expect(formats.length).toBeGreaterThan(0);
      expect(formats[0]).toHaveProperty('name');
      expect(formats[0]).toHaveProperty('pattern');
      expect(formats[0]).toHaveProperty('example');
      expect(formats[0]).toHaveProperty('description');
    });
    
    it('should include standard formats', () => {
      const formats = formatService.getSupportedFormats();
      const formatNames = formats.map(f => f.name);
      
      expect(formatNames).toContain('ISO 8601');
      expect(formatNames).toContain('Unix Timestamp');
    });
    
    it('should group formats by category', () => {
      const standardFormats = formatService.listFormatsByCategory('standard');
      const regionalFormats = formatService.listFormatsByCategory('regional');
      const technicalFormats = formatService.listFormatsByCategory('technical');
      
      expect(standardFormats.length).toBeGreaterThan(0);
      expect(regionalFormats.length).toBeGreaterThan(0);
      expect(technicalFormats.length).toBeGreaterThan(0);
      
      expect(standardFormats.every(f => f.category === 'standard')).toBe(true);
      expect(regionalFormats.every(f => f.category === 'regional')).toBe(true);
      expect(technicalFormats.every(f => f.category === 'technical')).toBe(true);
    });
  });
  
  describe('Date Formatting', () => {
    it('should format dates correctly with standard formats', async () => {
      const timestamp = 1609459200000; // 2021-01-01T00:00:00.000Z
      const formats = ['iso8601', 'unix-timestamp', 'iso8601-date'];
      
      const results = await formatService.format(timestamp, formats);
      
      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      
      // ISO 8601 format should contain the date part
      expect(results[0].result).toContain('2021-01-01');
      
      // Unix timestamp should be the timestamp in seconds
      expect(results[1].result).toBe('1609459200');
      
      // ISO date should only have the date part
      expect(results[2].result).toBe('2021-01-01');
    });
    
    it('should handle multiple formats in a single request', async () => {
      const timestamp = 1609459200000; // 2021-01-01T00:00:00.000Z
      const formats = ['iso8601', 'unix-timestamp', 'us-date', 'eu-date'];
      
      const results = await formatService.format(timestamp, formats);
      
      expect(results.length).toBe(4);
      for (const result of results) {
        expect(result.success).toBe(true);
        expect(result.result).toBeDefined();
      }
      
      // Check specific format results
      expect(results[2].result).toBe('01/01/2021'); // US date
      expect(results[3].result).toBe('01/01/2021'); // EU date (same for this date)
    });
    
    it('should handle invalid formats gracefully', async () => {
      const timestamp = 1609459200000;
      const formats = ['iso8601', 'invalid-format'];
      
      const results = await formatService.format(timestamp, formats);
      
      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
    });
    
    it('should handle invalid timestamps gracefully', async () => {
      const invalidTimestamp = NaN;
      const formats = ['iso8601'];
      
      await expect(formatService.format(invalidTimestamp, formats)).rejects.toThrow();
    });
  });
  
  describe('Timezone Support', () => {
    it('should apply timezone when formatting dates', async () => {
      const timestamp = 1609459200000; // 2021-01-01T00:00:00.000Z
      const formats = ['iso8601-time'];
      
      // Format in UTC
      const utcResults = await formatService.format(timestamp, formats, 'UTC');
      
      // Format in New York (EST/EDT)
      const nyResults = await formatService.format(timestamp, formats, 'America/New_York');
      
      // The times should be different due to timezone offset
      expect(utcResults[0].result).not.toEqual(nyResults[0].result);
    });
    
    it('should handle invalid timezones gracefully', async () => {
      const timestamp = 1609459200000;
      const formats = ['iso8601'];
      
      // Should not throw with invalid timezone
      const results = await formatService.format(timestamp, formats, 'Invalid/Timezone');
      
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBeDefined();
    });
    
    it('should format dates correctly across different timezones', async () => {
      const timestamp = 1609459200000; // 2021-01-01T00:00:00.000Z
      const format = ['iso8601-time'];
      
      const timezones = [
        'UTC',
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney'
      ];
      
      const results = await Promise.all(
        timezones.map(tz => formatService.format(timestamp, format, tz))
      );
      
      // All results should be successful
      results.forEach(result => {
        expect(result[0].success).toBe(true);
        expect(result[0].result).toBeDefined();
      });
      
      // Results should be different across timezones
      const uniqueTimes = new Set(results.map(r => r[0].result));
      expect(uniqueTimes.size).toBeGreaterThan(1);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty format arrays', async () => {
      const timestamp = 1609459200000;
      const formats: string[] = [];
      
      const results = await formatService.format(timestamp, formats);
      expect(results).toEqual([]);
    });
    
    it('should handle date formatting at DST transitions', async () => {
      // March 14, 2021, 2:00 AM - DST transition in the US
      const dstTransitionTimestamp = 1615708800000;
      const formats = ['iso8601'];
      
      const results = await formatService.format(dstTransitionTimestamp, formats, 'America/New_York');
      expect(results[0].success).toBe(true);
    });
    
    it('should handle extreme timestamps', async () => {
      // Very old date
      const oldTimestamp = new Date('1900-01-01').getTime();
      // Very future date
      const futureTimestamp = new Date('2100-01-01').getTime();
      
      const formats = ['iso8601'];
      
      const oldResults = await formatService.format(oldTimestamp, formats);
      const futureResults = await formatService.format(futureTimestamp, formats);
      
      expect(oldResults[0].success).toBe(true);
      expect(futureResults[0].success).toBe(true);
      
      expect(oldResults[0].result).toContain('1900-01-01');
      expect(futureResults[0].result).toContain('2100-01-01');
    });
    
    it('should handle special characters in formatted output', async () => {
      const timestamp = 1609459200000; // 2021-01-01T00:00:00.000Z
      const formats = ['ja-date', 'zh-date'];
      
      const results = await formatService.format(timestamp, formats);
      
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      
      expect(results[0].result).toBe('2021年01月01日');
      expect(results[1].result).toBe('2021年01月01日');
    });
  });
  
  describe('Format Value Validation', () => {
    it('should validate values against format patterns', () => {
      // Valid ISO date
      const isoResult = formatService.validateFormatValue('2021-01-01', 'iso8601-date');
      expect(isoResult.valid).toBe(true);
      
      // Invalid ISO date
      const invalidIsoResult = formatService.validateFormatValue('01/01/2021', 'iso8601-date');
      expect(invalidIsoResult.valid).toBe(false);
      
      // Valid US date
      const usDateResult = formatService.validateFormatValue('01/01/2021', 'us-date');
      expect(usDateResult.valid).toBe(true);
      
      // Invalid US date
      const invalidUsDateResult = formatService.validateFormatValue('2021-01-01', 'us-date');
      expect(invalidUsDateResult.valid).toBe(false);
    });
    
    it('should validate complex format patterns correctly', () => {
      // RFC 2822
      const validRfc = formatService.validateFormatValue('Mon, 01 Jan 2021 00:00:00 +0000', 'rfc2822');
      expect(validRfc.valid).toBe(true);
      
      const invalidRfc = formatService.validateFormatValue('Monday, 01 Jan 2021 00:00:00', 'rfc2822');
      expect(invalidRfc.valid).toBe(false);
      
      // SQL datetime
      const validSql = formatService.validateFormatValue('2021-01-01 00:00:00', 'sql-datetime');
      expect(validSql.valid).toBe(true);
      
      const invalidSql = formatService.validateFormatValue('2021-01-01T00:00:00', 'sql-datetime');
      expect(invalidSql.valid).toBe(false);
    });
    
    it('should validate timestamp formats correctly', () => {
      // Unix timestamp (seconds)
      const validUnix = formatService.validateFormatValue('1609459200', 'unix-timestamp');
      expect(validUnix.valid).toBe(true);
      
      const invalidUnix = formatService.validateFormatValue('abc', 'unix-timestamp');
      expect(invalidUnix.valid).toBe(false);
      
      // Millisecond timestamp
      const validMillis = formatService.validateFormatValue('1609459200000', 'millis-timestamp');
      expect(validMillis.valid).toBe(true);
      
      const invalidMillis = formatService.validateFormatValue('160945920', 'millis-timestamp');
      expect(invalidMillis.valid).toBe(false);
    });
    
    it('should validate format values with edge cases', () => {
      // Leap year date
      const leapDate = formatService.validateFormatValue('2020-02-29', 'iso8601-date');
      expect(leapDate.valid).toBe(true);
      
      // Invalid date (February 30)
      const invalidDate = formatService.validateFormatValue('2020-02-30', 'iso8601-date');
      expect(invalidDate.valid).toBe(false);
      
      // Date with single-digit components
      const singleDigitDate = formatService.validateFormatValue('2021-1-1', 'iso8601-date');
      expect(singleDigitDate.valid).toBe(false); // Should require leading zeros
      
      // Time with single-digit components
      const singleDigitTime = formatService.validateFormatValue('1:2:3', 'iso8601-time');
      expect(singleDigitTime.valid).toBe(false); // Should require leading zeros
    });
  });
  
  describe('Regex Pattern Compilation', () => {
    it('should compile regex patterns correctly for all formats', () => {
      const formats = formatService.getSupportedFormats();
      
      for (const format of formats) {
        // Test that the format can be retrieved without errors
        const formatObj = formatService.getFormat(format.name.toLowerCase().replace(/\s+/g, '-'));
        if (formatObj) {
          // Test that validation works without throwing errors
          const validation = formatService.validateFormat(format.name.toLowerCase().replace(/\s+/g, '-'));
          expect(validation.valid).toBe(true);
        }
      }
    });
    
    it('should handle special characters in format patterns', () => {
      // Test formats with special regex characters
      const specialFormats = ['rfc2822', 'ja-date', 'zh-date'];
      
      for (const formatName of specialFormats) {
        const validation = formatService.validateFormat(formatName);
        expect(validation.valid).toBe(true);
      }
    });
    
    it('should validate format values with compiled regex patterns', () => {
      const testCases = [
        { format: 'iso8601-date', validValue: '2024-01-15', invalidValue: '01/15/2024' },
        { format: 'us-date', validValue: '01/15/2024', invalidValue: '2024-01-15' },
        { format: 'eu-date', validValue: '15/01/2024', invalidValue: '01/15/2024' },
        { format: 'sql-datetime', validValue: '2024-01-15 14:30:00', invalidValue: '2024-01-15T14:30:00' },
        { format: 'filename-date', validValue: '20240115', invalidValue: '2024-01-15' },
        { format: 'unix-timestamp', validValue: '1642248600', invalidValue: '164224860' }, // 9 digits should fail
        { format: 'millis-timestamp', validValue: '1642248600000', invalidValue: '164224860000' } // 12 digits should fail
      ];
      
      for (const testCase of testCases) {
        // Valid value should pass
        const validResult = formatService.validateFormatValue(testCase.validValue, testCase.format);
        expect(validResult.valid).toBe(true);
        
        // Invalid value should fail
        const invalidResult = formatService.validateFormatValue(testCase.invalidValue, testCase.format);
        expect(invalidResult.valid).toBe(false);
      }
    });
    
    it('should handle edge cases in regex compilation', () => {
      // Test that regex compilation doesn't throw errors for complex patterns
      const complexFormats = ['rfc2822', 'log-timestamp', 'us-datetime', 'eu-datetime'];
      
      for (const formatName of complexFormats) {
        expect(() => {
          const validation = formatService.validateFormat(formatName);
          expect(validation.valid).toBe(true);
        }).not.toThrow();
      }
    });
    
    it('should properly escape special regex characters', () => {
      // Test formats that contain characters that need escaping
      const result1 = formatService.validateFormatValue('2024年01月15日', 'ja-date');
      expect(result1.valid).toBe(true);
      
      const result2 = formatService.validateFormatValue('2024年01月15日', 'zh-date');
      expect(result2.valid).toBe(true);
      
      // Test that invalid values are properly rejected
      const result3 = formatService.validateFormatValue('2024-01-15', 'ja-date');
      expect(result3.valid).toBe(false);
    });
  });
  
  describe('Format Parsing', () => {
    it('should parse dates correctly with compiled regex patterns', () => {
      const testCases = [
        { format: 'iso8601-date', value: '2024-01-15' },
        { format: 'us-date', value: '01/15/2024' },
        { format: 'eu-date', value: '15/01/2024' },
        { format: 'sql-datetime', value: '2024-01-15 14:30:00' },
        { format: 'filename-date', value: '20240115' }
      ];
      
      for (const testCase of testCases) {
        expect(() => {
          const parsedDate = formatService.parseDate(testCase.value, testCase.format);
          expect(parsedDate).toBeInstanceOf(Date);
          expect(isNaN(parsedDate.getTime())).toBe(false);
        }).not.toThrow();
      }
    });
    
    it('should handle parsing errors gracefully', () => {
      expect(() => {
        formatService.parseDate('invalid-date', 'iso8601-date');
      }).toThrow();
      
      expect(() => {
        formatService.parseDate('2024-01-15', 'us-date');
      }).toThrow();
    });
    
    it('should parse dates with different components correctly', () => {
      // Date only
      const dateOnly = formatService.parseDate('2024-01-15', 'iso8601-date');
      expect(dateOnly.getFullYear()).toBe(2024);
      expect(dateOnly.getMonth()).toBe(0); // January is 0
      expect(dateOnly.getDate()).toBe(15);
      expect(dateOnly.getHours()).toBe(0);
      expect(dateOnly.getMinutes()).toBe(0);
      
      // Date and time
      const dateTime = formatService.parseDate('2024-01-15 14:30:00', 'sql-datetime');
      expect(dateTime.getFullYear()).toBe(2024);
      expect(dateTime.getMonth()).toBe(0);
      expect(dateTime.getDate()).toBe(15);
      expect(dateTime.getHours()).toBe(14);
      expect(dateTime.getMinutes()).toBe(30);
      
      // Timestamp
      const timestamp = formatService.parseDate('1705320600', 'unix-timestamp');
      expect(timestamp.getTime()).toBe(1705320600 * 1000);
    });
  });
  
  describe('Performance Tests', () => {
    it('should format dates efficiently', async () => {
      const timestamp = Date.now();
      const formats = ['iso8601'];
      
      const start = performance.now();
      
      // Format 1000 times
      for (let i = 0; i < 1000; i++) {
        await formatService.format(timestamp, formats);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should take less than 1 second for 1000 operations
      expect(duration).toBeLessThan(1000);
    });
    
    it('should validate format values efficiently', () => {
      const start = performance.now();
      
      // Validate 1000 times
      for (let i = 0; i < 1000; i++) {
        formatService.validateFormatValue('2024-01-15', 'iso8601-date');
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should take less than 100ms for 1000 validations
      expect(duration).toBeLessThan(100);
    });
    
    it('should handle concurrent format operations efficiently', async () => {
      const timestamp = Date.now();
      const formatsList = [
        ['iso8601'],
        ['unix-timestamp'],
        ['us-date'],
        ['eu-date'],
        ['iso8601-date']
      ];
      
      const start = performance.now();
      
      // Format with different formats concurrently
      await Promise.all(
        formatsList.map(formats => formatService.format(timestamp, formats))
      );
      
      const end = performance.now();
      const duration = end - start;
      
      // Should be efficient for concurrent operations
      expect(duration).toBeLessThan(100);
    });
    
    it('should handle large batch of format operations', async () => {
      const timestamps = Array.from({ length: 100 }, (_, i) => Date.now() + i * 1000);
      const formats = ['iso8601'];
      
      const start = performance.now();
      
      // Format multiple timestamps
      await Promise.all(
        timestamps.map(timestamp => formatService.format(timestamp, formats))
      );
      
      const end = performance.now();
      const duration = end - start;
      
      // Should handle batch operations efficiently
      expect(duration).toBeLessThan(500);
    });
  });
  
  describe('Format Export and Serialization', () => {
    it('should export formats correctly', () => {
      const exportedFormats = formatService.exportFormats();
      
      expect(exportedFormats).toBeDefined();
      expect(Object.keys(exportedFormats).length).toBeGreaterThan(0);
      
      // Check a specific format
      expect(exportedFormats['ISO 8601']).toBeDefined();
      expect(exportedFormats['ISO 8601'].pattern).toBe('YYYY-MM-DDTHH:mm:ss.sssZ');
      expect(exportedFormats['ISO 8601'].description).toBeDefined();
      expect(exportedFormats['ISO 8601'].example).toBeDefined();
    });
  });
});