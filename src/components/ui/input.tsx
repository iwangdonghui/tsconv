import { cn } from '@/lib/utils';
import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Enable mobile optimizations (prevents iOS zoom, optimizes keyboard)
   */
  mobileOptimized?: boolean;
  /**
   * Input mode for mobile keyboards
   */
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, mobileOptimized = false, inputMode, ...props }, ref) => {
    // Determine input mode based on type if not explicitly set
    const resolvedInputMode = inputMode || (type === 'number' ? 'numeric' : undefined);

    return (
      <input
        type={type}
        inputMode={resolvedInputMode}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          // Mobile optimizations
          mobileOptimized && [
            'text-base', // 16px font size to prevent iOS zoom
            'min-h-[44px]', // Minimum touch target size
            'touch-manipulation', // Optimize touch interactions
          ],
          // Default text size for non-mobile optimized inputs
          !mobileOptimized && 'text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
