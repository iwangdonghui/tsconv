import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import Header from "./Header";
import ApiDocs from "./ApiDocs";
import Guide from "./Guide";
import Footer from "./Footer";
export default function TimestampConverter() {
  const [input, setInput] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});
  const [userTimezone, setUserTimezone] = useState("");
  const [currentPage, setCurrentPage] = useState<'converter' | 'api' | 'guide'>('converter');
  
  const { isDark } = useTheme();

  // 初始化
  useEffect(() => {
    // 检测用户时区
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
    
    // 检查URL哈希
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'api') {
        setCurrentPage('api');
      } else if (hash === 'guide') {
        setCurrentPage('guide');
      } else {
        setCurrentPage('converter');
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // 初始化
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 智能解析输入
  const parseInput = (value: string) => {
    if (!value.trim()) return null;

    const trimmed = value.trim();
    
    // 尝试解析为时间戳（10位或13位数字）
    if (/^\d{10}$/.test(trimmed)) {
      return { type: 'timestamp', value: parseInt(trimmed) * 1000 };
    }
    if (/^\d{13}$/.test(trimmed)) {
      return { type: 'timestamp', value: parseInt(trimmed) };
    }

    // 尝试解析为日期字符串
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return { type: 'date', value: date.getTime() };
    }

    return null;
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // 格式化结果
  const formatResults = () => {
    const parsed = parseInput(input);
    if (!parsed) return null;

    const date = new Date(parsed.value);
    const timestamp = Math.floor(parsed.value / 1000);

    return {
      utcDate: date.toUTCString(),
      localDate: date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }),
      timestamp: timestamp,
      iso8601: date.toISOString(),
      relative: getRelativeTime(date)
    };
  };

  // 获取相对时间
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (Math.abs(diffSec) < 60) return 'just now';
    if (Math.abs(diffMin) < 60) return `${Math.abs(diffMin)} minute${Math.abs(diffMin) !== 1 ? 's' : ''} ${diffMin > 0 ? 'from now' : 'ago'}`;
    if (Math.abs(diffHour) < 24) return `${Math.abs(diffHour)} hour${Math.abs(diffHour) !== 1 ? 's' : ''} ${diffHour > 0 ? 'from now' : 'ago'}`;
    return `${Math.abs(diffDay)} day${Math.abs(diffDay) !== 1 ? 's' : ''} ${diffDay > 0 ? 'from now' : 'ago'}`;
  };

  const results = formatResults();
  const currentTimestamp = Math.floor(currentTime.getTime() / 1000);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
    }`}>
      <Header currentPage={currentPage} />

      {/* Page Content */}
      {currentPage === 'converter' ? (
        <>
          {/* Main Content */}
          <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* Title */}
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-2xl sm:text-4xl font-light mb-4">
                Timestamp conversion, simplified.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Convert Unix timestamps to human-readable dates and vice versa
              </p>
            </div>

            {/* Input */}
            <div className="mb-6 sm:mb-8">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter timestamp or date..."
                className={`w-full text-base sm:text-lg p-3 sm:p-4 border-2 rounded-lg transition-colors focus:outline-none ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 focus:border-blue-500 placeholder-slate-400'
                    : 'bg-white border-slate-200 focus:border-blue-500 placeholder-slate-500'
                }`}
              />
            </div>

            {/* Results */}
            {results && (
              <div className="space-y-4 sm:space-y-6 mb-8">
                {/* Primary Results */}
                <div className="space-y-3 sm:space-y-4">
                  {/* UTC Date */}
                  <div className={`p-3 sm:p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-1`}>
                          Human readable date (UTC)
                        </div>
                        <div className="text-sm sm:text-lg font-mono break-all">
                          {results.utcDate}
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(results.utcDate, 'utc')}
                        className={`flex-shrink-0 p-2 rounded transition-colors ${
                          isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                        }`}
                      >
                        {copiedStates.utc ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Local Date */}
                  <div className={`p-3 sm:p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-1`}>
                          Your timezone: {userTimezone}
                        </div>
                        <div className="text-sm sm:text-lg font-mono break-all">
                          {results.localDate}
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(results.localDate, 'local')}
                        className={`flex-shrink-0 p-2 rounded transition-colors ${
                          isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                        }`}
                      >
                        {copiedStates.local ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Unix Timestamp */}
                  <div className={`p-3 sm:p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-1`}>
                          Unix timestamp (seconds)
                        </div>
                        <div className="text-sm sm:text-lg font-mono break-all">
                          {results.timestamp}
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(results.timestamp.toString(), 'timestamp')}
                        className={`flex-shrink-0 p-2 rounded transition-colors ${
                          isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                        }`}
                      >
                        {copiedStates.timestamp ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Secondary Information */}
                <details className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <summary className="cursor-pointer hover:text-current transition-colors text-sm sm:text-base">
                    More formats
                  </summary>
                  <div className="mt-3 sm:mt-4 space-y-3">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-sm">Relative time:</span>
                      <span className="font-mono text-sm break-all">{results.relative}</span>
                    </div>
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-sm flex-shrink-0">ISO 8601:</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs sm:text-sm break-all">{results.iso8601}</span>
                        <button
                          onClick={() => copyToClipboard(results.iso8601, 'iso')}
                          className={`flex-shrink-0 p-1 rounded transition-colors ${
                            isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                          }`}
                        >
                          {copiedStates.iso ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            )}

            {/* Current Timestamp */}
            <div className="mb-8">
              <div className={`p-4 sm:p-6 rounded-xl border-2 ${
                isDark 
                  ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/30' 
                  : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
              }`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm sm:text-base font-medium mb-2 ${
                      isDark ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      🕐 Current Unix Timestamp
                    </div>
                    <div className={`text-xl sm:text-2xl font-mono font-bold break-all ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {currentTimestamp}
                    </div>
                    <div className={`text-xs sm:text-sm mt-1 ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Updates every second
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(currentTimestamp.toString(), 'current')}
                    className={`flex-shrink-0 p-3 rounded-lg transition-all duration-200 ${
                      isDark 
                        ? 'hover:bg-blue-800/50 bg-blue-900/30 border border-blue-500/30' 
                        : 'hover:bg-blue-100 bg-blue-50 border border-blue-200'
                    }`}
                  >
                    {copiedStates.current ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className={`w-5 h-5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* What is Unix Timestamp */}
            <div className="mb-8">
              <h2 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4">What is a Unix Timestamp?</h2>
              <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed text-sm sm:text-base`}>
                A Unix timestamp is the number of seconds that have elapsed since January 1, 1970, 00:00:00 UTC. 
                It's a simple way to represent time that's widely used in programming and databases.
              </p>
            </div>
          </main>

          <Footer />
        </>
      ) : currentPage === 'api' ? (
        <>
          <div className="flex-1">
            <ApiDocs />
          </div>
          <Footer />
        </>
      ) : (
        <>
          <div className="flex-1">
            <Guide />
          </div>
          <Footer />
        </>
      )}
    </div>
  );
}
