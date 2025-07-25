import React, { useState } from 'react';
import { Calendar, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-8 w-8 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-900">Date Difference Calculator</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-6">
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setStartDate(getTodayDate())}
              className="mt-1 text-sm text-purple-600 hover:text-purple-800"
            >
              Use today
            </button>
          </div>

          {/* Start Time (if enabled) */}
          {includeTime && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setStartTime(getCurrentTime())}
                className="mt-1 text-sm text-purple-600 hover:text-purple-800"
              >
                Use current time
              </button>
            </div>
          )}

          {/* End Date */}
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* End Time (if enabled) */}
          {includeTime && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="time"
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
                onChange={(e) => setIncludeTime(e.target.checked)}
                className="mr-2"
              />
              Include time in calculation
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={absolute}
                onChange={(e) => setAbsolute(e.target.checked)}
                className="mr-2"
              />
              Show absolute difference (ignore direction)
            </label>
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
              onClick={calculateDifference}
              disabled={loading}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

              {/* Human Readable */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getDirectionColor(result.data.direction)} mb-2`}>
                    {!absolute && getDirectionIcon(result.data.direction)} {result.data.humanReadable}
                  </div>
                  <div className="text-sm text-gray-600">
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
                  <div className="text-sm text-blue-800">Years</div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {formatNumber(result.data.difference.months)}
                  </div>
                  <div className="text-sm text-green-800">Months</div>
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">
                    {formatNumber(result.data.difference.days)}
                  </div>
                  <div className="text-sm text-yellow-800">Days</div>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {formatNumber(result.data.difference.hours)}
                  </div>
                  <div className="text-sm text-purple-800">Hours</div>
                </div>

                <div className="bg-indigo-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-indigo-600">
                    {formatNumber(result.data.difference.minutes)}
                  </div>
                  <div className="text-sm text-indigo-800">Minutes</div>
                </div>

                <div className="bg-pink-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-pink-600">
                    {formatNumber(result.data.difference.seconds)}
                  </div>
                  <div className="text-sm text-pink-800">Seconds</div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
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
            <div className="text-center text-gray-500 py-8">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Enter two dates and click Calculate to see the difference</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
