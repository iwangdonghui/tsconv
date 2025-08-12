import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Palette,
  Settings,
  Target,
  Type,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import Footer from './Footer';
import Header from './Header';
import { SEO } from './SEO';

// Debounce utility function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debounced = ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

interface FormatResult {
  input: {
    timestamp?: number;
    date?: string;
    format: string;
    timezone?: string;
    locale?: string;
  };
  output: {
    formatted: string;
    formatString: string;
    originalDate: string;
  };
  template?: {
    name: string;
    pattern: string;
  };
}

interface FormatResponse {
  success: boolean;
  data: FormatResult;
  metadata: {
    timestamp: string;
    processingTime: string;
    cached: boolean;
  };
}

interface FormatTemplates {
  templates: Record<string, string>;
  examples: Record<string, string>;
}

export default function FormatTool() {
  const [inputType, setInputType] = useState<'timestamp' | 'date'>('timestamp');
  const [timestamp, setTimestamp] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [format, setFormat] = useState('iso');
  const [customFormat, setCustomFormat] = useState('');
  const [templates, setTemplates] = useState<FormatTemplates | null>(null);
  const [result, setResult] = useState<FormatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const { isDark } = useTheme();
  // const { t: _t } = useLanguage(); // Commented out as not used in current implementation

  // Auto-formatting function
  const performFormatting = useCallback(async () => {
    // Check if we have valid input
    if (inputType === 'timestamp' && !timestamp) {
      setResult(null);
      setError('');
      return;
    }

    if (inputType === 'date' && !date) {
      setResult(null);
      setError('');
      return;
    }

    const formatToUse = format === 'custom' ? customFormat : format;
    if (!formatToUse) {
      setResult(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        format: formatToUse,
        ...(inputType === 'timestamp'
          ? { timestamp }
          : { date: time ? `${date}T${time}:00` : date }),
      });

      const response = await fetch(`/api/format?${params}`);
      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || 'Failed to format date');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [inputType, timestamp, date, time, format, customFormat]);

  // Debounced formatting
  const debouncedFormatting = useCallback(debounce(performFormatting, 300), [performFormatting]);

  // Auto-format when inputs change
  useEffect(() => {
    const hasValidInput =
      (inputType === 'timestamp' && timestamp) || (inputType === 'date' && date);

    const hasValidFormat = format === 'custom' ? customFormat : format;

    if (hasValidInput && hasValidFormat) {
      debouncedFormatting();
    } else {
      setResult(null);
      setError('');
    }

    return () => {
      debouncedFormatting.cancel();
    };
  }, [inputType, timestamp, date, time, format, customFormat, debouncedFormatting]);

  // Load format templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/format/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  // formatDateTime function removed - now using performFormatting with auto-formatting

  const resetForm = () => {
    setTimestamp('');
    setDate('');
    setTime('');
    setFormat('iso');
    setCustomFormat('');
    setResult(null);
    setError('');
  };

  const useCurrentTimestamp = () => {
    setTimestamp(Math.floor(Date.now() / 1000).toString());
  };

  const useTodayDate = () => {
    setDate(new Date().toISOString().split('T')[0] || '');
  };

  const useCurrentTime = () => {
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getTemplateDescription = (templateName: string) => {
    const descriptions: Record<string, string> = {
      iso: 'ISO 8601 standard format',
      'iso-date': 'ISO date only',
      'iso-time': 'ISO time only',
      'us-date': 'US date format (MM/DD/YYYY)',
      'us-datetime': 'US date and time',
      'eu-date': 'European date format (DD/MM/YYYY)',
      'eu-datetime': 'European date and time',
      readable: 'Human readable date',
      'readable-full': 'Full readable date and time',
      compact: 'Compact date (YYYYMMDD)',
      'compact-time': 'Compact date and time',
      unix: 'Unix timestamp (seconds)',
      'unix-ms': 'Unix timestamp (milliseconds)',
      rfc2822: 'RFC 2822 format',
      sql: 'SQL datetime format',
      filename: 'Filename-safe format',
      log: 'Log format with milliseconds',
    };
    return descriptions[templateName] || 'Custom format';
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
      }`}
    >
      <SEO
        title='Date Format Tool - Custom Date Formatting | tsconv.com'
        description='Format dates and timestamps with custom patterns. Choose from 17 predefined templates or create your own date format patterns. Support for ISO, US, EU, and custom formats.'
        canonical='https://www.tsconv.com/format'
        ogTitle='Date Format Tool - Custom Date Formatting'
        ogDescription='Format dates and timestamps with custom patterns. Choose from 17 predefined templates or create your own date format patterns. Support for ISO, US, EU, and custom formats.'
        keywords='date format, timestamp format, date formatting, custom date format, date patterns, ISO format, date template, time formatting'
      />
      <Header />

      {/* Custom styles for date picker in dark mode */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          input[type="date"]::-webkit-calendar-picker-indicator,
          input[type="time"]::-webkit-calendar-picker-indicator {
            filter: ${isDark ? 'invert(1)' : 'none'};
            cursor: pointer;
          }

          /* Enhanced dark mode support */
          ${
            isDark
              ? `
            input[type="date"]::-webkit-datetime-edit-fields-wrapper {
              background: transparent;
            }

            input[type="date"]::-webkit-datetime-edit-text,
            input[type="date"]::-webkit-datetime-edit-month-field,
            input[type="date"]::-webkit-datetime-edit-day-field,
            input[type="date"]::-webkit-datetime-edit-year-field {
              color: white;
            }
          `
              : ''
          }
        `,
        }}
      />

      <main className='flex-1 container mx-auto px-4 py-8'>
        <div
          className={`max-w-7xl mx-auto p-8 rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
            isDark
              ? 'bg-slate-800/60 border-slate-600 shadow-2xl shadow-slate-900/50'
              : 'bg-white/80 border-gray-200 shadow-2xl shadow-gray-900/10'
          }`}
        >
          <div className='flex items-center gap-4 mb-8'>
            <div
              className={`p-3 rounded-xl shadow-lg transition-all duration-300 ${
                isDark
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/25'
                  : 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/25'
              }`}
            >
              <Palette className='h-8 w-8 text-white' />
            </div>
            <div>
              <h2
                className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Date Format Tool
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Transform dates and timestamps with custom formatting patterns
              </p>
            </div>
          </div>

          {/* SEO Content */}
          <div
            className={`mb-8 p-6 rounded-xl border transition-all duration-200 ${
              isDark
                ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20'
                : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200'
            }`}
          >
            <div className='flex items-center gap-3 mb-4'>
              <div
                className={`p-2 rounded-lg ${
                  isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                }`}
              >
                <Palette className='h-5 w-5' />
              </div>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Professional Date and Time Formatting
              </h3>
            </div>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Transform timestamps and dates into any format you need with our comprehensive date
              formatting tool. Choose from 17 predefined templates or create custom patterns using
              standard formatting tokens. Essential for developers, data analysts, and anyone
              working with timestamp conversion.
            </p>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div
                className={`p-4 rounded-lg border ${
                  isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-white/60 border-gray-200'
                }`}
              >
                <h4
                  className={`font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  <Settings className='h-4 w-4' />
                  Format Options:
                </h4>
                <ul className={`text-sm space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-blue-500 rounded-full'></div>
                    ISO 8601 standard formats
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-500 rounded-full'></div>
                    US and European date styles
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-yellow-500 rounded-full'></div>
                    Human-readable formats
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-purple-500 rounded-full'></div>
                    Custom pattern support
                  </li>
                </ul>
              </div>
              <div
                className={`p-4 rounded-lg border ${
                  isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-white/60 border-gray-200'
                }`}
              >
                <h4
                  className={`font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}
                >
                  <Target className='h-4 w-4' />
                  Perfect for:
                </h4>
                <ul className={`text-sm space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-blue-500 rounded-full'></div>
                    API response formatting
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-500 rounded-full'></div>
                    Database timestamp conversion
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-yellow-500 rounded-full'></div>
                    Report generation
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-purple-500 rounded-full'></div>
                    Log file processing
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-5 gap-8 min-h-[600px]'>
            {/* Input Form */}
            <div className='lg:col-span-2 space-y-6'>
              {/* Input Type */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Input Type
                </label>
                <div className='flex gap-4'>
                  <label className='flex items-center'>
                    <input
                      type='radio'
                      value='timestamp'
                      checked={inputType === 'timestamp'}
                      aria-label='Use timestamp as input'
                      onChange={e => setInputType(e.target.value as 'timestamp')}
                      className='mr-2'
                    />
                    Timestamp
                  </label>
                  <label className='flex items-center'>
                    <input
                      type='radio'
                      value='date'
                      checked={inputType === 'date'}
                      aria-label='Use date as input'
                      onChange={e => setInputType(e.target.value as 'date')}
                      className='mr-2'
                    />
                    Date
                  </label>
                </div>
              </div>

              {/* Quick Presets */}
              <div
                className={`p-4 rounded-lg border ${
                  isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-200 bg-gray-50/50'
                }`}
              >
                <h4
                  className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  ⚡ Quick Presets
                </h4>
                <div className='grid grid-cols-2 gap-2'>
                  <button
                    onClick={() => {
                      setInputType('timestamp');
                      setTimestamp(Math.floor(Date.now() / 1000).toString());
                      setFormat('iso');
                    }}
                    className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                      isDark
                        ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    🕐 Current Timestamp
                  </button>
                  <button
                    onClick={() => {
                      setInputType('date');
                      setDate(new Date().toISOString().split('T')[0] || '');
                      setFormat('readable');
                    }}
                    className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                      isDark
                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                        : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                    }`}
                  >
                    📅 Today's Date
                  </button>
                  <button
                    onClick={() => {
                      setInputType('date');
                      const now = new Date();
                      setDate(now.toISOString().split('T')[0] || '');
                      setTime(now.toTimeString().slice(0, 5));
                      setFormat('iso');
                    }}
                    className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                      isDark
                        ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'
                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
                    }`}
                  >
                    ⏰ Current DateTime
                  </button>
                  <button
                    onClick={() => {
                      setInputType('timestamp');
                      setTimestamp('1609459200'); // 2021-01-01
                      setFormat('custom');
                      setCustomFormat('YYYY-MM-DD HH:mm:ss');
                    }}
                    className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                      isDark
                        ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20'
                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'
                    }`}
                  >
                    🎯 Example Format
                  </button>
                </div>
              </div>

              {/* Input Fields */}
              {inputType === 'timestamp' ? (
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Timestamp (Unix seconds)
                  </label>
                  <input
                    type='number'
                    aria-label='Enter number of days'
                    value={timestamp}
                    onChange={e => setTimestamp(e.target.value)}
                    placeholder='e.g., 1640995200'
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                  <button
                    onClick={useCurrentTimestamp}
                    className={`mt-1 text-sm transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    Use current timestamp
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Date
                    </label>
                    <input
                      type='date'
                      aria-label='Select date'
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <button
                      onClick={useTodayDate}
                      className={`mt-1 text-sm transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      Use today
                    </button>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Time (optional)
                    </label>
                    <input
                      type='time'
                      aria-label='Select time'
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <button
                      onClick={useCurrentTime}
                      className={`mt-1 text-sm transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      Use current time
                    </button>
                  </div>
                </>
              )}

              {/* Format Selection */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Format Template
                </label>
                <select
                  value={format}
                  onChange={e => setFormat(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  {templates &&
                    Object.keys(templates.templates).map(templateName => (
                      <option key={templateName} value={templateName}>
                        {templateName} - {getTemplateDescription(templateName)}
                      </option>
                    ))}
                  <option value='custom'>Custom Format</option>
                </select>

                {templates && format !== 'custom' && templates.templates[format] && (
                  <div
                    className={`mt-2 p-2 rounded text-sm ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}
                  >
                    <strong>Pattern:</strong> {templates.templates[format]}
                  </div>
                )}
              </div>

              {/* Custom Format */}
              {format === 'custom' && (
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Custom Format Pattern
                  </label>
                  <input
                    type='text'
                    value={customFormat}
                    onChange={e => setCustomFormat(e.target.value)}
                    placeholder='e.g., YYYY-MM-DD HH:mm:ss'
                    aria-label='Enter custom date format pattern'
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                  <div className='mt-1 text-xs text-gray-500'>
                    Use YYYY (year), MM (month), DD (day), HH (hour), mm (minute), ss (second)
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-md border ${isDark ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}
                  role='alert'
                  aria-live='polite'
                >
                  <AlertCircle className='h-4 w-4 text-red-500' />
                  <span className='text-sm text-red-700'>{error}</span>
                </div>
              )}

              {/* Status Indicator */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  {loading ? (
                    <>
                      <Clock
                        className={`h-4 w-4 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                      />
                      <span className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        Formatting...
                      </span>
                    </>
                  ) : (inputType === 'timestamp' && timestamp) || (inputType === 'date' && date) ? (
                    <>
                      <CheckCircle
                        className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`}
                      />
                      <span className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        Auto-formatting
                      </span>
                    </>
                  ) : (
                    <>
                      <Type className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Enter input to format
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={resetForm}
                  aria-label='Reset form to default values'
                  className={`px-3 py-1.5 text-xs border rounded-md transition-colors ${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-300 hover:bg-gray-50 text-gray-900'}`}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Results */}
            <div
              className='lg:col-span-3 space-y-4'
              role='region'
              aria-label='Formatted date results'
            >
              {result && (
                <>
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-2'>
                      <CheckCircle className='h-5 w-5 text-green-500' />
                      <h3
                        className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        Formatted Result
                      </h3>
                      {result.metadata.cached && (
                        <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded'>
                          Cached
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.data.output.formatted)}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
                        copied
                          ? isDark
                            ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                            : 'bg-green-100 text-green-700 border border-green-300'
                          : isDark
                            ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 hover:border-blue-300'
                      }`}
                      aria-label='Copy result to clipboard'
                    >
                      {copied ? (
                        <>
                          <CheckCircle className='h-3 w-3' />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className='h-3 w-3' />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Main Result */}
                  <div
                    className={`p-6 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                      isDark
                        ? 'bg-gradient-to-br from-blue-500/10 to-indigo-600/5 border-blue-500/20 shadow-lg shadow-blue-500/10'
                        : 'bg-gradient-to-br from-blue-50 to-indigo-100/50 border-blue-200 shadow-lg shadow-blue-500/5'
                    }`}
                  >
                    <div className='mb-2'>
                      <span
                        className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        Formatted Output:
                      </span>
                    </div>
                    <div
                      className={`text-2xl font-mono p-4 rounded-lg border transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700/80 border-slate-600 text-white shadow-inner'
                          : 'bg-white/90 border-gray-200 text-gray-900 shadow-inner'
                      }`}
                    >
                      {result.data.output.formatted}
                    </div>
                  </div>

                  {/* Template Info */}
                  {result.data.template && (
                    <div
                      className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                        isDark
                          ? 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 shadow-lg shadow-green-500/10'
                          : 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 shadow-lg shadow-green-500/5'
                      }`}
                    >
                      <h4
                        className={`font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}
                      >
                        <Settings className='h-4 w-4' />
                        Template Used:
                      </h4>
                      <div
                        className={`text-sm space-y-2 ${isDark ? 'text-green-300' : 'text-green-700'}`}
                      >
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>Name:</span>
                          <span
                            className={`px-2 py-1 rounded-md text-xs ${
                              isDark
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {result.data.template.name}
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>Pattern:</span>
                          <code
                            className={`px-2 py-1 rounded-md text-xs font-mono ${
                              isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {result.data.template.pattern}
                          </code>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Input Details */}
                  <div
                    className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                      isDark
                        ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 shadow-lg shadow-purple-500/10'
                        : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 shadow-lg shadow-purple-500/5'
                    }`}
                  >
                    <h4
                      className={`font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
                    >
                      <Target className='h-4 w-4' />
                      Input Details:
                    </h4>
                    <div
                      className={`text-sm space-y-3 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}
                    >
                      {result.data.input.timestamp && (
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>Timestamp:</span>
                          <code
                            className={`px-2 py-1 rounded-md text-xs font-mono ${
                              isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {result.data.input.timestamp}
                          </code>
                        </div>
                      )}
                      {result.data.input.date && (
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>Date:</span>
                          <code
                            className={`px-2 py-1 rounded-md text-xs font-mono ${
                              isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {result.data.input.date}
                          </code>
                        </div>
                      )}
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>Format:</span>
                        <span
                          className={`px-2 py-1 rounded-md text-xs ${
                            isDark
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {result.data.input.format}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>Original Date:</span>
                        <span
                          className={`px-2 py-1 rounded-md text-xs ${
                            isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {new Date(result.data.output.originalDate).toLocaleString()}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>Processing Time:</span>
                        <span
                          className={`px-2 py-1 rounded-md text-xs ${
                            isDark
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {result.metadata.processingTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!result && !loading && (
                <div
                  className={`text-center py-12 px-6 rounded-xl border-2 border-dashed transition-all duration-200 ${
                    isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-300 bg-gray-50/50'
                  }`}
                >
                  <div
                    className={`p-4 rounded-full mx-auto mb-4 w-fit ${
                      isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    <Type className='h-8 w-8' />
                  </div>
                  <h3
                    className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    Ready to Format
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Enter a timestamp or date and select a format to see the formatted result
                  </p>
                  <div className='mt-4 flex flex-wrap justify-center gap-2 text-xs'>
                    <span
                      className={`px-2 py-1 rounded-full ${
                        isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      17 Templates
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full ${
                        isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                      }`}
                    >
                      Custom Patterns
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full ${
                        isDark
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-purple-100 text-purple-600'
                      }`}
                    >
                      Real-time Preview
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
