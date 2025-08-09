import { Check, AlertTriangle, X, Loader2, Circle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { ValidationState } from "@/utils/validation";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ValidationIndicatorProps {
  state: ValidationState;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  labelPosition?: 'right' | 'bottom';
  testId?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5", 
  lg: "w-6 h-6"
};

const stateStyles = {
  idle: {
    icon: Circle,
    className: "text-muted-foreground opacity-50",
    labelClass: "text-muted-foreground",
    bgClass: "bg-transparent",
    ringClass: ""
  },
  validating: {
    icon: Loader2,
    className: "text-blue-500 animate-spin",
    labelClass: "text-blue-500",
    bgClass: "bg-blue-50 dark:bg-blue-900/20",
    ringClass: "ring-2 ring-blue-500/20"
  },
  valid: {
    icon: Check,
    className: "text-green-500",
    labelClass: "text-green-500",
    bgClass: "bg-green-50 dark:bg-green-900/20",
    ringClass: "ring-2 ring-green-500/20"
  },
  invalid: {
    icon: X,
    className: "text-red-500",
    labelClass: "text-red-500",
    bgClass: "bg-red-50 dark:bg-red-900/20",
    ringClass: "ring-2 ring-red-500/20"
  },
  warning: {
    icon: AlertTriangle,
    className: "text-yellow-500",
    labelClass: "text-yellow-500",
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
    ringClass: "ring-2 ring-yellow-500/20"
  }
};

export function ValidationIndicator({ 
  state, 
  className,
  size = 'md',
  showLabel = false,
  animated = true,
  labelPosition = 'right',
  testId
}: ValidationIndicatorProps) {
  const { t } = useLanguage();
  const stateStyle = stateStyles[state] || stateStyles.idle;
  const IconComponent = stateStyle.icon;

  const getStateLabel = () => {
    return t(`validation.state.${state}`);
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-2 transition-all duration-200",
        labelPosition === 'bottom' && "flex-col items-center",
        className
      )}
      role="status"
      aria-live={state === 'invalid' || state === 'warning' ? 'assertive' : 'polite'}
      aria-label={getStateLabel()}
      data-testid={testId}
    >
      <div 
        className={cn(
          "flex items-center justify-center rounded-full p-1",
          stateStyle.bgClass,
          stateStyle.ringClass,
          animated && "transition-all duration-300"
        )}
      >
        <IconComponent 
          className={cn(
            sizeClasses[size],
            stateStyle.className,
            animated && "transition-all duration-300"
          )}
          aria-hidden="true"
        />
      </div>
      
      {showLabel && (
        <span className={cn(
          "text-sm font-medium",
          stateStyle.labelClass,
          animated && "transition-all duration-300"
        )}>
          {getStateLabel()}
        </span>
      )}
    </div>
  );
}

// Input wrapper component that includes validation styling
export interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  validationState?: ValidationState;
  showIndicator?: boolean;
  errorMessageId?: string;
  animated?: boolean;
}

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ 
    className, 
    validationState = 'idle', 
    showIndicator = true, 
    errorMessageId,
    animated = true,
    ...props 
  }, ref) => {
    const getValidationBorderClass = () => {
      switch (validationState) {
        case 'valid':
          return "border-green-500 focus-visible:ring-green-500";
        case 'invalid':
          return "border-red-500 focus-visible:ring-red-500";
        case 'warning':
          return "border-yellow-500 focus-visible:ring-yellow-500";
        case 'validating':
          return "border-blue-500 focus-visible:ring-blue-500";
        default:
          return "border-input focus-visible:ring-ring";
      }
    };

    const getValidationBackgroundClass = () => {
      switch (validationState) {
        case 'valid':
          return "bg-green-50/30 dark:bg-green-900/10";
        case 'invalid':
          return "bg-red-50/30 dark:bg-red-900/10";
        case 'warning':
          return "bg-yellow-50/30 dark:bg-yellow-900/10";
        case 'validating':
          return "bg-blue-50/30 dark:bg-blue-900/10";
        default:
          return "bg-background";
      }
    };

    return (
      <div className="relative">
        <input
          className={cn(
            "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            animated && "transition-all duration-300",
            getValidationBorderClass(),
            getValidationBackgroundClass(),
            showIndicator && "pr-10", // Add padding for indicator
            className
          )}
          ref={ref}
          aria-invalid={validationState === 'invalid'}
          {...(errorMessageId && validationState === 'invalid' && {
            'aria-describedby': errorMessageId
          })}
          {...props}
        />
        {showIndicator && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <ValidationIndicator 
              state={validationState} 
              size="sm" 
              animated={animated}
            />
          </div>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

// Textarea version with validation
export interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  validationState?: ValidationState;
  showIndicator?: boolean;
  errorMessageId?: string;
  animated?: boolean;
}

export const ValidatedTextarea = React.forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  ({ 
    className, 
    validationState = 'idle', 
    showIndicator = true, 
    errorMessageId,
    animated = true,
    ...props 
  }, ref) => {
    const getValidationBorderClass = () => {
      switch (validationState) {
        case 'valid':
          return "border-green-500 focus-visible:ring-green-500";
        case 'invalid':
          return "border-red-500 focus-visible:ring-red-500";
        case 'warning':
          return "border-yellow-500 focus-visible:ring-yellow-500";
        case 'validating':
          return "border-blue-500 focus-visible:ring-blue-500";
        default:
          return "border-input focus-visible:ring-ring";
      }
    };

    const getValidationBackgroundClass = () => {
      switch (validationState) {
        case 'valid':
          return "bg-green-50/30 dark:bg-green-900/10";
        case 'invalid':
          return "bg-red-50/30 dark:bg-red-900/10";
        case 'warning':
          return "bg-yellow-50/30 dark:bg-yellow-900/10";
        case 'validating':
          return "bg-blue-50/30 dark:bg-blue-900/10";
        default:
          return "bg-background";
      }
    };

    return (
      <div className="relative">
        <textarea
          className={cn(
            "flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            animated && "transition-all duration-300",
            getValidationBorderClass(),
            getValidationBackgroundClass(),
            showIndicator && "pr-10", // Add padding for indicator
            className
          )}
          ref={ref}
          aria-invalid={validationState === 'invalid'}
          {...(errorMessageId && validationState === 'invalid' && {
            'aria-describedby': errorMessageId
          })}
          {...props}
        />
        {showIndicator && (
          <div className="absolute right-3 top-3">
            <ValidationIndicator 
              state={validationState} 
              size="sm" 
              animated={animated}
            />
          </div>
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = "ValidatedTextarea";