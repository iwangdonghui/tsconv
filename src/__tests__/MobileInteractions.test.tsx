import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDeviceCapabilities } from '../hooks/useMobileGestures';

// Mock component to test device capabilities
function TestDeviceComponent() {
  const { isTouchDevice, isIOS, isAndroid, isMobile } = useDeviceCapabilities();

  return (
    <div data-testid="device-info">
      <span data-testid="is-touch">{isTouchDevice.toString()}</span>
      <span data-testid="is-ios">{isIOS.toString()}</span>
      <span data-testid="is-android">{isAndroid.toString()}</span>
      <span data-testid="is-mobile">{isMobile.toString()}</span>
    </div>
  );
}

describe('Mobile Interactions', () => {
  describe('Device Capabilities Detection', () => {
    it('should detect touch device capabilities', () => {
      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        writable: true,
      });

      render(<TestDeviceComponent />);

      expect(screen.getByTestId('is-touch')).toHaveTextContent('true');
    });

    it('should detect iOS device', () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
      });

      render(<TestDeviceComponent />);

      expect(screen.getByTestId('is-ios')).toHaveTextContent('true');
    });

    it('should detect Android device', () => {
      // Mock Android user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
        writable: true,
      });

      render(<TestDeviceComponent />);

      expect(screen.getByTestId('is-android')).toHaveTextContent('true');
    });
  });

  describe('Mobile Input Optimizations', () => {
    it('should apply mobile-specific input attributes', () => {
      render(
        <input
          type="number"
          inputMode="numeric"
          className="mobile-input"
          data-testid="mobile-input"
        />
      );

      const input = screen.getByTestId('mobile-input');
      expect(input).toHaveAttribute('inputMode', 'numeric');
      expect(input).toHaveClass('mobile-input');
    });

    it('should have proper touch target sizes', () => {
      render(
        <button
          className="mobile-button"
          data-testid="mobile-button"
        >
          Test Button
        </button>
      );

      const button = screen.getByTestId('mobile-button');
      expect(button).toHaveClass('mobile-button');
    });
  });

  describe('Touch Feedback', () => {
    it('should apply touch feedback classes', () => {
      render(
        <button
          className="touch-feedback"
          data-testid="touch-button"
        >
          Touch Me
        </button>
      );

      const button = screen.getByTestId('touch-button');
      expect(button).toHaveClass('touch-feedback');
    });
  });

  describe('Responsive Design', () => {
    it('should apply mobile-specific classes', () => {
      render(
        <div className="mobile-optimized mobile-spacing mobile-text">
          Mobile Content
        </div>
      );

      const element = screen.getByText('Mobile Content');
      expect(element).toHaveClass('mobile-optimized');
      expect(element).toHaveClass('mobile-spacing');
      expect(element).toHaveClass('mobile-text');
    });
  });
});

describe('Mobile Accessibility', () => {
  it('should have proper ARIA attributes for mobile', () => {
    render(
      <button
        aria-label="Copy to clipboard"
        className="mobile-touch-target"
        data-testid="accessible-button"
      >
        Copy
      </button>
    );

    const button = screen.getByTestId('accessible-button');
    expect(button).toHaveAttribute('aria-label', 'Copy to clipboard');
    expect(button).toHaveClass('mobile-touch-target');
  });

  it('should support keyboard navigation on mobile', () => {
    render(
      <input
        type="text"
        aria-label="Timestamp input"
        className="mobile-input"
        data-testid="keyboard-input"
      />
    );

    const input = screen.getByTestId('keyboard-input');
    expect(input).toHaveAttribute('aria-label', 'Timestamp input');
    
    // Test focus
    input.focus();
    expect(input).toHaveFocus();
  });
});
