import { Clock, RotateCcw, X } from 'lucide-react';
import React from 'react';

import type { HistoryItem } from '../hooks/useHistory';
import { useDeviceCapabilities } from '../hooks/useMobileGestures';

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelectItem: (input: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryPanel = React.forwardRef<HTMLDivElement, HistoryPanelProps>(
  ({ history, onSelectItem, onClear, isOpen, onClose }, ref) => {
    const { isMobile } = useDeviceCapabilities();

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className='absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto'
      >
        <div className='flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center gap-2'>
            <Clock className='w-4 h-4' />
            <span className='font-medium'>History</span>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={onClear}
              className={`text-gray-500 hover:text-red-500 transition-colors touch-manipulation ${
                isMobile ? 'p-3 min-h-[44px] min-w-[44px]' : 'p-1'
              }`}
              title='Clear history'
              aria-label='Clear history'
            >
              <RotateCcw className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
            </button>
            <button
              onClick={onClose}
              className={`text-gray-500 hover:text-gray-700 transition-colors touch-manipulation ${
                isMobile ? 'p-3 min-h-[44px] min-w-[44px]' : 'p-1'
              }`}
              aria-label='Close history'
            >
              <X className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className='p-4 text-center text-gray-500'>No conversion history yet</div>
        ) : (
          <div className='p-2'>
            {history.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectItem(item.input);
                  onClose();
                }}
                className={`w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors touch-manipulation ${
                  isMobile
                    ? 'p-4 text-base min-h-[60px]' // Larger touch target and text for mobile
                    : 'p-2 text-sm'
                }`}
              >
                <div className='font-mono text-blue-600 dark:text-blue-400'>{item.input}</div>
                <div className='text-gray-600 dark:text-gray-400 truncate'>→ {item.output}</div>
                <div className='text-xs text-gray-400 mt-1'>
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

HistoryPanel.displayName = 'HistoryPanel';
