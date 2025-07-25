import React, { useState } from 'react';
import { Calendar, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SEO } from './SEO';
import Header from './Header';
import Footer from './Footer';

interface DateDiffResult {
  startDate: string;
  endDate: string;
  difference: {
    milliseconds: number;
    seconds: number;
    minutes: number;
    hours: number;
    days: number;
    weeks: number;
    months: number;
    years: number;
  };
  humanReadable: string;
  direction: 'future' | 'past';
  absolute: boolean;
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

  const { isDark } = useTheme();
  const { t } = useLanguage();

  const calculateDifference = async () => {
    if (!startDate || !endDate) {
      setError('Both start and end dates are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const startDateTime = includeTime && startTime 
        ? `${startDate}T${startTime}:00` 
        : startDate;
      const endDateTime = includeTime && endTime 
        ? `${endDate}T${endTime}:00` 
        : endDate;

      const params = new URLSearchParams({
        startDate: startDateTime,
        endDate: endDateTime,
        absolute: absolute.toString(),
        includeTime: includeTime.toString()
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
  };

  const resetForm = () => {
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setResult(null);
    setError('');
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
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
        isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"
      }`}
    >
      <SEO
        title="Date Difference Calculator - Time Between Dates | tsconv.com"
        description="Calculate the difference between two dates in years, months, days, hours, minutes, and seconds. Get human-readable time differences with precise calculations."
        canonical="https://tsconv.com/date-diff"
        ogTitle="Date Difference Calculator - Time Between Dates"
        ogDescription="Calculate the difference between two dates in years, months, days, hours, minutes, and seconds. Get human-readable time differences with precise calculations."
        keywords="date difference, time difference, date calculator, days between dates, time between dates, age calculator, duration calculator, date math"
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-8 w-8 text-purple-600" />
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Date Difference Calculator</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-6">
          {/* Start Date */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Start Date
            </label>
            <div className="relative">
              <Calendar className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="date"
                  aria-label="Select date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setStartDate(getTodayDate())}
              className={`mt-1 text-sm transition-colors ${isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-800'}`}
            >
              Use today
            </button>
          </div>

          {/* Start Time (if enabled) */}
          {includeTime && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Start Time
              </label>
              <div className="relative">
                <Clock className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="time"
                  aria-label="Select time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setStartTime(getCurrentTime())}
                className={`mt-1 text-sm transition-colors ${isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-800'}`}
              >
                Use current time
              </button>
            </div>
          )}

          {/* End Date */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              End Date
            </label>
            <div className="relative">
              <Calendar className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="date"
                  aria-label="Select date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* End Time (if enabled) */}
          {includeTime && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                End Time
              </label>
              <div className="relative">
                <Clock className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="time"
                  aria-label="Select time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeTime}
                aria-label="Include time in date difference calculation"
                onChange={(e) => setIncludeTime(e.target.checked)}
                className="mr-2"
              />
              Include time in calculation
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={absolute}
                aria-label="Show absolute difference ignoring direction"
                onChange={(e) => setAbsolute(e.target.checked)}
                className="mr-2"
              />
              Show absolute difference (ignore direction)
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div className={`flex items-center gap-2 p-3 rounded-md border ${isDark ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`} role="alert" aria-live="polite">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={calculateDifference}
              disabled={loading}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              aria-label="Calculate difference between selected dates"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Calculate
                </>
              )}
            </button>
            <button
              onClick={resetForm}
              aria-label="Reset form to default values"
              className={`px-4 py-2 border rounded-md transition-colors ${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-300 hover:bg-gray-50 text-gray-900'}`}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4" role="region" aria-label="Date difference results">
          {result && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Results</h3>
                {result.metadata.cached && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Cached
                  </span>
                )}
              </div>

              {/* Human Readable */}
              <div className={`p-4 rounded-lg border ${isDark ? 'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-slate-600' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-gray-200'}`}>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getDirectionColor(result.data.direction)} mb-2`}>
                    {!absolute && getDirectionIcon(result.data.direction)} {result.data.humanReadable}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {result.data.direction === 'future' ? 'In the future' : 'In the past'}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {formatNumber(result.data.difference.years)}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Years</div>
                </div>

                <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/20 border border-green-800' : 'bg-green-50'}`}>
                  <div className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    {formatNumber(result.data.difference.months)}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-green-300' : 'text-green-800'}`}>Months</div>
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">
                    {formatNumber(result.data.difference.days)}
                  </div>
                  <div className="text-sm text-yellow-800">Days</div>
                </div>

                <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50'}`}>
                  <div className={`text-lg font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                    {formatNumber(result.data.difference.hours)}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>Hours</div>
                </div>

                <div className={`p-3 rounded-lg ${isDark ? 'bg-indigo-900/20 border border-indigo-800' : 'bg-indigo-50'}`}>
                  <div className={`text-lg font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {formatNumber(result.data.difference.minutes)}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>Minutes</div>
                </div>

                <div className={`p-3 rounded-lg ${isDark ? 'bg-pink-900/20 border border-pink-800' : 'bg-pink-50'}`}>
                  <div className={`text-lg font-bold ${isDark ? 'text-pink-400' : 'text-pink-600'}`}>
                    {formatNumber(result.data.difference.seconds)}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-pink-300' : 'text-pink-800'}`}>Seconds</div>
                </div>
              </div>

              {/* Additional Info */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Start:</strong> {new Date(result.data.startDate).toLocaleString()}</div>
                  <div><strong>End:</strong> {new Date(result.data.endDate).toLocaleString()}</div>
                  <div><strong>Weeks:</strong> {formatNumber(result.data.difference.weeks)}</div>
                  <div><strong>Processing Time:</strong> {result.metadata.processingTime}</div>
                </div>
              </div>
            </>
          )}

          {!result && !loading && (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Enter two dates and click Calculate to see the difference</p>
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
