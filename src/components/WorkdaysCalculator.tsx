import React, { useState } from 'react';
import { Calendar, Clock, Calculator, AlertCircle, CheckCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SEO } from './SEO';
import Header from './Header';
import Footer from './Footer';

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
  excludedDates?: Array<{date: string, reason: string, name?: string}>;
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

  const { isDark } = useTheme();
  const { t } = useLanguage();

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
        ...(calculationMode === 'dateRange' ? { endDate } : { days })
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

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"
      }`}
    >
      {/* Custom styles for date picker in dark mode */}
      <style dangerouslySetInnerHTML={{
        __html: `
          input[type="date"]::-webkit-calendar-picker-indicator,
          input[type="time"]::-webkit-calendar-picker-indicator {
            filter: ${isDark ? 'invert(1)' : 'none'};
            cursor: pointer;
          }

          input[type="date"]::-webkit-datetime-edit,
          input[type="time"]::-webkit-datetime-edit {
            color: ${isDark ? 'white' : 'inherit'};
          }
        `
      }} />
      <SEO
        title="Workdays Calculator - Business Days Counter | tsconv.com"
        description="Calculate workdays and business days between dates. Exclude weekends and holidays for accurate business day calculations. Support for US, UK, and China holidays."
        canonical="https://tsconv.com/workdays"
        ogTitle="Workdays Calculator - Business Days Counter"
        ogDescription="Calculate workdays and business days between dates. Exclude weekends and holidays for accurate business day calculations. Support for US, UK, and China holidays."
        keywords="workdays calculator, business days, working days, date calculator, holiday calculator, business day counter, weekday calculator, work schedule"
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="h-8 w-8 text-blue-600" />
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Workdays Calculator</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-6">
          <fieldset>
            <legend className="sr-only">Workdays calculation settings</legend>
          {/* Calculation Mode */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Calculation Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="dateRange"
                  checked={calculationMode === 'dateRange'}
                  aria-label="Calculate workdays using date range"
                  onChange={(e) => setCalculationMode(e.target.value as 'dateRange')}
                  className="mr-2"
                />
                Date Range
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="dayCount"
                  checked={calculationMode === 'dayCount'}
                  aria-label="Calculate workdays using day count"
                  onChange={(e) => setCalculationMode(e.target.value as 'dayCount')}
                  className="mr-2"
                />
                Day Count
              </label>
            </div>
          </div>

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
                className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
            <button
              onClick={() => setStartDate(getTodayDate())}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Use today
            </button>
          </div>

          {/* End Date or Days */}
          {calculationMode === 'dateRange' ? (
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
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Number of Days
              </label>
              <input
                type="number"
                  aria-label="Enter number of days"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="e.g., 30"
                min="1"
                max="3650"
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={excludeWeekends}
                aria-label="Exclude weekends from calculation"
                onChange={(e) => setExcludeWeekends(e.target.checked)}
                className="mr-2"
              />
              Exclude weekends
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={excludeHolidays}
                aria-label="Exclude holidays from calculation"
                onChange={(e) => setExcludeHolidays(e.target.checked)}
                className="mr-2"
              />
              Exclude holidays
            </label>

            {excludeHolidays && (
              <div className="ml-6">
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Country
                </label>
                <select
                  value={country}
                  aria-label="Select country for holidays"
                  onChange={(e) => setCountry(e.target.value)}
                  className={`w-32 px-3 py-1 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="CN">China</option>
                </select>
              </div>
            )}
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
              onClick={calculateWorkdays}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              aria-label="Calculate workdays between selected dates"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" />
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
          </fieldset>
        </div>

        {/* Results */}
        <div className="space-y-4" role="region" aria-label="Calculation results">
          {result && (
            <div role="status" aria-live="polite">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Results</h3>
                {result.metadata.cached && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Cached
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50'}`}>
                  <div className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {result.data.workdays}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Workdays</div>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className={`text-2xl font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {result.data.totalDays}
                  </div>
                  <div className="text-sm text-gray-800">Total Days</div>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? 'bg-orange-900/20 border border-orange-800' : 'bg-orange-50'}`}>
                  <div className={`text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                    {result.data.weekends}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>Weekends</div>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50'}`}>
                  <div className={`text-2xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    {result.data.holidays}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>Holidays</div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Period:</strong> {result.data.startDate} to {result.data.endDate}
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>Exclude Weekends:</strong> {result.data.settings?.excludeWeekends ? 'Yes' : 'No'}
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>Exclude Holidays:</strong> {result.data.settings?.excludeHolidays ? 'Yes' : 'No'}
                </div>
              </div>

              {result.data.excludedDates.length > 0 && (
                <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50'}`}>
                  <h4 className={`font-medium mb-2 ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>Excluded Dates:</h4>
                  <div className={`text-sm max-h-32 overflow-y-auto ${isDark ? 'text-yellow-200' : 'text-yellow-700'}`}>
                    {result.data.excludedDates?.slice(0, 10).map((dateInfo, index) => (
                      <div key={index}>
                        {typeof dateInfo === 'string' ? dateInfo : `${dateInfo.date} (${dateInfo.reason}${dateInfo.name ? ` - ${dateInfo.name}` : ''})`}
                      </div>
                    ))}
                    {result.data.excludedDates && result.data.excludedDates.length > 10 && (
                      <div className={`mt-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        ... and {result.data.excludedDates.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!result && !loading && (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Enter dates and click Calculate to see workdays</p>
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
