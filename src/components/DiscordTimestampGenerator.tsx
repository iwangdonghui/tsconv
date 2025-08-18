import { AlertCircle, CheckCircle, Clock, Copy, MessageSquare, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import Footer from './Footer';
import Header from './Header';
import { SEO } from './SEO';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
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

// Discord timestamp format definitions
const DISCORD_FORMATS = {
  t: { label: 'Short Time', description: '16:20', example: '4:20 PM' },
  T: { label: 'Long Time', description: '16:20:30', example: '4:20:30 PM' },
  d: { label: 'Short Date', description: '20/04/2021', example: '04/20/2021' },
  D: { label: 'Long Date', description: '20 April 2021', example: 'April 20, 2021' },
  f: {
    label: 'Short Date/Time',
    description: '20 April 2021 16:20',
    example: 'April 20, 2021 4:20 PM',
  },
  F: {
    label: 'Long Date/Time',
    description: 'Tuesday, 20 April 2021 16:20',
    example: 'Tuesday, April 20, 2021 4:20 PM',
  },
  R: { label: 'Relative Time', description: '2 months ago', example: 'in 2 months' },
} as const;

type DiscordFormat = keyof typeof DISCORD_FORMATS;

interface DiscordTimestamp {
  timestamp: number;
  date: string;
  time: string;
  formats: Record<DiscordFormat, string>;
  previews: Record<DiscordFormat, string>;
}

export default function DiscordTimestampGenerator() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [result, setResult] = useState<DiscordTimestamp | null>(null);
  const [error, setError] = useState('');
  const [copiedFormat, setCopiedFormat] = useState<DiscordFormat | null>(null);

  const { isDark } = useTheme();

  // Debounced auto-generation
  const debouncedGenerate = useCallback(
    debounce(() => {
      if (shouldAutoGenerate()) {
        generateTimestamps();
      }
    }, 300),
    [date, time]
  );

  // Check if we have enough data to auto-generate
  const shouldAutoGenerate = () => {
    return date !== '' && time !== '';
  };

  // Auto-generate when inputs change
  useEffect(() => {
    debouncedGenerate();
    return () => {
      debouncedGenerate.cancel();
    };
  }, [debouncedGenerate]);

  const generateTimestamps = () => {
    if (!date) {
      setError('Please select a date');
      setResult(null);
      return;
    }

    if (!time) {
      setError('Please select a time');
      setResult(null);
      return;
    }

    try {
      // Create date object from inputs
      const dateTime = new Date(`${date}T${time}:00`);

      if (isNaN(dateTime.getTime())) {
        setError('Invalid date or time');
        setResult(null);
        return;
      }

      const timestamp = Math.floor(dateTime.getTime() / 1000);

      // Generate all Discord format strings
      const formats = {} as Record<DiscordFormat, string>;
      const previews = {} as Record<DiscordFormat, string>;

      Object.keys(DISCORD_FORMATS).forEach(format => {
        const f = format as DiscordFormat;
        formats[f] = `<t:${timestamp}:${f}>`;

        // Generate preview text (simplified approximation)
        const config = DISCORD_FORMATS[f];
        previews[f] = generatePreview(dateTime, f);
      });

      setResult({
        timestamp,
        date,
        time,
        formats,
        previews,
      });
      setError('');
    } catch (err) {
      setError('Failed to generate timestamps');
      setResult(null);
    }
  };

  const generatePreview = (dateTime: Date, format: DiscordFormat): string => {
    const now = new Date();
    const diffMs = dateTime.getTime() - now.getTime();

    switch (format) {
      case 't':
        return dateTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      case 'T':
        return dateTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      case 'd':
        return dateTime.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        });
      case 'D':
        return dateTime.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      case 'f':
        return dateTime.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      case 'F':
        return dateTime.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      case 'R':
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (Math.abs(diffDays) >= 1) {
          return diffDays > 0
            ? `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
            : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
        } else if (Math.abs(diffHours) >= 1) {
          return diffHours > 0
            ? `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`
            : `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ago`;
        } else if (Math.abs(diffMinutes) >= 1) {
          return diffMinutes > 0
            ? `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
            : `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) !== 1 ? 's' : ''} ago`;
        } else {
          return diffSeconds >= 0 ? 'in a few seconds' : 'a few seconds ago';
        }
      default:
        return 'Preview';
    }
  };

  const resetForm = () => {
    setDate('');
    setTime('');
    setResult(null);
    setError('');
    setCopiedFormat(null);
  };

  const useCurrentDateTime = () => {
    const now = new Date();
    setDate(now.toISOString().split('T')[0]);
    setTime(now.toTimeString().slice(0, 5));
  };

  const copyFormat = async (format: DiscordFormat) => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.formats[format]);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
      }`}
    >
      <SEO
        title='Discord Timestamp Generator - Dynamic Time Display | tsconv.com'
        description='Generate Discord timestamps that display dynamically for all users. Create timestamps for events, reminders, and announcements with automatic timezone conversion.'
        canonical='https://www.tsconv.com/discord'
        ogTitle='Discord Timestamp Generator - Dynamic Time Display'
        ogDescription='Generate Discord timestamps that display dynamically for all users. Create timestamps for events, reminders, and announcements with automatic timezone conversion.'
        keywords='discord timestamp, discord time, dynamic timestamp, discord bot, discord events, timezone conversion, discord formatting'
      />
      <Header />

      <main className='flex-1 container mx-auto px-4 py-8'>
        <div
          className={`max-w-4xl mx-auto p-8 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${
            isDark
              ? 'bg-slate-800/95 border-slate-700 shadow-2xl shadow-slate-900/50'
              : 'bg-white/95 border-gray-200 shadow-2xl shadow-gray-900/10'
          }`}
        >
          <div className='flex items-center gap-4 mb-8'>
            <div
              className={`p-3 rounded-xl transition-all duration-300 ${
                isDark
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25'
                  : 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25'
              }`}
            >
              <MessageSquare className='h-8 w-8 text-white' />
            </div>
            <div>
              <h1
                className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Discord Timestamp Generator
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Create dynamic timestamps for Discord messages
              </p>
            </div>
          </div>

          {/* SEO Content */}
          <div
            className={`mb-8 p-6 rounded-xl border transition-all duration-300 ${
              isDark
                ? 'bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600 shadow-lg shadow-slate-900/20'
                : 'bg-gradient-to-br from-purple-50/80 to-indigo-50/60 border-purple-200/50 shadow-lg shadow-purple-900/5'
            }`}
          >
            <div className='flex items-center gap-3 mb-4'>
              <div
                className={`p-2 rounded-lg ${
                  isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                }`}
              >
                <TrendingUp className='h-5 w-5' />
              </div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Dynamic Discord Timestamps
              </h2>
            </div>
            <p className={`mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Generate Discord timestamps that automatically display in each user's local timezone.
              Perfect for scheduling events, setting reminders, or coordinating activities across
              different time zones. Choose from 7 different display formats.
            </p>
          </div>

          {/* Main Layout - Left/Right Split */}
          <div className='grid grid-cols-1 lg:grid-cols-5 gap-8 min-h-[600px]'>
            {/* Left Panel - Input Form */}
            <div className='lg:col-span-2 space-y-6'>
              <div
                className={`p-6 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                  isDark
                    ? 'border-slate-600 bg-gradient-to-br from-slate-800/60 to-slate-700/40 hover:border-slate-500'
                    : 'border-gray-200 bg-gradient-to-br from-white/80 to-gray-50/60 hover:border-gray-300'
                }`}
              >
                <div className='flex items-center gap-3 mb-6'>
                  <div
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    <Clock className='h-5 w-5' />
                  </div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Date & Time Settings
                  </h2>
                </div>

                <fieldset className='space-y-6'>
                  <legend className='sr-only'>Discord timestamp generation settings</legend>

                  {/* Date Input */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Date
                    </label>
                    <input
                      type='date'
                      aria-label='Select date for timestamp'
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md ${isDark ? 'bg-slate-700 border-slate-600 text-white hover:border-slate-500' : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'}`}
                    />
                  </div>

                  {/* Time Input */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Time
                    </label>
                    <input
                      type='time'
                      aria-label='Select time for timestamp'
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md ${isDark ? 'bg-slate-700 border-slate-600 text-white hover:border-slate-500' : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'}`}
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className='flex gap-3'>
                    <button
                      onClick={useCurrentDateTime}
                      className={`flex-1 px-4 py-2 border rounded-lg font-medium transition-all duration-200 ${isDark ? 'border-slate-600 hover:bg-slate-700 text-white hover:border-slate-500' : 'border-gray-300 hover:bg-gray-50 text-gray-900 hover:border-gray-400'}`}
                    >
                      Use Current Time
                    </button>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div
                      className={`flex items-center gap-3 p-4 rounded-lg border ${isDark ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}
                      role='alert'
                      aria-live='polite'
                    >
                      <AlertCircle className='h-5 w-5 text-red-500 flex-shrink-0' />
                      <span className='text-sm font-medium'>{error}</span>
                    </div>
                  )}

                  {/* Status Indicator & Reset Button */}
                  <div className='flex items-center justify-between pt-2'>
                    {/* Real-time Status */}
                    <div className='flex items-center gap-2'>
                      {shouldAutoGenerate() ? (
                        <>
                          <CheckCircle className='h-4 w-4 text-green-500' />
                          <span
                            className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}
                          >
                            Auto-generating
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock className='h-4 w-4 text-gray-400' />
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Select date and time
                          </span>
                        </>
                      )}
                    </div>

                    {/* Reset Button */}
                    <button
                      onClick={resetForm}
                      aria-label='Reset form to default values'
                      className={`px-4 py-2 border rounded-lg font-medium transition-all duration-200 ${isDark ? 'border-slate-600 hover:bg-slate-700 text-white hover:border-slate-500' : 'border-gray-300 hover:bg-gray-50 text-gray-900 hover:border-gray-400'}`}
                    >
                      Reset
                    </button>
                  </div>
                </fieldset>
              </div>
            </div>

            {/* Right Panel - Results Display */}
            <div className='lg:col-span-3' role='region' aria-label='Discord timestamp results'>
              <div
                className={`h-full p-6 rounded-lg border-2 transition-colors ${
                  result
                    ? isDark
                      ? 'border-green-500 bg-green-900/10'
                      : 'border-green-500 bg-green-50/50'
                    : isDark
                      ? 'border-slate-600 bg-slate-700/30'
                      : 'border-gray-200 bg-gray-50/50'
                }`}
              >
                {result ? (
                  <div role='status' aria-live='polite' className='h-full'>
                    <div className='flex items-center justify-between mb-6'>
                      <div className='flex items-center gap-3'>
                        <CheckCircle className='h-6 w-6 text-green-500' />
                        <h2
                          className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          Discord Timestamps
                        </h2>
                      </div>
                    </div>

                    {/* Timestamp Info */}
                    <div
                      className={`mb-6 p-4 rounded-lg border ${
                        isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className='grid grid-cols-2 gap-4 text-sm'>
                        <div>
                          <span
                            className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                          >
                            Unix Timestamp:
                          </span>
                          <div className={`font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {result.timestamp}
                          </div>
                        </div>
                        <div>
                          <span
                            className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                          >
                            Selected Time:
                          </span>
                          <div className={`${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {result.date} {result.time}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Format Results */}
                    <div className='space-y-4'>
                      <h3
                        className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        Discord Formats
                      </h3>

                      <div className='space-y-3'>
                        {Object.entries(DISCORD_FORMATS).map(([format, config]) => {
                          const f = format as DiscordFormat;
                          const isCopied = copiedFormat === f;

                          return (
                            <div
                              key={format}
                              className={`p-4 rounded-lg border transition-all duration-200 ${
                                isDark
                                  ? 'bg-slate-800/30 border-slate-600 hover:bg-slate-800/50'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className='flex items-center justify-between mb-2'>
                                <div className='flex items-center gap-3'>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                                      isDark
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : 'bg-purple-100 text-purple-700'
                                    }`}
                                  >
                                    {format}
                                  </span>
                                  <span
                                    className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                                  >
                                    {config.label}
                                  </span>
                                </div>

                                <button
                                  onClick={() => copyFormat(f)}
                                  className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                                    isCopied
                                      ? isDark
                                        ? 'bg-green-900/30 text-green-400 border border-green-500'
                                        : 'bg-green-100 text-green-700 border border-green-300'
                                      : isDark
                                        ? 'bg-slate-700 text-gray-300 border border-slate-600 hover:bg-slate-600'
                                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                                  }`}
                                >
                                  <Copy className='h-3 w-3' />
                                  {isCopied ? 'Copied!' : 'Copy'}
                                </button>
                              </div>

                              <div className='space-y-2'>
                                <div
                                  className={`font-mono text-sm p-2 rounded ${
                                    isDark
                                      ? 'bg-slate-900/50 text-green-400'
                                      : 'bg-gray-100 text-green-600'
                                  }`}
                                >
                                  {result.formats[f]}
                                </div>

                                <div
                                  className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                                >
                                  <span className='font-medium'>Preview: </span>
                                  {result.previews[f]}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='h-full flex items-center justify-center'>
                    <div className='text-center'>
                      <MessageSquare
                        className={`h-16 w-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}
                      />
                      <h3
                        className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                      >
                        Ready to Generate
                      </h3>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Select a date and time to generate Discord timestamps
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
