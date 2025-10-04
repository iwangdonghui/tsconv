import { ArrowUpRight, Check, Clock, Copy, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useHistory } from '../hooks/useHistory';
import { useInputValidation } from '../hooks/useInputValidation';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useDeviceCapabilities, useMobileGestures } from '../hooks/useMobileGestures';
import FAQ from './FAQ';
import Footer from './Footer';
import Header from './Header';
import { HistoryPanel } from './HistoryPanel';
import { SEO } from './SEO';
import { ErrorMessage } from './ui/error-message';
import { RecoverySuggestions } from './ui/recovery-suggestions';
import { ValidationIndicator } from './ui/validation-indicator';

// Type for manual date that allows string values during input
type ManualDateField = string | number;
type ManualDateType = {
  year: ManualDateField;
  month: ManualDateField;
  day: ManualDateField;
  hour: ManualDateField;
  minute: ManualDateField;
  second: ManualDateField;
};

export default function TimestampConverter() {
  const [input, setInput] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const [userTimezone, setUserTimezone] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [showBatchConverter, setShowBatchConverter] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [manualDate, setManualDate] = useState<ManualDateType>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
    second: new Date().getSeconds(),
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const { history, addToHistory, clearHistory } = useHistory();
  const { isMobile, isTouchDevice } = useDeviceCapabilities();
  const {
    validationResult,
    validateInput: validateMainInput,
    validationState,
    isValidating,
    clearValidation: clearMainValidation,
  } = useInputValidation({
    debounceMs: 300,
    enableCache: true,
  });
  const { validationResult: manualDateValidation, validateInput: validateManualDateInput } =
    useInputValidation({
      debounceMs: 100,
      validator: () => {
        const now = new Date();
        const year = getNumericValue(manualDate.year, now.getFullYear());
        const month = getNumericValue(manualDate.month, now.getMonth() + 1);
        const day = getNumericValue(manualDate.day, now.getDate());
        const hour = getNumericValue(manualDate.hour, now.getHours());
        const minute = getNumericValue(manualDate.minute, now.getMinutes());
        const second = getNumericValue(manualDate.second, now.getSeconds());

        const date = new Date(year, month - 1, day, hour, minute, second);
        if (isNaN(date.getTime())) {
          return {
            isValid: false,
            errorType: 'syntax' as const,
            message: 'Invalid manual date configuration',
            severity: 'error' as const,
            suggestions: [
              'Check if the date exists',
              'Verify month has correct number of days',
              'Ensure all values are within valid ranges',
            ],
          };
        }
        if (date.getFullYear() < 1970) {
          return {
            isValid: false,
            errorType: 'range' as const,
            message: 'Year must be 1970 or later',
            severity: 'error' as const,
            suggestions: ['Unix timestamps start from January 1970', 'Use a year of 1970 or later'],
          };
        }
        return {
          isValid: true,
          errorType: undefined,
          message: 'Valid date configuration',
          severity: 'info' as const,
        };
      },
    });

  // Add keyboard shortcuts
  useKeyboardShortcuts({
    onFocusInput: () => inputRef.current?.focus(),
    onConvert: () => {
      // No separate convert function needed, input change triggers formatResults
      if (input.trim()) {
        inputRef.current?.focus();
      }
    },
    onCopy: () => {
      if (results) {
        navigator.clipboard.writeText(results.utcDate || results.timestamp?.toString() || '');
      }
    },
    onClear: () => {
      setInput('');
      clearMainValidation();
      inputRef.current?.focus();
    },
  });

  // Add mobile gesture support for history navigation
  const { attachGestures } = useMobileGestures({
    onSwipeLeft: () => {
      if (showHistory && history.length > 0) {
        // Navigate to next history item
        const currentIndex = history.findIndex(item => item.input === input);
        const nextIndex = (currentIndex + 1) % history.length;
        const nextItem = history[nextIndex];
        if (nextItem) {
          setInput(nextItem.input);
        }
      }
    },
    onSwipeRight: () => {
      if (showHistory && history.length > 0) {
        // Navigate to previous history item
        const currentIndex = history.findIndex(item => item.input === input);
        const prevIndex = currentIndex <= 0 ? history.length - 1 : currentIndex - 1;
        const prevItem = history[prevIndex];
        if (prevItem) {
          setInput(prevItem.input);
        }
      }
    },
    onLongPress: () => {
      // Long press to show/hide history
      setShowHistory(!showHistory);
    },
  });

  // Attach gestures to history panel
  useEffect(() => {
    if (historyPanelRef.current && isTouchDevice) {
      return attachGestures(historyPanelRef.current);
    }
    return undefined;
  }, [attachGestures, isTouchDevice]);

  // 初始化
  useEffect(() => {
    // 检测用户时区
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);

    // 设置 canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://www.tsconv.com/');
    } else {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', 'https://www.tsconv.com/');
      document.head.appendChild(canonical);
    }
  }, []);

  // 更新当前时间
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // 智能解析输入
  const parseInput = (value: string): { type: 'timestamp' | 'date'; value: number } | null => {
    if (!value.trim()) return null;

    const trimmed = value.trim();

    // 移除可能的逗号分隔符
    const cleanedNumber = trimmed.replace(/,/g, '');

    // 尝试解析为时间戳
    if (/^\d+$/.test(cleanedNumber)) {
      const num = parseInt(cleanedNumber);

      // 10位时间戳 (2001-2286年): 1000000000 - 9999999999
      if (num >= 1000000000 && num <= 9999999999) {
        return { type: 'timestamp' as const, value: num * 1000 };
      }

      // 13位时间戳 (毫秒): 1000000000000 - 9999999999999
      if (num >= 1000000000000 && num <= 9999999999999) {
        return { type: 'timestamp' as const, value: num };
      }

      // 9位时间戳 (1973-2001年): 100000000 - 999999999
      if (num >= 100000000 && num <= 999999999) {
        return { type: 'timestamp' as const, value: num * 1000 };
      }
    }

    // 尝试解析为日期字符串
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return { type: 'date' as const, value: date.getTime() };
    }

    return null;
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      // Copy failed silently
    }
  };

  // 格式化结果
  const formatResults = () => {
    const parsed = parseInput(input);
    if (!parsed) return null;

    const date = new Date(parsed.value);
    const timestamp = Math.floor(parsed.value / 1000);

    const result = {
      utcDate: date.toUTCString(),
      localDate: date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      }),
      timestamp,
      iso8601: date.toISOString(),
      relative: getRelativeTime(date),
    };

    return result;
  };

  // Save to history when input changes and produces valid results
  useEffect(() => {
    if (!input.trim()) return;

    const timeoutId = setTimeout(() => {
      const parsed = parseInput(input);
      if (parsed) {
        // 检查是否是完整的时间戳（9位、10位或13位）或有效日期
        const trimmed = input.trim();
        const cleanedNumber = trimmed.replace(/,/g, '');
        let isCompleteTimestamp = false;

        if (/^\d+$/.test(cleanedNumber)) {
          const num = parseInt(cleanedNumber);
          isCompleteTimestamp =
            (num >= 100000000 && num <= 9999999999) ||
            (num >= 1000000000000 && num <= 9999999999999);
        }

        const isValidDate = !isCompleteTimestamp && !isNaN(new Date(trimmed).getTime());

        if (isCompleteTimestamp || isValidDate) {
          const date = new Date(parsed.value);
          const timestamp = Math.floor(parsed.value / 1000);
          const output = parsed.type === 'timestamp' ? date.toUTCString() : timestamp.toString();
          addToHistory(input.trim(), output, parsed.type);
        }
      }
    }, 800); // 800ms 防抖，给用户足够时间输入

    return () => clearTimeout(timeoutId);
  }, [input, addToHistory]);

  // 获取相对时间
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (Math.abs(diffSec) < 60) return 'just now';
    if (Math.abs(diffMin) < 60)
      return `${Math.abs(diffMin)} minute${
        Math.abs(diffMin) !== 1 ? 's' : ''
      } ${diffMin > 0 ? 'from now' : 'ago'}`;
    if (Math.abs(diffHour) < 24)
      return `${Math.abs(diffHour)} hour${
        Math.abs(diffHour) !== 1 ? 's' : ''
      } ${diffHour > 0 ? 'from now' : 'ago'}`;
    return `${Math.abs(diffDay)} day${Math.abs(diffDay) !== 1 ? 's' : ''} ${
      diffDay > 0 ? 'from now' : 'ago'
    }`;
  };

  // 批量转换功能
  const processBatchConversion = () => {
    const lines = batchInput
      .trim()
      .split('\n')
      .filter(line => line.trim());
    const results = lines.map(line => {
      const trimmed = line.trim();
      const parsed = parseInput(trimmed);
      if (!parsed) return `${trimmed} → Invalid format`;

      const date = new Date(parsed.value);
      if (parsed.type === 'timestamp') {
        return `${trimmed} → ${date.toISOString()} (${date.toLocaleString()})`;
      } else {
        return `${trimmed} → ${Math.floor(parsed.value / 1000)}`;
      }
    });
    return results.join('\n');
  };

  // 手动日期转换
  const getManualTimestamp = () => {
    const now = new Date();
    const year = getNumericValue(manualDate.year, now.getFullYear());
    const month = getNumericValue(manualDate.month, now.getMonth() + 1);
    const day = getNumericValue(manualDate.day, now.getDate());
    const hour = getNumericValue(manualDate.hour, now.getHours());
    const minute = getNumericValue(manualDate.minute, now.getMinutes());
    const second = getNumericValue(manualDate.second, now.getSeconds());

    const date = new Date(year, month - 1, day, hour, minute, second);
    return Math.floor(date.getTime() / 1000);
  };

  // Helper function to get numeric value with fallback
  const getNumericValue = (value: ManualDateField, fallback: number): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      if (value === '') return fallback;
      const parsed = parseInt(value);
      return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  };

  const updateManualDate = (field: string, value: ManualDateField) => {
    setManualDate(prev => ({ ...prev, [field]: value }));
    setTimeout(() => validateManualDateInput(''), 0);
  };

  useEffect(() => {
    validateManualDateInput('');
  }, [manualDate, validateManualDateInput]);

  const results = formatResults();
  const currentTimestamp = Math.floor(currentTime.getTime() / 1000);

  const accentStyles = {
    blue: {
      arrow: 'text-blue-500',
      hoverDark: 'hover:border-blue-500/70',
      hoverLight: 'hover:border-blue-500/70',
    },
    emerald: {
      arrow: 'text-emerald-500',
      hoverDark: 'hover:border-emerald-500/70',
      hoverLight: 'hover:border-emerald-500/70',
    },
    violet: {
      arrow: 'text-violet-500',
      hoverDark: 'hover:border-violet-500/70',
      hoverLight: 'hover:border-violet-500/70',
    },
  } as const;

  const clusterCards = [
    {
      key: 'format',
      to: '/format',
      accent: 'blue' as const,
      title: language === 'zh' ? '需要格式化输出？' : 'Need formatted output?',
      description:
        language === 'zh'
          ? '前往格式化工具，获取 ISO 8601、RFC 3339、Discord/Slack 消息等格式。'
          : 'Jump to the Format Tool for ISO 8601, RFC 3339, Discord/Slack messages, and locale-aware strings.',
    },
    {
      key: 'datediff',
      to: '/date-diff',
      accent: 'emerald' as const,
      title: language === 'zh' ? '比较两个时间戳' : 'Compare two timestamps',
      description:
        language === 'zh'
          ? '使用日期差计算器处理持续时间、年龄计算、倒计时和工作日排班。'
          : 'Use the Date Difference Calculator for durations, age math, countdowns, and workday planning.',
    },
    {
      key: 'discord',
      to: '/discord',
      accent: 'violet' as const,
      title: language === 'zh' ? '跨平台安排日程' : 'Schedule across communities',
      description:
        language === 'zh'
          ? '为 Discord、Slack、Notion 以及跨时区活动生成时间戳，并查看时区指南获取最佳实践。'
          : 'Generate rich timestamps for Discord, Slack, Notion, and cross-timezone events; review the timezone guides for best practices.',
      span: true,
    },
  ];

  const getCardClasses = (accent: keyof typeof accentStyles, extra = '') =>
    `group flex flex-col gap-2 rounded-2xl border px-4 py-5 transition-colors ${extra} ${
      isDark
        ? `border-slate-700 bg-slate-800/60 hover:bg-slate-800 ${accentStyles[accent].hoverDark}`
        : `border-slate-200 bg-white hover:bg-slate-50 ${accentStyles[accent].hoverLight}`
    }`;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
      }`}
    >
      <SEO
        title='Timestamp Converter - Unix & Epoch Time | tsconv.com'
        description='Convert Unix timestamps to human-readable dates and vice versa. Fast, simple, and accurate timestamp conversion tool with real-time results. Includes FAQ about timestamp conversion, timezone handling, and programming best practices.'
        canonical='https://www.tsconv.com/'
        ogTitle='Timestamp Converter - Unix & Epoch Time'
        ogDescription='Convert Unix timestamps to human-readable dates and vice versa. Fast, simple, and accurate timestamp conversion tool with real-time results. Includes FAQ about timestamp conversion, timezone handling, and programming best practices.'
        keywords='timestamp converter, unix timestamp, epoch time, date converter, time conversion, unix time, timestamp FAQ, 时间戳转换, 毫秒转换, 1970年, 闰秒, 时区处理, 2038年问题'
      />
      <Header />
      {/* 转换器主要内容 */}
      <main className='flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-12'>
        {/* Title */}
        <div className='text-center mb-4 sm:mb-8'>
          <h1 className='text-xl sm:text-4xl font-bold mb-2 sm:mb-4'>Timestamp Converter</h1>
          <p className='text-sm sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed'>
            Convert Unix timestamps to human-readable dates (and back) in real time. Explore timezone
            aware output, batch conversion, and language-specific snippets to cover every timestamp
            workflow.
          </p>
        </div>

        {/* Input */}
        <div className='mb-6 sm:mb-8'>
          <div className='relative'>
            <input
              ref={inputRef}
              type='text'
              inputMode='text'
              value={input}
              onChange={e => {
                setInput(e.target.value);
                validateMainInput(e.target.value);
              }}
              placeholder={t('converter.placeholder')}
              className={`w-full border-2 rounded-xl transition-all duration-200 pr-24 bg-background text-foreground placeholder:text-muted-foreground border-input focus:border-ring focus:ring-2 focus:ring-ring/20 touch-manipulation ${
                // Mobile optimizations
                isMobile
                  ? 'p-4 text-base min-h-[56px]' // 16px font size to prevent iOS zoom, larger touch target
                  : 'p-4 sm:p-6 text-base sm:text-lg'
              } ${
                validationState === 'invalid'
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : ''
              }
              ${
                validationState === 'valid'
                  ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                  : ''
              }
              ${isValidating ? 'border-blue-500' : ''} focus:outline-none focus:ring-4`}
              aria-invalid={validationState === 'invalid' || validationState === 'warning'}
              aria-describedby={validationResult ? 'input-validation-feedback' : undefined}
              aria-busy={isValidating}
              role='combobox'
              aria-expanded={showHistory}
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
              spellCheck='false'
            />
            <div className='absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2'>
              <ValidationIndicator state={validationState} size='md' animated={true} />

              {/* History Button */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
                title='Show history'
                aria-label='Show conversion history'
              >
                <Clock className='w-5 h-5' />
              </button>

              {/* Clear Button */}
              {input && (
                <button
                  onClick={() => setInput('')}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark
                      ? 'hover:bg-slate-700 text-slate-400'
                      : 'hover:bg-slate-100 text-slate-500'
                  }`}
                  aria-label='Clear input'
                >
                  <X className='w-5 h-5' />
                </button>
              )}
            </div>

            {/* History Panel */}
            <HistoryPanel
              ref={historyPanelRef}
              history={history}
              onSelectItem={(value: string) => setInput(value)}
              onClear={clearHistory}
              isOpen={showHistory}
              onClose={() => setShowHistory(false)}
            />
          </div>
        </div>

        {/* Validation Feedback */}
        {validationResult && validationResult.severity === 'error' && (
          <div
            id='input-validation-feedback'
            className='mt-2 space-y-2'
            role='alert'
            aria-live='polite'
          >
            <ErrorMessage result={validationResult} />
            <RecoverySuggestions result={validationResult} />
          </div>
        )}

        {validationResult && validationResult.severity === 'warning' && (
          <div
            id='input-validation-feedback'
            className='mt-2 space-y-2'
            role='alert'
            aria-live='polite'
          >
            <ErrorMessage result={validationResult} />
          </div>
        )}

        {/* Results */}
        {results && (
          <div className='space-y-4 sm:space-y-6 mb-8'>
            {/* Primary Results */}
            <div className='space-y-3 sm:space-y-4'>
              {/* UTC Date */}
              <div className={`p-3 sm:p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className='flex justify-between items-start gap-3'>
                  <div className='flex-1 min-w-0'>
                    <div
                      className={`text-xs sm:text-sm ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      } mb-1`}
                    >
                      Human readable date (UTC)
                    </div>
                    <div className='text-sm sm:text-lg font-mono break-all'>{results.utcDate}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(results.utcDate, 'utc')}
                    className={`flex-shrink-0 rounded transition-colors touch-manipulation ${
                      isMobile
                        ? 'p-3 min-h-[44px] min-w-[44px]' // Mobile touch target
                        : 'p-2'
                    } ${
                      isDark
                        ? 'hover:bg-slate-700 active:bg-slate-600'
                        : 'hover:bg-slate-200 active:bg-slate-300'
                    }`}
                    aria-label='Copy UTC date'
                  >
                    {copiedStates.utc ? (
                      <Check
                        className={isMobile ? 'w-5 h-5 text-green-500' : 'w-4 h-4 text-green-500'}
                      />
                    ) : (
                      <Copy className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
                    )}
                  </button>
                </div>
              </div>

              {/* Local Date */}
              <div className={`p-3 sm:p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className='flex justify-between items-start gap-3'>
                  <div className='flex-1 min-w-0'>
                    <div
                      className={`text-xs sm:text-sm ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      } mb-1`}
                    >
                      Your timezone: {userTimezone}
                    </div>
                    <div className='text-sm sm:text-lg font-mono break-all'>
                      {results.localDate}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(results.localDate, 'local')}
                    className={`flex-shrink-0 p-2 rounded transition-colors ${
                      isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                    }`}
                    aria-label='Copy local date'
                  >
                    {copiedStates.local ? (
                      <Check className='w-4 h-4 text-green-500' />
                    ) : (
                      <Copy className='w-4 h-4' />
                    )}
                  </button>
                </div>
              </div>

              {/* Unix Timestamp */}
              <div className={`p-3 sm:p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className='flex justify-between items-start gap-3'>
                  <div className='flex-1 min-w-0'>
                    <div
                      className={`text-xs sm:text-sm ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      } mb-1`}
                    >
                      Unix timestamp (seconds)
                    </div>
                    <div className='text-sm sm:text-lg font-mono break-all'>
                      {results.timestamp}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(results.timestamp.toString(), 'timestamp')}
                    className={`flex-shrink-0 p-2 rounded transition-colors ${
                      isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                    }`}
                    aria-label='Copy timestamp'
                  >
                    {copiedStates.timestamp ? (
                      <Check className='w-4 h-4 text-green-500' />
                    ) : (
                      <Copy className='w-4 h-4' />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary Information */}
            <details className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <summary className='cursor-pointer hover:text-current transition-colors text-sm sm:text-base'>
                More formats
              </summary>
              <div className='mt-3 sm:mt-4 space-y-3'>
                <div className='flex justify-between items-center gap-3'>
                  <span className='text-sm'>Relative time:</span>
                  <span className='font-mono text-sm break-all'>{results.relative}</span>
                </div>
                <div className='flex justify-between items-start gap-3'>
                  <span className='text-sm flex-shrink-0'>ISO 8601:</span>
                  <div className='flex items-center gap-2 min-w-0'>
                    <span className='font-mono text-xs sm:text-sm break-all'>
                      {results.iso8601}
                    </span>
                    <button
                      onClick={() => copyToClipboard(results.iso8601, 'iso')}
                      className={`flex-shrink-0 p-1 rounded transition-colors ${
                        isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                      }`}
                      aria-label='Copy ISO 8601 date'
                    >
                      {copiedStates.iso ? (
                        <Check className='w-3 h-3 text-green-500' />
                      ) : (
                        <Copy className='w-3 h-3' />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Current Timestamp */}
        <div className='mb-6 sm:mb-12'>
          <div
            className={`p-4 sm:p-8 rounded-2xl border shadow-md sm:shadow-xl ${
              isDark
                ? 'bg-slate-900/70 border-blue-500/30'
                : 'bg-white border-blue-200'
            }`}
          >
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4'>
              <div className='flex-1 min-w-0'>
                <div
                  className={`text-sm sm:text-lg font-semibold tracking-tight mb-2 ${
                    isDark ? 'text-blue-200' : 'text-blue-700'
                  }`}
                >
                  {t('current.title')}
                </div>
                <div
                  className={`text-xl sm:text-4xl font-mono font-bold break-all ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {currentTimestamp}
                </div>
                <div
                  className={`text-xs sm:text-base mt-2 sm:mt-3 leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {isPaused ? t('current.paused') : t('current.updates')}
                </div>
              </div>
              <div className='flex gap-2 sm:gap-3'>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`flex-shrink-0 px-3 py-2 sm:px-4 sm:py-3 rounded-xl font-medium transition-all duration-200 ${
                    isDark
                      ? 'hover:bg-blue-800/60 bg-blue-900/30 border border-blue-500/30 text-blue-200'
                      : 'hover:bg-blue-100 bg-blue-50 border border-blue-200 text-blue-700'
                  }`}
                  title={isPaused ? t('current.resume') : t('current.pause')}
                >
                  {isPaused ? (
                    <svg
                      className='w-4 h-4 sm:w-5 sm:h-5 mx-auto'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z'
                        clipRule='evenodd'
                      />
                    </svg>
                  ) : (
                    <svg
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z'
                        clipRule='evenodd'
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => copyToClipboard(currentTimestamp.toString(), 'current')}
                  className={`flex-shrink-0 px-3 py-2 sm:px-4 sm:py-3 rounded-xl transition-all duration-200 border font-medium ${
                    isDark
                      ? 'hover:bg-blue-800/60 bg-blue-900/30 border-blue-500/30 text-blue-200'
                      : 'hover:bg-blue-100 bg-blue-50 border-blue-200 text-blue-700'
                  }`}
                >
                  {copiedStates.current ? (
                    <Check className='w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mx-auto' />
                  ) : (
                    <Copy className='w-4 h-4 sm:w-5 sm:h-5 mx-auto' />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content cluster navigation */}
        <section className='mb-6 sm:mb-12'>
          <div className='sm:hidden mb-4'>
            <details className={`${isDark ? 'bg-slate-800/80 border border-slate-700 text-slate-100' : 'bg-slate-50 border border-slate-200 text-slate-700'} rounded-xl p-3`}> 
              <summary className='text-sm font-semibold cursor-pointer'>Quick tools & guides</summary>
              <div className='mt-3 space-y-2'>
                {clusterCards.map(card => (
                  <Link
                    key={`accordion-${card.key}`}
                    to={card.to}
                    className={getCardClasses(card.accent, 'flex-shrink-0 px-3 py-3')}
                  >
                    <div className='flex items-center justify-between'>
                      <h2 className='text-sm font-semibold'>{card.title}</h2>
                      <ArrowUpRight
                        className={`h-4 w-4 ${accentStyles[card.accent].arrow} transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5`}
                      />
                    </div>
                    <p className='text-xs leading-relaxed text-slate-500 dark:text-slate-400'>
                      {card.description}
                    </p>
                  </Link>
                ))}
              </div>
            </details>
          </div>

          <div className='hidden sm:grid sm:grid-cols-2 gap-4'>
            {clusterCards.map(card => (
              <Link
                key={`desktop-${card.key}`}
                to={card.to}
                className={getCardClasses(card.accent, card.span ? 'sm:col-span-2' : '')}
              >
                <div className='flex items-center justify-between'>
                  <h2 className='text-lg font-semibold'>{card.title}</h2>
                  <ArrowUpRight
                    className={`h-4 w-4 ${accentStyles[card.accent].arrow} transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5`}
                  />
                </div>
                <p className='text-sm leading-relaxed text-slate-500 dark:text-slate-400'>
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <div className='mb-8 sm:mb-10 text-xs sm:text-sm text-center text-slate-500 dark:text-slate-400 px-4 sm:px-0'>
          {language === 'zh' ? (
            <>
              需要代码示例？前往
              <Link to='/how-to' className='mx-1 text-blue-600 dark:text-blue-400 underline-offset-2 hover:underline'>
                使用教程库
              </Link>
              或
              <Link to='/guide' className='ml-1 text-blue-600 dark:text-blue-400 underline-offset-2 hover:underline'>
                开发者指南
              </Link>
              获取跨语言时间戳解决方案。
            </>
          ) : (
            <>
              Need code samples? Head to
              <Link to='/how-to' className='mx-1 text-blue-600 dark:text-blue-400 underline-offset-2 hover:underline'>
                How-To Library
              </Link>
              or
              <Link to='/guide' className='ml-1 text-blue-600 dark:text-blue-400 underline-offset-2 hover:underline'>
                Developer Guides
              </Link>
              for multi-language timestamp solutions.
            </>
          )}
        </div>

        {/* Manual Date & Time section */}
        <div className='mb-8'>
          <div
            className={`p-4 sm:p-6 rounded-xl border ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h2 className='text-lg font-medium mb-4'>{t('manual.title')}</h2>
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4'>
              <div>
                <label
                  htmlFor='manual-year'
                  className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  {t('manual.year')}
                </label>
                <input
                  id='manual-year'
                  type='number'
                  inputMode='numeric'
                  min='1970'
                  max='3000'
                  value={manualDate.year}
                  placeholder='YYYY'
                  onChange={e => updateManualDate('year', e.target.value)}
                  onBlur={e => {
                    const value = e.target.value;
                    if (value === '' || isNaN(parseInt(value))) {
                      updateManualDate('year', new Date().getFullYear());
                    } else {
                      const numValue = parseInt(value);
                      updateManualDate('year', Math.max(1970, Math.min(3000, numValue)));
                    }
                  }}
                  className={`w-full border rounded bg-background text-foreground border-input focus:border-ring focus:ring-2 focus:ring-ring/20 touch-manipulation ${
                    isMobile
                      ? 'p-3 text-base min-h-[44px]' // Mobile optimizations
                      : 'p-2 text-sm'
                  } ${manualDateValidation?.severity === 'error' ? 'border-red-500' : ''}
                  ${manualDateValidation?.severity === 'info' ? 'border-green-500' : ''}`}
                  aria-invalid={
                    manualDateValidation?.severity === 'error' ||
                    manualDateValidation?.severity === 'warning'
                  }
                  aria-describedby={manualDateValidation ? 'manual-date-validation' : undefined}
                  autoComplete='off'
                />
              </div>
              <div>
                <label
                  htmlFor='manual-month'
                  className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  {t('manual.month')}
                </label>
                <input
                  id='manual-month'
                  type='number'
                  inputMode='numeric'
                  min='1'
                  max='12'
                  value={manualDate.month}
                  placeholder='MM'
                  onChange={e => updateManualDate('month', e.target.value)}
                  onBlur={e => {
                    const value = e.target.value;
                    if (value === '' || isNaN(parseInt(value))) {
                      updateManualDate('month', new Date().getMonth() + 1);
                    } else {
                      const numValue = parseInt(value);
                      updateManualDate('month', Math.max(1, Math.min(12, numValue)));
                    }
                  }}
                  className={`w-full border rounded bg-background text-foreground border-input focus:border-ring focus:ring-2 focus:ring-ring/20 touch-manipulation ${
                    isMobile
                      ? 'p-3 text-base min-h-[44px]' // Mobile optimizations
                      : 'p-2 text-sm'
                  }`}
                  aria-describedby={manualDateValidation ? 'manual-date-validation' : undefined}
                  aria-invalid={
                    manualDateValidation?.severity === 'error' ||
                    manualDateValidation?.severity === 'warning'
                  }
                  autoComplete='off'
                />
              </div>
              <div>
                <label
                  htmlFor='manual-day'
                  className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  {t('manual.day')}
                </label>
                <input
                  id='manual-day'
                  type='number'
                  min='1'
                  max='31'
                  value={manualDate.day}
                  placeholder='DD'
                  onChange={e => updateManualDate('day', e.target.value)}
                  onBlur={e => {
                    const value = e.target.value;
                    if (value === '' || isNaN(parseInt(value))) {
                      updateManualDate('day', new Date().getDate());
                    } else {
                      const numValue = parseInt(value);
                      updateManualDate('day', Math.max(1, Math.min(31, numValue)));
                    }
                  }}
                  className='w-full p-2 text-sm border rounded bg-background text-foreground border-input focus:border-ring focus:ring-2 focus:ring-ring/20'
                />
              </div>
              <div>
                <label
                  htmlFor='manual-hour'
                  className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  {t('manual.hour')}
                </label>
                <input
                  id='manual-hour'
                  type='number'
                  min='0'
                  max='23'
                  value={manualDate.hour}
                  placeholder='HH'
                  onChange={e => updateManualDate('hour', e.target.value)}
                  onBlur={e => {
                    const value = e.target.value;
                    if (value === '' || isNaN(parseInt(value))) {
                      updateManualDate('hour', new Date().getHours());
                    } else {
                      const numValue = parseInt(value);
                      updateManualDate('hour', Math.max(0, Math.min(23, numValue)));
                    }
                  }}
                  className='w-full p-2 text-sm border rounded bg-background text-foreground border-input focus:border-ring focus:ring-2 focus:ring-ring/20'
                />
              </div>
              <div>
                <label
                  htmlFor='manual-minute'
                  className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  {t('manual.minute')}
                </label>
                <input
                  id='manual-minute'
                  type='number'
                  min='0'
                  max='59'
                  value={manualDate.minute}
                  placeholder='MM'
                  onChange={e => updateManualDate('minute', e.target.value)}
                  onBlur={e => {
                    const value = e.target.value;
                    if (value === '' || isNaN(parseInt(value))) {
                      updateManualDate('minute', new Date().getMinutes());
                    } else {
                      const numValue = parseInt(value);
                      updateManualDate('minute', Math.max(0, Math.min(59, numValue)));
                    }
                  }}
                  className='w-full p-2 text-sm border rounded bg-background text-foreground border-input focus:border-ring focus:ring-2 focus:ring-ring/20'
                />
              </div>
              <div>
                <label
                  htmlFor='manual-second'
                  className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  {t('manual.second')}
                </label>
                <input
                  id='manual-second'
                  type='number'
                  min='0'
                  max='59'
                  value={manualDate.second}
                  placeholder='SS'
                  onChange={e => updateManualDate('second', e.target.value)}
                  onBlur={e => {
                    const value = e.target.value;
                    if (value === '' || isNaN(parseInt(value))) {
                      updateManualDate('second', new Date().getSeconds());
                    } else {
                      const numValue = parseInt(value);
                      updateManualDate('second', Math.max(0, Math.min(59, numValue)));
                    }
                  }}
                  className='w-full p-2 text-sm border rounded bg-background text-foreground border-input focus:border-ring focus:ring-2 focus:ring-ring/20'
                />
              </div>
            </div>

            {/* Manual Date Controls */}
            <div className='flex gap-2 mb-4'>
              <button
                type='button'
                onClick={() => {
                  const now = new Date();
                  setManualDate({
                    year: now.getFullYear(),
                    month: now.getMonth() + 1,
                    day: now.getDate(),
                    hour: now.getHours(),
                    minute: now.getMinutes(),
                    second: now.getSeconds(),
                  });
                }}
                className={`px-3 py-2 text-sm rounded transition-colors ${
                  isDark
                    ? 'bg-slate-600 hover:bg-slate-500 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
                title='Set to current date and time'
              >
                Now
              </button>
              <button
                type='button'
                onClick={() => {
                  setManualDate({
                    year: '',
                    month: '',
                    day: '',
                    hour: '',
                    minute: '',
                    second: '',
                  });
                }}
                className={`px-3 py-2 text-sm rounded transition-colors ${
                  isDark
                    ? 'bg-slate-600 hover:bg-slate-500 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
                title='Clear all fields'
              >
                Clear
              </button>
              <button
                type='button'
                onClick={() => {
                  setManualDate({
                    year: 2000,
                    month: 1,
                    day: 1,
                    hour: 0,
                    minute: 0,
                    second: 0,
                  });
                }}
                className={`px-3 py-2 text-sm rounded transition-colors ${
                  isDark
                    ? 'bg-slate-600 hover:bg-slate-500 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
                title='Reset to default values'
              >
                Reset
              </button>
            </div>

            <div>
              <ValidationIndicator
                state={
                  manualDateValidation?.severity === 'error'
                    ? 'invalid'
                    : manualDateValidation?.severity === 'info'
                      ? 'valid'
                      : 'idle'
                }
                size='sm'
                animated={true}
              />
            </div>

            {manualDateValidation && manualDateValidation.severity === 'error' && (
              <div className='mt-2 space-y-2' role='alert' aria-live='polite'>
                <ErrorMessage result={manualDateValidation} />
              </div>
            )}

            <div className='flex justify-between items-center'>
              <div className='text-sm'>
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                  {t('manual.timestamp')}:
                </span>
                <span className='font-mono font-bold'>{getManualTimestamp()}</span>
              </div>
              <button
                onClick={() => copyToClipboard(getManualTimestamp().toString(), 'manual')}
                className={`p-2 rounded transition-colors ${
                  isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                }`}
                aria-label='Copy manual timestamp'
              >
                {copiedStates.manual ? (
                  <Check className='w-4 h-4 text-green-500' />
                ) : (
                  <Copy className='w-4 h-4' />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Batch Converter */}
        <div className='mb-8'>
          <button
            onClick={() => setShowBatchConverter(!showBatchConverter)}
            className={`w-full p-4 rounded-lg border-2 border-dashed transition-colors ${
              isDark
                ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <div className='flex items-center justify-center gap-2'>
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                />
              </svg>
              <span>{t('batch.title')}</span>
            </div>
          </button>

          {showBatchConverter && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <h2 className='text-lg font-medium mb-3'>{t('batch.title')}</h2>
              <label
                htmlFor='batch-input'
                className={`text-sm mb-3 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
              >
                {t('batch.description')}
              </label>
              <textarea
                id='batch-input'
                value={batchInput}
                onChange={e => setBatchInput(e.target.value)}
                placeholder='1640995200&#10;2022-01-01&#10;1672531200'
                rows={4}
                className='w-full p-3 border rounded-lg text-sm font-mono bg-background text-foreground border-input placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20'
              />
              {batchInput.trim() && (
                <div className='mt-3'>
                  <h3 className='font-medium mb-2'>Results:</h3>
                  <pre
                    className={`p-3 rounded text-xs font-mono whitespace-pre-wrap ${
                      isDark ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-700'
                    }`}
                  >
                    {processBatchConversion()}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(processBatchConversion(), 'batch')}
                    className={`mt-2 px-3 py-1 text-sm rounded transition-colors ${
                      isDark
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                    aria-label='Copy batch results'
                  >
                    {copiedStates.batch ? 'Copied!' : 'Copy Results'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* What is Unix Timestamp */}
        <div className='mb-8'>
          <h2 className='text-lg sm:text-xl font-medium mb-3 sm:mb-4'>{t('unix.what.title')}</h2>
          <p
            className={`${
              isDark ? 'text-slate-400' : 'text-slate-600'
            } leading-relaxed text-sm sm:text-base`}
          >
            {t('unix.what.description')}
          </p>
        </div>

        {/* FAQ Section */}
        <FAQ />
      </main>

      <Footer />
    </div>
  );
}
