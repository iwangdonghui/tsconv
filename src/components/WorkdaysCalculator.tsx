import React, { useState } from 'react';
import { Calendar, Clock, Calculator, AlertCircle, CheckCircle } from 'lucide-react';

interface WorkdaysResult {
  startDate: string;
  endDate: string;
  totalDays: number;
  workdays: number;
  weekends: number;
  holidays: number;
  excludedDates: string[];
  businessDaysOnly: number;
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
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="h-8 w-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Workdays Calculator</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-6">
          {/* Calculation Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calculation Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="dateRange"
                  checked={calculationMode === 'dateRange'}
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
                  onChange={(e) => setCalculationMode(e.target.value as 'dayCount')}
                  className="mr-2"
                />
                Day Count
              </label>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Days
              </label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="e.g., 30"
                min="1"
                max="3650"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={excludeWeekends}
                onChange={(e) => setExcludeWeekends(e.target.checked)}
                className="mr-2"
              />
              Exclude weekends
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={excludeHolidays}
                onChange={(e) => setExcludeHolidays(e.target.checked)}
                className="mr-2"
              />
              Exclude holidays
            </label>

            {excludeHolidays && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-32 px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
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
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900">Results</h3>
                {result.metadata.cached && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Cached
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.data.workdays}
                  </div>
                  <div className="text-sm text-blue-800">Workdays</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {result.data.totalDays}
                  </div>
                  <div className="text-sm text-gray-800">Total Days</div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {result.data.weekends}
                  </div>
                  <div className="text-sm text-orange-800">Weekends</div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {result.data.holidays}
                  </div>
                  <div className="text-sm text-red-800">Holidays</div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Period:</strong> {result.data.startDate} to {result.data.endDate}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Business Days Only:</strong> {result.data.businessDaysOnly}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Processing Time:</strong> {result.metadata.processingTime}
                </div>
              </div>

              {result.data.excludedDates.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">Excluded Dates:</h4>
                  <div className="text-sm text-yellow-700 max-h-32 overflow-y-auto">
                    {result.data.excludedDates.slice(0, 10).map((date, index) => (
                      <div key={index}>{date}</div>
                    ))}
                    {result.data.excludedDates.length > 10 && (
                      <div className="text-yellow-600 mt-1">
                        ... and {result.data.excludedDates.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {!result && !loading && (
            <div className="text-center text-gray-500 py-8">
              <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Enter dates and click Calculate to see workdays</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
