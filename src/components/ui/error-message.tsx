import * as React from "react";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ValidationResult } from "@/utils/validation";
import { useLanguage } from "@/contexts/LanguageContext";
import { RecoverySuggestions, InlineRecoverySuggestions } from "./recovery-suggestions";

export interface ErrorMessageProps {
  result: ValidationResult;
  className?: string;
  id?: string;
  inputId?: string; // ID of the associated input for accessibility
  showIcon?: boolean;
  animate?: boolean;
  showSuggestions?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  testId?: string;
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    bgClass: "bg-red-50 dark:bg-red-900/20",
    borderClass: "border-red-200 dark:border-red-800",
    iconClass: "text-red-500",
    textClass: "text-red-800 dark:text-red-200",
    focusRingClass: "focus-within:ring-red-500/40"
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
    borderClass: "border-yellow-200 dark:border-yellow-800",
    iconClass: "text-yellow-500",
    textClass: "text-yellow-800 dark:text-yellow-200",
    focusRingClass: "focus-within:ring-yellow-500/40"
  },
  info: {
    icon: Info,
    bgClass: "bg-blue-50 dark:bg-blue-900/20",
    borderClass: "border-blue-200 dark:border-blue-800",
    iconClass: "text-blue-500",
    textClass: "text-blue-800 dark:text-blue-200",
    focusRingClass: "focus-within:ring-blue-500/40"
  }
};

export function ErrorMessage({ 
  result, 
  className,
  id,
  inputId,
  showIcon = true,
  animate = true,
  showSuggestions = true,
  onSuggestionClick,
  testId
}: ErrorMessageProps) {
  const { t } = useLanguage();
  
  // Don't render if valid and no message
  if (result.isValid && !result.message) {
    return null;
  }

  const config = severityConfig[result.severity];
  const IconComponent = config.icon;
  const messageId = id || `error-message-${Math.random().toString(36).substring(2, 9)}`;
  const hasSuggestions = showSuggestions && result.suggestions && result.suggestions.length > 0;

  return (
    <div
      id={messageId}
      className={cn(
        "rounded-lg border p-3 transition-all duration-300 focus-within:ring-2 focus-within:ring-offset-1",
        animate && "animate-in slide-in-from-top-1",
        config.bgClass,
        config.borderClass,
        config.focusRingClass,
        className
      )}
      role="alert"
      aria-live={result.severity === 'error' ? 'assertive' : 'polite'}
      {...(inputId && { 'aria-describedby': inputId })}
      data-testid={testId}
    >
      <div className="flex items-start gap-2">
        {showIcon && (
          <IconComponent 
            className={cn(
              "w-4 h-4 mt-0.5 flex-shrink-0",
              config.iconClass
            )}
            aria-hidden="true"
          />
        )}
        <div className="flex-1 min-w-0">
          {result.message && (
            <p className={cn(
              "text-sm font-medium",
              config.textClass
            )}>
              {result.message}
            </p>
          )}
          
          {/* Show suggestions if available */}
          {hasSuggestions && (
            <div className="mt-2">
              <p className={cn(
                "text-xs font-medium mb-1.5",
                config.textClass
              )}>
                {t('validation.suggestions')}
              </p>
              <div className="space-y-1">
                {result.suggestions!.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onSuggestionClick?.(suggestion)}
                    className={cn(
                      "text-xs py-1 px-2 rounded-md w-full text-left transition-colors duration-200",
                      "hover:bg-white/50 dark:hover:bg-white/10",
                      "focus:outline-none focus:ring-2",
                      result.severity === 'error' && "focus:ring-red-500",
                      result.severity === 'warning' && "focus:ring-yellow-500",
                      result.severity === 'info' && "focus:ring-blue-500",
                      config.textClass
                    )}
                    aria-label={t('validation.apply.suggestion')}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for inline display
export interface InlineErrorMessageProps {
  result: ValidationResult;
  className?: string;
  id?: string;
  inputId?: string; // ID of the associated input for accessibility
  showIcon?: boolean;
  animate?: boolean;
  showSuggestions?: boolean;
  maxSuggestions?: number;
  onSuggestionClick?: (suggestion: string) => void;
  testId?: string;
}

export function InlineErrorMessage({ 
  result, 
  className,
  id,
  inputId,
  showIcon = true,
  animate = true,
  showSuggestions = true,
  maxSuggestions = 2,
  onSuggestionClick,
  testId
}: InlineErrorMessageProps) {
  // Don't render if valid and no message
  if (result.isValid && !result.message) {
    return null;
  }

  const config = severityConfig[result.severity];
  const IconComponent = config.icon;
  const messageId = id || `inline-error-${Math.random().toString(36).substring(2, 9)}`;
  const hasSuggestions = showSuggestions && result.suggestions && result.suggestions.length > 0;

  return (
    <>
      <div
        id={messageId}
        className={cn(
          "flex items-center gap-1.5 text-sm transition-all duration-300",
          animate && "animate-in fade-in",
          config.textClass,
          className
        )}
        role="alert"
        aria-live={result.severity === 'error' ? 'assertive' : 'polite'}
        {...(inputId && { 'aria-describedby': inputId })}
        data-testid={testId}
      >
        {showIcon && (
          <IconComponent 
            className={cn(
              "w-3.5 h-3.5 flex-shrink-0",
              config.iconClass
            )}
            aria-hidden="true"
          />
        )}
        {result.message && (
          <span className="font-medium">
            {result.message}
          </span>
        )}
      </div>
      
      {/* Show inline suggestions if available */}
      {hasSuggestions && (
        <InlineRecoverySuggestions
          result={result}
          onSuggestionClick={onSuggestionClick}
          maxSuggestions={maxSuggestions}
          className="mt-1"
        />
      )}
    </>
  );
}

// Combined component that includes error message and recovery suggestions
export interface ValidationFeedbackProps {
  result: ValidationResult;
  className?: string;
  id?: string;
  inputId?: string;
  variant?: 'default' | 'inline';
  showIcon?: boolean;
  animate?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  testId?: string;
}

export function ValidationFeedback({
  result,
  className,
  id,
  inputId,
  variant = 'default',
  showIcon = true,
  animate = true,
  onSuggestionClick,
  testId
}: ValidationFeedbackProps) {
  // Don't render if valid and no message
  if (result.isValid && !result.message) {
    return null;
  }
  
  if (variant === 'inline') {
    return (
      <div className={className}>
        <InlineErrorMessage
          result={result}
          id={id}
          inputId={inputId}
          showIcon={showIcon}
          animate={animate}
          showSuggestions={false}
          testId={testId ? `${testId}-message` : undefined}
        />
        
        {result.suggestions && result.suggestions.length > 0 && (
          <InlineRecoverySuggestions
            result={result}
            onSuggestionClick={onSuggestionClick}
            className="mt-1"
            id={id ? `${id}-suggestions` : undefined}
            testId={testId ? `${testId}-suggestions` : undefined}
          />
        )}
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      <ErrorMessage
        result={result}
        id={id}
        inputId={inputId}
        showIcon={showIcon}
        animate={animate}
        showSuggestions={false}
        testId={testId ? `${testId}-message` : undefined}
      />
      
      {result.suggestions && result.suggestions.length > 0 && (
        <RecoverySuggestions
          result={result}
          onSuggestionClick={onSuggestionClick}
          id={id ? `${id}-suggestions` : undefined}
          testId={testId ? `${testId}-suggestions` : undefined}
        />
      )}
    </div>
  );
}