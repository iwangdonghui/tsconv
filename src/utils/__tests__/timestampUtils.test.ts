import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseInput,
  formatResults,
  getRelativeTime,
  processBatchConversion,
  getManualTimestamp,
  isValidTimestamp,
  isValidDateString,
  type ManualDate
} from '../timestampUtils';

describe('timestampUtils', () => {
  beforeEach(() => {
    // Mock current time to 2024-01-01 00:00:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseInput', () => {
    it('should return null for empty input', () => {
      expect(parseInput('')).toBeNull();
      expect(parseInput('   ')).toBeNull();
    });

    it('should parse 10-digit timestamp correctly', () => {
      const result = parseInput('1640995200');
      expect(result).toEqual({
        type: 'timestamp',
        value: 1640995200000
      });
    });

    it('should parse 13-digit timestamp correctly', () => {
      const result = parseInput('1640995200000');
      expect(result).toEqual({
        type: 'timestamp',
        value: 1640995200000
      });
    });

    it('should parse ISO date string correctly', () => {
      const result = parseInput('2022-01-01T00:00:00.000Z');
      expect(result).toEqual({
        type: 'date',
        value: 1640995200000
      });
    });

    it('should parse simple date string correctly', () => {
      const result = parseInput('2022-01-01');
      expect(result?.type).toBe('date');
      expect(result?.value).toBeGreaterThan(0);
    });

    it('should return null for invalid input', () => {
      expect(parseInput('invalid')).toBeNull();
      expect(parseInput('123abc')).toBeNull();
      expect(parseInput('2022-13-45')).toBeNull();
    });

    it('should handle edge cases', () => {
      // '0' is a valid date string (interpreted as year 2000)
      const result = parseInput('0');
      expect(result?.type).toBe('date');
      
      // '12345' is also a valid date (year 12345)
      const result2 = parseInput('12345');
      expect(result2?.type).toBe('date');
      
      expect(parseInput('12345678901234')).toBeNull(); // Too long for timestamp
      expect(parseInput('abc123')).toBeNull(); // Invalid format
    });
  });

  describe('formatResults', () => {
    it('should format timestamp correctly', () => {
      const parsed = { type: 'timestamp' as const, value: 1640995200000 };
      const result = formatResults(parsed);

      expect(result.timestamp).toBe(1640995200);
      expect(result.iso8601).toBe('2022-01-01T00:00:00.000Z');
      expect(result.utcDate).toBe('Sat, 01 Jan 2022 00:00:00 GMT');
      expect(result.localDate).toContain('2022');
      expect(result.relative).toContain('ago');
    });

    it('should format date correctly', () => {
      const parsed = { type: 'date' as const, value: 1640995200000 };
      const result = formatResults(parsed);

      expect(result.timestamp).toBe(1640995200);
      expect(result.iso8601).toBe('2022-01-01T00:00:00.000Z');
    });
  });

  describe('getRelativeTime', () => {
    it('should return seconds for recent times', () => {
      const date = new Date('2023-12-31T23:59:30.000Z'); // 30 seconds ago
      expect(getRelativeTime(date)).toBe('30 seconds ago');
    });

    it('should return minutes for times within an hour', () => {
      const date = new Date('2023-12-31T23:30:00.000Z'); // 30 minutes ago
      expect(getRelativeTime(date)).toBe('30 minutes ago');
    });

    it('should return hours for times within a day', () => {
      const date = new Date('2023-12-31T12:00:00.000Z'); // 12 hours ago
      expect(getRelativeTime(date)).toBe('12 hours ago');
    });

    it('should return days for older times', () => {
      const date = new Date('2023-12-30T00:00:00.000Z'); // 2 days ago
      expect(getRelativeTime(date)).toBe('2 days ago');
    });

    it('should handle future times', () => {
      const date = new Date('2024-01-01T00:01:00.000Z'); // 1 minute in future
      expect(getRelativeTime(date)).toBe('in 1 minutes');
    });

    it('should handle edge cases', () => {
      const now = new Date('2024-01-01T00:00:00.000Z');
      expect(getRelativeTime(now)).toBe('0 seconds ago');
    });
  });

  describe('processBatchConversion', () => {
    it('should process multiple valid inputs', () => {
      const input = `1640995200
2022-01-01T00:00:00.000Z
1640995200000`;
      
      const result = processBatchConversion(input);
      const lines = result.split('\n');
      
      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain('1640995200 →');
      expect(lines[0]).toContain('2022-01-01T00:00:00.000Z');
      expect(lines[1]).toContain('2022-01-01T00:00:00.000Z →');
      expect(lines[1]).toContain('1640995200');
      expect(lines[2]).toContain('1640995200000 →');
    });

    it('should handle invalid inputs', () => {
      const input = `invalid
1640995200
another invalid`;
      
      const result = processBatchConversion(input);
      const lines = result.split('\n');
      
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('invalid → Invalid format');
      expect(lines[1]).toContain('1640995200 →');
      expect(lines[2]).toBe('another invalid → Invalid format');
    });

    it('should handle empty lines', () => {
      const input = `1640995200

2022-01-01`;
      
      const result = processBatchConversion(input);
      const lines = result.split('\n');
      
      expect(lines).toHaveLength(2); // Empty lines should be filtered out
    });
  });

  describe('getManualTimestamp', () => {
    it('should convert manual date to timestamp', () => {
      const manualDate: ManualDate = {
        year: 2022,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0
      };
      
      const timestamp = getManualTimestamp(manualDate);
      expect(timestamp).toBeGreaterThan(0);
      
      // Verify the timestamp represents the correct date
      const date = new Date(timestamp * 1000);
      expect(date.getFullYear()).toBe(2022);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(1);
    });

    it('should handle different time components', () => {
      const manualDate: ManualDate = {
        year: 2023,
        month: 12,
        day: 25,
        hour: 15,
        minute: 30,
        second: 45
      };
      
      const timestamp = getManualTimestamp(manualDate);
      const date = new Date(timestamp * 1000);
      
      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBe(11); // December is 11
      expect(date.getDate()).toBe(25);
      expect(date.getHours()).toBe(15);
      expect(date.getMinutes()).toBe(30);
      expect(date.getSeconds()).toBe(45);
    });
  });

  describe('isValidTimestamp', () => {
    it('should validate timestamp range', () => {
      expect(isValidTimestamp(0)).toBe(true);
      expect(isValidTimestamp(1640995200)).toBe(true);
      expect(isValidTimestamp(2147483647)).toBe(true);
    });

    it('should reject invalid timestamps', () => {
      expect(isValidTimestamp(-1)).toBe(false);
      expect(isValidTimestamp(2147483648)).toBe(false);
    });
  });

  describe('isValidDateString', () => {
    it('should validate correct date strings', () => {
      expect(isValidDateString('2022-01-01')).toBe(true);
      expect(isValidDateString('2022-01-01T00:00:00.000Z')).toBe(true);
      expect(isValidDateString('January 1, 2022')).toBe(true);
    });

    it('should reject invalid date strings', () => {
      expect(isValidDateString('invalid')).toBe(false);
      expect(isValidDateString('2022-13-45')).toBe(false);
      expect(isValidDateString('')).toBe(false);
    });
  });
});
