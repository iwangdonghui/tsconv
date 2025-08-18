import { AlertCircle, Clock, Filter, Globe, MapPin, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import Footer from './Footer';
import Header from './Header';
import { SEO } from './SEO';

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

// US State to timezone mapping for better search experience
const US_STATE_TIMEZONES: { [key: string]: string[] } = {
  alabama: ['America/Chicago'],
  alaska: ['America/Anchorage', 'America/Adak'],
  arizona: ['America/Phoenix', 'America/Denver'], // Most of AZ doesn't observe DST
  arkansas: ['America/Chicago'],
  california: ['America/Los_Angeles'],
  colorado: ['America/Denver'],
  connecticut: ['America/New_York'],
  delaware: ['America/New_York'],
  florida: ['America/New_York', 'America/Chicago'], // Eastern and Central
  georgia: ['America/New_York'],
  hawaii: ['Pacific/Honolulu'],
  idaho: ['America/Denver', 'America/Los_Angeles'], // Mountain and Pacific
  illinois: ['America/Chicago'],
  indiana: ['America/New_York', 'America/Chicago'], // Eastern and Central
  iowa: ['America/Chicago'],
  kansas: ['America/Chicago', 'America/Denver'], // Central and Mountain
  kentucky: ['America/New_York', 'America/Chicago'], // Eastern and Central
  louisiana: ['America/Chicago'],
  maine: ['America/New_York'],
  maryland: ['America/New_York'],
  massachusetts: ['America/New_York'],
  michigan: ['America/New_York', 'America/Chicago'], // Eastern and Central
  minnesota: ['America/Chicago'],
  mississippi: ['America/Chicago'],
  missouri: ['America/Chicago'],
  montana: ['America/Denver'],
  nebraska: ['America/Chicago', 'America/Denver'], // Central and Mountain
  nevada: ['America/Los_Angeles', 'America/Denver'], // Pacific and Mountain
  'new hampshire': ['America/New_York'],
  'new jersey': ['America/New_York'],
  'new mexico': ['America/Denver'],
  'new york': ['America/New_York'],
  'north carolina': ['America/New_York'],
  'north dakota': ['America/Chicago', 'America/Denver'], // Central and Mountain
  ohio: ['America/New_York'],
  oklahoma: ['America/Chicago'],
  oregon: ['America/Los_Angeles', 'America/Denver'], // Pacific and Mountain
  pennsylvania: ['America/New_York'],
  'rhode island': ['America/New_York'],
  'south carolina': ['America/New_York'],
  'south dakota': ['America/Chicago', 'America/Denver'], // Central and Mountain
  tennessee: ['America/New_York', 'America/Chicago'], // Eastern and Central
  texas: ['America/Chicago', 'America/Denver'], // Central and Mountain
  utah: ['America/Denver'],
  vermont: ['America/New_York'],
  virginia: ['America/New_York'],
  washington: ['America/Los_Angeles'],
  'west virginia': ['America/New_York'],
  wisconsin: ['America/Chicago'],
  wyoming: ['America/Denver'],
  // Common abbreviations
  ms: ['America/Chicago'], // Mississippi
  ny: ['America/New_York'], // New York
  ca: ['America/Los_Angeles'], // California
  tx: ['America/Chicago'], // Texas
  fl: ['America/New_York'], // Florida
};

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
  // const { t: _t } = useLanguage(); // Currently not used

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

  // Reset dependent filters when parent filter changes
  useEffect(() => {
    if (selectedRegion) {
      // Reset country and offset when region changes
      setSelectedCountry('');
      setSelectedOffset('');
    }
  }, [selectedRegion]);

  useEffect(() => {
    if (selectedCountry) {
      // Reset offset when country changes
      setSelectedOffset('');
    }
  }, [selectedCountry]);

  const loadTimezones = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if search query matches a US state
      let enhancedSearchQuery = searchQuery;
      if (searchQuery && !selectedRegion && !selectedCountry) {
        const lowerQuery = searchQuery.toLowerCase().trim();
        const stateTimezones = US_STATE_TIMEZONES[lowerQuery];

        if (stateTimezones && stateTimezones.length > 0) {
          // If it's a US state, search for its primary timezone
          const primaryTimezone = stateTimezones[0];
          const timezoneParts = primaryTimezone?.split('/');
          if (timezoneParts && timezoneParts.length > 1 && timezoneParts[1]) {
            enhancedSearchQuery = timezoneParts[1]; // e.g., "Chicago" from "America/Chicago"
          }
        }
      }

      const params = new URLSearchParams({
        format,
        limit: '50',
        ...(enhancedSearchQuery && { q: enhancedSearchQuery }),
        ...(selectedRegion && { region: selectedRegion }),
        ...(selectedCountry && { country: selectedCountry }),
        ...(selectedOffset && { offset: selectedOffset }),
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
      // Get current UTC time
      const now = new Date();
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;

      // Calculate timezone time
      const timezoneTime = new Date(utcTime + timezone.offsetMinutes * 60000);

      // Validate the date
      if (isNaN(timezoneTime.getTime())) {
        return 'Invalid time';
      }

      // Format time
      return timezoneTime.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      console.error('Error calculating timezone time:', error);
      return 'N/A';
    }
  };

  // Removed getOffsetColor function as it's no longer used with the new color system

  const getRegionIcon = (region: string): string => {
    const icons: Record<string, string> = {
      America: '🌎',
      Europe: '🌍',
      Asia: '🌏',
      Africa: '🌍',
      Australia: '🇦🇺',
      Pacific: '🌊',
      UTC: '🌐',
    };
    return icons[region] || '🌍';
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
      }`}
    >
      <SEO
        title='Timezone Explorer - World Time Zones | tsconv.com'
        description='Explore world timezones with search and filtering. Find current time in any city or US state. View time in Mississippi, New York, California and more. Real-time world clock with IANA timezone support.'
        canonical='https://www.tsconv.com/timezones'
        ogTitle='Timezone Explorer - World Time Zones'
        ogDescription='Explore world timezones with search and filtering. Find current time in any city or US state. View time in Mississippi, New York, California and more. Real-time world clock with IANA timezone support.'
        keywords='timezone explorer, world timezones, time zones, world clock, timezone search, what time is it in mississippi, what time zone is ms, current time in states, US state timezones, timezone converter, IANA timezones, UTC offset, GMT'
      />
      <Header />

      {/* Custom styles for select elements in dark mode */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          select option {
            background-color: ${isDark ? '#334155' : 'white'};
            color: ${isDark ? 'white' : 'black'};
          }

          select::-webkit-scrollbar {
            width: 8px;
          }

          select::-webkit-scrollbar-track {
            background: ${isDark ? '#1e293b' : '#f1f5f9'};
          }

          select::-webkit-scrollbar-thumb {
            background: ${isDark ? '#475569' : '#cbd5e1'};
            border-radius: 4px;
          }

          /* Custom dropdown arrow for better dark mode visibility */
          select {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${isDark ? 'white' : 'currentColor'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 8px center;
            background-size: 16px;
            padding-right: 32px;
          }

          /* Custom dropdown arrow for dark mode */
          select {
            background-image: ${
              isDark
                ? "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e\")"
                : "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e\")"
            };
            background-repeat: no-repeat;
            background-position: right 8px center;
            background-size: 16px;
            padding-right: 32px;
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
              <Globe className='h-8 w-8 text-white' />
            </div>
            <div>
              <h1
                className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Timezone Explorer
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Explore world timezones with real-time search and filtering
              </p>
            </div>
          </div>

          {/* SEO Content */}
          <div
            className={`mb-8 p-6 rounded-xl border transition-all duration-200 ${
              isDark
                ? 'bg-gradient-to-br from-blue-500/10 to-indigo-600/5 border-blue-500/20'
                : 'bg-gradient-to-br from-blue-50 to-indigo-100/50 border-blue-200'
            }`}
          >
            <div className='flex items-center gap-3 mb-4'>
              <div
                className={`p-2 rounded-lg ${
                  isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                }`}
              >
                <Clock className='h-5 w-5' />
              </div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Explore World Time Zones in Real-Time
              </h2>
            </div>
            <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Navigate through global time zones with our comprehensive timezone explorer. View
              current times across different regions, search by location, and filter by continent,
              country, or UTC offset. Essential for international business, travel planning, and
              global team coordination.
            </p>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <h3
                  className={`font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  <Search className='h-4 w-4' />
                  Features:
                </h3>
                <ul className={`text-sm space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-500 rounded-full'></div>
                    Real-time clock updates
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-blue-500 rounded-full'></div>
                    IANA timezone database
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-purple-500 rounded-full'></div>
                    Advanced filtering options
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-orange-500 rounded-full'></div>
                    Detailed timezone information
                  </li>
                </ul>
              </div>
              <div>
                <h3
                  className={`font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  <MapPin className='h-4 w-4' />
                  Ideal for:
                </h3>
                <ul className={`text-sm space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-red-500 rounded-full'></div>
                    International meeting scheduling
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-yellow-500 rounded-full'></div>
                    Global team coordination
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-teal-500 rounded-full'></div>
                    Travel time planning
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-pink-500 rounded-full'></div>
                    Timestamp conversion reference
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-5 gap-8 min-h-[600px]'>
            {/* Search and Filters */}
            <div className='lg:col-span-2 space-y-6'>
              <div
                className={`p-6 rounded-xl border transition-all duration-200 ${
                  isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50/50 border-gray-200'
                }`}
              >
                <h2
                  className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  Search & Filter
                </h2>

                {/* Quick Presets */}
                <div
                  className={`p-4 rounded-lg border ${
                    isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <h3
                    className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    ⚡ Quick Presets
                  </h3>
                  <div className='grid grid-cols-2 gap-2'>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedRegion('');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      All Timezones
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedRegion('America');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      US Timezones
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedRegion('Europe');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      European Zones
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedRegion('Asia');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      Asian Zones
                    </button>
                  </div>
                </div>

                {/* Popular Cities */}
                <div
                  className={`p-4 rounded-lg border ${
                    isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <h3
                    className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    🏙️ Popular Cities
                  </h3>
                  <div className='grid grid-cols-2 gap-2'>
                    <button
                      onClick={() => {
                        setSearchQuery('New York');
                        setSelectedRegion('');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      New York
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('Los Angeles');
                        setSelectedRegion('');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      Los Angeles
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('Chicago');
                        setSelectedRegion('');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      Chicago
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('London');
                        setSelectedRegion('');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      London
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('Tokyo');
                        setSelectedRegion('');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      Tokyo
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('Sydney');
                        setSelectedRegion('');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      Sydney
                    </button>
                  </div>
                </div>

                {/* US States Quick Access */}
                <div
                  className={`p-4 rounded-lg border ${
                    isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <h3
                    className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    🇺🇸 US States
                  </h3>
                  <div className='grid grid-cols-2 gap-2'>
                    <button
                      onClick={() => {
                        setSearchQuery('Mississippi');
                        setSelectedRegion('');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      Mississippi
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('California');
                        setSelectedRegion('');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      California
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('Texas');
                        setSelectedRegion('');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      Texas
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('Florida');
                        setSelectedRegion('');
                        setSelectedCountry('');
                        setSelectedOffset('');
                      }}
                      className={`px-3 py-2 text-xs rounded-md transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600'
                          : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      Florida
                    </button>
                  </div>
                </div>

                <div className='space-y-4'>
                  {/* Search */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Search Timezones
                    </label>
                    <div className='relative'>
                      <Search
                        className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                      />
                      <input
                        type='text'
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder='Search by name, city, or US state...'
                        aria-label='Search timezones by name or region'
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                    <div className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      💡 Try searching: "Mississippi", "New York", "California", or "MS"
                    </div>
                  </div>

                  {/* Region Filter */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Region
                    </label>
                    <div className='relative'>
                      <Filter
                        className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                      />
                      <select
                        value={selectedRegion}
                        onChange={e => setSelectedRegion(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${isDark ? 'bg-slate-700 border-slate-600 text-white [&>option]:bg-slate-700 [&>option]:text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value=''>All Regions</option>
                        {regions.map(region => (
                          <option key={region} value={region}>
                            {getRegionIcon(region)} {region}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Country Filter */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Country
                    </label>
                    <div className='relative'>
                      <MapPin
                        className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                      />
                      <select
                        value={selectedCountry}
                        onChange={e => setSelectedCountry(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${isDark ? 'bg-slate-700 border-slate-600 text-white [&>option]:bg-slate-700 [&>option]:text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value=''>All Countries</option>
                        {countries.map(country => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Offset Filter */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      UTC Offset
                    </label>
                    <div className='relative'>
                      <Clock
                        className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                      />
                      <select
                        value={selectedOffset}
                        onChange={e => setSelectedOffset(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${isDark ? 'bg-slate-700 border-slate-600 text-white [&>option]:bg-slate-700 [&>option]:text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value=''>All Offsets</option>
                        {offsets.map(offset => (
                          <option key={offset} value={offset}>
                            UTC{offset}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Status */}
              <div
                className={`p-4 rounded-lg border ${
                  isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h3
                  className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Search Status
                </h3>
                <div className='flex items-center gap-2'>
                  {loading ? (
                    <>
                      <Clock
                        className={`h-4 w-4 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                      />
                      <span className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        Searching...
                      </span>
                    </>
                  ) : searchQuery || selectedRegion || selectedCountry || selectedOffset ? (
                    <>
                      <Search
                        className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`}
                      />
                      <span className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        Auto-searching
                      </span>
                    </>
                  ) : (
                    <>
                      <Globe className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Enter search criteria
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* View Options */}
              <div
                className={`p-4 rounded-lg border ${
                  isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h3
                  className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  View Options
                </h3>
                <div className='space-y-3'>
                  <label className='flex items-center'>
                    <input
                      type='radio'
                      value='detailed'
                      checked={format === 'detailed'}
                      onChange={e => setFormat(e.target.value as 'detailed')}
                      className='mr-3'
                    />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Detailed View
                    </span>
                  </label>
                  <label className='flex items-center'>
                    <input
                      type='radio'
                      value='simple'
                      checked={format === 'simple'}
                      onChange={e => setFormat(e.target.value as 'simple')}
                      className='mr-3'
                    />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Simple View
                    </span>
                  </label>
                </div>
                <button
                  onClick={resetFilters}
                  className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm border rounded-lg transition-colors ${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-300 hover:bg-gray-50 text-gray-900'}`}
                >
                  <Filter className='h-4 w-4' />
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Results */}
            <div
              className='lg:col-span-3 space-y-4'
              role='region'
              aria-label='Timezone search results'
            >
              {/* Error Display */}
              {error && (
                <div
                  className={`flex items-center gap-2 p-4 rounded-lg border ${isDark ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}
                  role='alert'
                  aria-live='polite'
                >
                  <AlertCircle className='h-4 w-4 text-red-500' />
                  <span className={`text-sm ${isDark ? 'text-red-200' : 'text-red-700'}`}>
                    {error}
                  </span>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className='text-center py-12'>
                  <Clock
                    className={`h-8 w-8 animate-spin mx-auto mb-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                  />
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Loading timezones...
                  </p>
                </div>
              )}

              {/* Timezone List */}
              {!loading && timezones.length > 0 && (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between mb-4'>
                    <h2
                      className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      Timezones ({timezones.length} shown)
                    </h2>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Current UTC time: {currentTime.toUTCString()}
                    </div>
                  </div>

                  <div
                    className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    role='list'
                    aria-label='Timezone list'
                  >
                    {timezones.map(timezone => {
                      return (
                        <div
                          key={timezone.id}
                          className={`border rounded-xl p-6 transition-all duration-200 hover:shadow-lg cursor-pointer ${
                            isDark
                              ? 'bg-slate-800 border-slate-700 hover:border-slate-600 shadow-slate-900/20 hover:shadow-slate-900/30'
                              : 'bg-white border-gray-200 hover:border-gray-300 shadow-gray-900/5 hover:shadow-gray-900/10'
                          }`}
                          role='listitem'
                          aria-label={`${timezone.name} timezone information`}
                          onClick={() => {
                            // Copy timezone info to clipboard
                            const timezoneInfo = `${timezone.city || timezone.name} (${timezone.id})\nCurrent time: ${getTimeInTimezone(timezone)}\nUTC offset: ${timezone.offset}`;
                            navigator.clipboard.writeText(timezoneInfo);
                          }}
                        >
                          <div className='flex items-start justify-between mb-4'>
                            <div>
                              <h3
                                className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                              >
                                {timezone.city || timezone.name}
                              </h3>
                              <p
                                className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                              >
                                {timezone.id}
                              </p>
                            </div>
                            <div
                              className={`px-2 py-1 rounded-md text-xs font-mono ${
                                isDark ? 'bg-slate-600 text-gray-300' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {timezone.offset}
                            </div>
                          </div>

                          <div className='space-y-3'>
                            <div
                              className={`p-3 rounded-lg border ${
                                isDark
                                  ? 'bg-slate-600/30 border-slate-500'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className='flex items-center gap-2 mb-1'>
                                <Clock
                                  className={`h-4 w-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                                />
                                <span
                                  className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                                >
                                  Current Time
                                </span>
                              </div>
                              <div
                                className={`font-mono text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                              >
                                {getTimeInTimezone(timezone)}
                              </div>
                            </div>

                            {format === 'detailed' && (
                              <div className='space-y-2'>
                                <div className='flex items-center gap-2'>
                                  <MapPin
                                    className={`h-4 w-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                                  />
                                  <span
                                    className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                                  >
                                    {timezone.region} {timezone.country && `• ${timezone.country}`}
                                  </span>
                                </div>

                                <div className='flex items-center gap-2'>
                                  <span
                                    className={`px-2 py-1 rounded-md text-xs font-medium ${
                                      isDark
                                        ? 'bg-purple-500/20 text-purple-300'
                                        : 'bg-purple-100 text-purple-700'
                                    }`}
                                  >
                                    {timezone.abbreviation}
                                  </span>
                                  {timezone.isDST && (
                                    <span
                                      className={`px-2 py-1 rounded-md text-xs font-medium ${
                                        isDark
                                          ? 'bg-yellow-500/20 text-yellow-300'
                                          : 'bg-yellow-100 text-yellow-700'
                                      }`}
                                    >
                                      DST Active
                                    </span>
                                  )}
                                </div>

                                <div className='flex items-center gap-2'>
                                  <span
                                    className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                                  >
                                    UTC{timezone.utcOffset} •{' '}
                                    {timezone.offsetMinutes > 0 ? '+' : ''}
                                    {timezone.offsetMinutes} minutes
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Results */}
              {!loading && timezones.length === 0 && (
                <div
                  className={`text-center py-12 px-6 rounded-xl border-2 border-dashed transition-all duration-200 ${
                    isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-300 bg-gray-50/50'
                  }`}
                >
                  <div
                    className={`p-4 rounded-full mx-auto mb-4 w-fit ${
                      isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <Globe className='h-8 w-8' />
                  </div>
                  <h2
                    className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    No Timezones Found
                  </h2>
                  <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No timezones found matching your search criteria
                  </p>
                  <button
                    onClick={resetFilters}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  >
                    Reset Filters
                  </button>
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
