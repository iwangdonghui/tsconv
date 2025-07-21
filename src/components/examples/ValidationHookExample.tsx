import React, { useState, useEffect } from 'react';
import { useInputValidation } from '../../hooks/useInputValidation';
import { ValidationIndicator } from '../ui/validation-indicator';
import { ValidationFeedback } from '../ui/error-message';

/**
 * Example component demonstrating the useInputValidation hook
 */
export function ValidationHookExample() {
  const [input, setInput] = useState('');
  
  // Use the validation hook
  const {
    validationResult,
    validationState,
    isValidating,
    validateInput,
    clearValidation
  } = useInputValidation({
    debounceMs: 300, // 300ms debounce
    enableCache: true
  });

  // Validate input when it changes
  useEffect(() => {
    if (input.trim()) {
      validateInput(input);
    } else {
      clearValidation();
    }
  }, [input, validateInput, clearValidation]);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-lg font-medium">Validation Hook Example</h2>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="validation-example" className="text-sm font-medium">
            Enter a timestamp or date:
          </label>
          <ValidationIndicator state={validationState} showLabel />
        </div>
        
        <input
          id="validation-example"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Try: 1640995200 or 2022-01-01"
          className={`w-full p-2 border rounded-md ${
            validationState === 'valid' ? 'border-green-500' :
            validationState === 'invalid' ? 'border-red-500' :
            validationState === 'warning' ? 'border-yellow-500' :
            validationState === 'validating' ? 'border-blue-500' :
            'border-gray-300'
          }`}
        />
        
        {validationResult && (
          <ValidationFeedback
            result={validationResult}
            onSuggestionClick={(suggestion) => {
              // Extract value from suggestion (e.g., "Try: 1640995200" -> "1640995200")
              const match = suggestion.match(/Try:?\s*([^\s(]+)/);
              if (match) {
                setInput(match[1]);
              } else {
                setInput(suggestion);
              }
            }}
          />
        )}
      </div>
      
      <div className="text-sm">
        <p><strong>Current state:</strong> {validationState}</p>
        <p><strong>Is validating:</strong> {isValidating ? 'Yes' : 'No'}</p>
        {validationResult && (
          <p><strong>Is valid:</strong> {validationResult.isValid ? 'Yes' : 'No'}</p>
        )}
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => setInput('1640995200')}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
        >
          Try valid timestamp
        </button>
        <button
          onClick={() => setInput('2022-01-01')}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
        >
          Try valid date
        </button>
        <button
          onClick={() => setInput('invalid')}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
        >
          Try invalid input
        </button>
        <button
          onClick={() => clearValidation()}
          className="px-3 py-1 text-sm bg-gray-500 text-white rounded"
        >
          Clear validation
        </button>
      </div>
    </div>
  );
}