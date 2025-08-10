import { describe, expect, it } from 'vitest';
import { validateInput } from '../validation';

describe('Validation Utils', () => {
  describe('validateInput', () => {
    it('should return error for empty input', () => {
      const result = validateInput('');
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('format');
    });

    it('should validate 10-digit Unix timestamps', () => {
      const result = validateInput('1640995200');
      expect(result.isValid).toBe(true);
      expect(result.errorType).toBeUndefined();
    });

    it('should validate 13-digit Unix timestamps (milliseconds)', () => {
      const result = validateInput('1640995200000');
      expect(result.isValid).toBe(true);
      expect(result.errorType).toBeUndefined();
    });

    it('should validate 9-digit Unix timestamps', () => {
      const result = validateInput('999999999');
      expect(result.isValid).toBe(true);
      expect(result.errorType).toBeUndefined();
    });

    it('should reject invalid timestamp lengths', () => {
      const result = validateInput('12345678901234'); // 14 digits
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('range');
    });

    it('should validate ISO date strings', () => {
      const result = validateInput('2022-01-01T00:00:00Z');
      expect(result.isValid).toBe(true);
      expect(result.errorType).toBeUndefined();
    });

    it('should validate human-readable date strings', () => {
      const result = validateInput('January 1, 2022');
      expect(result.isValid).toBe(true);
      expect(result.errorType).toBeUndefined();
    });

    it('should provide suggestions for invalid timestamps', () => {
      const result = validateInput('1234567'); // Short timestamp
      expect(result.isValid).toBe(false);
      expect(result.suggestions).toBeDefined();
    });

    it('should provide suggestions for malformed dates', () => {
      const result = validateInput('32/13/2022'); // Invalid day/month
      expect(result.isValid).toBe(false);
      expect(result.suggestions).toBeDefined();
    });

    it('should handle comma-separated timestamps', () => {
      const result = validateInput('1,640,995,200');
      expect(result.isValid).toBe(true);
      expect(result.errorType).toBeUndefined();
    });

    it('should handle edge case timestamps', () => {
      const minResult = validateInput('0'); // Unix epoch
      expect(minResult.isValid).toBe(false); // Too small for our validator

      const maxResult = validateInput('2147483647'); // Max 32-bit timestamp
      expect(maxResult.isValid).toBe(true);
    });
  });
});
