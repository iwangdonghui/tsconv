import { AlertCircle, ArrowUpDown, Calendar, CheckCircle, Clock, Copy, Link, TrendingUp, History, Cake, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState, useRef } from 'react';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { useTheme } from '../contexts/ThemeContext';
import { useDateHistory } from '../hooks/useDateHistory';
import { parseNaturalDate } from '../utils/naturalDateParser';
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
  const [shareUrl, setShareUrl] = useState('');
  const [copyFormat, setCopyFormat] = useState<'text' | 'markdown' | 'json'>('text');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [ageMode, setAgeMode] = useState(false);
  
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  const { isDark } = useTheme();
  const { history, addToHistory, removeFromHistory, clearHistory, getHistoryLabel } = useDateHistory();

  // Initialize from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStartDate = params.get('start');
    const urlEndDate = params.get('end');
    const urlIncludeTime = params.get('time') === 'true';
    const urlAbsolute = params.get('abs') !== 'false';
    
    if (urlStartDate) setStartDate(urlStartDate);
    if (urlEndDate) setEndDate(urlEndDate);
    if (urlIncludeTime) setIncludeTime(urlIncludeTime);
    setAbsolute(urlAbsolute);
  }, []);

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

      const response = await fetch(buildApiUrl(`${API_ENDPOINTS.DATE_DIFF}?${params}`));
      const data = await response.json();

      if (data.success) {
        setResult(data);
        // Add to history
        addToHistory(startDate, endDate, includeTime, absolute);
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
      // Generate share URL
      const params = new URLSearchParams({
        start: startDate,
        end: endDate,
        time: includeTime.toString(),
        abs: absolute.toString()
      });
      setShareUrl(`${window.location.origin}${window.location.pathname}?${params.toString()}`);
    } else {
      setResult(null);
      setError('');
      setShareUrl('');
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
    setShareUrl('');
    setSelectedPreset('');
    setStartDateInput('');
    setEndDateInput('');
    setAgeMode(false);
  };

  // Age calculator mode
  const enableAgeMode = () => {
    setAgeMode(true);
    setEndDate(getTodayDate());
    setAbsolute(true);
    setSelectedPreset('age');
    // Focus on start date for birth date input
    setTimeout(() => startInputRef.current?.focus(), 100);
  };

  // Swap dates function
  const swapDates = () => {
    const tempDate = startDate;
    const tempTime = startTime;
    setStartDate(endDate);
    setStartTime(endTime);
    setEndDate(tempDate);
    setEndTime(tempTime);
  };

  // Copy results function
  const copyResults = async () => {
    if (!result) return;

    let copyText = '';
    
    if (copyFormat === 'json') {
      copyText = JSON.stringify({
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        difference: result.data.difference,
        humanReadable: result.data.difference.humanReadable,
        direction: result.data.difference.direction
      }, null, 2);
    } else if (copyFormat === 'markdown') {
      copyText = `## Date Difference Results

**Start Date:** ${new Date(result.data.startDate).toLocaleString()}  
**End Date:** ${new Date(result.data.endDate).toLocaleString()}  
**Difference:** ${result.data.difference.humanReadable}  

| Unit | Value |
|------|-------|
| Years | ${formatNumber(result.data.difference.years)} |
| Months | ${formatNumber(result.data.difference.months)} |
| Days | ${formatNumber(result.data.difference.days)} |
| Hours | ${formatNumber(result.data.difference.hours)} |
| Minutes | ${formatNumber(result.data.difference.minutes)} |
| Seconds | ${formatNumber(result.data.difference.seconds)} |`;
    } else {
      copyText = `Date Difference Results:
Start: ${new Date(result.data.startDate).toLocaleString()}
End: ${new Date(result.data.endDate).toLocaleString()}
Difference: ${result.data.difference.humanReadable}
Years: ${formatNumber(result.data.difference.years)}
Months: ${formatNumber(result.data.difference.months)}
Days: ${formatNumber(result.data.difference.days)}
Hours: ${formatNumber(result.data.difference.hours)}
Minutes: ${formatNumber(result.data.difference.minutes)}
Seconds: ${formatNumber(result.data.difference.seconds)}`;
    }

    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silently handle copy failure
      setCopied(false);
    }
  };

  // Copy share URL
  const copyShareUrl = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
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

  // Calculate additional statistics
  const getAdditionalStats = (start: Date, end: Date) => {
    const diffMs = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Calculate weekends
    let weekends = 0;
    const current = new Date(start);
    while (current <= end) {
      if (current.getDay() === 0 || current.getDay() === 6) {
        weekends++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    // Calculate months and quarters crossed
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const startMonth = start.getMonth();
    const endMonth = end.getMonth();
    
    const monthsCrossed = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    const quartersCrossed = Math.ceil(monthsCrossed / 3);
    const yearsCrossed = endYear - startYear + 1;
    
    return {
      totalDays,
      weekends,
      weekdays: totalDays - weekends,
      monthsCrossed,
      quartersCrossed,
      yearsCrossed
    };
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
              <h1
                className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Date Difference Calculator
              </h1>
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
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Precise Time Difference Calculations
              </h2>
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
                  <h3 className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    Calculation Options
                  </h3>
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
                  <h3 className={`font-semibold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                    Use Cases
                  </h3>
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
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {ageMode ? 'Age Calculator' : 'Date Selection'}
                  </h2>
                  <div className='ml-auto flex gap-2'>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        showHistory
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-blue-100 text-blue-600'
                          : isDark
                            ? 'hover:bg-slate-700 text-gray-400'
                            : 'hover:bg-gray-100 text-gray-600'
                      }`}
                      title='Calculation history'
                    >
                      <History className='h-4 w-4' />
                    </button>
                    <button
                      onClick={ageMode ? resetForm : enableAgeMode}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        ageMode
                          ? isDark
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-purple-100 text-purple-600'
                          : isDark
                            ? 'hover:bg-slate-700 text-gray-400'
                            : 'hover:bg-gray-100 text-gray-600'
                      }`}
                      title={ageMode ? 'Exit age mode' : 'Age calculator'}
                    >
                      {ageMode ? <X className='h-4 w-4' /> : <Cake className='h-4 w-4' />}
                    </button>
                  </div>
                </div>

                {/* History Panel */}
                {showHistory && history.length > 0 && (
                  <div
                    className={`mb-4 p-3 rounded-lg border ${
                      isDark ? 'border-slate-600 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Recent Calculations
                      </h4>
                      <button
                        onClick={clearHistory}
                        className={`text-xs px-2 py-1 rounded ${
                          isDark
                            ? 'text-red-400 hover:bg-red-500/10'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        Clear all
                      </button>
                    </div>
                    <div className='space-y-1 max-h-32 overflow-y-auto'>
                      {history.slice(0, 5).map(item => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-2 rounded text-xs ${
                            isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                          }`}
                        >
                          <button
                            onClick={() => {
                              setStartDate(item.startDate);
                              setEndDate(item.endDate);
                              setIncludeTime(item.includeTime);
                              setAbsolute(item.absolute);
                              setShowHistory(false);
                            }}
                            className='flex-1 text-left truncate'
                          >
                            {getHistoryLabel(item)}
                          </button>
                          <button
                            onClick={() => removeFromHistory(item.id)}
                            className={`ml-2 p-1 rounded ${
                              isDark
                                ? 'text-gray-500 hover:text-red-400'
                                : 'text-gray-400 hover:text-red-600'
                            }`}
                          >
                            <Trash2 className='h-3 w-3' />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Presets */}
                <div
                  className={`p-4 rounded-lg border ${
                    isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <h3
                    className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Quick Presets
                  </h3>
                  <div className='grid grid-cols-2 gap-2'>
                    <button
                      onClick={() => {
                        const today = getTodayDate();
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setStartDate(yesterday.toISOString().split('T')[0] || '');
                        setEndDate(today);
                        setSelectedPreset('yesterday');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 border ${
                        selectedPreset === 'yesterday'
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-blue-50 text-blue-600 border-blue-300'
                          : isDark
                            ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border-slate-600'
                            : 'bg-white text-blue-600 hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      Yesterday to Today
                    </button>
                    <button
                      onClick={() => {
                        const today = getTodayDate();
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        setStartDate(weekAgo.toISOString().split('T')[0] || '');
                        setEndDate(today);
                        setSelectedPreset('week');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 border ${
                        selectedPreset === 'week'
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-blue-50 text-blue-600 border-blue-300'
                          : isDark
                            ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border-slate-600'
                            : 'bg-white text-blue-600 hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      Last Week
                    </button>
                    <button
                      onClick={() => {
                        const today = getTodayDate();
                        const monthAgo = new Date();
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        setStartDate(monthAgo.toISOString().split('T')[0] || '');
                        setEndDate(today);
                        setSelectedPreset('month');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 border ${
                        selectedPreset === 'month'
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-blue-50 text-blue-600 border-blue-300'
                          : isDark
                            ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border-slate-600'
                            : 'bg-white text-blue-600 hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      Last Month
                    </button>
                    <button
                      onClick={() => {
                        const today = getTodayDate();
                        const yearAgo = new Date();
                        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                        setStartDate(yearAgo.toISOString().split('T')[0] || '');
                        setEndDate(today);
                        setSelectedPreset('year');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 border ${
                        selectedPreset === 'year'
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-blue-50 text-blue-600 border-blue-300'
                          : isDark
                            ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border-slate-600'
                            : 'bg-white text-blue-600 hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      Last Year
                    </button>
                    {/* New presets */}
                    <button
                      onClick={() => {
                        const today = new Date();
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() - today.getDay());
                        setStartDate(weekStart.toISOString().split('T')[0] || '');
                        setEndDate(getTodayDate());
                        setSelectedPreset('thisweek');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 border ${
                        selectedPreset === 'thisweek'
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-blue-50 text-blue-600 border-blue-300'
                          : isDark
                            ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border-slate-600'
                            : 'bg-white text-blue-600 hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date();
                        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                        setStartDate(monthStart.toISOString().split('T')[0] || '');
                        setEndDate(getTodayDate());
                        setSelectedPreset('thismonth');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 border ${
                        selectedPreset === 'thismonth'
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-blue-50 text-blue-600 border-blue-300'
                          : isDark
                            ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border-slate-600'
                            : 'bg-white text-blue-600 hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date();
                        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
                        setStartDate(quarterStart.toISOString().split('T')[0] || '');
                        setEndDate(getTodayDate());
                        setSelectedPreset('thisquarter');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 border ${
                        selectedPreset === 'thisquarter'
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-blue-50 text-blue-600 border-blue-300'
                          : isDark
                            ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border-slate-600'
                            : 'bg-white text-blue-600 hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      This Quarter
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date();
                        const yearStart = new Date(today.getFullYear(), 0, 1);
                        setStartDate(yearStart.toISOString().split('T')[0] || '');
                        setEndDate(getTodayDate());
                        setSelectedPreset('thisyear');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 border ${
                        selectedPreset === 'thisyear'
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-blue-50 text-blue-600 border-blue-300'
                          : isDark
                            ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border-slate-600'
                            : 'bg-white text-blue-600 hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      This Year
                    </button>
                  </div>
                </div>

                <div className='space-y-6'>
                  {/* Start Date */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      {ageMode ? 'Birth Date' : 'Start Date'}
                    </label>
                    <div className='relative'>
                      {/* Text input for natural language */}
                      {startDateInput && (
                        <input
                          ref={startInputRef}
                          type='text'
                          aria-label='Enter date or natural language'
                          placeholder={ageMode ? 'Enter birth date or "50 years ago"' : 'Enter date or "yesterday"'}
                          value={startDateInput}
                          onChange={e => {
                            const value = e.target.value;
                            setStartDateInput(value);
                            // Parse natural language on change
                            const parsed = parseNaturalDate(value);
                            if (parsed) {
                              setStartDate(parsed);
                            }
                            setSelectedPreset('');
                            if (value) setAgeMode(false);
                          }}
                          onBlur={() => {
                            // If natural language was parsed, clear the input to show the date
                            if (startDateInput && startDate) {
                              const parsed = parseNaturalDate(startDateInput);
                              if (parsed === startDate) {
                                setStartDateInput('');
                              }
                            }
                          }}
                          className={`w-full px-4 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      )}
                      {/* Date input - shown when no text input */}
                      {!startDateInput && (
                        <input
                          type='date'
                          aria-label='Select date'
                          value={startDate}
                          onChange={e => {
                            setStartDate(e.target.value);
                            setStartDateInput('');
                            setSelectedPreset('');
                            setAgeMode(false);
                          }}
                          onFocus={() => {
                            // Allow typing natural language on desktop
                            if (window.innerWidth >= 768) {
                              setStartDateInput(' ');
                              setTimeout(() => {
                                if (startInputRef.current) {
                                  startInputRef.current.focus();
                                  startInputRef.current.value = '';
                                  setStartDateInput('');
                                }
                              }, 10);
                            }
                          }}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      )}
                    </div>
                    <div className='flex gap-2 mt-1'>
                      <button
                        onClick={() => {
                          setStartDate(getTodayDate());
                          setStartDateInput('');
                        }}
                        className={`text-sm transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        Use today
                      </button>
                      {startDateInput && (
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          Type "yesterday", "last week", "3 days ago", etc.
                        </span>
                      )}
                    </div>
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
                    <div className='flex items-center justify-between mb-2'>
                      <label
                        className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        End Date
                      </label>
                      <button
                        onClick={swapDates}
                        disabled={!startDate || !endDate}
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all duration-200 ${
                          startDate && endDate
                            ? isDark
                              ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                            : isDark
                              ? 'bg-slate-700 text-slate-500 border border-slate-600 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        }`}
                        aria-label='Swap start and end dates'
                      >
                        <ArrowUpDown className='h-3 w-3' />
                        Swap
                      </button>
                    </div>
                    <div className='relative'>
                      {/* Text input for natural language */}
                      {endDateInput && !ageMode && (
                        <input
                          ref={endInputRef}
                          type='text'
                          aria-label='Enter date or natural language'
                          placeholder='Enter date or "tomorrow"'
                          value={endDateInput}
                          onChange={e => {
                            if (ageMode) return;
                            const value = e.target.value;
                            setEndDateInput(value);
                            // Parse natural language on change
                            const parsed = parseNaturalDate(value);
                            if (parsed) {
                              setEndDate(parsed);
                            }
                            setSelectedPreset('');
                          }}
                          onBlur={() => {
                            // If natural language was parsed, clear the input to show the date
                            if (endDateInput && endDate) {
                              const parsed = parseNaturalDate(endDateInput);
                              if (parsed === endDate) {
                                setEndDateInput('');
                              }
                            }
                          }}
                          disabled={ageMode}
                          className={`w-full px-4 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'} ${ageMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      )}
                      {/* Date input - shown when no text input */}
                      {!endDateInput && (
                        <input
                          type='date'
                          aria-label='Select date'
                          value={endDate}
                          onChange={e => {
                            setEndDate(e.target.value);
                            setEndDateInput('');
                            setSelectedPreset('');
                            setAgeMode(false);
                          }}
                          onFocus={() => {
                            // Allow typing natural language on desktop
                            if (!ageMode && window.innerWidth >= 768) {
                              setEndDateInput(' ');
                              setTimeout(() => {
                                if (endInputRef.current) {
                                  endInputRef.current.focus();
                                  endInputRef.current.value = '';
                                  setEndDateInput('');
                                }
                              }, 10);
                            }
                          }}
                          disabled={ageMode}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} ${ageMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      )}
                    </div>
                    <div className='flex gap-2 mt-1'>
                      <button
                        onClick={() => {
                          setEndDate(getTodayDate());
                          setEndDateInput('');
                        }}
                        disabled={ageMode}
                        className={`text-sm transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} ${ageMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Use today
                      </button>
                      {endDateInput && !ageMode && (
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          Type "tomorrow", "next month", "5 days from now", etc.
                        </span>
                      )}
                      {ageMode && (
                        <span className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                          Auto-set to today for age calculation
                        </span>
                      )}
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
                        <h2
                          className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          Results
                        </h2>
                        {result.metadata.cached && (
                          <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded'>
                            Cached
                          </span>
                        )}
                      </div>
                      <div className='flex items-center gap-2 flex-wrap'>
                        {/* Copy Format Selector - hidden on mobile */}
                        <select
                          value={copyFormat}
                          onChange={(e) => setCopyFormat(e.target.value as 'text' | 'markdown' | 'json')}
                          className={`px-2 py-1 text-xs rounded-md border hidden sm:block ${
                            isDark
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          aria-label='Select copy format'
                        >
                          <option value='text'>Text</option>
                          <option value='markdown'>Markdown</option>
                          <option value='json'>JSON</option>
                        </select>
                        <button
                          onClick={copyResults}
                          className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
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
                              <span className='hidden sm:inline'>Copied!</span>
                              <span className='sm:hidden'>✓</span>
                            </>
                          ) : (
                            <>
                              <Copy className='h-3 w-3' />
                              <span className='hidden sm:inline'>Copy</span>
                            </>
                          )}
                        </button>
                        {shareUrl && (
                          <button
                            onClick={copyShareUrl}
                            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
                              isDark
                                ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40'
                                : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 hover:border-purple-300'
                            }`}
                            aria-label='Copy share URL'
                            title='Copy shareable link'
                          >
                            <Link className='h-3 w-3' />
                            <span className='hidden sm:inline'>Share</span>
                          </button>
                        )}
                      </div>
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

                    {/* Period Statistics */}
                    {(() => {
                      const stats = getAdditionalStats(
                        new Date(result.data.startDate),
                        new Date(result.data.endDate)
                      );
                      return (
                        <div
                          className={`p-4 rounded-lg border ${
                            isDark
                              ? 'bg-slate-800/50 border-slate-600'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <h3
                            className={`text-sm font-medium mb-3 ${
                              isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}
                          >
                            📊 Period Statistics
                          </h3>
                          <div className='grid grid-cols-2 gap-3'>
                            <div className='flex justify-between'>
                              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Total Days:
                              </span>
                              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {formatNumber(stats.totalDays)}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Weekends:
                              </span>
                              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {formatNumber(stats.weekends)}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Weekdays:
                              </span>
                              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {formatNumber(stats.weekdays)}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Months Crossed:
                              </span>
                              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {stats.monthsCrossed}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Quarters Crossed:
                              </span>
                              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {stats.quartersCrossed}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Years Crossed:
                              </span>
                              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {stats.yearsCrossed}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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
                      <h2
                        className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        Ready to Calculate
                      </h2>
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
