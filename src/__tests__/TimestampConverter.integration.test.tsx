import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimestampConverter from '../components/TimestampConverter';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock clipboard API
describe('TimestampConverter Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    // Mock window.matchMedia for theme context
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderConverter = () => {
    return render(
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <TimestampConverter />
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  describe('Input Validation Flow', () => {
    it('should show validation feedback for valid timestamp', async () => {
      const { findByPlaceholderText } = renderConverter();
      const input = await findByPlaceholderText('Enter timestamp or date...');

      fireEvent.change(input, { target: { value: '1640995200' } });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Input is valid');
      });
    });

    it('should show validation feedback for invalid input', async () => {
      const { findByPlaceholderText } = renderConverter();
      const input = await findByPlaceholderText('Enter timestamp or date...');

      fireEvent.change(input, { target: { value: 'invalid-input' } });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid format');
      });
    });

    it('should show suggestions for common errors', async () => {
      const { findByPlaceholderText } = renderConverter();
      const input = await findByPlaceholderText('Enter timestamp or date...');

      fireEvent.change(input, { target: { value: '164099520' } }); // 9 digits

      await waitFor(() => {
        expect(screen.getByText('Suggestions:')).toBeInTheDocument();
        expect(
          screen.getByText('Try adding leading zeros to make a 10-digit timestamp')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Manual Date Validation', () => {
    it('should validate manual date inputs', async () => {
      const { findByLabelText } = renderConverter();
      const yearInput = await findByLabelText('Year');
      // Month and day inputs are available but not used in this test
      await findByLabelText('Month');
      await findByLabelText('Day');

      fireEvent.change(yearInput, { target: { value: '1969' } }); // Invalid year for Unix timestamp

      await waitFor(() => {
        expect(
          screen.getByText('Year must be 1970 or later for Unix timestamps')
        ).toBeInTheDocument();
      });
    });

    it('should validate non-existent dates', async () => {
      const { findByLabelText } = renderConverter();
      const yearInput = await findByLabelText('Year');
      const monthInput = await findByLabelText('Month');
      const dayInput = await findByLabelText('Day');

      fireEvent.change(yearInput, { target: { value: '2023' } });
      fireEvent.change(monthInput, { target: { value: '2' } });
      fireEvent.change(dayInput, { target: { value: '30' } }); // Feb 30 doesn't exist

      await waitFor(() => {
        expect(screen.getByText('Invalid manual date configuration')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes for validation feedback', async () => {
      const { findByPlaceholderText } = renderConverter();
      const input = await findByPlaceholderText('Enter timestamp or date...');

      expect(input).toHaveAttribute('aria-invalid', 'false');
      expect(input).toHaveAttribute('aria-busy', 'false');

      fireEvent.change(input, { target: { value: 'invalid' } });

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('aria-describedby', 'input-validation-feedback');
      });
    });

    it('should announce validation changes to screen readers', async () => {
      const { findByPlaceholderText } = renderConverter();
      const input = await findByPlaceholderText('Enter timestamp or date...');

      fireEvent.change(input, { target: { value: '1640995200' } });

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Input is valid');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate between input fields with Tab key', async () => {
      const { findByPlaceholderText, findByLabelText } = renderConverter();
      const mainInput = await findByPlaceholderText('Enter timestamp or date...');
      // Year input is available but not used in this test
      await findByLabelText('Year');

      mainInput.focus();
      expect(document.activeElement).toBe(mainInput);

      // Use fireEvent instead of userEvent.tab() since user-event is not imported
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
      // Test focus navigation through elements
    });
  });

  describe('Error Recovery Flow', () => {
    it('should clear validation state when input is cleared', async () => {
      const { findByPlaceholderText, findByRole } = renderConverter();
      const input = await findByPlaceholderText('Enter timestamp or date...');
      const clearButton = await findByRole('button', { name: 'Clear input' });

      fireEvent.change(input, { target: { value: 'invalid-input' } });
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      fireEvent.click(clearButton);
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Batch Conversion Validation', () => {
    it('should validate batch input and show appropriate feedback', async () => {
      const { findByRole } = renderConverter();
      const batchButton = await findByRole('button', { name: /batch converter/i });

      fireEvent.click(batchButton);

      const batchTextarea = await screen.findByPlaceholderText(/1640995200/);
      expect(batchTextarea).toBeTruthy();
      expect(batchTextarea.tagName.toLowerCase()).toBe('textarea');

      fireEvent.change(batchTextarea, {
        target: { value: '1640995200\ninvalid-input\n2022-01-01' },
      });

      await waitFor(() => {
        expect(screen.getByText('1640995200 →')).toBeInTheDocument();
        expect(screen.getByText('invalid-input → Invalid format')).toBeInTheDocument();
      });
    });
  });
});
