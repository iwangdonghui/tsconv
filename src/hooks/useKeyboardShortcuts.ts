import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsProps {
  onFocusInput: () => void;
  onConvert: () => void;
  onCopy: () => void;
  onClear: () => void;
}

export const useKeyboardShortcuts = ({
  onFocusInput,
  onConvert,
  onCopy,
  onClear
}: KeyboardShortcutsProps) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

    // Ctrl/Cmd + K: Focus input
    if (ctrlKey && event.key === 'k') {
      event.preventDefault();
      onFocusInput();
    }

    // Ctrl/Cmd + Enter: Execute conversion
    if (ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      onConvert();
    }

    // Ctrl/Cmd + C: Copy result (only if not in input field)
    if (ctrlKey && event.key === 'c' && !(event.target as HTMLElement)?.matches('input, textarea')) {
      event.preventDefault();
      onCopy();
    }

    // Esc: Clear input
    if (event.key === 'Escape') {
      event.preventDefault();
      onClear();
    }
  }, [onFocusInput, onConvert, onCopy, onClear]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};