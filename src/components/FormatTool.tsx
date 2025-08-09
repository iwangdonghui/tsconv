import { Type, Clock, Copy, CheckCircle, AlertCircle, Palette } from "lucide-react";
import { useState, useEffect } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SEO } from './SEO';
import Header from './Header';
import Footer from './Footer';

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
  const { t } = useLanguage();

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

  const formatDateTime = async () => {
    if (inputType === 'timestamp' && !timestamp) {
      setError('Timestamp is required');
      return;
    }

    if (inputType === 'date' && !date) {
      setError('Date is required');
      return;
    }

    const formatToUse = format === 'custom' ? customFormat : format;
    if (!formatToUse) {
      setError('Format is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        format: formatToUse,
        ...(inputType === 'timestamp' 
          ? { timestamp } 
          : { date: time ? `${date}T${time}:00` : date }
        )
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
  };

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
    setDate(new Date().toISOString().split('T')[0]);
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
      'iso': 'ISO 8601 standard format',
      'iso-date': 'ISO date only',
      'iso-time': 'ISO time only',
      'us-date': 'US date format (MM/DD/YYYY)',
      'us-datetime': 'US date and time',
      'eu-date': 'European date format (DD/MM/YYYY)',
      'eu-datetime': 'European date and time',
      'readable': 'Human readable date',
      'readable-full': 'Full readable date and time',
      'compact': 'Compact date (YYYYMMDD)',
      'compact-time': 'Compact date and time',
      'unix': 'Unix timestamp (seconds)',
      'unix-ms': 'Unix timestamp (milliseconds)',
      'rfc2822': 'RFC 2822 format',
      'sql': 'SQL datetime format',
      'filename': 'Filename-safe format',
      'log': 'Log format with milliseconds'
    };
    return descriptions[templateName] || 'Custom format';
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"
      }`}
    >
      <SEO
        title="Date Format Tool - Custom Date Formatting | tsconv.com"
        description="Format dates and timestamps with custom patterns. Choose from 17 predefined templates or create your own date format patterns. Support for ISO, US, EU, and custom formats."
        canonical="https://www.tsconv.com/format"
        ogTitle="Date Format Tool - Custom Date Formatting"
        ogDescription="Format dates and timestamps with custom patterns. Choose from 17 predefined templates or create your own date format patterns. Support for ISO, US, EU, and custom formats."
        keywords="date format, timestamp format, date formatting, custom date format, date patterns, ISO format, date template, time formatting"
      />
      <Header />

      {/* Custom styles for date picker in dark mode */}
      <style dangerouslySetInnerHTML={{
        __html: `
          input[type="date"]::-webkit-calendar-picker-indicator,
          input[type="time"]::-webkit-calendar-picker-indicator {
            filter: ${isDark ? 'invert(1)' : 'none'};
            cursor: pointer;
          }

          /* Enhanced dark mode support */
          ${isDark ? `
            input[type="date"]::-webkit-datetime-edit-fields-wrapper {
              background: transparent;
            }

            input[type="date"]::-webkit-datetime-edit-text,
            input[type="date"]::-webkit-datetime-edit-month-field,
            input[type="date"]::-webkit-datetime-edit-day-field,
            input[type="date"]::-webkit-datetime-edit-year-field {
              color: white;
            }
          ` : ''}
        `
      }} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Palette className="h-8 w-8 text-blue-600" />
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Date Format Tool</h2>
      </div>

      {/* SEO Content */}
      <div className={`mb-8 p-6 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-blue-50'}`}>
        <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Professional Date and Time Formatting
        </h3>
        <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Transform timestamps and dates into any format you need with our comprehensive date formatting tool.
          Choose from 17 predefined templates or create custom patterns using standard formatting tokens.
          Essential for developers, data analysts, and anyone working with timestamp conversion.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className={`font-medium mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Format Options:</h4>
            <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• ISO 8601 standard formats</li>
              <li>• US and European date styles</li>
              <li>• Human-readable formats</li>
              <li>• Custom pattern support</li>
            </ul>
          </div>
          <div>
            <h4 className={`font-medium mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Perfect for:</h4>
            <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• API response formatting</li>
              <li>• Database timestamp conversion</li>
              <li>• Report generation</li>
              <li>• Log file processing</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-6">
          {/* Input Type */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Input Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="timestamp"
                  checked={inputType === 'timestamp'}
                  aria-label="Use timestamp as input"
                  onChange={(e) => setInputType(e.target.value as 'timestamp')}
                  className="mr-2"
                />
                Timestamp
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="date"
                  checked={inputType === 'date'}
                  aria-label="Use date as input"
                  onChange={(e) => setInputType(e.target.value as 'date')}
                  className="mr-2"
                />
                Date
              </label>
            </div>
          </div>

          {/* Input Fields */}
          {inputType === 'timestamp' ? (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Timestamp (Unix seconds)
              </label>
              <input
                type="number"
                  aria-label="Enter number of days"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                placeholder="e.g., 1640995200"
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
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Date
                </label>
                <input
                  type="date"
                  aria-label="Select date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
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
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Time (optional)
                </label>
                <input
                  type="time"
                  aria-label="Select time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
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
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Format Template
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              {templates && Object.keys(templates.templates).map(templateName => (
                <option key={templateName} value={templateName}>
                  {templateName} - {getTemplateDescription(templateName)}
                </option>
              ))}
              <option value="custom">Custom Format</option>
            </select>
            
            {templates && format !== 'custom' && templates.templates[format] && (
              <div className={`mt-2 p-2 rounded text-sm ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <strong>Pattern:</strong> {templates.templates[format]}
              </div>
            )}
          </div>

          {/* Custom Format */}
          {format === 'custom' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Custom Format Pattern
              </label>
              <input
                type="text"
                value={customFormat}
                onChange={(e) => setCustomFormat(e.target.value)}
                placeholder="e.g., YYYY-MM-DD HH:mm:ss"
                  aria-label="Enter custom date format pattern"
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
              <div className="mt-1 text-xs text-gray-500">
                Use YYYY (year), MM (month), DD (day), HH (hour), mm (minute), ss (second)
              </div>
            </div>
          )}

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
              onClick={formatDateTime}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              aria-label="Format date with selected pattern"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Formatting...
                </>
              ) : (
                <>
                  <Type className="h-4 w-4" />
                  Format
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
        <div className="space-y-4" role="region" aria-label="Formatted date results">
          {result && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Formatted Result</h3>
                {result.metadata.cached && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Cached
                  </span>
                )}
              </div>

              {/* Main Result */}
              <div className={`p-4 rounded-lg border ${isDark ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-slate-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Formatted Output:</span>
                  <button
                    onClick={() => copyToClipboard(result.data.output.formatted)}
                    aria-label="Copy result to clipboard"
                    className={`flex items-center gap-1 text-sm transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className={`text-xl font-mono p-3 rounded border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                  {result.data.output.formatted}
                </div>
              </div>

              {/* Template Info */}
              {result.data.template && (
                <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50'}`}>
                  <h4 className="font-medium text-blue-800 mb-2">Template Used:</h4>
                  <div className="text-sm text-blue-700">
                    <div><strong>Name:</strong> {result.data.template.name}</div>
                    <div><strong>Pattern:</strong> {result.data.template.pattern}</div>
                  </div>
                </div>
              )}

              {/* Input Details */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <h4 className="font-medium text-gray-800 mb-2">Input Details:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {result.data.input.timestamp && (
                    <div><strong>Timestamp:</strong> {result.data.input.timestamp}</div>
                  )}
                  {result.data.input.date && (
                    <div><strong>Date:</strong> {result.data.input.date}</div>
                  )}
                  <div><strong>Format:</strong> {result.data.input.format}</div>
                  <div><strong>Original Date:</strong> {new Date(result.data.output.originalDate).toLocaleString()}</div>
                  <div><strong>Processing Time:</strong> {result.metadata.processingTime}</div>
                </div>
              </div>
            </>
          )}

          {!result && !loading && (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <Type className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Enter a timestamp or date and select a format to see the result</p>
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
