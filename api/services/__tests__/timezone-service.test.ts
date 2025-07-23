import { describe, it, expect, beforeEach } from 'vitest';
import { timezoneService } from '../timezone-service';

describe('Timezone Service', () => {
  describe('Basic Timezone Operations', () => {
    it('should validate timezones correctly', () => {
      // Valid timezones
      expect(timezoneService.validateTimezone('UTC')).toBe(true);
      expect(timezoneService.validateTimezone('America/New_York')).toBe(true);
      expect(timezoneService.validateTimezone('Europe/London')).toBe(true);
      
      // Valid timezone shortcuts
      expect(timezoneService.validateTimezone('EST')).toBe(true);
      expect(timezoneService.validateTimezone('PST')).toBe(true);
      expect(timezoneService.validateTimezone('GMT')).toBe(true);
      
      // Invalid timezones
      expect(timezoneService.validateTimezone('Invalid/Timezone')).toBe(false);
      expect(timezoneService.validateTimezone('XYZ')).toBe(false);
      expect(timezoneService.validateTimezone('')).toBe(false);
    });
    
    it('should resolve timezone shortcuts correctly', () => {
      expect(timezoneService.resolveTimezone('EST')).toBe('America/New_York');
      expect(timezoneService.resolveTimezone('PST')).toBe('America/Los_Angeles');
      expect(timezoneService.resolveTimezone('GMT')).toBe('Europe/London');
      
      // Should return original if not a shortcut
      expect(timezoneService.resolveTimezone('America/Chicago')).toBe('America/Chicago');
      expect(timezoneService.resolveTimezone('UTC')).toBe('UTC');
    });
    
    it('should get timezone info correctly', () => {
      const utcInfo = timezoneService.getTimezoneInfo('UTC');
      expect(utcInfo.identifier).toBe('UTC');
      expect(utcInfo.currentOffset).toBe(0);
      
      const nyInfo = timezoneService.getTimezoneInfo('America/New_York');
      expect(nyInfo.identifier).toBe('America/New_York');
      expect(typeof nyInfo.currentOffset).toBe('number');
      expect(typeof nyInfo.isDST).toBe('boolean');
    });
    
    it('should handle timezone shortcuts in getTimezoneInfo', () => {
      const estInfo = timezoneService.getTimezoneInfo('EST');
      expect(estInfo.identifier).toBe('America/New_York');
      
      const pstInfo = timezoneService.getTimezoneInfo('PST');
      expect(pstInfo.identifier).toBe('America/Los_Angeles');
    });
    
    it('should throw error for invalid timezones in getTimezoneInfo', () => {
      expect(() => timezoneService.getTimezoneInfo('Invalid/Timezone')).toThrow();
    });
  });
  
  describe('Timezone Conversion', () => {
    it('should convert timestamps between timezones correctly', () => {
      const timestamp = 1609459200; // 2021-01-01T00:00:00.000Z
      const result = timezoneService.convertTimestamp(timestamp, 'UTC', 'America/New_York');
      
      expect(result.originalTimestamp).toBe(timestamp);
      expect(typeof result.convertedTimestamp).toBe('number');
      expect(result.fromTimezone.identifier).toBe('UTC');
      expect(result.toTimezone.identifier).toBe('America/New_York');
      expect(typeof result.offsetDifference).toBe('number');
    });
    
    it('should handle timezone shortcuts in conversion', () => {
      const timestamp = 1609459200; // 2021-01-01T00:00:00.000Z
      const result = timezoneService.convertTimestamp(timestamp, 'UTC', 'EST');
      
      expect(result.toTimezone.identifier).toBe('America/New_York');
    });
    
    it('should throw error for invalid timezones in conversion', () => {
      const timestamp = 1609459200;
      expect(() => timezoneService.convertTimestamp(timestamp, 'UTC', 'Invalid/Timezone')).toThrow();
      expect(() => timezoneService.convertTimestamp(timestamp, 'Invalid/Timezone', 'UTC')).toThrow();
    });
  });
  
  describe('Common Timezones', () => {
    it('should return list of common timezones', () => {
      const commonTimezones = timezoneService.getCommonTimezones();
      
      expect(Array.isArray(commonTimezones)).toBe(true);
      expect(commonTimezones.length).toBeGreaterThan(0);
      expect(commonTimezones[0]).toHaveProperty('identifier');
      expect(commonTimezones[0]).toHaveProperty('displayName');
      expect(commonTimezones[0]).toHaveProperty('region');
    });
    
    it('should filter common timezones by region', () => {
      const europeTimezones = timezoneService.getCommonTimezonesByRegion('Europe');
      
      expect(Array.isArray(europeTimezones)).toBe(true);
      expect(europeTimezones.length).toBeGreaterThan(0);
      expect(europeTimezones.every(tz => tz.region === 'Europe')).toBe(true);
    });
    
    it('should search timezones by query', () => {
      const searchResults = timezoneService.searchTimezones('new york');
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.some(tz => tz.identifier === 'America/New_York')).toBe(true);
    });
  });
  
  describe('DST Handling', () => {
    it('should detect DST status correctly', () => {
      // January 1, 2021 (non-DST for northern hemisphere)
      const winterDate = new Date(2021, 0, 1);
      
      // July 1, 2021 (DST for northern hemisphere)
      const summerDate = new Date(2021, 6, 1);
      
      // New York observes DST
      const nyWinterDST = timezoneService.isDST(winterDate, 'America/New_York');
      const nySummerDST = timezoneService.isDST(summerDate, 'America/New_York');
      
      // Phoenix doesn't observe DST
      const phoenixWinterDST = timezoneService.isDST(winterDate, 'America/Phoenix');
      const phoenixSummerDST = timezoneService.isDST(summerDate, 'America/Phoenix');
      
      // UTC doesn't observe DST
      const utcWinterDST = timezoneService.isDST(winterDate, 'UTC');
      const utcSummerDST = timezoneService.isDST(summerDate, 'UTC');
      
      expect(nyWinterDST).toBe(false);
      expect(nySummerDST).toBe(true);
      
      expect(phoenixWinterDST).toBe(false);
      expect(phoenixSummerDST).toBe(false);
      
      expect(utcWinterDST).toBe(false);
      expect(utcSummerDST).toBe(false);
    });
    
    it('should get DST transition dates', () => {
      const transitions = timezoneService.getDSTTransitionDates('America/New_York', 2021);
      
      expect(Array.isArray(transitions)).toBe(true);
      
      // If timezone has DST, should have transitions
      if (transitions.length > 0) {
        expect(transitions.length).toBe(2); // Start and end transitions
        expect(transitions[0]).toHaveProperty('date');
        expect(transitions[0]).toHaveProperty('offsetBefore');
        expect(transitions[0]).toHaveProperty('offsetAfter');
        expect(transitions[0]).toHaveProperty('type');
      }
      
      // UTC should have no transitions
      const utcTransitions = timezoneService.getDSTTransitionDates('UTC', 2021);
      expect(utcTransitions.length).toBe(0);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle invalid date in isDST', () => {
      const invalidDate = new Date('invalid date');
      expect(timezoneService.isDST(invalidDate, 'America/New_York')).toBe(false);
    });
    
    it('should handle DST transition times correctly', () => {
      // March 14, 2021, 1:59:59 AM EST - just before DST transition
      const beforeTransition = new Date(2021, 2, 14, 1, 59, 59);
      
      // March 14, 2021, 3:00:00 AM EDT - just after DST transition
      const afterTransition = new Date(2021, 2, 14, 3, 0, 0);
      
      // Convert both times to UTC
      const beforeResult = timezoneService.convertTimezoneWithValidation(
        beforeTransition, 
        'America/New_York', 
        'UTC'
      );
      
      const afterResult = timezoneService.convertTimezoneWithValidation(
        afterTransition, 
        'America/New_York', 
        'UTC'
      );
      
      // The difference should be 1 hour + 1 second (due to DST spring forward)
      const diffMs = afterResult.getTime() - beforeResult.getTime();
      const expectedDiffMs = (1 * 60 * 60 * 1000) + 1000; // 1 hour + 1 second
      
      expect(diffMs).toBe(expectedDiffMs);
    });
    
    it('should handle historical timezone data', () => {
      // Test with a date before DST was standardized
      const historicalDate = new Date(1950, 0, 1);
      
      // Should not throw errors
      expect(() => {
        timezoneService.getTimezoneOffsetAtDate('America/New_York', historicalDate);
      }).not.toThrow();
    });
    
    it('should handle timezone aliases correctly', () => {
      const nyInfo = timezoneService.getTimezoneInfo('America/New_York');
      
      // Should include EST/EDT as aliases
      expect(Array.isArray(nyInfo.aliases)).toBe(true);
      expect(nyInfo.aliases).toContain('EST');
      expect(nyInfo.aliases).toContain('EDT');
    });
    
    it('should handle extreme timezone offsets', () => {
      // Kiritimati (Christmas Island) has UTC+14, the most extreme positive offset
      const kiritimatiInfo = timezoneService.getTimezoneInfo('Pacific/Kiritimati');
      
      // Baker Island has UTC-12, the most extreme negative offset
      const bakerInfo = timezoneService.getTimezoneInfo('Etc/GMT+12'); // Note: Etc/GMT+12 is actually UTC-12
      
      // The difference between the most extreme timezones should be 26 hours
      const offsetDiff = timezoneService.getTimezoneDifference('Pacific/Kiritimati', 'Etc/GMT+12');
      
      expect(Math.abs(offsetDiff)).toBe(26 * 60); // 26 hours in minutes
    });
    
    it('should handle non-integer timezone offsets', () => {
      // Nepal has a UTC+5:45 offset
      const nepalInfo = timezoneService.getTimezoneInfo('Asia/Kathmandu');
      
      // Offset should not be a whole number of hours
      expect(nepalInfo.currentOffset % 60).not.toBe(0);
      
      // Chatham Islands has a UTC+12:45 offset
      const chathamInfo = timezoneService.getTimezoneInfo('Pacific/Chatham');
      
      // Offset should not be a whole number of hours
      expect(chathamInfo.currentOffset % 60).not.toBe(0);
    });
  });
});