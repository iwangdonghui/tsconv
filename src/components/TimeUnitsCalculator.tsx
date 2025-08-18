import { AlertCircle, Calculator, CheckCircle, Clock, Copy, TrendingUp } from 'lucide-react';
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

// Time unit definitions with conversion factors to milliseconds
const TIME_UNITS = {
  microseconds: { label: 'Microseconds (μs)', factor: 0.001, symbol: 'μs' },
  milliseconds: { label: 'Milliseconds (ms)', factor: 1, symbol: 'ms' },
  seconds: { label: 'Seconds (s)', factor: 1000, symbol: 's' },
  minutes: { label: 'Minutes (min)', factor: 60000, symbol: 'min' },
  hours: { label: 'Hours (h)', factor: 3600000, symbol: 'h' },
  days: { label: 'Days (d)', factor: 86400000, symbol: 'd' },
  weeks: { label: 'Weeks (w)', factor: 604800000, symbol: 'w' },
  months: { label: 'Months (mo)', factor: 2629746000, symbol: 'mo' }, // Average month
  years: { label: 'Years (y)', factor: 31556952000, symbol: 'y' }, // Average year
} as const;

type TimeUnit = keyof typeof TIME_UNITS;

interface ConversionResult {
  inputValue: number;
  inputUnit: TimeUnit;
  conversions: Record<TimeUnit, number>;
}

