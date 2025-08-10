import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManualDate } from '../../utils/validation';
import {
  useDateStringValidation,
  useInputValidation,
  useManualDateValidation,
  useTimestampValidation,
} from '../useInputValidation';

// Mock timers for debounce testing
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useInputValidation', () => {
  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useInputValidation());

    expect(result.current.validationState).toBe('idle');
    expect(result.current.validationResult).toBeNull();
    expect(result.current.isValidating).toBe(false);
  });

  it('should validate timestamp input correctly', async () => {
    const { result } = renderHook(() => useInputValidation());

    act(() => {
      result.current.validateInput('1640995200');
    });

    // Should be in validating state immediately
    expect(result.current.validationState).toBe('validating');
    expect(result.current.isValidating).toBe(true);

    // Fast-forward debounce timer
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should be valid after debounce
    expect(result.current.validationState).toBe('valid');
    expect(result.current.isValidating).toBe(false);
    expect(result.current.validationResult?.isValid).toBe(true);
  });

  it('should validate invalid input correctly', async () => {
    const { result } = renderHook(() => useInputValidation());

    act(() => {
      result.current.validateInput('invalid');
    });

    // Fast-forward debounce timer
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should be invalid after debounce
    expect(result.current.validationState).toBe('invalid');
    expect(result.current.validationResult?.isValid).toBe(false);
    expect(result.current.validationResult?.errorType).toBe('format');
  });

  it('should clear validation state', () => {
    const { result } = renderHook(() => useInputValidation());

    act(() => {
      result.current.validateInput('1640995200');
      vi.advanceTimersByTime(300);
    });

    expect(result.current.validationState).toBe('valid');

    act(() => {
      result.current.clearValidation();
    });

    expect(result.current.validationState).toBe('idle');
    expect(result.current.validationResult).toBeNull();
  });

  it('should reset validation to initial state', () => {
    const { result } = renderHook(() => useInputValidation({ initialState: 'warning' }));

    act(() => {
      result.current.validateInput('1640995200');
      vi.advanceTimersByTime(300);
    });

    expect(result.current.validationState).toBe('valid');

    act(() => {
      result.current.resetValidation();
    });

    expect(result.current.validationState).toBe('warning');
    expect(result.current.validationResult).toBeNull();
  });

  it('should use custom validator if provided', () => {
    const customValidator = vi.fn().mockReturnValue({
      isValid: true,
      severity: 'warning',
      message: 'Custom validation',
    });

    const { result } = renderHook(() => useInputValidation({ validator: customValidator }));

    act(() => {
      result.current.validateInput('test');
      vi.advanceTimersByTime(300);
    });

    expect(customValidator).toHaveBeenCalledWith('test');
    expect(result.current.validationState).toBe('warning');
    expect(result.current.validationResult?.message).toBe('Custom validation');
  });

  it('should cache validation results', () => {
    const customValidator = vi.fn().mockReturnValue({
      isValid: true,
      severity: 'info',
    });

    const { result } = renderHook(() =>
      useInputValidation({ validator: customValidator, enableCache: true })
    );

    // First validation
    act(() => {
      result.current.validateInput('test');
      vi.advanceTimersByTime(300);
    });

    expect(customValidator).toHaveBeenCalledTimes(1);

    // Same input should use cache
    act(() => {
      result.current.validateInput('test');
      vi.advanceTimersByTime(300);
    });

    expect(customValidator).toHaveBeenCalledTimes(1); // Still called only once

    // Different input should call validator again
    act(() => {
      result.current.validateInput('different');
      vi.advanceTimersByTime(300);
    });

    expect(customValidator).toHaveBeenCalledTimes(2);
  });

  it('should disable cache if specified', () => {
    const customValidator = vi.fn().mockReturnValue({
      isValid: true,
      severity: 'info',
    });

    const { result } = renderHook(() =>
      useInputValidation({ validator: customValidator, enableCache: false })
    );

    // First validation
    act(() => {
      result.current.validateInput('test');
      vi.advanceTimersByTime(300);
    });

    expect(customValidator).toHaveBeenCalledTimes(1);

    // Same input should call validator again
    act(() => {
      result.current.validateInput('test');
      vi.advanceTimersByTime(300);
    });

    expect(customValidator).toHaveBeenCalledTimes(2);
  });
});

describe('Specialized validation hooks', () => {
  it('useTimestampValidation should validate timestamps', () => {
    const { result } = renderHook(() => useTimestampValidation());

    act(() => {
      result.current.validateInput('1640995200');
      vi.advanceTimersByTime(300);
    });

    expect(result.current.validationState).toBe('valid');

    act(() => {
      result.current.validateInput('invalid');
      vi.advanceTimersByTime(300);
    });

    expect(result.current.validationState).toBe('invalid');
  });

  it('useDateStringValidation should validate date strings', () => {
    const { result } = renderHook(() => useDateStringValidation());

    act(() => {
      result.current.validateInput('2022-01-01');
      vi.advanceTimersByTime(300);
    });

    expect(result.current.validationState).toBe('valid');

    act(() => {
      result.current.validateInput('invalid');
      vi.advanceTimersByTime(300);
    });

    expect(result.current.validationState).toBe('invalid');
  });

  it('useManualDateValidation should validate manual dates', () => {
    const { result } = renderHook(() => useManualDateValidation());

    const validDate: ManualDate = {
      year: 2022,
      month: 1,
      day: 1,
      hour: 12,
      minute: 30,
      second: 45,
    };

    act(() => {
      result.current.validateInput(validDate);
      vi.advanceTimersByTime(300);
    });

    expect(result.current.validationState).toBe('valid');

    const invalidDate: ManualDate = {
      year: 2022,
      month: 13, // Invalid month
      day: 1,
      hour: 12,
      minute: 30,
      second: 45,
    };

    act(() => {
      result.current.validateInput(invalidDate);
      vi.advanceTimersByTime(300);
    });

    expect(result.current.validationState).toBe('invalid');
  });
});
