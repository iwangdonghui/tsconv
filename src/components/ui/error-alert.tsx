import { AlertTriangle, X } from 'lucide-react';
import { Button } from './button';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorAlert({ 
  title = "Error", 
  message, 
  onDismiss, 
  onRetry 
}: ErrorAlertProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            {title}
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {message}
          </p>
          {onRetry && (
            <div className="mt-3">
              <Button 
                onClick={onRetry} 
                variant="outline" 
                size="sm"
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}