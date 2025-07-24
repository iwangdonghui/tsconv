import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  convertTimezone,
  getTimezoneOffset,
  isValidTimezone,
  parseTimestamp,
  formatRelativeTime,
  validateDateRange,
  getCommonTimezones,
  detectTimestampFormat,
  convertTimestamp
} from '../conversion-utils';

describe('Conversion Utils', () => {
  describe('parseTimestamp', () => {
    it('should parse valid unix timestamp', () => {
      const result = parseTimestamp(1640995200); // 2022-01-01 00:00:00 UTC
      expect(result.isValid).toBe(true);
      expect(result.timestamp).toBe(1640995200);
    });

    it('should parse timestamp string', () => {
      const result = parseTimestamp('1640995200');
      expect(result.isValid).toBe(true);
      expect(result.timestamp).toBe(1640995200);
    });

    it('should parse ISO date string', () => {
      const result = parseTimestamp('2022-01-01T00:00:00.000Z');
      expect(result.isValid).toBe(true);
      expect(result.timestamp).toBe(1640995200);
    });

    it('should reject invalid timestamps', () => {
      const result = parseTimestamp(-1);
      expect(result.isValid).toBe(false);
      expect(result.timestamp).toBe(0);
    });

    it('should reject timestamps that are too large', () => {
      const result = parseTimestamp(2147483648); // Beyond 32-bit limit
      expect(result.isValid).toBe(false);
      expect(result.timestamp).toBe(0);
    });

    it('should handle invalid string input', () => {
      const result = parseTimestamp('invalid');
      expect(result.isValid).toBe(false);
      expect(result.timestamp).toBe(0);
    });
  });

  describe('isValidTimezone', () => {
    it('should validate correct timezone identifiers', () => {
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
      expect(isValidTimezone('Asia/Tokyo')).toBe(true);
    });

    it('should reject invalid timezone identifiers', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('NotATimezone')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
    });
  });

  describe('getTimezoneOffset', () => {
    it('should calculate timezone offset for UTC', () => {
      const date = new Date('2022-01-01T12:00:00Z');
      const offset = getTimezoneOffset(date, 'UTC');
      expect(offset).toBe(0);
    });

    it('should handle invalid timezone gracefully', () => {
      const date = new Date('2022-01-01T12:00:00Z');
      const offset = getTimezoneOffset(date, 'Invalid/Timezone');
      expect(offset).toBe(0);
    });
  });

  describe('convertTimezone', () => {
    it('should convert between timezones', () => {
      const date = new Date('2022-01-01T12:00:00Z');
      const converted = convertTimezone(date, 'UTC', 'America/New_York');
      
      // The converted date should be different from the original
      expect(converted.getTime()).not.toBe(date.getTime());
    });

    it('should return original date for invalid timezones', () => {
      const date = new Date('2022-01-01T12:00:00Z');
      const converted = convertTimezone(date, 'Invalid/From', 'Invalid/To');
      
      expect(converted.getTime()).toBe(date.getTime());
    });
  });

  describe('formatRelativeTime', () => {
    it('should format time in the past', () => {
      const baseDate = new Date('2022-01-01T12:00:00Z');
      const pastDate = new Date('2022-01-01T11:00:00Z'); // 1 hour ago
      
      const result = formatRelativeTime(pastDate, baseDate);
      expect(result).toBe('1 hour ago');
    });

    it('should format time in the future', () => {
      const baseDate = new Date('2022-01-01T12:00:00Z');
      const futureDate = new Date('2022-01-01T13:00:00Z'); // 1 hour in future
      
      const result = formatRelativeTime(futureDate, baseDate);
      expect(result).toBe('in 1 hour');
    });

    it('should handle plural forms', () => {
      const baseDate = new Date('2022-01-01T12:00:00Z');
      const pastDate = new Date('2022-01-01T10:00:00Z'); // 2 hours ago
      
      const result = formatRelativeTime(pastDate, baseDate);
      expect(result).toBe('2 hours ago');
    });

    it('should handle very recent times', () => {
      const baseDate = new Date('2022-01-01T12:00:00Z');
      const recentDate = new Date('2022-01-01T11:59:59Z'); // 1 second ago
      
      const result = formatRelativeTime(recentDate, baseDate);
      expect(result).toBe('1 second ago');
    });

    it('should handle current time', () => {
      const date = new Date('2022-01-01T12:00:00Z');
      
      const result = formatRelativeTime(date, date);
      expect(result).toBe('just now');
    });
  });

  describe('validateDateRange', () => {
    it('should validate date within range', () => {
      const date = new Date('2022-06-01');
      const minDate = new Date('2022-01-01');
      const maxDate = new Date('2022-12-31');
      
      expect(validateDateRange(date, minDate, maxDate)).toBe(true);
    });

    it('should reject date before minimum', () => {
      const date = new Date('2021-12-31');
      const minDate = new Date('2022-01-01');
      
      expect(validateDateRange(date, minDate)).toBe(false);
    });

    it('should reject date after maximum', () => {
      const date = new Date('2023-01-01');
      const maxDate = new Date('2022-12-31');
      
      expect(validateDateRange(date, undefined, maxDate)).toBe(false);
    });

    it('should validate without constraints', () => {
      const date = new Date('2022-06-01');
      
      expect(validateDateRange(date)).toBe(true);
    });
  });

  describe('getCommonTimezones', () => {
    it('should return array of common timezones', () => {
      const timezones = getCommonTimezones();
      
      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
      
      // Check structure of first timezone
      const firstTz = timezones[0];
      expect(firstTz).toHaveProperty('identifier');
      expect(firstTz).toHaveProperty('displayName');
      expect(firstTz).toHaveProperty('offset');
      expect(typeof firstTz.offset).toBe('number');
    });

    it('should include UTC timezone', () => {
      const timezones = getCommonTimezones();
      const utcTimezone = timezones.find(tz => tz.identifier === 'UTC');
      
      expect(utcTimezone).toBeDefined();
      expect(utcTimezone?.offset).toBe(0);
    });
  });

  describe('detectTimestampFormat', () => {
    it('should detect unix timestamp format', () => {
      const result = detectTimestampFormat('1640995200');
      expect(result).toBe('unix');
    });

    it('should detect milliseconds timestamp format', () => {
      const result = detectTimestampFormat('1640995200000');
      expect(result).toBe('milliseconds');
    });

    it('should detect ISO format', () => {
      const result = detectTimestampFormat('2022-01-01T00:00:00.000Z');
      expect(result).toBe('iso');
    });

    it('should detect unknown format', () => {
      const result = detectTimestampFormat('invalid-format');
      expect(result).toBe('unknown');
    });

    it('should handle edge cases for timestamp detection', () => {
      // Too short for unix timestamp
      expect(detectTimestampFormat('123')).toBe('unknown');
      
      // Too long for milliseconds timestamp
      expect(detectTimestampFormat('12345678901234')).toBe('unknown');
    });
  });

  describe('convertTimestamp', () => {
    it('should convert timestamp to basic formats', async () => {
      const timestamp = 1640995200; // 2022-01-01 00:00:00 UTC
      const result = await convertTimestamp(timestamp);
      
      expect(result.timestamp).toBe(timestamp);
      expect(result.iso).toBe('2022-01-01T00:00:00.000Z');
      expect(result.utc).toContain('Sat, 01 Jan 2022');
      expect(result.local).toBeDefined();
    });

    it('should include custom formats when specified', async () => {
      const timestamp = 1640995200;
      const formats = ['iso', 'utc', 'unix', 'milliseconds'];
      const result = await convertTimestamp(timestamp, formats);
      
      expect(result.formats).toBeDefined();
      expect(result.formats.iso).toBe('2022-01-01T00:00:00.000Z');
      expect(result.formats.unix).toBe(timestamp);
      expect(result.formats.milliseconds).toBe(timestamp * 1000);
    });

    it('should handle timezone conversion', async () => {
      const timestamp = 1640995200;
      const result = await convertTimestamp(timestamp, [], 'UTC', 'America/New_York');
      
      expect(result.converted).toBeDefined();
      expect(result.converted.timestamp).toBeDefined();
      expect(result.converted.iso).toBeDefined();
    });

    it('should handle invalid timezone conversion gracefully', async () => {
      const timestamp = 1640995200;
      const result = await convertTimestamp(timestamp, [], 'Invalid/From', 'Invalid/To');
      
      expect(result.conversionError).toBe('Invalid timezone conversion');
    });

    it('should handle invalid custom formats gracefully', async () => {
      const timestamp = 1640995200;
      const result = await convertTimestamp(timestamp, ['invalid-format']);
      
      expect(result.formats['invalid-format']).toBe('Invalid format');
    });
  });
});