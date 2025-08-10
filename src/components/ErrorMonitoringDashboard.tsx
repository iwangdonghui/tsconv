/**
 * Error Monitoring Dashboard
 *
 * A development-only component that displays error tracking statistics
 * and allows developers to view and manage error logs.
 */

import { AlertTriangle, Clock, Download, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ErrorTracking } from '../lib/error-tracking';
import { Button } from './ui/button';

interface ErrorStats {
  totalErrors: number;
  recentErrors: number;
  errorTypes: Record<string, number>;
}

interface StoredError {
  message: string;
  stack?: string;
  name: string;
  context?: Record<string, any>;
  timestamp: string;
  url: string;
  userAgent: string;
}

export function ErrorMonitoringDashboard() {
  const [stats, setStats] = useState<ErrorStats>({
    totalErrors: 0,
    recentErrors: 0,
    errorTypes: {},
  });
  const [errors, setErrors] = useState<StoredError[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedError, setSelectedError] = useState<StoredError | null>(null);

  // Only show in development
  if (import.meta.env?.PROD) {
    return null;
  }

  useEffect(() => {
    loadErrorData();

    // Refresh data every 30 seconds
    const interval = setInterval(loadErrorData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadErrorData = () => {
    const errorStats = ErrorTracking.getErrorStats();
    const storedErrors = ErrorTracking.getStoredErrors();

    setStats(errorStats);
    setErrors(storedErrors.reverse()); // Show newest first
  };

  const handleClearErrors = () => {
    ErrorTracking.clearStoredErrors();
    loadErrorData();
  };

  const handleDownloadErrors = () => {
    const dataStr = JSON.stringify(errors, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getErrorTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      unhandled_error: 'text-red-600 bg-red-50',
      unhandled_promise_rejection: 'text-orange-600 bg-orange-50',
      resource_error: 'text-yellow-600 bg-yellow-50',
      api_error: 'text-purple-600 bg-purple-50',
      unknown: 'text-gray-600 bg-gray-50',
    };
    return colors[type] || colors.unknown;
  };

  return (
    <div className='fixed bottom-4 right-4 z-50'>
      {/* Floating indicator */}
      <div
        className={`
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg p-3 cursor-pointer transition-all duration-200
          ${isExpanded ? 'mb-4' : ''}
          ${stats.recentErrors > 0 ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''}
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className='flex items-center gap-2'>
          <AlertTriangle
            className={`w-5 h-5 ${stats.recentErrors > 0 ? 'text-red-500' : 'text-gray-500'}`}
          />
          <div className='text-sm'>
            <div className='font-medium'>{stats.totalErrors} errors</div>
            {stats.recentErrors > 0 && (
              <div className='text-red-600 text-xs'>{stats.recentErrors} recent</div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded dashboard */}
      {isExpanded && (
        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-96 max-h-96 overflow-hidden'>
          {/* Header */}
          <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <h3 className='font-semibold text-gray-900 dark:text-white'>Error Monitor</h3>
              <div className='flex gap-2'>
                <Button size='sm' variant='outline' onClick={loadErrorData}>
                  <RefreshCw className='w-4 h-4' />
                </Button>
                <Button size='sm' variant='outline' onClick={handleDownloadErrors}>
                  <Download className='w-4 h-4' />
                </Button>
                <Button size='sm' variant='outline' onClick={handleClearErrors}>
                  <Trash2 className='w-4 h-4' />
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div className='flex items-center gap-2'>
                <TrendingUp className='w-4 h-4 text-blue-500' />
                <span>Total: {stats.totalErrors}</span>
              </div>
              <div className='flex items-center gap-2'>
                <Clock className='w-4 h-4 text-orange-500' />
                <span>Recent: {stats.recentErrors}</span>
              </div>
            </div>

            {/* Error types */}
            {Object.keys(stats.errorTypes).length > 0 && (
              <div className='mt-3'>
                <div className='text-xs text-gray-600 dark:text-gray-400 mb-2'>Error Types:</div>
                <div className='flex flex-wrap gap-1'>
                  {Object.entries(stats.errorTypes).map(([type, count]) => (
                    <span
                      key={type}
                      className={`px-2 py-1 rounded text-xs ${getErrorTypeColor(type)}`}
                    >
                      {type}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error list */}
          <div className='max-h-48 overflow-y-auto'>
            {errors.length === 0 ? (
              <div className='p-4 text-center text-gray-500 dark:text-gray-400 text-sm'>
                No errors recorded
              </div>
            ) : (
              <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                {errors.slice(0, 10).map((error, index) => (
                  <div
                    key={index}
                    className='p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                    onClick={() => setSelectedError(error)}
                  >
                    <div className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                      {error.name}: {error.message}
                    </div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      {formatTimestamp(error.timestamp)}
                    </div>
                    {error.context?.type && (
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${getErrorTypeColor(error.context.type)}`}
                      >
                        {error.context.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error detail modal */}
      {selectedError && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-gray-900 dark:text-white'>Error Details</h3>
                <Button size='sm' variant='outline' onClick={() => setSelectedError(null)}>
                  Close
                </Button>
              </div>
            </div>

            <div className='p-4 overflow-y-auto max-h-80'>
              <div className='space-y-4 text-sm'>
                <div>
                  <div className='font-medium text-gray-900 dark:text-white'>Message:</div>
                  <div className='text-gray-600 dark:text-gray-400'>{selectedError.message}</div>
                </div>

                <div>
                  <div className='font-medium text-gray-900 dark:text-white'>Timestamp:</div>
                  <div className='text-gray-600 dark:text-gray-400'>
                    {formatTimestamp(selectedError.timestamp)}
                  </div>
                </div>

                <div>
                  <div className='font-medium text-gray-900 dark:text-white'>URL:</div>
                  <div className='text-gray-600 dark:text-gray-400 break-all'>
                    {selectedError.url}
                  </div>
                </div>

                {selectedError.context && (
                  <div>
                    <div className='font-medium text-gray-900 dark:text-white'>Context:</div>
                    <pre className='text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto'>
                      {JSON.stringify(selectedError.context, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedError.stack && (
                  <div>
                    <div className='font-medium text-gray-900 dark:text-white'>Stack Trace:</div>
                    <pre className='text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto'>
                      {selectedError.stack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
