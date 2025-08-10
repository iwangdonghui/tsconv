import { ValidationResult } from '@/utils/validation';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorMessage, ValidationFeedback } from '../error-message';
import { InlineRecoverySuggestions, RecoverySuggestions } from '../recovery-suggestions';
import { ValidatedInput, ValidationIndicator } from '../validation-indicator';

// Mock the language context
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

describe('ValidationIndicator', () => {
  it('renders with different states', () => {
    const { rerender } = render(<ValidationIndicator state='idle' testId='indicator' />);
    expect(screen.getByTestId('indicator')).toBeInTheDocument();

    rerender(<ValidationIndicator state='valid' testId='indicator' />);
    // Find the icon inside the indicator
    const validIcon = screen.getByTestId('indicator').querySelector('svg');
    expect(validIcon).toHaveClass('text-green-500');

    rerender(<ValidationIndicator state='invalid' testId='indicator' />);
    const invalidIcon = screen.getByTestId('indicator').querySelector('svg');
    expect(invalidIcon).toHaveClass('text-red-500');

    rerender(<ValidationIndicator state='warning' testId='indicator' />);
    const warningIcon = screen.getByTestId('indicator').querySelector('svg');
    expect(warningIcon).toHaveClass('text-yellow-500');
  });

  it('shows label when requested', () => {
    render(<ValidationIndicator state='valid' showLabel testId='indicator' />);
    expect(screen.getByText('validation.state.valid')).toBeInTheDocument();
  });
});

describe('ValidatedInput', () => {
  it('renders with different validation states', () => {
    const { rerender } = render(<ValidatedInput validationState='idle' placeholder='Test input' />);

    const input = screen.getByPlaceholderText('Test input');
    expect(input).toBeInTheDocument();

    rerender(<ValidatedInput validationState='valid' placeholder='Test input' />);
    expect(input).toHaveClass('border-green-500');

    rerender(<ValidatedInput validationState='invalid' placeholder='Test input' />);
    expect(input).toHaveClass('border-red-500');
  });

  it('connects to error message with aria-describedby', () => {
    render(
      <ValidatedInput
        validationState='invalid'
        placeholder='Test input'
        errorMessageId='test-error'
      />
    );

    const input = screen.getByPlaceholderText('Test input');
    expect(input).toHaveAttribute('aria-describedby', 'test-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('ErrorMessage', () => {
  const validResult: ValidationResult = {
    isValid: true,
    severity: 'info',
  };

  const errorResult: ValidationResult = {
    isValid: false,
    errorType: 'format',
    message: 'Invalid format',
    suggestions: ['Try format A', 'Try format B'],
    severity: 'error',
  };

  it('does not render when result is valid with no message', () => {
    const { container } = render(<ErrorMessage result={validResult} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error message with icon', () => {
    render(<ErrorMessage result={errorResult} testId='error-msg' />);
    expect(screen.getByTestId('error-msg')).toBeInTheDocument();
    expect(screen.getByText('Invalid format')).toBeInTheDocument();
  });

  it('shows suggestions when available', () => {
    render(<ErrorMessage result={errorResult} showSuggestions={true} testId='error-msg' />);

    expect(screen.getByText('validation.suggestions')).toBeInTheDocument();
    expect(screen.getByText('Try format A')).toBeInTheDocument();
    expect(screen.getByText('Try format B')).toBeInTheDocument();
  });
});

describe('RecoverySuggestions', () => {
  const mockResult: ValidationResult = {
    isValid: false,
    errorType: 'format',
    message: 'Invalid format',
    suggestions: ['Try: 1640995200', 'Try format B', 'Try another format'],
    severity: 'error',
  };

  it('renders suggestions with clickable buttons', () => {
    const handleClick = vi.fn();
    render(
      <RecoverySuggestions
        result={mockResult}
        onSuggestionClick={handleClick}
        testId='suggestions'
      />
    );

    // Find suggestion buttons (not copy buttons)
    const suggestionButtons = screen
      .getAllByRole('button')
      .filter(button => !button.getAttribute('aria-label')?.includes('copy'));
    expect(suggestionButtons.length).toBe(3); // 3 suggestions

    if (suggestionButtons[0]) {
      fireEvent.click(suggestionButtons[0]);
    }
    expect(handleClick).toHaveBeenCalledWith('Try: 1640995200');
  });

  it('shows copy button for value suggestions', () => {
    render(<RecoverySuggestions result={mockResult} testId='suggestions' />);

    // The first suggestion has "Try: " pattern so should have a copy button
    const copyButtons = screen
      .getAllByRole('button')
      .filter(button => button.getAttribute('aria-label') === 'validation.copy.suggestion');
    expect(copyButtons.length).toBe(3); // We're now showing copy buttons for all suggestions
  });
});

describe('InlineRecoverySuggestions', () => {
  const mockResult: ValidationResult = {
    isValid: false,
    errorType: 'format',
    message: 'Invalid format',
    suggestions: ['Try format A', 'Try format B', 'Try format C', 'Try format D'],
    severity: 'error',
  };

  it('limits the number of suggestions shown', () => {
    render(
      <InlineRecoverySuggestions
        result={mockResult}
        maxSuggestions={2}
        testId='inline-suggestions'
      />
    );

    expect(screen.getByText('Try format A')).toBeInTheDocument();
    expect(screen.getByText('Try format B')).toBeInTheDocument();
    expect(screen.queryByText('Try format C')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});

describe('ValidationFeedback', () => {
  const mockResult: ValidationResult = {
    isValid: false,
    errorType: 'format',
    message: 'Invalid format',
    suggestions: ['Try format A', 'Try format B'],
    severity: 'error',
  };

  it('renders both error message and suggestions', () => {
    render(<ValidationFeedback result={mockResult} testId='feedback' />);

    expect(screen.getByTestId('feedback-message')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-suggestions')).toBeInTheDocument();
    expect(screen.getByText('Invalid format')).toBeInTheDocument();
    expect(screen.getByText('Try format A')).toBeInTheDocument();
  });

  it('renders inline variant correctly', () => {
    render(<ValidationFeedback result={mockResult} variant='inline' testId='feedback' />);

    expect(screen.getByTestId('feedback-message')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-suggestions')).toBeInTheDocument();
  });
});
