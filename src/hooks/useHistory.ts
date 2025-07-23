import { useState, useEffect, useCallback } from 'react';

// Type definitions
type ConversionType = 'timestamp' | 'date';

interface HistoryItem {
  id: string;
  input: string;
  output: string;
  timestamp: number;
  type: ConversionType;
}

// Hook implementation
function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('tsconv-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to parse history from localStorage');
      }
    }
  }, []);

  const addToHistory = useCallback((input: string, output: string, itemType: ConversionType) => {
    setHistory(prevHistory => {
      // Check if this exact input already exists to avoid duplicates
      if (prevHistory.some(item => item.input === input)) {
        return prevHistory;
      }

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        input,
        output,
        timestamp: Date.now(),
        type: itemType
      };

      const newHistory = [newItem, ...prevHistory.slice(0, 9)]; // Keep only 10 items
      localStorage.setItem('tsconv-history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('tsconv-history');
  }, []);

  return { history, addToHistory, clearHistory };
}

// Exports
export type { HistoryItem };
export { useHistory };
