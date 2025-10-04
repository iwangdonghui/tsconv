import {
  AlertCircle,
  ArrowUpDown,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Link,
  TrendingUp,
  History,
  Cake,
  Trash2,
  X,
  Download,
} from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { useCallback, useEffect, useState, useRef } from 'react';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { useTheme } from '../contexts/ThemeContext';
import { useDateHistory } from '../hooks/useDateHistory';
import { parseNaturalDate } from '../utils/naturalDateParser';
import Footer from './Footer';
import Header from './Header';
import { SEO } from './SEO';
import { HelpButton } from './Tooltip';
import { usePreferences, PreferenceManager } from '../utils/preferences';

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
  const [successMessage, setSuccessMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copyFormat, setCopyFormat] = useState<'text' | 'markdown' | 'json'>('text');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showHistory, setShowHistory] = useState(true);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [ageMode, setAgeMode] = useState(false);
  const [naturalLanguageMode, setNaturalLanguageMode] = useState(false);
  const [countdownMode, setCountdownMode] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  const { isDark } = useTheme();
  const { history, addToHistory, removeFromHistory, clearHistory, getHistoryLabel } =
    useDateHistory();
  // Safely use hooks with error handling
  let preferences: any = {};
  let updatePreference: any = () => {};
  // Smart suggestions and pulsing removed - not currently used

  try {
    const prefResult = usePreferences();
    preferences = prefResult?.preferences || {};
    updatePreference = prefResult?.updatePreference || (() => {});
  } catch (e) {
    console.error('Error loading preferences:', e);
    preferences = {};
    updatePreference = () => {};
  }

  // Load saved preferences on mount
  useEffect(() => {
    try {
      if (preferences && preferences.includeTime !== undefined) {
        setIncludeTime(preferences.includeTime);
      }
      if (preferences && preferences.absoluteMode !== undefined) {
        setAbsolute(preferences.absoluteMode);
      }
      if (preferences && preferences.lastMode) {
        if (preferences.lastMode === 'age') {
          setAgeMode(true);
        } else if (preferences.lastMode === 'countdown') {
          setCountdownMode(true);
        }
      }

      // Show welcome message for returning users
      try {
        if (typeof PreferenceManager !== 'undefined' && PreferenceManager.getWelcomeMessage) {
          const welcomeMessage = PreferenceManager.getWelcomeMessage();
          if (welcomeMessage) {
            setSuccessMessage(welcomeMessage);
            setTimeout(() => setSuccessMessage(''), 3000);
          }
        }
      } catch (e) {
        // Ignore errors
      }
    } catch (error) {
      console.error('Error applying preferences:', error);
    }
  }, []);

  // Auto-calculation function
  const performCalculation = useCallback(
    async (skipLoadingState = false) => {
      if (!startDate || !endDate) {
        setResult(null);
        setError('');
        return;
      }

      // Only show loading state if not in countdown mode or explicitly requested
      if (!skipLoadingState) {
        setLoading(true);
      }
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
          // Only add to history if not in countdown mode (to avoid spamming history)
          if (!countdownMode) {
            addToHistory(startDate, endDate, includeTime, absolute);
          }
        } else {
          setError(data.message || 'Failed to calculate date difference');
        }
      } catch (err) {
        setError('Network error occurred');
      } finally {
        if (!skipLoadingState) {
          setLoading(false);
        }
      }
    },
    [startDate, endDate, startTime, endTime, includeTime, absolute, addToHistory, countdownMode]
  );

  // Debounced calculation
  const debouncedCalculation = useCallback(debounce(performCalculation, 300), [performCalculation]);

  // Live countdown timer
  useEffect(() => {
    if (!countdownMode) return;

    // Perform initial calculation when countdown mode is activated
    if (startDate && endDate) {
      performCalculation(false); // Do show loading for initial calculation
    }

    const timer = setInterval(() => {
      setLiveTime(new Date());
      // Force recalculation for countdown mode without showing loading state
      if (startDate && endDate) {
        performCalculation(true); // Skip loading state for smooth updates
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownMode, startDate, endDate, performCalculation]);

  // Auto-calculate when inputs change
  useEffect(() => {
    if (startDate && endDate) {
      debouncedCalculation();
      // Generate share URL
      const params = new URLSearchParams({
        start: startDate,
        end: endDate,
        time: includeTime.toString(),
        abs: absolute.toString(),
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

  // Age calculator mode is handled inline in button onClick
  // Removed unused enableAgeMode function

  // Swap dates function
  const swapDates = () => {
    const tempDate = startDate;
    const tempTime = startTime;
    setStartDate(endDate);
    setStartTime(endTime);
    setEndDate(tempDate);
    setEndTime(tempTime);
  };

  // Copy results function with success feedback
  const copyResults = async () => {
    if (!result) return;

    let copyText = '';

    if (copyFormat === 'json') {
      copyText = JSON.stringify(
        {
          startDate: result.data.startDate,
          endDate: result.data.endDate,
          difference: result.data.difference,
          humanReadable: result.data.difference.humanReadable,
          direction: result.data.difference.direction,
        },
        null,
        2
      );
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
      setSuccessMessage(`Results copied as ${copyFormat.toUpperCase()}!`);
      setTimeout(() => {
        setCopied(false);
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError('Failed to copy to clipboard. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Copy share URL with feedback
  const copyShareUrl = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setSuccessMessage('Share link copied!');
      setTimeout(() => {
        setCopied(false);
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError('Failed to copy share link. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Export to CSV function with feedback
  const exportToCSV = () => {
    if (!result) return;

    try {
      const stats = getAdditionalStats(
        new Date(result.data.startDate),
        new Date(result.data.endDate)
      );

      // Create CSV content
      const csvRows = [
        // Headers
        ['Date Difference Calculation Results'],
        [],
        ['Field', 'Value'],
        ['Start Date', new Date(result.data.startDate).toLocaleString()],
        ['End Date', new Date(result.data.endDate).toLocaleString()],
        ['Human Readable', result.data.difference.humanReadable],
        ['Direction', result.data.difference.direction],
        [],
        ['Time Units', 'Value'],
        ['Years', result.data.difference.years],
        ['Months', result.data.difference.months],
        ['Weeks', result.data.difference.weeks],
        ['Days', result.data.difference.days],
        ['Hours', result.data.difference.hours],
        ['Minutes', result.data.difference.minutes],
        ['Seconds', result.data.difference.seconds],
        ['Milliseconds', result.data.difference.milliseconds],
        [],
        ['Period Statistics', 'Value'],
        ['Total Days', stats.totalDays],
        ['Weekends', stats.weekends],
        ['Weekdays', stats.weekdays],
        ['Months Crossed', stats.monthsCrossed],
        ['Quarters Crossed', stats.quartersCrossed],
        ['Years Crossed', stats.yearsCrossed],
        [],
        ['Metadata', 'Value'],
        ['Include Time', result.data.includeTime ? 'Yes' : 'No'],
        ['Absolute Value', result.data.absolute ? 'Yes' : 'No'],
        ['Calculation Time', new Date().toLocaleString()],
        ['Processing Time', result.metadata.processingTime],
      ];

      // Convert to CSV string
      const csvContent = csvRows
        .map(row =>
          row
            .map(cell => {
              // Escape quotes and wrap in quotes if contains comma or quotes
              const cellStr = String(cell);
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(',')
        )
        .join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.setAttribute('href', url);
      link.setAttribute('download', `date-difference-${timestamp}.csv`);
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);

      setSuccessMessage('CSV exported successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to export CSV. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getTodayDate = (): string => {
    try {
      return new Date().toISOString().split('T')[0] || '';
    } catch (e) {
      console.error('Error getting today date:', e);
      return '';
    }
  };

  const getCurrentTime = () => {
    try {
      return new Date().toTimeString().slice(0, 5) || '';
    } catch (e) {
      console.error('Error getting current time:', e);
      return '';
    }
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
      yearsCrossed,
    };
  };

  // Generate milestone events between dates
  const getMilestoneEvents = (start: Date, end: Date) => {
    interface Milestone {
      date: string;
      label: string;
      type: string;
      progress: number;
    }

    const milestones: Milestone[] = [];
    const startTime = start.getTime();
    const endTime = end.getTime();
    const isForward = endTime > startTime;

    // Helper to add milestone
    const addMilestone = (date: Date, label: string, type: string) => {
      const time = date.getTime();
      if (isForward ? time > startTime && time < endTime : time < startTime && time > endTime) {
        try {
          const dateStr = date.toISOString().split('T')[0];
          if (dateStr) {
            milestones.push({
              date: dateStr,
              label,
              type,
              progress: Math.abs((time - startTime) / (endTime - startTime)) * 100,
            });
          }
        } catch (e) {
          console.error('Error adding milestone:', e);
        }
      }
    };

    // Add month boundaries
    const current = new Date(start);
    current.setDate(1);
    current.setMonth(current.getMonth() + 1);

    while (isForward ? current < end : current > end) {
      addMilestone(
        new Date(current),
        `Start of ${current.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        'month'
      );
      current.setMonth(current.getMonth() + (isForward ? 1 : -1));
    }

    // Add year boundaries
    const yearCurrent = new Date(start);
    yearCurrent.setMonth(0);
    yearCurrent.setDate(1);
    yearCurrent.setFullYear(yearCurrent.getFullYear() + 1);

    while (isForward ? yearCurrent < end : yearCurrent > end) {
      addMilestone(new Date(yearCurrent), `New Year ${yearCurrent.getFullYear()}`, 'year');
      yearCurrent.setFullYear(yearCurrent.getFullYear() + (isForward ? 1 : -1));
    }

    // Add special dates
    const today = new Date();
    addMilestone(today, 'Today', 'today');

    // Sort by progress
    milestones.sort((a, b) => a.progress - b.progress);

    // Limit to 5 most significant milestones
    return milestones.slice(0, 5);
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

          /* Animation for error shake */
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
            20%, 40%, 60%, 80% { transform: translateX(2px); }
          }
          
          .animate-shake {
            animation: shake 0.5s;
          }
          
          /* Animation for success slide in */
          @keyframes slideIn {
            from { 
              transform: translateY(-10px);
              opacity: 0;
            }
            to { 
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          .animate-slideIn {
            animation: slideIn 0.3s ease-out;
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

          <div className='mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2'>
            <RouterLink
              to='/workdays'
              className={`group flex items-start justify-between gap-3 rounded-2xl border px-4 py-5 text-left transition-colors ${
                isDark
                  ? 'border-slate-600 bg-slate-800/50 hover:border-blue-400/70 hover:bg-slate-800'
                  : 'border-blue-200/70 bg-white hover:border-blue-400/70 hover:bg-blue-50'
              }`}
            >
              <div>
                <p className='text-sm font-semibold text-blue-600 dark:text-blue-300'>Workdays Calculator</p>
                <p className='mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400'>
                  Turn your date range into business-day counts, exclude weekends/holidays, and export schedules.
                </p>
              </div>
              <ArrowUpRight className='h-4 w-4 flex-shrink-0 text-blue-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5' />
            </RouterLink>
            <RouterLink
              to='/how-to/time-arithmetic'
              className={`group flex items-start justify-between gap-3 rounded-2xl border px-4 py-5 text-left transition-colors ${
                isDark
                  ? 'border-slate-600 bg-slate-800/50 hover:border-emerald-400/70 hover:bg-slate-800'
                  : 'border-emerald-200/70 bg-white hover:border-emerald-400/70 hover:bg-emerald-50'
              }`}
            >
              <div>
                <p className='text-sm font-semibold text-emerald-600 dark:text-emerald-300'>Time Arithmetic How-To</p>
                <p className='mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400'>
                  Follow language-specific snippets to add, subtract, and compare timestamps in code.
                </p>
              </div>
              <ArrowUpRight className='h-4 w-4 flex-shrink-0 text-emerald-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5' />
            </RouterLink>
            <RouterLink
              to='/discord'
              className={`group sm:col-span-2 flex items-start justify-between gap-3 rounded-2xl border px-4 py-5 text-left transition-colors ${
                isDark
                  ? 'border-slate-600 bg-slate-800/50 hover:border-violet-400/70 hover:bg-slate-800'
                  : 'border-violet-200/70 bg-white hover:border-violet-400/70 hover:bg-violet-50'
              }`}
            >
              <div>
                <p className='text-sm font-semibold text-violet-600 dark:text-violet-300'>Cross-Platform Scheduling</p>
                <p className='mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400'>
                  Convert the result into shareable Discord/Slack timestamps and coordinate launches in multiple timezones.
                </p>
              </div>
              <ArrowUpRight className='h-4 w-4 flex-shrink-0 text-violet-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5' />
            </RouterLink>
          </div>

          {/* Main Layout - Left/Right Split */}
          <div className='grid grid-cols-1 lg:grid-cols-5 gap-8 min-h-[600px]'>
            {/* Left Panel - Input Form */}
            <div className='lg:col-span-2 space-y-4 sm:space-y-6'>
              <div
                className={`p-4 sm:p-6 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                  isDark
                    ? 'border-slate-600 bg-gradient-to-br from-slate-800/60 to-slate-700/40 hover:border-slate-500'
                    : 'border-gray-200 bg-gradient-to-br from-white/80 to-gray-50/60 hover:border-gray-300'
                }`}
              >
                {/* Mode Tabs */}
                <div className='mb-6'>
                  <div className='flex items-center justify-between mb-4'>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Calculator Mode
                    </h2>
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
                  </div>

                  <div
                    className='flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg'
                    data-tour='mode-tabs'
                  >
                    <button
                      onClick={() => {
                        setAgeMode(false);
                        setCountdownMode(false);
                        updatePreference('lastMode', 'date-diff');
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all hover-lift ${
                        !ageMode && !countdownMode
                          ? isDark
                            ? 'bg-blue-500 text-white shadow-lg animate-scaleIn'
                            : 'bg-blue-500 text-white shadow-lg animate-scaleIn'
                          : isDark
                            ? 'text-gray-400 hover:text-white hover:bg-slate-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <Calendar className='h-3 w-3 sm:h-4 sm:w-4' />
                      <span className='hidden sm:inline'>Date Difference</span>
                      <span className='sm:hidden'>Date Diff</span>
                    </button>

                    <button
                      onClick={() => {
                        setAgeMode(true);
                        setCountdownMode(false);
                        setEndDate(getTodayDate());
                        setAbsolute(true);
                        setSelectedPreset('age');
                        updatePreference('lastMode', 'age');
                        setTimeout(() => startInputRef.current?.focus(), 100);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all hover-lift ${
                        ageMode
                          ? isDark
                            ? 'bg-purple-500 text-white shadow-lg animate-scaleIn'
                            : 'bg-purple-500 text-white shadow-lg animate-scaleIn'
                          : isDark
                            ? 'text-gray-400 hover:text-white hover:bg-slate-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <Cake className='h-3 w-3 sm:h-4 sm:w-4' />
                      <span className='hidden sm:inline'>Age Calculator</span>
                      <span className='sm:hidden'>Age</span>
                    </button>

                    <button
                      onClick={() => {
                        setCountdownMode(!countdownMode);
                        setAgeMode(false);
                        updatePreference('lastMode', countdownMode ? 'date-diff' : 'countdown');
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all hover-lift ${
                        countdownMode
                          ? isDark
                            ? 'bg-green-500 text-white shadow-lg animate-scaleIn'
                            : 'bg-green-500 text-white shadow-lg animate-scaleIn'
                          : isDark
                            ? 'text-gray-400 hover:text-white hover:bg-slate-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <Clock className='h-3 w-3 sm:h-4 sm:w-4' />
                      <span className='hidden sm:inline'>Live Countdown</span>
                      <span className='sm:hidden'>Live</span>
                    </button>
                  </div>

                  {/* Mode Description */}
                  <div className={`mt-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {ageMode && (
                      <p className='flex items-center gap-2'>
                        <span className='text-purple-500'>●</span>
                        Calculate age from birth date to today
                      </p>
                    )}
                    {countdownMode && (
                      <p className='flex items-center gap-2'>
                        <span className='text-green-500'>●</span>
                        Real-time countdown updating every second
                      </p>
                    )}
                    {!ageMode && !countdownMode && (
                      <p className='flex items-center gap-2'>
                        <span className='text-blue-500'>●</span>
                        Calculate the difference between any two dates
                      </p>
                    )}
                  </div>
                </div>

                {/* History Panel - Now Visible by Default */}
                {showHistory && (
                  <div
                    className={`mb-4 p-3 rounded-lg border transition-all duration-300 ${
                      isDark ? 'border-slate-600 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
                    }`}
                    data-tour='history'
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <h4
                        className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        Recent Calculations
                      </h4>
                      {history.length > 0 && (
                        <button
                          onClick={clearHistory}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            isDark
                              ? 'text-red-400 hover:bg-red-500/10'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    {history.length > 0 ? (
                      <div className='space-y-1 max-h-32 overflow-y-auto'>
                        {history.slice(0, 5).map(item => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-2 rounded text-xs transition-colors ${
                              isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            <button
                              onClick={() => {
                                setStartDate(item.startDate);
                                setEndDate(item.endDate);
                                setIncludeTime(item.includeTime);
                                setAbsolute(item.absolute);
                              }}
                              className='flex-1 text-left truncate'
                            >
                              {getHistoryLabel(item)}
                            </button>
                            <button
                              onClick={() => removeFromHistory(item.id)}
                              className={`ml-2 p-1 rounded transition-colors ${
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
                    ) : (
                      <p
                        className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} text-center py-2`}
                      >
                        No calculations yet
                      </p>
                    )}
                  </div>
                )}

                {/* Quick Presets - Simplified */}
                <div
                  className={`p-3 rounded-lg border ${
                    isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-200 bg-gray-50/50'
                  }`}
                  data-tour='quick-presets'
                >
                  <h3
                    className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    Popular Ranges
                  </h3>
                  <div className='grid grid-cols-2 sm:grid-cols-3 gap-1.5'>
                    <button
                      onClick={() => {
                        const today = getTodayDate();
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        try {
                          const weekAgoStr = weekAgo.toISOString().split('T')[0];
                          if (weekAgoStr) {
                            setStartDate(weekAgoStr);
                          }
                        } catch (e) {
                          console.error('Error setting week ago date:', e);
                        }
                        setEndDate(today);
                        setSelectedPreset('week');
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 border ${
                        selectedPreset === 'week'
                          ? isDark
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-blue-500 text-white border-blue-500'
                          : isDark
                            ? 'bg-slate-800 text-gray-300 hover:bg-slate-700 border-slate-700'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                      }`}
                    >
                      Last 7 days
                    </button>
                    <button
                      onClick={() => {
                        const today = getTodayDate();
                        const monthAgo = new Date();
                        monthAgo.setDate(monthAgo.getDate() - 30);
                        try {
                          const monthAgoStr = monthAgo.toISOString().split('T')[0];
                          if (monthAgoStr) {
                            setStartDate(monthAgoStr);
                          }
                        } catch (e) {
                          console.error('Error setting month ago date:', e);
                        }
                        setEndDate(today);
                        setSelectedPreset('month');
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 border ${
                        selectedPreset === 'month'
                          ? isDark
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-blue-500 text-white border-blue-500'
                          : isDark
                            ? 'bg-slate-800 text-gray-300 hover:bg-slate-700 border-slate-700'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                      }`}
                    >
                      Last 30 days
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date();
                        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                        try {
                          const monthStartStr = monthStart.toISOString().split('T')[0];
                          if (monthStartStr) {
                            setStartDate(monthStartStr);
                          }
                        } catch (e) {
                          console.error('Error setting month start date:', e);
                        }
                        setEndDate(getTodayDate());
                        setSelectedPreset('thismonth');
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 border ${
                        selectedPreset === 'thismonth'
                          ? isDark
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-blue-500 text-white border-blue-500'
                          : isDark
                            ? 'bg-slate-800 text-gray-300 hover:bg-slate-700 border-slate-700'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                      }`}
                    >
                      This month
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date();
                        const yearStart = new Date(today.getFullYear(), 0, 1);
                        try {
                          const yearStartStr = yearStart.toISOString().split('T')[0];
                          if (yearStartStr) {
                            setStartDate(yearStartStr);
                          }
                        } catch (e) {
                          console.error('Error setting year start date:', e);
                        }
                        setEndDate(getTodayDate());
                        setSelectedPreset('thisyear');
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 border ${
                        selectedPreset === 'thisyear'
                          ? isDark
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-blue-500 text-white border-blue-500'
                          : isDark
                            ? 'bg-slate-800 text-gray-300 hover:bg-slate-700 border-slate-700'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                      }`}
                    >
                      This year
                    </button>
                    <button
                      onClick={() => {
                        const today = getTodayDate();
                        const yearAgo = new Date();
                        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                        try {
                          const yearAgoStr = yearAgo.toISOString().split('T')[0];
                          if (yearAgoStr) {
                            setStartDate(yearAgoStr);
                          }
                        } catch (e) {
                          console.error('Error setting year ago date:', e);
                        }
                        setEndDate(today);
                        setSelectedPreset('year');
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 border ${
                        selectedPreset === 'year'
                          ? isDark
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-blue-500 text-white border-blue-500'
                          : isDark
                            ? 'bg-slate-800 text-gray-300 hover:bg-slate-700 border-slate-700'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                      }`}
                    >
                      Last year
                    </button>
                    <button
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setSelectedPreset('custom');
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 border ${
                        selectedPreset === 'custom'
                          ? isDark
                            ? 'bg-purple-500 text-white border-purple-500'
                            : 'bg-purple-500 text-white border-purple-500'
                          : isDark
                            ? 'bg-slate-800 text-gray-300 hover:bg-slate-700 border-slate-700'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                <div className='space-y-6'>
                  {/* Start Date */}
                  <div>
                    <div className='flex items-center justify-between mb-2'>
                      <label
                        className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        {ageMode ? 'Birth Date' : 'Start Date'}
                      </label>
                      <button
                        onClick={() => setNaturalLanguageMode(!naturalLanguageMode)}
                        className={`text-xs px-2 py-1 rounded-md transition-colors ${
                          naturalLanguageMode
                            ? isDark
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-blue-100 text-blue-600'
                            : isDark
                              ? 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                      {naturalLanguageMode ? '📝 Text' : '📅 Calendar'}
                      </button>
                    </div>

                    {naturalLanguageMode ? (
                      // Natural Language Input Mode
                      <div>
                        <input
                          ref={startInputRef}
                          type='text'
                          aria-label='Enter natural language date'
                          placeholder={
                            ageMode
                              ? 'e.g., "30 years ago", "January 1, 1990"'
                              : 'e.g., "yesterday", "last Monday", "3 days ago"'
                          }
                          value={startDateInput}
                          onChange={e => {
                            const value = e.target.value;
                            setStartDateInput(value);
                            // Try to parse as natural language
                            const parsed = parseNaturalDate(value);
                            if (parsed) {
                              setStartDate(parsed);
                              // Show success feedback
                              setTimeout(() => {
                                setStartDateInput('');
                                setNaturalLanguageMode(false);
                              }, 500);
                            }
                            setSelectedPreset('');
                            if (value) setAgeMode(false);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const parsed = parseNaturalDate(startDateInput);
                              if (parsed) {
                                setStartDate(parsed);
                                setStartDateInput('');
                                setNaturalLanguageMode(false);
                              }
                            } else if (e.key === 'Escape') {
                              setStartDateInput('');
                              setNaturalLanguageMode(false);
                            }
                          }}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            isDark
                              ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                        <div className='mt-2 space-y-1'>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            💡 Examples:
                          </p>
                          <div className='flex flex-wrap gap-1'>
                            {['yesterday', 'last week', '3 days ago', 'June 15'].map(example => (
                              <button
                                key={example}
                                onClick={() => {
                                  const parsed = parseNaturalDate(example);
                                  if (parsed) {
                                    setStartDate(parsed);
                                    setStartDateInput('');
                                    setNaturalLanguageMode(false);
                                  }
                                }}
                                className={`text-xs px-2 py-1 rounded border ${
                                  isDark
                                    ? 'border-slate-600 bg-slate-800 hover:bg-slate-700'
                                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                }`}
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Date Picker Mode
                      <div>
                        <input
                          type='date'
                          aria-label='Select date'
                          value={startDate}
                          onChange={e => {
                            setStartDate(e.target.value);
                            setSelectedPreset('');
                            setAgeMode(false);
                          }}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            isDark
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                        <div className='flex gap-2 mt-1'>
                          <button
                            onClick={() => {
                              setStartDate(getTodayDate());
                            }}
                            className={`text-sm transition-colors ${
                              isDark
                                ? 'text-blue-400 hover:text-blue-300'
                                : 'text-blue-600 hover:text-blue-800'
                            }`}
                          >
                            Use today
                          </button>
                        </div>
                      </div>
                    )}
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
                        className={`flex items-center justify-center gap-1 px-3 py-2 min-w-[60px] min-h-[36px] text-sm rounded-md transition-all duration-200 ${
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
                        <ArrowUpDown className='h-4 w-4' />
                        <span className='font-medium'>Swap</span>
                      </button>
                    </div>
                    <div className='relative'>
                      <input
                        ref={endInputRef}
                        type='text'
                        aria-label='Enter date or natural language'
                        placeholder='Enter date (e.g., 2024-12-25 or "tomorrow", "next month")'
                        value={endDateInput || endDate}
                        onChange={e => {
                          if (ageMode) return;
                          const value = e.target.value;
                          setEndDateInput(value);
                          // Try to parse as natural language
                          const parsed = parseNaturalDate(value);
                          if (parsed) {
                            setEndDate(parsed);
                            // Clear input after successful parse
                            setTimeout(() => setEndDateInput(''), 100);
                          } else if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            // If it's a valid date format, set it directly
                            setEndDate(value);
                            setEndDateInput('');
                          }
                          setSelectedPreset('');
                        }}
                        onKeyDown={e => {
                          // If user presses Escape, clear the text input to show date picker
                          if (e.key === 'Escape') {
                            setEndDateInput('');
                          }
                        }}
                        disabled={ageMode}
                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'} ${ageMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      {/* Hidden date input for calendar functionality */}
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
                        disabled={ageMode}
                        className={`absolute inset-0 w-full px-4 py-2 opacity-0 pointer-events-none [&::-webkit-calendar-picker-indicator]:pointer-events-auto [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${ageMode ? '[&::-webkit-calendar-picker-indicator]:pointer-events-none' : ''}`}
                      />
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
                        <span
                          className={`text-xs mt-1 block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                          💡 Try: "tomorrow", "next Friday", "in 2 weeks", "December 31"
                        </span>
                      )}
                      {ageMode && (
                        <span
                          className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}
                        >
                          <CheckCircle className='h-3 w-3' />
                          Automatically set to today for age calculation
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
                    <label className='flex items-center cursor-pointer group'>
                      <input
                        type='checkbox'
                        checked={includeTime}
                        aria-label='Include time in date difference calculation'
                        onChange={e => setIncludeTime(e.target.checked)}
                        className='mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600'
                      />
                      <span className='group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
                        Include time in calculation
                      </span>
                    </label>

                    <label className='flex items-center cursor-pointer group'>
                      <input
                        type='checkbox'
                        checked={absolute}
                        aria-label='Show absolute difference ignoring direction'
                        onChange={e => setAbsolute(e.target.checked)}
                        className='mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600'
                      />
                      <span className='group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
                        Show absolute difference (ignore direction)
                      </span>
                    </label>
                  </div>

                  {/* Error and Success Messages */}
                  {error && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-md border animate-shake ${
                        isDark
                          ? 'bg-red-900/20 border-red-800 text-red-200'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}
                      role='alert'
                      aria-live='polite'
                    >
                      <AlertCircle className='h-4 w-4 text-red-500 flex-shrink-0' />
                      <span className='text-sm font-medium'>{error}</span>
                      <button
                        onClick={() => setError('')}
                        className='ml-auto p-1 hover:bg-red-500/10 rounded'
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </div>
                  )}

                  {successMessage && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-md border animate-slideIn ${
                        isDark
                          ? 'bg-green-900/20 border-green-800 text-green-200'
                          : 'bg-green-50 border-green-200 text-green-700'
                      }`}
                      role='status'
                      aria-live='polite'
                    >
                      <CheckCircle className='h-4 w-4 text-green-500 flex-shrink-0' />
                      <span className='text-sm font-medium'>{successMessage}</span>
                    </div>
                  )}

                  {/* Status Indicator */}
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      {countdownMode && startDate && endDate ? (
                        <>
                          <span className='relative flex h-2 w-2'>
                            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75'></span>
                            <span className='relative inline-flex rounded-full h-2 w-2 bg-green-500'></span>
                          </span>
                          <span
                            className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}
                          >
                            Live countdown active
                          </span>
                        </>
                      ) : loading ? (
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
                      className={`px-4 py-2 min-h-[44px] text-sm font-medium border rounded-md transition-colors ${
                        isDark
                          ? 'border-slate-600 hover:bg-slate-700 text-white'
                          : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Results */}
            <div className='lg:col-span-3 space-y-4 sm:space-y-6'>
              {/* Results */}
              <div className='space-y-4' role='region' aria-label='Date difference results'>
                {result && (
                  <>
                    <div className='relative flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 overflow-visible'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <CheckCircle className='h-5 w-5 text-green-500 flex-shrink-0' />
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
                      <div
                        className='flex items-center gap-1 sm:gap-2 flex-wrap justify-end'
                        data-tour='export'
                      >
                        {/* Copy Format Selector and Actions - All in one row */}
                        <div
                          className={`flex rounded-md text-xs sm:text-sm overflow-hidden border ${
                            isDark ? 'border-slate-600' : 'border-gray-300'
                          }`}
                        >
                          <button
                            onClick={() => setCopyFormat('text')}
                            className={`px-2 sm:px-3 py-2 min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] transition-colors ${
                              copyFormat === 'text'
                                ? isDark
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-500 text-white'
                                : isDark
                                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                                  : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            aria-label='Select text format'
                          >
                            Text
                          </button>
                          <button
                            onClick={() => setCopyFormat('markdown')}
                            className={`px-2 sm:px-3 py-2 min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] border-l transition-colors ${
                              copyFormat === 'markdown'
                                ? isDark
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-500 text-white'
                                : isDark
                                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600 border-slate-600'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                            }`}
                            aria-label='Select markdown format'
                          >
                            MD
                          </button>
                          <button
                            onClick={() => setCopyFormat('json')}
                            className={`px-2 sm:px-3 py-2 min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] border-l transition-colors ${
                              copyFormat === 'json'
                                ? isDark
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-500 text-white'
                                : isDark
                                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600 border-slate-600'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                            }`}
                            aria-label='Select JSON format'
                          >
                            JSON
                          </button>
                        </div>
                        <button
                          onClick={copyResults}
                          className={`flex items-center justify-center p-2 min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm rounded-md transition-all duration-200 ${
                            copied
                              ? isDark
                                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                : 'bg-green-100 text-green-700 border border-green-300'
                              : isDark
                                ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 hover:border-blue-300'
                          }`}
                          aria-label='Copy results to clipboard'
                          title='Copy'
                        >
                          {copied ? (
                            <CheckCircle className='h-4 w-4' />
                          ) : (
                            <Copy className='h-4 w-4' />
                          )}
                        </button>
                        {shareUrl && (
                          <button
                            onClick={copyShareUrl}
                            className={`flex items-center justify-center p-2 min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm rounded-md transition-all duration-200 ${
                              isDark
                                ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40'
                                : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 hover:border-purple-300'
                            }`}
                            aria-label='Copy share URL'
                            title='Share'
                          >
                            <Link className='h-4 w-4' />
                          </button>
                        )}
                        <button
                          onClick={exportToCSV}
                          className={`flex items-center justify-center p-2 min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm rounded-md transition-all duration-200 ${
                            isDark
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40'
                              : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 hover:border-green-300'
                          }`}
                          aria-label='Export to CSV'
                          title='Download CSV'
                        >
                          <Download className='h-4 w-4' />
                        </button>
                      </div>
                    </div>

                    {/* Human Readable */}
                    <div
                      className={`p-4 rounded-lg border ${isDark ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-slate-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'}`}
                    >
                      <div className='text-center'>
                        {countdownMode && (
                          <div className='mb-2'>
                            <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'>
                              <span className='relative flex h-2 w-2'>
                                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75'></span>
                                <span className='relative inline-flex rounded-full h-2 w-2 bg-green-500'></span>
                              </span>
                              Live Countdown
                            </span>
                          </div>
                        )}
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
                        {countdownMode && (
                          <div className='mt-2 text-xs text-gray-500'>
                            Last updated: {liveTime.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visual Timeline */}
                    <div
                      className={`p-4 rounded-lg border ${
                        isDark
                          ? 'bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600'
                          : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
                      }`}
                    >
                      <h3
                        className={`text-sm font-medium mb-3 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        📍 Timeline Visualization
                      </h3>
                      <div className='relative'>
                        {/* Timeline bar */}
                        <div
                          className={`h-2 rounded-full mb-4 ${
                            isDark ? 'bg-slate-700' : 'bg-gray-200'
                          }`}
                        >
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              result.data.difference.direction === 'future'
                                ? 'bg-gradient-to-r from-blue-500 to-green-500'
                                : 'bg-gradient-to-r from-purple-500 to-blue-500'
                            }`}
                            style={{
                              width: '100%',
                            }}
                          />
                        </div>

                        {/* Timeline markers */}
                        <div className='flex justify-between relative'>
                          {/* Start marker */}
                          <div className='flex flex-col items-center'>
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                isDark
                                  ? 'bg-blue-500 border-blue-400'
                                  : 'bg-blue-500 border-blue-600'
                              }`}
                            />
                            <div className='mt-2 text-center'>
                              <div
                                className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                              >
                                Start
                              </div>
                              <div
                                className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                              >
                                {new Date(result.data.startDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          {/* Today marker (if between dates) */}
                          {(() => {
                            const start = new Date(result.data.startDate).getTime();
                            const end = new Date(result.data.endDate).getTime();
                            const today = new Date().getTime();
                            const isToday =
                              today >= Math.min(start, end) && today <= Math.max(start, end);
                            const progress = isToday
                              ? ((today - Math.min(start, end)) / Math.abs(end - start)) * 100
                              : 0;

                            return isToday ? (
                              <div
                                className='absolute flex flex-col items-center'
                                style={{
                                  left: `${progress}%`,
                                  transform: 'translateX(-50%)',
                                }}
                              >
                                <div
                                  className={`w-3 h-3 rounded-full border-2 ${
                                    isDark
                                      ? 'bg-yellow-500 border-yellow-400'
                                      : 'bg-yellow-500 border-yellow-600'
                                  }`}
                                />
                                <div className='mt-2 text-center'>
                                  <div
                                    className={`text-xs font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}
                                  >
                                    Today
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          })()}

                          {/* End marker */}
                          <div className='flex flex-col items-center'>
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                result.data.difference.direction === 'future'
                                  ? isDark
                                    ? 'bg-green-500 border-green-400'
                                    : 'bg-green-500 border-green-600'
                                  : isDark
                                    ? 'bg-purple-500 border-purple-400'
                                    : 'bg-purple-500 border-purple-600'
                              }`}
                            />
                            <div className='mt-2 text-center'>
                              <div
                                className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                              >
                                End
                              </div>
                              <div
                                className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                              >
                                {new Date(result.data.endDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Progress percentage (if today is between dates) */}
                        {(() => {
                          const start = new Date(result.data.startDate).getTime();
                          const end = new Date(result.data.endDate).getTime();
                          const today = new Date().getTime();
                          const isToday =
                            today >= Math.min(start, end) && today <= Math.max(start, end);
                          const progress = isToday
                            ? ((today - Math.min(start, end)) / Math.abs(end - start)) * 100
                            : 0;

                          return isToday ? (
                            <div className='mt-4 text-center'>
                              <div
                                className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                              >
                                Progress: {progress.toFixed(1)}% complete
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* Milestone Events */}
                    {(() => {
                      const milestones = getMilestoneEvents(
                        new Date(result.data.startDate),
                        new Date(result.data.endDate)
                      );
                      return milestones.length > 0 ? (
                        <div
                          className={`p-4 rounded-lg border ${
                            isDark
                              ? 'bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-slate-600'
                              : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-gray-200'
                          }`}
                        >
                          <h3
                            className={`text-sm font-medium mb-3 ${
                              isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}
                          >
                            🎯 Key Milestones
                          </h3>
                          <div className='space-y-2'>
                            {milestones.map((milestone, index) => (
                              <div
                                key={index}
                                className={`flex items-center justify-between p-2 rounded-lg ${
                                  isDark
                                    ? 'bg-slate-800/50 border border-slate-700'
                                    : 'bg-white/70 border border-gray-200'
                                }`}
                              >
                                <div className='flex items-center gap-3'>
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      milestone.type === 'year'
                                        ? 'bg-purple-500'
                                        : milestone.type === 'month'
                                          ? 'bg-blue-500'
                                          : milestone.type === 'today'
                                            ? 'bg-yellow-500'
                                            : 'bg-gray-500'
                                    }`}
                                  />
                                  <div>
                                    <div
                                      className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                                    >
                                      {milestone.label}
                                    </div>
                                    <div
                                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                                    >
                                      {milestone.date}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    isDark
                                      ? 'bg-slate-700 text-gray-300'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {milestone.progress.toFixed(0)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Detailed Breakdown - Responsive Grid */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'>
                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg min-h-[100px] flex flex-col justify-center ${
                          isDark
                            ? 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 shadow-lg shadow-blue-500/10'
                            : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 shadow-lg shadow-blue-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                        >
                          {formatNumber(result.data.difference.years)}
                        </div>
                        <div
                          className={`text-sm font-medium mt-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}
                        >
                          Years
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg min-h-[100px] flex flex-col justify-center ${
                          isDark
                            ? 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 shadow-lg shadow-green-500/10'
                            : 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 shadow-lg shadow-green-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}
                        >
                          {formatNumber(result.data.difference.months)}
                        </div>
                        <div
                          className={`text-sm font-medium mt-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}
                        >
                          Months
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg min-h-[100px] flex flex-col justify-center ${
                          isDark
                            ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 shadow-lg shadow-yellow-500/10'
                            : 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200 shadow-lg shadow-yellow-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}
                        >
                          {formatNumber(result.data.difference.days)}
                        </div>
                        <div
                          className={`text-sm font-medium mt-1 ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}
                        >
                          Days
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg min-h-[100px] flex flex-col justify-center ${
                          isDark
                            ? 'bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 shadow-lg shadow-indigo-500/10'
                            : 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 shadow-lg shadow-indigo-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
                        >
                          {formatNumber(result.data.difference.hours)}
                        </div>
                        <div
                          className={`text-sm font-medium mt-1 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}
                        >
                          Hours
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg min-h-[100px] flex flex-col justify-center ${
                          isDark
                            ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 shadow-lg shadow-purple-500/10'
                            : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 shadow-lg shadow-purple-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
                        >
                          {formatNumber(result.data.difference.minutes)}
                        </div>
                        <div
                          className={`text-sm font-medium mt-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}
                        >
                          Minutes
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg min-h-[100px] flex flex-col justify-center ${
                          isDark
                            ? 'bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20 shadow-lg shadow-pink-500/10'
                            : 'bg-gradient-to-br from-pink-50 to-pink-100/50 border-pink-200 shadow-lg shadow-pink-500/5'
                        }`}
                      >
                        <div
                          className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-pink-400' : 'text-pink-600'}`}
                        >
                          {formatNumber(result.data.difference.seconds)}
                        </div>
                        <div
                          className={`text-sm font-medium mt-1 ${isDark ? 'text-pink-300' : 'text-pink-700'}`}
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
                            isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-white border-gray-200'
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
                              <span
                                className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                              >
                                Total Days:
                              </span>
                              <span
                                className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                              >
                                {formatNumber(stats.totalDays)}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span
                                className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                              >
                                Weekends:
                              </span>
                              <span
                                className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                              >
                                {formatNumber(stats.weekends)}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span
                                className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                              >
                                Weekdays:
                              </span>
                              <span
                                className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                              >
                                {formatNumber(stats.weekdays)}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span
                                className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                              >
                                Months Crossed:
                              </span>
                              <span
                                className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                              >
                                {stats.monthsCrossed}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span
                                className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                              >
                                Quarters Crossed:
                              </span>
                              <span
                                className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                              >
                                {stats.quartersCrossed}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span
                                className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                              >
                                Years Crossed:
                              </span>
                              <span
                                className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                              >
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
      <HelpButton />
    </div>
  );
}
