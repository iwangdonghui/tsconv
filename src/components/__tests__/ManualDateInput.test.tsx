import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TimestampConverter from '../TimestampConverter';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock the hooks
vi.mock('../../hooks/useHistory', () => ({
  useHistory: () => ({
    history: [],
    addToHistory: vi.fn(),
    clearHistory: vi.fn()
  })
}));

vi.mock('../../hooks/useInputValidation', () => ({
  useInputValidation: () => ({
    validationResult: null,
    validateInput: vi.fn(),
    resetValidation: vi.fn()
  })
}));

vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => {}
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          {component}
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Manual Date Input - Mobile Improvements', () => {
  it('should allow users to clear and input values directly', () => {
    renderWithProviders(<TimestampConverter />);
    
    const monthInput = screen.getByPlaceholderText('Month') as HTMLInputElement;
    
    // User can clear the input and type a new value
    fireEvent.change(monthInput, { target: { value: '' } });
    fireEvent.change(monthInput, { target: { value: '5' } });
    
    // Month field uses padStart, so '5' becomes '05'
    expect(monthInput.value).toBe('05');
    
    // Test with year field which doesn't use padStart
    const yearInput = screen.getByPlaceholderText('YYYY') as HTMLInputElement;
    fireEvent.change(yearInput, { target: { value: '' } });
    fireEvent.change(yearInput, { target: { value: '2025' } });
    
    expect(yearInput.value).toBe('2025');
  });



  it('should have proper placeholder text', () => {
    renderWithProviders(<TimestampConverter />);
    
    const yearInput = screen.getByPlaceholderText('YYYY');
    const monthInput = screen.getByPlaceholderText('Month');
    const dayInput = screen.getByPlaceholderText('DD');
    const hourInput = screen.getByPlaceholderText('HH');
    const minuteInput = screen.getByPlaceholderText('Minute');
    const secondInput = screen.getByPlaceholderText('SS');
    
    expect(yearInput).toBeInTheDocument();
    expect(monthInput).toBeInTheDocument();
    expect(dayInput).toBeInTheDocument();
    expect(hourInput).toBeInTheDocument();
    expect(minuteInput).toBeInTheDocument();
    expect(secondInput).toBeInTheDocument();
  });

  it('should have Now and Reset buttons', () => {
    renderWithProviders(<TimestampConverter />);
    
    const nowButton = screen.getByText('📅 Now');
    const resetButton = screen.getByText('🔄 Reset');
    
    expect(nowButton).toBeInTheDocument();
    expect(resetButton).toBeInTheDocument();
  });

  it('should set current date when Now button is clicked', () => {
    renderWithProviders(<TimestampConverter />);
    
    const nowButton = screen.getByText('📅 Now');
    const yearInput = screen.getByPlaceholderText('YYYY') as HTMLInputElement;
    
    fireEvent.click(nowButton);
    
    const currentYear = new Date().getFullYear();
    expect(parseInt(yearInput.value)).toBe(currentYear);
  });

  it('should reset to default values when Reset button is clicked', () => {
    renderWithProviders(<TimestampConverter />);
    
    const resetButton = screen.getByText('🔄 Reset');
    const yearInput = screen.getByPlaceholderText('YYYY') as HTMLInputElement;
    const monthInput = screen.getByPlaceholderText('Month') as HTMLInputElement;
    
    fireEvent.click(resetButton);
    
    expect(yearInput.value).toBe('2000');
    expect(monthInput.value).toBe('01');
  });

  it('should respect min/max values for all fields', () => {
    renderWithProviders(<TimestampConverter />);
    
    // Test year boundaries
    const yearInput = screen.getByPlaceholderText('YYYY') as HTMLInputElement;
    
    // Test max value constraint
    fireEvent.change(yearInput, { target: { value: '5000' } });
    expect(parseInt(yearInput.value)).toBe(3000); // Should be clamped to max
    
    // Test min value constraint
    fireEvent.change(yearInput, { target: { value: '1000' } });
    expect(parseInt(yearInput.value)).toBe(1970); // Should be clamped to min
  });
});