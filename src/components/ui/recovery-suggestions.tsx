import { Lightbulb, Copy, Check, ArrowRight } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { ValidationResult } from "@/utils/validation";
import { Button } from "./button";
import { useLanguage } from "@/contexts/LanguageContext";

export interface RecoverySuggestionsProps {
  result: ValidationResult;
  onSuggestionClick?: (suggestion: string) => void;
  className?: string;
  id?: string;
  animate?: boolean;
  showTitle?: boolean;
  testId?: string;
}

export function RecoverySuggestions({ 
  result, 
  onSuggestionClick,
  className,
  id,
  animate = true,
  showTitle = true,
  testId
}: RecoverySuggestionsProps) {
  const { t } = useLanguage();
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

  // Don't render if no suggestions
  if (!result.suggestions || result.suggestions.length === 0) {
    return null;
  }

  const handleSuggestionClick = (suggestion: string, index: number) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  const handleCopySuggestion = async (suggestion: string, index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      // Extract the actual value from suggestion text (look for patterns like "Try: 1640995200")
      const match = suggestion.match(/Try:?\s*([^\s(]+)/);
      const textToCopy = match ? match[1] : suggestion;
      
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy suggestion:', error);
    }
  };

  const getSeverityStyles = () => {
    switch (result.severity) {
      case 'error':
        return {
          bgClass: "bg-red-50 dark:bg-red-900/10",
          borderClass: "border-red-100 dark:border-red-800/50",
          iconClass: "text-red-500",
          textClass: "text-red-700 dark:text-red-300",
          buttonClass: "text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20",
          focusRingClass: "focus-within:ring-red-500/40"
        };
      case 'warning':
        return {
          bgClass: "bg-yellow-50 dark:bg-yellow-900/10",
          borderClass: "border-yellow-100 dark:border-yellow-800/50",
          iconClass: "text-yellow-500",
          textClass: "text-yellow-700 dark:text-yellow-300",
          buttonClass: "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/20",
          focusRingClass: "focus-within:ring-yellow-500/40"
        };
      default:
        return {
          bgClass: "bg-blue-50 dark:bg-blue-900/10",
          borderClass: "border-blue-100 dark:border-blue-800/50",
          iconClass: "text-blue-500",
          textClass: "text-blue-700 dark:text-blue-300",
          buttonClass: "text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/20",
          focusRingClass: "focus-within:ring-blue-500/40"
        };
    }
  };

  const styles = getSeverityStyles();
  const suggestionId = id || `recovery-suggestions-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div
      id={suggestionId}
      className={cn(
        "rounded-lg border p-3 transition-all duration-300 focus-within:ring-2 focus-within:ring-offset-1",
        animate && "animate-in slide-in-from-top-1",
        styles.bgClass,
        styles.borderClass,
        styles.focusRingClass,
        className
      )}
      role="region"
      aria-label="Suggestions for fixing the input"
      data-testid={testId}
    >
      <div className="flex items-start gap-2">
        <Lightbulb 
          className={cn(
            "w-4 h-4 mt-0.5 flex-shrink-0",
            styles.iconClass
          )}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          {showTitle && (
            <p className={cn(
              "text-sm font-medium mb-2",
              styles.textClass
            )}>
              {t('validation.suggestions')}
            </p>
          )}
          <ul 
            className="space-y-1.5" 
            role="list"
            aria-label="Suggested fixes"
          >
            {result.suggestions.map((suggestion, index) => (
              <li 
                key={index} 
                className="flex items-center justify-between group"
                onMouseEnter={() => setFocusedIndex(index)}
                onMouseLeave={() => setFocusedIndex(null)}
              >
                <button
                  onClick={() => handleSuggestionClick(suggestion, index)}
                  className={cn(
                    "flex-1 text-left text-sm p-2 rounded transition-all duration-200",
                    styles.textClass,
                    styles.buttonClass,
                    "focus:outline-none focus:ring-2 focus:ring-offset-1",
                    result.severity === 'error' && "focus:ring-red-500",
                    result.severity === 'warning' && "focus:ring-yellow-500",
                    result.severity === 'info' && "focus:ring-blue-500",
                    focusedIndex === index && "bg-white/30 dark:bg-white/5"
                  )}
                  aria-label={t('validation.apply.suggestion')}
                >
                  <div className="flex items-center">
                    <span className="flex-1">{suggestion}</span>
                    <ArrowRight 
                      className={cn(
                        "w-3 h-3 ml-1.5 opacity-0 transition-opacity duration-200",
                        (focusedIndex === index) && "opacity-70"
                      )}
                    />
                  </div>
                </button>
                
                {/* Copy button for suggestions that look like values */}
                {suggestion.match(/Try:?\s*([^\s(]+)/) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleCopySuggestion(suggestion, index, e)}
                    className={cn(
                      "ml-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                      styles.buttonClass
                    )}
                    aria-label={t('validation.copy.suggestion')}
                  >
                    {copiedIndex === index ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Compact version for inline display
export interface InlineRecoverySuggestionsProps {
  result: ValidationResult;
  onSuggestionClick?: (suggestion: string) => void;
  maxSuggestions?: number;
  className?: string;
  id?: string;
  animate?: boolean;
  testId?: string;
}

export function InlineRecoverySuggestions({ 
  result, 
  onSuggestionClick,
  maxSuggestions = 2,
  className,
  id,
  animate = true,
  testId
}: InlineRecoverySuggestionsProps) {
  const { t } = useLanguage();
  
  // Don't render if no suggestions
  if (!result.suggestions || result.suggestions.length === 0) {
    return null;
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  const getSeverityTextClass = () => {
    switch (result.severity) {
      case 'error':
        return "text-red-600 dark:text-red-400";
      case 'warning':
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  const getSeverityBgClass = () => {
    switch (result.severity) {
      case 'error':
        return "bg-red-50 dark:bg-red-900/20";
      case 'warning':
        return "bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "bg-blue-50 dark:bg-blue-900/20";
    }
  };

  const limitedSuggestions = result.suggestions.slice(0, maxSuggestions);
  const suggestionId = id || `inline-suggestions-${Math.random().toString(36).substring(2, 9)}`;
  const hasMoreSuggestions = result.suggestions.length > maxSuggestions;

  return (
    <div
      id={suggestionId}
      className={cn(
        "flex flex-wrap gap-1.5 transition-all duration-300",
        animate && "animate-in fade-in",
        className
      )}
      role="region"
      aria-label="Quick suggestions"
      data-testid={testId}
    >
      {limitedSuggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => handleSuggestionClick(suggestion)}
          className={cn(
            "inline-flex items-center px-2 py-1 text-xs rounded-md transition-all duration-200",
            "border border-current/20 hover:bg-current/10",
            "focus:outline-none focus:ring-2 focus:ring-offset-1",
            getSeverityTextClass(),
            result.severity === 'error' && "focus:ring-red-500",
            result.severity === 'warning' && "focus:ring-yellow-500",
            result.severity === 'info' && "focus:ring-blue-500"
          )}
          aria-label={t('validation.apply.suggestion')}
        >
          {suggestion.length > 30 ? `${suggestion.substring(0, 30)}...` : suggestion}
        </button>
      ))}
      
      {/* Show indicator if there are more suggestions */}
      {hasMoreSuggestions && (
        <span 
          className={cn(
            "inline-flex items-center px-2 py-1 text-xs rounded-md",
            "border border-current/10",
            getSeverityTextClass(),
            getSeverityBgClass()
          )}
          aria-hidden="true"
        >
          +{result.suggestions.length - maxSuggestions} more
        </span>
      )}
    </div>
  );
}