export default function TimeUnitsCalculator() {
  const [inputValue, setInputValue] = useState('');
  const [inputUnit, setInputUnit] = useState<TimeUnit>('seconds');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const { isDark } = useTheme();

  // Debounced auto-calculation
  const debouncedCalculate = useCallback(
    debounce(() => {
      if (shouldAutoCalculate()) {
        calculateConversions();
      }
    }, 300),
    [inputValue, inputUnit]
  );

  // Check if we have enough data to auto-calculate
  const shouldAutoCalculate = () => {
    const numValue = parseFloat(inputValue);
    return inputValue !== '' && !isNaN(numValue) && numValue >= 0;
  };

  // Auto-calculate when inputs change
  useEffect(() => {
    debouncedCalculate();
    return () => {
      debouncedCalculate.cancel();
    };
  }, [debouncedCalculate]);

  const calculateConversions = () => {
    const numValue = parseFloat(inputValue);

    if (isNaN(numValue) || numValue < 0) {
      setError('Please enter a valid positive number');
      setResult(null);
      return;
    }

    setError('');

    // Convert input to milliseconds first
    const inputInMs = numValue * TIME_UNITS[inputUnit].factor;

    // Convert to all other units
    const conversions = {} as Record<TimeUnit, number>;

    Object.entries(TIME_UNITS).forEach(([unit, config]) => {
      conversions[unit as TimeUnit] = inputInMs / config.factor;
    });

    setResult({
      inputValue: numValue,
      inputUnit,
      conversions,
    });
  };

  const resetForm = () => {
    setInputValue('');
    setInputUnit('seconds');
    setResult(null);
    setError('');
  };

  const copyResults = async () => {
    if (!result) return;

    const resultText = `Time Unit Conversion Results
Input: ${result.inputValue} ${TIME_UNITS[result.inputUnit].label}

Conversions:
${Object.entries(result.conversions)
  .map(([unit, value]) => {
    const config = TIME_UNITS[unit as TimeUnit];
    const formattedValue =
      value < 0.001
        ? value.toExponential(3)
        : value < 1
          ? value.toFixed(6)
          : value < 1000
            ? value.toFixed(3)
            : value.toLocaleString();
    return `${config.label}: ${formattedValue}`;
  })
  .join('\n')}`;

    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopied(false);
    }
  };

  const formatNumber = (value: number): string => {
    if (value === 0) return '0';
    if (value < 0.001) return value.toExponential(3);
    if (value < 1) return value.toFixed(6);
    if (value < 1000) return value.toFixed(3);
    return value.toLocaleString();
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
      }`}
    >
      <SEO
        title='Time Units Converter - Convert Seconds, Minutes, Hours | tsconv.com'
        description='Convert between time units: microseconds, milliseconds, seconds, minutes, hours, days, weeks, months, years. Instant conversions with precise calculations.'
        canonical='https://www.tsconv.com/time-units'
        ogTitle='Time Units Converter - Convert Seconds, Minutes, Hours'
        ogDescription='Convert between time units: microseconds, milliseconds, seconds, minutes, hours, days, weeks, months, years. Instant conversions with precise calculations.'
        keywords='time units converter, seconds to minutes, milliseconds to seconds, hours to days, time conversion calculator, microseconds, nanoseconds'
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
              <Clock className='h-8 w-8 text-white' />
            </div>
            <div>
              <h1
                className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Time Units Converter
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Convert between all time units instantly
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
                Convert Time Units with Precision
              </h2>
            </div>
            <p className={`mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Our time units converter helps you convert between all common time measurements.
              Whether you need to convert milliseconds to seconds, minutes to hours, or any other
              time unit combination, get instant and accurate results for all your timing needs.
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
                      isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <Calculator className='h-5 w-5' />
                  </div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Conversion Settings
                  </h2>
                </div>

                <fieldset className='space-y-6'>
                  <legend className='sr-only'>Time units conversion settings</legend>

                  {/* Input Value */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Value to Convert
                    </label>
                    <input
                      type='number'
                      aria-label='Enter value to convert'
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      placeholder='e.g., 3600'
                      min='0'
                      step='any'
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 hover:border-slate-500' : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'}`}
                    />
                  </div>

                  {/* Input Unit */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      From Unit
                    </label>
                    <div className='relative'>
                      <select
                        value={inputUnit}
                        aria-label='Select input time unit'
                        onChange={e => setInputUnit(e.target.value as TimeUnit)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer shadow-sm hover:shadow-md ${isDark ? 'bg-slate-700 border-slate-600 text-white hover:border-slate-500' : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'}`}
                      >
                        {Object.entries(TIME_UNITS).map(([unit, config]) => (
                          <option key={unit} value={unit}>
                            {config.label}
                          </option>
                        ))}
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
                      {shouldAutoCalculate() ? (
                        <>
                          <CheckCircle className='h-4 w-4 text-green-500' />
                          <span
                            className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}
                          >
                            Auto-converting
                          </span>
                        </>
                      ) : (
                        <>
                          <Calculator className='h-4 w-4 text-gray-400' />
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Enter value to convert
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
            <div className='lg:col-span-3' role='region' aria-label='Conversion results'>
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
                          Conversion Results
                        </h2>
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
                        aria-label='Copy conversion results'
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

                    {/* Input Summary */}
                    <div
                      className={`p-4 rounded-xl border mb-6 ${isDark ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}`}
                    >
                      <div className='text-center'>
                        <div
                          className={`text-3xl font-bold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                        >
                          {result.inputValue.toLocaleString()}
                        </div>
                        <div
                          className={`text-lg font-semibold ${isDark ? 'text-blue-300' : 'text-blue-800'}`}
                        >
                          {TIME_UNITS[result.inputUnit].label}
                        </div>
                      </div>
                    </div>

                    {/* Conversion Results Grid */}
                    <div className='space-y-4'>
                      <h3
                        className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        <Clock className='h-5 w-5 text-blue-500' />
                        All Conversions
                      </h3>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                        {Object.entries(result.conversions).map(([unit, value]) => {
                          const config = TIME_UNITS[unit as TimeUnit];
                          const isInputUnit = unit === result.inputUnit;

                          return (
                            <div
                              key={unit}
                              className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                isInputUnit
                                  ? isDark
                                    ? 'border-blue-500 bg-blue-900/20'
                                    : 'border-blue-500 bg-blue-50'
                                  : isDark
                                    ? 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                              <div className='flex items-center justify-between'>
                                <div>
                                  <div
                                    className={`text-lg font-bold ${
                                      isInputUnit
                                        ? isDark
                                          ? 'text-blue-400'
                                          : 'text-blue-600'
                                        : isDark
                                          ? 'text-gray-200'
                                          : 'text-gray-800'
                                    }`}
                                  >
                                    {formatNumber(value)}
                                  </div>
                                  <div
                                    className={`text-sm font-medium ${
                                      isInputUnit
                                        ? isDark
                                          ? 'text-blue-300'
                                          : 'text-blue-700'
                                        : isDark
                                          ? 'text-gray-400'
                                          : 'text-gray-600'
                                    }`}
                                  >
                                    {config.label}
                                  </div>
                                </div>
                                <div
                                  className={`text-xs px-2 py-1 rounded-full font-mono ${
                                    isInputUnit
                                      ? isDark
                                        ? 'bg-blue-900/50 text-blue-300'
                                        : 'bg-blue-100 text-blue-700'
                                      : isDark
                                        ? 'bg-slate-600 text-gray-300'
                                        : 'bg-gray-200 text-gray-600'
                                  }`}
                                >
                                  {config.symbol}
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
                      <div
                        className={`p-4 rounded-full mb-4 mx-auto w-fit ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}
                      >
                        <Clock
                          className={`h-12 w-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                        />
                      </div>
                      <h3
                        className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        Enter a Value to Convert
                      </h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Input any positive number and select a time unit to see instant conversions
                        to all other time units.
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
