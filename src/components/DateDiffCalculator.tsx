import { AlertCircle, Calendar, CheckCircle, Clock, Copy, TrendingUp } from 'lucide-react';
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

interface DateDiffResult {
  startDate: string;
  endDate: string;
  includeTime: boolean;
  absolute: boolean;
  difference: {
    milliseconds: number;
    seconds: number;
    minutes: number;
    hours: number;
    days: number;
    weeks: number;
    months: number;
    years: number;
    humanReadable: string;
    isNegative: boolean;
    direction: 'future' | 'past';
  };
  formatted: {
    years: string;
    months: string;
    weeks: string;
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  };
}

interface DateDiffResponse {
  success: boolean;
  data: DateDiffResult;
  metadata: {
    timestamp: string;
    processingTime: string;
    cached: boolean;
  };
}

export default function DateDiffCalculator() {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [includeTime, setIncludeTime] = useState(false);
  const [absolute, setAbsolute] = useState(true);
  const [result, setResult] = useState<DateDiffResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const { isDark } = useTheme();
  // const { t: _t } = useLanguage(); // Commented out as not used in current implementation

  // Auto-calculation function
  const performCalculation = useCallback(async () => {
    if (!startDate || !endDate) {
      setResult(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const startDateTime = includeTime && startTime ? `${startDate}T${startTime}:00` : startDate;
      const endDateTime = includeTime && endTime ? `${endDate}T${endTime}:00` : endDate;

      const params = new URLSearchParams({
        startDate: startDateTime,
        endDate: endDateTime,
        absolute: absolute.toString(),
        includeTime: includeTime.toString(),
      });

      const response = await fetch(`/api/date-diff?${params}`);
      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || 'Failed to calculate date difference');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, startTime, endTime, includeTime, absolute]);

  // Debounced calculation
  const debouncedCalculation = useCallback(debounce(performCalculation, 300), [performCalculation]);

  // Auto-calculate when inputs change
  useEffect(() => {
    if (startDate && endDate) {
      debouncedCalculation();
    } else {
      setResult(null);
      setError('');
    }

    return () => {
      debouncedCalculation.cancel();
    };
  }, [startDate, endDate, startTime, endTime, includeTime, absolute, debouncedCalculation]);

  // calculateDifference function removed - now using performCalculation with auto-calculation

  const resetForm = () => {
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setResult(null);
    setError('');
  };

  // Copy results function
  const copyResults = async () => {
    if (!result) return;

    const copyText = `Date Difference Results:
Start: ${new Date(result.data.startDate).toLocaleString()}
End: ${new Date(result.data.endDate).toLocaleString()}
Difference: ${result.data.difference.humanReadable}
Years: ${formatNumber(result.data.difference.years)}
Months: ${formatNumber(result.data.difference.months)}
Days: ${formatNumber(result.data.difference.days)}
Hours: ${formatNumber(result.data.difference.hours)}
Minutes: ${formatNumber(result.data.difference.minutes)}
Seconds: ${formatNumber(result.data.difference.seconds)}`;

    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silently handle copy failure
      setCopied(false);
    }
  };

  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0] || '';
  };

  const getCurrentTime = () => {
    return new Date().toTimeString().slice(0, 5);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.abs(num));
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'future' ? '→' : '←';
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'future' ? 'text-green-600' : 'text-blue-600';
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
      }`}
    >
      <SEO
        title='Date Difference Calculator - Time Between Dates | tsconv.com'
        description='Calculate the difference between two dates in years, months, days, hours, minutes, and seconds. Get human-readable time differences with precise calculations.'
        canonical='https://www.tsconv.com/date-diff'
        ogTitle='Date Difference Calculator - Time Between Dates'
        ogDescription='Calculate the difference between two dates in years, months, days, hours, minutes, and seconds. Get human-readable time differences with precise calculations.'
        keywords='date difference, time difference, date calculator, days between dates, time between dates, age calculator, duration calculator, date math'
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
            input[type="date"]::-webkit-datetime-edit-fields-wrapper,
            input[type="time"]::-webkit-datetime-edit-fields-wrapper {
              background: transparent;
            }

            input[type="date"]::-webkit-datetime-edit-text,
            input[type="time"]::-webkit-datetime-edit-text,
            input[type="date"]::-webkit-datetime-edit-month-field,
            input[type="date"]::-webkit-datetime-edit-day-field,
            input[type="date"]::-webkit-datetime-edit-year-field,
            input[type="time"]::-webkit-datetime-edit-hour-field,
            input[type="time"]::-webkit-datetime-edit-minute-field {
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
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25'
              }`}
            >
              <TrendingUp className='h-8 w-8 text-white' />
            </div>
            <div>
              <h2
                className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Date Difference Calculator
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Calculate precise time differences between any two dates
              </p>
            </div>
          </div>

          {/* SEO Content */}
          <div
            className={`mb-8 p-6 rounded-xl border transition-all duration-300 ${
              isDark
                ? 'bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600 shadow-lg shadow-slate-900/20'
                : 'bg-gradient-to-br from-blue-50/80 to-indigo-50/60 border-blue-200/50 shadow-lg shadow-blue-900/5'
            }`}
          >
            <div className='flex items-center gap-3 mb-4'>
              <div
                className={`p-2 rounded-lg ${
                  isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                }`}
              >
                <Calendar className='h-5 w-5' />
              </div>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Precise Time Difference Calculations
              </h3>
            </div>
            <p className={`mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Calculate the exact difference between two dates and times with our advanced date
              difference calculator. Get results in multiple formats including years, months, weeks,
              days, hours, minutes, and seconds. Perfect for age calculations, event planning, and
              timestamp analysis.
            </p>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div
                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  isDark
                    ? 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                    : 'border-gray-200 bg-white/50 hover:border-gray-300'
                }`}
              >
                <div className='flex items-center gap-2 mb-3'>
                  <CheckCircle
                    className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-600'}`}
                  />
                  <h4 className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    Calculation Options
                  </h4>
                </div>
                <ul className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0'></span>
                    Include or exclude time components
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0'></span>
                    Absolute or directional differences
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0'></span>
                    Human-readable format output
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0'></span>
                    Multiple time unit breakdowns
                  </li>
                </ul>
              </div>
              <div
                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  isDark
                    ? 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                    : 'border-gray-200 bg-white/50 hover:border-gray-300'
                }`}
              >
                <div className='flex items-center gap-2 mb-3'>
                  <TrendingUp
                    className={`h-5 w-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
                  />
                  <h4 className={`font-semibold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                    Use Cases
                  </h4>
                </div>
                <ul className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0'></span>
                    Age and anniversary calculations
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0'></span>
                    Project duration analysis
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0'></span>
                    Event countdown timers
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0'></span>
                    Historical date comparisons
                  </li>
                </ul>
              </div>
            </div>
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
                      isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <Calendar className='h-5 w-5' />
                  </div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Date Selection
                  </h3>
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
                        const today = getTodayDate();
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setStartDate(yesterday.toISOString().split('T')[0] || '');
                        setEndDate(today);
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      📅 Yesterday to Today
                    </button>
                    <button
                      onClick={() => {
                        const today = getTodayDate();
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        setStartDate(weekAgo.toISOString().split('T')[0] || '');
                        setEndDate(today);
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                          : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                      }`}
                    >
                      📊 Last Week
                    </button>
                    <button
                      onClick={() => {
                        const today = getTodayDate();
                        const monthAgo = new Date();
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        setStartDate(monthAgo.toISOString().split('T')[0] || '');
                        setEndDate(today);
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'
                          : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
                      }`}
                    >
                      📈 Last Month
                    </button>
                    <button
                      onClick={() => {
                        const today = getTodayDate();
                        const yearAgo = new Date();
                        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                        setStartDate(yearAgo.toISOString().split('T')[0] || '');
                        setEndDate(today);
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20'
                          : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'
                      }`}
                    >
                      🎂 Last Year
                    </button>
                  </div>
                </div>

                <div className='space-y-6'>
                  {/* Start Date */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Start Date
                    </label>
                    <div className='relative'>
                      <Calendar
                        className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                      />
                      <input
                        type='date'
                        aria-label='Select date'
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                    <button
                      onClick={() => setStartDate(getTodayDate())}
                      className={`mt-1 text-sm transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      Use today
                    </button>
                  </div>

                  {/* Start Time (if enabled) */}
                  {includeTime && (
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        Start Time
                      </label>
                      <div className='relative'>
                        <Clock
                          className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                        />
                        <input
                          type='time'
                          aria-label='Select time'
                          value={startTime}
                          onChange={e => setStartTime(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                      <button
                        onClick={() => setStartTime(getCurrentTime())}
                        className={`mt-1 text-sm transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        Use current time
                      </button>
                    </div>
                  )}

                  {/* End Date */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      End Date
                    </label>
                    <div className='relative'>
                      <Calendar
                        className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                      />
                      <input
                        type='date'
                        aria-label='Select date'
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                  </div>

                  {/* End Time (if enabled) */}
                  {includeTime && (
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        End Time
                      </label>
                      <div className='relative'>
                        <Clock
                          className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                        />
                        <input
                          type='time'
                          aria-label='Select time'
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Options */}
                  <div className='space-y-3'>
                    <label className='flex items-center'>
                      <input
                        type='checkbox'
                        checked={includeTime}
                        aria-label='Include time in date difference calculation'
                        onChange={e => setIncludeTime(e.target.checked)}
                        className='mr-2'
                      />
                      Include time in calculation
                    </label>

                    <label className='flex items-center'>
                      <input
                        type='checkbox'
                        checked={absolute}
                        aria-label='Show absolute difference ignoring direction'
                        onChange={e => setAbsolute(e.target.checked)}
                        className='mr-2'
                      />
                      Show absolute difference (ignore direction)
                    </label>
                  </div>

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
                            Calculating...
                          </span>
                        </>
                      ) : startDate && endDate ? (
                        <>
                          <CheckCircle
                            className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`}
                          />
                          <span
                            className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}
                          >
                            Auto-calculating
                          </span>
                        </>
                      ) : (
                        <>
                          <Calendar
                            className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                          />
                          <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Enter dates to calculate
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
              </div>
            </div>

            {/* Right Panel - Results */}
            <div className='lg:col-span-3 space-y-6'>
              {/* Results */}
              <div className='space-y-4' role='region' aria-label='Date difference results'>
                {result && (
                  <>
                    <div className='flex items-center justify-between mb-4'>
                      <div className='flex items-center gap-2'>
                        <CheckCircle className='h-5 w-5 text-green-500' />
                        <h3
                          className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          Results
                        </h3>
                        {result.metadata.cached && (
                          <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded'>
                            Cached
                          </span>
                        )}
                      </div>
                      <button
                        onClick={copyResults}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
                          copied
                            ? isDark
                              ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                              : 'bg-green-100 text-green-700 border border-green-300'
                            : isDark
                              ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 hover:border-blue-300'
                        }`}
                        aria-label='Copy results to clipboard'
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

                    {/* Human Readable */}
                    <div
                      className={`p-4 rounded-lg border ${isDark ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-slate-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'}`}
                    >
                      <div className='text-center'>
                        <div
                          className={`text-2xl font-bold ${getDirectionColor(result.data.difference.direction)} mb-2`}
                        >
                          {!absolute && getDirectionIcon(result.data.difference.direction)}{' '}
                          {result.data.difference.humanReadable}
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {result.data.difference.direction === 'future'
                            ? 'In the future'
                            : 'In the past'}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className='grid grid-cols-2 gap-4'>
                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                          isDark
                            ? 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 shadow-lg shadow-blue-500/10'
                            : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 shadow-lg shadow-blue-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                        >
                          {formatNumber(result.data.difference.years)}
                        </div>
                        <div
                          className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}
                        >
                          Years
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                          isDark
                            ? 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 shadow-lg shadow-green-500/10'
                            : 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 shadow-lg shadow-green-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}
                        >
                          {formatNumber(result.data.difference.months)}
                        </div>
                        <div
                          className={`text-sm font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}
                        >
                          Months
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                          isDark
                            ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 shadow-lg shadow-yellow-500/10'
                            : 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200 shadow-lg shadow-yellow-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}
                        >
                          {formatNumber(result.data.difference.days)}
                        </div>
                        <div
                          className={`text-sm font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}
                        >
                          Days
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                          isDark
                            ? 'bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 shadow-lg shadow-indigo-500/10'
                            : 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 shadow-lg shadow-indigo-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
                        >
                          {formatNumber(result.data.difference.hours)}
                        </div>
                        <div
                          className={`text-sm font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}
                        >
                          Hours
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                          isDark
                            ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 shadow-lg shadow-purple-500/10'
                            : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 shadow-lg shadow-purple-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
                        >
                          {formatNumber(result.data.difference.minutes)}
                        </div>
                        <div
                          className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}
                        >
                          Minutes
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                          isDark
                            ? 'bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20 shadow-lg shadow-pink-500/10'
                            : 'bg-gradient-to-br from-pink-50 to-pink-100/50 border-pink-200 shadow-lg shadow-pink-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl font-bold ${isDark ? 'text-pink-400' : 'text-pink-600'}`}
                        >
                          {formatNumber(result.data.difference.seconds)}
                        </div>
                        <div
                          className={`text-sm font-medium ${isDark ? 'text-pink-300' : 'text-pink-700'}`}
                        >
                          Seconds
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                      <div className='text-sm text-gray-600 space-y-1'>
                        <div>
                          <strong>Start:</strong> {new Date(result.data.startDate).toLocaleString()}
                        </div>
                        <div>
                          <strong>End:</strong> {new Date(result.data.endDate).toLocaleString()}
                        </div>
                        <div>
                          <strong>Weeks:</strong> {formatNumber(result.data.difference.weeks)}
                        </div>
                        <div>
                          <strong>Processing Time:</strong> {result.metadata.processingTime}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {!result && !loading && (
                  <div
                    className={`p-8 rounded-xl border-2 border-dashed transition-all duration-300 ${
                      isDark ? 'border-slate-600 bg-slate-800/30' : 'border-gray-300 bg-gray-50/50'
                    }`}
                  >
                    <div className='text-center'>
                      <div
                        className={`inline-flex p-4 rounded-full mb-6 ${
                          isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        <TrendingUp className='h-12 w-12' />
                      </div>
                      <h3
                        className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        Ready to Calculate
                      </h3>
                      <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Enter your start and end dates to see precise time differences
                      </p>
                      <div className='grid grid-cols-2 gap-4 text-xs'>
                        <div
                          className={`p-3 rounded-lg ${
                            isDark ? 'bg-slate-700/50 text-gray-300' : 'bg-white text-gray-600'
                          }`}
                        >
                          <div className='font-medium mb-1'>📅 Date Range</div>
                          <div>Calculate between any two dates</div>
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            isDark ? 'bg-slate-700/50 text-gray-300' : 'bg-white text-gray-600'
                          }`}
                        >
                          <div className='font-medium mb-1'>⏰ Time Precision</div>
                          <div>Include hours and minutes</div>
                        </div>
                      </div>
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
