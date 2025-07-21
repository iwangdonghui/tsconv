import React from 'react';
import { Clock, X, RotateCcw } from 'lucide-react';
import { HistoryItem } from '../hooks/useHistory';

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelectItem: (input: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onSelectItem,
  onClear,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="font-medium">History</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="text-gray-500 hover:text-red-500 p-1"
            title="Clear history"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {history.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No conversion history yet
        </div>
      ) : (
        <div className="p-2">
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectItem(item.input);
                onClose();
              }}
              className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-sm"
            >
              <div className="font-mono text-blue-600 dark:text-blue-400">
                {item.input}
              </div>
              <div className="text-gray-600 dark:text-gray-400 truncate">
                → {item.output}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(item.timestamp).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};