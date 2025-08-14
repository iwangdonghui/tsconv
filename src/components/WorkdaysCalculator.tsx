import {
  AlertCircle,
  Calculator,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  TrendingUp,
} from 'lucide-react';
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

interface WorkdaysResult {
  mode: string;
  startDate: string;
  endDate?: string;
  targetDate?: string;
  requestedDays?: number;
  totalDays?: number;
  workdays?: number;
  weekends?: number;
  holidays?: number;
  excludedDates?: Array<{ date: string; reason: string; name?: string }>;
  settings?: {
    excludeWeekends: boolean;
    excludeHolidays: boolean;
    country: string;
  };
}

interface WorkdaysResponse {
  success: boolean;
  data: WorkdaysResult;
  metadata: {
    timestamp: string;
    processingTime: string;
    cached: boolean;
  };
}

export default function WorkdaysCalculator() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState('');
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [excludeHolidays, setExcludeHolidays] = useState(false);
  const [country, setCountry] = useState('US');
  const [calculationMode, setCalculationMode] = useState<'dateRange' | 'dayCount'>('dateRange');
  const [result, setResult] = useState<WorkdaysResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const { isDark } = useTheme();

  // Debounced auto-calculation
  const debouncedCalculate = useCallback(
    debounce(() => {
      if (shouldAutoCalculate()) {
        calculateWorkdays();
      }
    }, 300),
    [startDate, endDate, days, excludeWeekends, excludeHolidays, country, calculationMode]
  );

  // Check if we have enough data to auto-calculate
  const shouldAutoCalculate = () => {
    if (!startDate) return false;

    if (calculationMode === 'dateRange') {
      return !!endDate;
    } else {
      return !!days && parseInt(days) > 0;
    }
  };

  // Auto-calculate when inputs change
  useEffect(() => {
    debouncedCalculate();
    return () => {
      debouncedCalculate.cancel();
    };
  }, [debouncedCalculate]);

  const calculateWorkdays = async () => {
    if (!startDate) {
      setError('Start date is required');
      return;
    }

    if (calculationMode === 'dateRange' && !endDate) {
      setError('End date is required for date range calculation');
      return;
    }

    if (calculationMode === 'dayCount' && !days) {
      setError('Number of days is required for day count calculation');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        startDate,
        excludeWeekends: excludeWeekends.toString(),
        excludeHolidays: excludeHolidays.toString(),
        ...(excludeHolidays && { country }),
        ...(calculationMode === 'dateRange' ? { endDate } : { days }),
      });

      const response = await fetch(`/api/workdays?${params}`);
      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || 'Failed to calculate workdays');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setDays('');
    setResult(null);
    setError('');
  };

  const copyResults = async () => {
    if (!result) return;

    const resultText = `Workdays Calculation Results
Period: ${result.data.startDate} to ${result.data.endDate || result.data.targetDate}
Total Days: ${result.data.totalDays}
Workdays: ${result.data.workdays}
Weekends Excluded: ${result.data.weekends || 0}
Holidays Excluded: ${result.data.holidays || 0}
Settings: Weekends ${result.data.settings?.excludeWeekends ? 'excluded' : 'included'}, Holidays ${result.data.settings?.excludeHolidays ? `excluded (${result.data.settings?.country})` : 'included'}`;

    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silently handle copy failure
      setCopied(false);
    }
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
      }`}
    >
      {/* Custom styles for date picker in dark mode */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* Calendar picker indicator styling */
          input[type="date"]::-webkit-calendar-picker-indicator,
          input[type="time"]::-webkit-calendar-picker-indicator {
            filter: ${isDark ? 'invert(1)' : 'none'};
            cursor: pointer;
            opacity: ${isDark ? '0.8' : '0.7'};
            width: 16px;
            height: 16px;
            padding: 2px;
            border-radius: 3px;
            transition: opacity 0.2s ease;
          }

          /* Hover effect for calendar icon */
          input[type="date"]:hover::-webkit-calendar-picker-indicator,
          input[type="time"]:hover::-webkit-calendar-picker-indicator {
            opacity: 1;
            background-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
          }

          /* Date text styling */
          input[type="date"]::-webkit-datetime-edit,
          input[type="time"]::-webkit-datetime-edit {
            color: ${isDark ? 'white' : 'inherit'};
          }

          /* Force dark mode styles */
          ${
            isDark
              ? `
            input[type="date"]::-webkit-datetime-edit-fields-wrapper,
            input[type="time"]::-webkit-datetime-edit-fields-wrapper {
              background: transparent;
            }

            input[type="date"]::-webkit-datetime-edit-text,
            input[type="time"]::-webkit-datetime-edit-text {
              color: white;
            }

            input[type="date"]::-webkit-datetime-edit-month-field,
            input[type="date"]::-webkit-datetime-edit-day-field,
            input[type="date"]::-webkit-datetime-edit-year-field,
            input[type="time"]::-webkit-datetime-edit-hour-field,
            input[type="time"]::-webkit-datetime-edit-minute-field {
              color: white;
            }
          `
              : `
            /* Light mode specific styles */
            input[type="date"]::-webkit-calendar-picker-indicator,
            input[type="time"]::-webkit-calendar-picker-indicator {
              filter: contrast(1.2) brightness(0.8);
            }
          `
          }
        `,
        }}
      />
      <SEO
        title='Workdays Calculator - Business Days Counter | tsconv.com'
        description='Calculate workdays and business days between dates. Exclude weekends and holidays for accurate business day calculations. Support for US, UK, and China holidays.'
        canonical='https://www.tsconv.com/workdays'
        ogTitle='Workdays Calculator - Business Days Counter'
        ogDescription='Calculate workdays and business days between dates. Exclude weekends and holidays for accurate business day calculations. Support for US, UK, and China holidays.'
        keywords='workdays calculator, business days, working days, date calculator, holiday calculator, business day counter, weekday calculator, work schedule'
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
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25'
              }`}
            >
              <Calculator className='h-8 w-8 text-white' />
            </div>
            <div>
              <h1
                className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Workdays Calculator
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Professional business day calculations
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
                <TrendingUp className='h-5 w-5' />
              </div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Calculate Business Days with Precision
              </h2>
            </div>
            <p className={`mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Our workdays calculator helps you determine the exact number of business days between
              any two dates. Whether you're planning project timelines, calculating delivery dates,
              or managing business schedules, this tool provides accurate workday calculations while
              excluding weekends and holidays.
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
                  <h3 className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    Key Features
                  </h3>
                </div>
                <ul className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0'></span>
                    Exclude weekends (Saturday & Sunday)
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0'></span>
                    Support for US, UK, and China holidays
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0'></span>
                    Two calculation modes: date range or day count
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0'></span>
                    Real-time automatic calculations
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
                  <h3 className={`font-semibold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                    Perfect For
                  </h3>
                </div>
                <ul className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0'></span>
                    Project management and planning
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0'></span>
                    Business timeline calculations
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0'></span>
                    Delivery and shipping schedules
                  </li>
                  <li className='flex items-center gap-2 text-sm'>
                    <span className='w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0'></span>
                    Contract and deadline management
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
                    <Calculator className='h-5 w-5' />
                  </div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Calculation Settings
                  </h2>
                </div>

                <fieldset className='space-y-6'>
                  <legend className='sr-only'>Workdays calculation settings</legend>

                  {/* Calculation Mode */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Calculation Mode
                    </label>
                    <div className='flex gap-4'>
                      <label
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          calculationMode === 'dateRange'
                            ? isDark
                              ? 'border-blue-500 bg-blue-900/20'
                              : 'border-blue-500 bg-blue-50'
                            : isDark
                              ? 'border-slate-600 hover:border-slate-500'
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type='radio'
                          value='dateRange'
                          checked={calculationMode === 'dateRange'}
                          aria-label='Calculate workdays using date range'
                          onChange={e => setCalculationMode(e.target.value as 'dateRange')}
                          className='mr-2'
                        />
                        <span
                          className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                        >
                          Date Range
                        </span>
                      </label>
                      <label
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          calculationMode === 'dayCount'
                            ? isDark
                              ? 'border-blue-500 bg-blue-900/20'
                              : 'border-blue-500 bg-blue-50'
                            : isDark
                              ? 'border-slate-600 hover:border-slate-500'
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type='radio'
                          value='dayCount'
                          checked={calculationMode === 'dayCount'}
                          aria-label='Calculate workdays using day count'
                          onChange={e => setCalculationMode(e.target.value as 'dayCount')}
                          className='mr-2'
                        />
                        <span
                          className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                        >
                          Day Count
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Start Date
                    </label>
                    <div className='relative'>
                      <input
                        type='date'
                        aria-label='Select start date'
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 hover:border-slate-500' : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'}`}
                      />
                    </div>
                    <button
                      onClick={() => setStartDate(getTodayDate() || '')}
                      className={`mt-3 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                        isDark
                          ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40'
                          : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 hover:border-blue-300'
                      }`}
                    >
                      📅 Use today
                    </button>
                  </div>

                  {/* End Date or Days */}
                  {calculationMode === 'dateRange' ? (
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        End Date
                      </label>
                      <div className='relative'>
                        <input
                          type='date'
                          aria-label='Select end date'
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 hover:border-slate-500' : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'}`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        Number of Workdays
                      </label>
                      <input
                        type='number'
                        aria-label='Enter number of workdays'
                        value={days}
                        onChange={e => setDays(e.target.value)}
                        placeholder='e.g., 30'
                        min='1'
                        max='3650'
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 hover:border-slate-500' : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'}`}
                      />
                    </div>
                  )}

                  {/* Options */}
                  <div className='space-y-4'>
                    <div>
                      <h3
                        className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        Exclusion Options
                      </h3>
                      <div className='space-y-3'>
                        <label
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            excludeWeekends
                              ? isDark
                                ? 'border-green-500 bg-green-900/20'
                                : 'border-green-500 bg-green-50'
                              : isDark
                                ? 'border-slate-600 hover:border-slate-500'
                                : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type='checkbox'
                            checked={excludeWeekends}
                            aria-label='Exclude weekends from calculation'
                            onChange={e => setExcludeWeekends(e.target.checked)}
                            className='mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                          />
                          <span
                            className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                          >
                            Exclude weekends (Saturday & Sunday)
                          </span>
                        </label>

                        <label
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            excludeHolidays
                              ? isDark
                                ? 'border-orange-500 bg-orange-900/20'
                                : 'border-orange-500 bg-orange-50'
                              : isDark
                                ? 'border-slate-600 hover:border-slate-500'
                                : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type='checkbox'
                            checked={excludeHolidays}
                            aria-label='Exclude holidays from calculation'
                            onChange={e => setExcludeHolidays(e.target.checked)}
                            className='mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                          />
                          <span
                            className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                          >
                            Exclude holidays
                          </span>
                        </label>

                        {excludeHolidays && (
                          <div className='mt-4 p-4 rounded-lg border-l-4 border-orange-500 bg-orange-50/50 dark:bg-orange-900/20'>
                            <div className='flex items-center gap-2 mb-3'>
                              <div className='p-1 rounded-full bg-orange-100 dark:bg-orange-900/50'>
                                <Calendar className='h-4 w-4 text-orange-600 dark:text-orange-400' />
                              </div>
                              <label
                                className={`text-sm font-semibold ${isDark ? 'text-orange-300' : 'text-orange-800'}`}
                              >
                                Holiday Calendar
                              </label>
                            </div>

                            <p
                              className={`text-xs mb-3 ${isDark ? 'text-orange-200/80' : 'text-orange-700/80'}`}
                            >
                              Select the country/region for holiday calculations
                            </p>

                            <div className='relative'>
                              <select
                                value={country}
                                aria-label='Select country for holiday calculations'
                                onChange={e => setCountry(e.target.value)}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer ${isDark ? 'bg-slate-700 border-slate-600 text-white hover:border-slate-500' : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'}`}
                              >
                                <option value='US'>🇺🇸 United States</option>
                                <option value='UK'>🇬🇧 United Kingdom</option>
                                <option value='CN'>🇨🇳 China</option>
                              </select>

                              {/* Custom dropdown arrow */}
                              <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
                                <svg
                                  className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                                  fill='none'
                                  stroke='currentColor'
                                  viewBox='0 0 24 24'
                                >
                                  <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M19 9l-7 7-7-7'
                                  />
                                </svg>
                              </div>
                            </div>

                            {/* Holiday info for selected country */}
                            <div className='mt-3 space-y-2'>
                              <div
                                className={`p-3 rounded-lg border ${isDark ? 'border-slate-600 bg-slate-800/50' : 'border-gray-200 bg-white/70'}`}
                              >
                                {country === 'US' && (
                                  <div className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                      <div className='flex items-center gap-2'>
                                        <span className='text-lg'>🇺🇸</span>
                                        <span
                                          className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}
                                        >
                                          United States Federal Holidays
                                        </span>
                                      </div>
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}
                                      >
                                        ~11 holidays/year
                                      </span>
                                    </div>
                                    <div
                                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                                    >
                                      <span className='font-medium'>Major holidays:</span> New
                                      Year's Day, MLK Day, Presidents Day, Memorial Day,
                                      Independence Day, Labor Day, Columbus Day, Veterans Day,
                                      Thanksgiving, Christmas
                                    </div>
                                  </div>
                                )}
                                {country === 'UK' && (
                                  <div className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                      <div className='flex items-center gap-2'>
                                        <span className='text-lg'>🇬🇧</span>
                                        <span
                                          className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}
                                        >
                                          United Kingdom Bank Holidays
                                        </span>
                                      </div>
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}
                                      >
                                        ~8 holidays/year
                                      </span>
                                    </div>
                                    <div
                                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                                    >
                                      <span className='font-medium'>Major holidays:</span> New
                                      Year's Day, Good Friday, Easter Monday, Early May Bank
                                      Holiday, Spring Bank Holiday, Summer Bank Holiday, Christmas
                                      Day, Boxing Day
                                    </div>
                                  </div>
                                )}
                                {country === 'CN' && (
                                  <div className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                      <div className='flex items-center gap-2'>
                                        <span className='text-lg'>🇨🇳</span>
                                        <span
                                          className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}
                                        >
                                          China National Holidays
                                        </span>
                                      </div>
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}
                                      >
                                        ~11 holidays/year
                                      </span>
                                    </div>
                                    <div
                                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                                    >
                                      <span className='font-medium'>Major holidays:</span> New
                                      Year's Day, Spring Festival (Chinese New Year), Tomb Sweeping
                                      Day, Labor Day, Dragon Boat Festival, Mid-Autumn Festival,
                                      National Day
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Quick tip */}
                              <div
                                className={`text-xs p-2 rounded ${isDark ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}
                              >
                                💡 <span className='font-medium'>Tip:</span> Holiday calculations
                                are based on the most recent official calendar for each country
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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
                      {loading ? (
                        <>
                          <Clock className='h-4 w-4 animate-spin text-blue-500' />
                          <span
                            className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                          >
                            Calculating...
                          </span>
                        </>
                      ) : shouldAutoCalculate() ? (
                        <>
                          <CheckCircle className='h-4 w-4 text-green-500' />
                          <span
                            className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}
                          >
                            Auto-calculating
                          </span>
                        </>
                      ) : (
                        <>
                          <Calculator className='h-4 w-4 text-gray-400' />
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Enter dates to calculate
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
            <div className='lg:col-span-3' role='region' aria-label='Calculation results'>
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
                          Calculation Results
                        </h2>
                        {result.metadata.cached && (
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}
                          >
                            Cached
                          </span>
                        )}
                      </div>

                      {/* Copy Results Button */}
                      <button
                        onClick={copyResults}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          copied
                            ? isDark
                              ? 'bg-green-900/30 text-green-400 border border-green-500'
                              : 'bg-green-100 text-green-700 border border-green-300'
                            : isDark
                              ? 'bg-slate-700 text-gray-300 border border-slate-600 hover:bg-slate-600'
                              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                        }`}
                        aria-label='Copy calculation results'
                      >
                        {copied ? (
                          <>
                            <CheckCircle className='h-4 w-4' />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className='h-4 w-4' />
                            Copy Results
                          </>
                        )}
                      </button>
                    </div>

                    {/* Main Result Card */}
                    <div
                      className={`p-6 rounded-xl border-2 mb-6 relative overflow-hidden ${isDark ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}`}
                    >
                      {/* Background Pattern */}
                      <div className='absolute inset-0 opacity-5'>
                        <div className='absolute top-4 right-4 text-6xl'>📊</div>
                      </div>

                      <div className='relative'>
                        <div className='text-center mb-4'>
                          <div
                            className={`text-6xl font-bold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                          >
                            {result.data.workdays}
                          </div>
                          <div
                            className={`text-xl font-semibold ${isDark ? 'text-blue-300' : 'text-blue-800'}`}
                          >
                            Workdays
                          </div>
                          <div
                            className={`text-sm mt-1 ${isDark ? 'text-blue-300/70' : 'text-blue-600/70'}`}
                          >
                            {calculationMode === 'dateRange'
                              ? 'Total business days'
                              : 'Target date calculation'}
                          </div>
                        </div>

                        {/* Progress Visualization */}
                        <div className='mt-6'>
                          <div className='flex items-center justify-between text-sm mb-2'>
                            <span
                              className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}
                            >
                              Workdays Progress
                            </span>
                            <span className={`${isDark ? 'text-blue-300/70' : 'text-blue-600/70'}`}>
                              {result.data.workdays} of {result.data.totalDays} days
                            </span>
                          </div>
                          <div
                            className={`w-full bg-gray-200 rounded-full h-3 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                          >
                            <div
                              className={`h-3 rounded-full transition-all duration-1000 ease-out ${isDark ? 'bg-blue-400' : 'bg-blue-600'}`}
                              style={{
                                width: `${Math.min(((result.data.workdays || 0) / (result.data.totalDays || 1)) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <div className='flex justify-between text-xs mt-1'>
                            <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              0%
                            </span>
                            <span
                              className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                            >
                              {Math.round(
                                ((result.data.workdays || 0) / (result.data.totalDays || 1)) * 100
                              )}
                              %
                            </span>
                            <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              100%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className='space-y-4 mb-6'>
                      <h3
                        className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        <Calendar className='h-5 w-5 text-blue-500' />
                        Breakdown Analysis
                      </h3>

                      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                        {/* Total Days Card */}
                        <div
                          className={`p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${isDark ? 'border-slate-600 bg-slate-700/50 hover:border-slate-500' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
                        >
                          <div className='flex items-center justify-between mb-3'>
                            <div
                              className={`p-2 rounded-lg ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}
                            >
                              <Calendar
                                className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                              />
                            </div>
                            <div
                              className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-slate-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
                            >
                              100%
                            </div>
                          </div>
                          <div
                            className={`text-3xl font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                          >
                            {result.data.totalDays}
                          </div>
                          <div
                            className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                          >
                            Total Days
                          </div>
                          <div
                            className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
                          >
                            Complete period duration
                          </div>
                        </div>

                        {/* Weekends Card */}
                        <div
                          className={`p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${isDark ? 'border-orange-600 bg-orange-900/20 hover:border-orange-500' : 'border-orange-200 bg-orange-50 hover:border-orange-300'}`}
                        >
                          <div className='flex items-center justify-between mb-3'>
                            <div
                              className={`p-2 rounded-lg ${isDark ? 'bg-orange-900/50' : 'bg-orange-100'}`}
                            >
                              <span className='text-lg'>🏖️</span>
                            </div>
                            <div
                              className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700'}`}
                            >
                              {result.data.totalDays
                                ? Math.round(
                                    ((result.data.weekends || 0) / result.data.totalDays) * 100
                                  )
                                : 0}
                              %
                            </div>
                          </div>
                          <div
                            className={`text-3xl font-bold mb-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}
                          >
                            {result.data.weekends || 0}
                          </div>
                          <div
                            className={`text-sm font-medium ${isDark ? 'text-orange-300' : 'text-orange-700'}`}
                          >
                            Weekends Excluded
                          </div>
                          <div
                            className={`text-xs mt-2 ${isDark ? 'text-orange-300/70' : 'text-orange-600/70'}`}
                          >
                            Saturday & Sunday
                          </div>
                        </div>

                        {/* Holidays Card */}
                        <div
                          className={`p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${isDark ? 'border-red-600 bg-red-900/20 hover:border-red-500' : 'border-red-200 bg-red-50 hover:border-red-300'}`}
                        >
                          <div className='flex items-center justify-between mb-3'>
                            <div
                              className={`p-2 rounded-lg ${isDark ? 'bg-red-900/50' : 'bg-red-100'}`}
                            >
                              <span className='text-lg'>🎉</span>
                            </div>
                            <div
                              className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}`}
                            >
                              {result.data.totalDays
                                ? Math.round(
                                    ((result.data.holidays || 0) / result.data.totalDays) * 100
                                  )
                                : 0}
                              %
                            </div>
                          </div>
                          <div
                            className={`text-3xl font-bold mb-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}
                          >
                            {result.data.holidays || 0}
                          </div>
                          <div
                            className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}
                          >
                            Holidays Excluded
                          </div>
                          <div
                            className={`text-xs mt-2 ${isDark ? 'text-red-300/70' : 'text-red-600/70'}`}
                          >
                            {result.data.settings?.country || 'National'} holidays
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Calculation Summary */}
                    <div
                      className={`p-5 rounded-lg border ${isDark ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <h3
                        className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        Calculation Details
                      </h3>
                      <div className='space-y-2'>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className='font-medium'>Calculation Period:</span>
                          <span className='ml-2'>
                            {result.data.startDate} to{' '}
                            {result.data.endDate || result.data.targetDate}
                          </span>
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className='font-medium'>Exclude Weekends:</span>
                          <span
                            className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                              result.data.settings?.excludeWeekends
                                ? isDark
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'bg-green-100 text-green-800'
                                : isDark
                                  ? 'bg-gray-700 text-gray-400'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {result.data.settings?.excludeWeekends ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className='font-medium'>Exclude Holidays:</span>
                          <span
                            className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                              result.data.settings?.excludeHolidays
                                ? isDark
                                  ? 'bg-orange-900/30 text-orange-400'
                                  : 'bg-orange-100 text-orange-800'
                                : isDark
                                  ? 'bg-gray-700 text-gray-400'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {result.data.settings?.excludeHolidays
                              ? `Yes (${result.data.settings?.country})`
                              : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Excluded Dates Details */}
                    {result.data.excludedDates && result.data.excludedDates.length > 0 && (
                      <div
                        className={`p-5 rounded-lg border ${isDark ? 'border-yellow-600 bg-yellow-900/20' : 'border-yellow-200 bg-yellow-50'}`}
                      >
                        <h3
                          className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}
                        >
                          <AlertCircle className='h-4 w-4' />
                          Excluded Dates Details
                        </h3>
                        <div
                          className={`text-sm max-h-40 overflow-y-auto space-y-1 ${isDark ? 'text-yellow-200' : 'text-yellow-700'}`}
                        >
                          {result.data.excludedDates?.slice(0, 15).map((dateInfo, index) => (
                            <div
                              key={index}
                              className={`p-2 rounded border-l-2 ${isDark ? 'border-yellow-500 bg-yellow-900/10' : 'border-yellow-400 bg-yellow-100/50'}`}
                            >
                              {typeof dateInfo === 'string' ? (
                                dateInfo
                              ) : (
                                <div>
                                  <span className='font-medium'>{dateInfo.date}</span>
                                  <span className='ml-2 text-xs opacity-75'>
                                    ({dateInfo.reason})
                                  </span>
                                  {dateInfo.name && (
                                    <span className='ml-1 text-xs font-medium'>
                                      - {dateInfo.name}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          {result.data.excludedDates && result.data.excludedDates.length > 15 && (
                            <div
                              className={`mt-2 text-center text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}
                            >
                              ... and {result.data.excludedDates.length - 15} more excluded dates
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Placeholder when no results */
                  <div className='h-full flex flex-col items-center justify-center text-center py-12'>
                    <div
                      className={`p-6 rounded-full mb-6 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}
                    >
                      <Calculator
                        className={`h-12 w-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                      />
                    </div>
                    <h2
                      className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Real-time Results
                    </h2>
                    <p
                      className={`text-sm mb-4 max-w-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      Fill in the dates on the left, and results will appear here instantly
                    </p>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      💡 Supports US, UK, and China holidays
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
