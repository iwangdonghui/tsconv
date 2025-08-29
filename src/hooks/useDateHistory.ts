import { useCallback, useEffect, useState } from 'react';

export interface DateHistoryItem {
  id: string;
  startDate: string;
  endDate: string;
  includeTime: boolean;
  absolute: boolean;
  timestamp: number;
  label?: string;
}

const STORAGE_KEY = 'tsconv_date_history';
const MAX_HISTORY_ITEMS = 10;

export function useDateHistory() {
  const [history, setHistory] = useState<DateHistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate and clean old entries (older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const validHistory = parsed.filter((item: DateHistoryItem) => 
          item.timestamp > thirtyDaysAgo
        ).slice(0, MAX_HISTORY_ITEMS);
        setHistory(validHistory);
      }
    } catch (error) {
      console.error('Failed to load date history:', error);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save date history:', error);
    }
  }, [history]);

  const addToHistory = useCallback((
    startDate: string,
    endDate: string,
    includeTime: boolean,
    absolute: boolean,
    label?: string
  ) => {
    if (!startDate || !endDate) return;

    const newItem: DateHistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startDate,
      endDate,
      includeTime,
      absolute,
      timestamp: Date.now(),
      label: label || `${startDate} to ${endDate}`
    };

    setHistory(prev => {
      // Remove duplicates (same dates)
      const filtered = prev.filter(
        item => !(item.startDate === startDate && item.endDate === endDate)
      );
      // Add new item at the beginning and limit to max items
      return [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    });
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getHistoryLabel = useCallback((item: DateHistoryItem): string => {
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    const today = new Date();
    
    // Check for special cases
    if (start.toDateString() === today.toDateString() && 
        end.toDateString() === today.toDateString()) {
      return "Today to Today";
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (start.toDateString() === yesterday.toDateString() && 
        end.toDateString() === today.toDateString()) {
      return "Yesterday to Today";
    }
    
    // Check if it's an age calculation (from birth date to today)
    if (end.toDateString() === today.toDateString()) {
      const years = today.getFullYear() - start.getFullYear();
      if (years > 0 && years < 150) {
        return `Age calculation (${years}y)`;
      }
    }
    
    return item.label || `${item.startDate} → ${item.endDate}`;
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getHistoryLabel
  };
}