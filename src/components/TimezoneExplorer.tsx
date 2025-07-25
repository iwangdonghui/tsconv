import React, { useState, useEffect } from 'react';
import { Globe, Search, Filter, Clock, MapPin, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SEO } from './SEO';
import Header from './Header';
import Footer from './Footer';

interface TimezoneInfo {
  id: string;
  name: string;
  abbreviation: string;
  offset: string;
  offsetMinutes: number;
  country: string;
  region: string;
  city: string;
  isDST: boolean;
  utcOffset: string;
}

interface TimezoneResponse {
  success: boolean;
  data: {
    timezones: TimezoneInfo[];
    total: number;
    filtered: number;
    regions?: string[];
    countries?: string[];
    offsets?: string[];
    search?: {
      query: string;
      region: string;
      country: string;
      offset: string;
      limit: number;
    };
  };
  metadata: {
    timestamp: string;
    processingTime: string;
    cached: boolean;
  };
}

export default function TimezoneExplorer() {
  const [timezones, setTimezones] = useState<TimezoneInfo[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [offsets, setOffsets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedOffset, setSelectedOffset] = useState('');
  const [format, setFormat] = useState<'simple' | 'detailed'>('detailed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const { isDark } = useTheme();
  const { t } = useLanguage();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load timezones on component mount
  useEffect(() => {
    loadTimezones();
  }, []);

  // Load timezones when filters change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadTimezones();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedRegion, selectedCountry, selectedOffset, format]);

  const loadTimezones = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        format,
        limit: '50',
        ...(searchQuery && { q: searchQuery }),
        ...(selectedRegion && { region: selectedRegion }),
        ...(selectedCountry && { country: selectedCountry }),
        ...(selectedOffset && { offset: selectedOffset })
      });

      const response = await fetch(`/api/timezones?${params}`);
      const data: TimezoneResponse = await response.json();

      if (data.success) {
        setTimezones(data.data.timezones);
        if (data.data.regions) setRegions(data.data.regions);
        if (data.data.countries) setCountries(data.data.countries);
        if (data.data.offsets) setOffsets(data.data.offsets);
      } else {
        setError('Failed to load timezones');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedRegion('');
    setSelectedCountry('');
    setSelectedOffset('');
  };

  const getTimeInTimezone = (timezone: TimezoneInfo): string => {
    try {
      // Simple calculation (in real app, use proper timezone library)
      const utcTime = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000);
      const timezoneTime = new Date(utcTime + (timezone.offsetMinutes * 60000));
      return timezoneTime.toLocaleTimeString();
    } catch {
      return 'N/A';
    }
  };

  const getOffsetColor = (offset: string): string => {
    const hour = parseInt(offset.split(':')[0]);
    if (hour < 0) return 'text-blue-600';
    if (hour > 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getRegionIcon = (region: string): string => {
    const icons: Record<string, string> = {
      'America': '🌎',
      'Europe': '🌍',
      'Asia': '🌏',
      'Africa': '🌍',
      'Australia': '🇦🇺',
      'Pacific': '🌊',
      'UTC': '🌐'
    };
    return icons[region] || '🌍';
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"
      }`}
    >
      <SEO
        title="Timezone Explorer - World Time Zones | tsconv.com"
        description="Explore world timezones with search and filtering. View current time in different timezones and get detailed timezone information."
        canonical="https://tsconv.com/timezones"
        ogTitle="Timezone Explorer - World Time Zones"
        ogDescription="Explore world timezones with search and filtering. View current time in different timezones and get detailed timezone information."
        keywords="timezone explorer, world timezones, time zones, world clock, timezone search, timezone converter"
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="h-8 w-8 text-emerald-600" />
        <h2 className="text-2xl font-bold text-gray-900">Timezone Explorer</h2>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timezones..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Region Filter */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">All Regions</option>
            {regions.map(region => (
              <option key={region} value={region}>
                {getRegionIcon(region)} {region}
              </option>
            ))}
          </select>

          {/* Country Filter */}
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">All Countries</option>
            {countries.map(country => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          {/* Offset Filter */}
          <select
            value={selectedOffset}
            onChange={(e) => setSelectedOffset(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">All Offsets</option>
            {offsets.map(offset => (
              <option key={offset} value={offset}>
                UTC{offset}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="detailed"
                checked={format === 'detailed'}
                onChange={(e) => setFormat(e.target.value as 'detailed')}
                className="mr-2"
              />
              Detailed View
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="simple"
                checked={format === 'simple'}
                onChange={(e) => setFormat(e.target.value as 'simple')}
                className="mr-2"
              />
              Simple View
            </label>
          </div>

          <button
            onClick={resetFilters}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <Filter className="h-4 w-4" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md mb-6">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-emerald-600" />
          <p className="text-gray-600">Loading timezones...</p>
        </div>
      )}

      {/* Timezone List */}
      {!loading && timezones.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Timezones ({timezones.length} shown)
            </h3>
            <div className="text-sm text-gray-600">
              Current UTC time: {currentTime.toUTCString()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timezones.map((timezone) => (
              <div
                key={timezone.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getRegionIcon(timezone.region)}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{timezone.city || timezone.name}</h4>
                      <p className="text-sm text-gray-600">{timezone.id}</p>
                    </div>
                  </div>
                  <div className={`text-sm font-mono ${getOffsetColor(timezone.offset)}`}>
                    {timezone.offset}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="font-mono text-lg">
                      {getTimeInTimezone(timezone)}
                    </span>
                  </div>

                  {format === 'detailed' && (
                    <>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {timezone.region} {timezone.country && `• ${timezone.country}`}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{timezone.abbreviation}</span>
                        {timezone.isDST && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            DST
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-500">
                        {timezone.utcOffset} • {timezone.offsetMinutes > 0 ? '+' : ''}{timezone.offsetMinutes} minutes
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && timezones.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No timezones found matching your criteria</p>
          <button
            onClick={resetFilters}
            className="mt-2 text-emerald-600 hover:text-emerald-800"
          >
            Reset filters to see all timezones
          </button>
        </div>
      )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
