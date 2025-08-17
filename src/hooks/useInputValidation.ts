import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getValidationState,
  isLikelyTimestamp,
  ManualDate,
  validateDateString,
  validateManualDate,
  validateTimestamp,
  ValidationResult,
  ValidationState,
} from '../utils/validation';

export type ValidationFunction = (input: string) => ValidationResult;
export type ManualDateValidationFunction = (input: ManualDate) => ValidationResult;

export interface UseInputValidationOptions {
  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounceMs?: number;

  /**
   * Initial validation state
   * @default 'idle'
   */
  initialState?: ValidationState;

  /**
   * Custom validation function
   * If not provided, the hook will try to auto-detect the input type
   */
  validator?: ValidationFunction | ManualDateValidationFunction;

  /**
   * Enable caching of validation results
   * @default true
   */
  enableCache?: boolean;

  /**
   * Maximum cache size
   * @default 50
   */
  maxCacheSize?: number;
}

export interface UseInputValidationReturn<T extends string | ManualDate> {
  /**
   * Current validation result
   */
  validationResult: ValidationResult | null;

  /**
   * Current validation state
   */
  validationState: ValidationState;

  /**
   * Whether validation is in progress
   */
  isValidating: boolean;

  /**
   * Validate input manually
   */
  validateInput: (input: T) => void;

  /**
   * Clear validation state and result
   */
  clearValidation: () => void;

  /**
   * Reset validation to initial state
   */
  resetValidation: () => void;
}

/**
 * Hook for real-time input validation with debounce and caching
 */
export function useInputValidation<T extends string | ManualDate = string>(
  options: UseInputValidationOptions = {}
): UseInputValidationReturn<T> {
  const {
    debounceMs = 300,
    initialState = 'idle',
    validator,
    enableCache = true,
    maxCacheSize = 50,
  } = options;

  // State
  const [validationState, setValidationState] = useState<ValidationState>(initialState);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Refs
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Map<string, ValidationResult>>(new Map());
  const lastInputRef = useRef<T | null>(null);

  /**
   * Auto-detect and validate input type
   */
  const autoDetectAndValidate = useCallback((input: string): ValidationResult => {
    // Empty input case
    if (!input || !input.trim()) {
      return {
        isValid: false,
        errorType: 'format',
        message: 'Please enter a value',
        severity: 'error',
      };
    }

    // Try to determine if it's a timestamp or date
    if (isLikelyTimestamp(input)) {
      return validateTimestamp(input);
    } else {
      return validateDateString(input);
    }
  }, []);

  /**
   * Get cache key for input
   */
  const getCacheKey = useCallback((input: T): string => {
    if (typeof input === 'string') {
      return input.trim();
    } else {
      // For ManualDate objects, create a string key
      const dateObj = input as ManualDate;
      return `${dateObj.year}-${dateObj.month}-${dateObj.day}-${dateObj.hour}-${dateObj.minute}-${dateObj.second}`;
    }
  }, []);

  /**
   * Validate input with caching
   */
  const validateWithCache = useCallback(
    (input: T): ValidationResult => {
      const cacheKey = getCacheKey(input);

      // Check cache first if enabled
      if (enableCache && cacheKey !== undefined && cacheRef.current.has(cacheKey)) {
        return cacheRef.current.get(cacheKey)!;
      }

      // Perform validation based on input type
      let result: ValidationResult;

      if (validator) {
        // Use custom validator
        if (typeof input === 'string') {
          result = (validator as ValidationFunction)(input);
        } else {
          result = (validator as ManualDateValidationFunction)(input as ManualDate);
        }
      } else {
        // Use auto-detection for strings
        if (typeof input === 'string') {
          result = autoDetectAndValidate(input);
        } else {
          // Default to manual date validation for objects
          result = validateManualDate(input as ManualDate);
        }
      }

      // Cache the result if enabled
      if (enableCache) {
        // Implement LRU-like behavior by removing oldest entries if cache is too large
        if (cacheRef.current.size >= maxCacheSize) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey !== undefined) {
            cacheRef.current.delete(firstKey);
          }
        }

        if (cacheKey !== undefined && cacheKey !== null) {
          cacheRef.current.set(cacheKey, result);
        }
      }

      return result;
    },
    [validator, enableCache, maxCacheSize, autoDetectAndValidate, getCacheKey]
  );

  /**
   * Validate input with debounce
   */
  const validateInput = useCallback(
    (input: T) => {
      // Store the input for potential later use
      lastInputRef.current = input;

      // Clear any existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set validating state immediately
      setIsValidating(true);
      setValidationState('validating');

      // Debounce the validation
      debounceTimerRef.current = setTimeout(() => {
        try {
          const result = validateWithCache(input);
          setValidationResult(result);
          setValidationState(getValidationState(result));
        } catch (error) {
          // Handle validation errors
          console.error('Validation error:', error);
          setValidationResult({
            isValid: false,
            errorType: 'system',
            message: 'An error occurred during validation',
            severity: 'error',
          });
          setValidationState('invalid');
        } finally {
          setIsValidating(false);
        }
      }, debounceMs);
    },
    [debounceMs, validateWithCache]
  );

  /**
   * Clear validation state and result
   */
  const clearValidation = useCallback(() => {
    setValidationState('idle');
    setValidationResult(null);
    setIsValidating(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  /**
   * Reset validation to initial state
   */
  const resetValidation = useCallback(() => {
    setValidationState(initialState);
    setValidationResult(null);
    setIsValidating(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [initialState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    validationResult,
    validationState,
    isValidating,
    validateInput,
    clearValidation,
    resetValidation,
  };
}

/**
 * Hook specifically for timestamp validation
 */
export function useTimestampValidation(
  options: Omit<UseInputValidationOptions, 'validator'> = {}
): UseInputValidationReturn<string> {
  return useInputValidation<string>({
    ...options,
    validator: validateTimestamp,
  });
}

/**
 * Hook specifically for date string validation
 */
export function useDateStringValidation(
  options: Omit<UseInputValidationOptions, 'validator'> = {}
): UseInputValidationReturn<string> {
  return useInputValidation<string>({
    ...options,
    validator: validateDateString,
  });
}

/**
 * Hook specifically for manual date validation
 */
export function useManualDateValidation(
  options: Omit<UseInputValidationOptions, 'validator'> = {}
): UseInputValidationReturn<ManualDate> {
  return useInputValidation<ManualDate>({
    ...options,
    validator: validateManualDate,
  });
}
