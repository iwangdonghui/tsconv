import { useState, useEffect, useRef } from "react";
import { Copy, Check, X, Clock } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useHistory, type HistoryItem } from "../hooks/useHistory";
import { useInputValidation } from "../hooks/useInputValidation";
import { SEO } from "./SEO";
import Header from "./Header";
import Footer from "./Footer";
import { HistoryPanel } from "./HistoryPanel";
import { ValidationIndicator } from "./ui/validation-indicator";
import { ErrorMessage } from "./ui/error-message";
import { RecoverySuggestions } from "./ui/recovery-suggestions";

export default function TimestampConverter() {
  const [input, setInput] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [userTimezone, setUserTimezone] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [batchInput, setBatchInput] = useState("");
  const [showBatchConverter, setShowBatchConverter] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [manualDate, setManualDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
    second: new Date().getSeconds(),
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { history, addToHistory, clearHistory } = useHistory();
  const {
    validationResult,
    validateInput: validateMainInput,
    validationState,
    isValidating,
    clearValidation: clearMainValidation,
  } = useInputValidation({
    debounceMs: 300,
    enableCache: true,
  });
  const {
    validationResult: manualDateValidation,
    validateInput: validateManualDateInput,
    resetValidation: resetManualValidation,
  } = useInputValidation({
    debounceMs: 100,
    validator: () => {
      const date = new Date(
        manualDate.year,
        manualDate.month - 1,
        manualDate.day,
        manualDate.hour,
        manualDate.minute,
        manualDate.second
      );
      if (isNaN(date.getTime())) {
        return {
          isValid: false,
          errorType: "syntax" as const,
          message: "Invalid manual date configuration",
          severity: "error" as const,
          suggestions: [
            "Check if the date exists",
            "Verify month has correct number of days",
            "Ensure all values are within valid ranges",
          ],
        };
      }
      if (date.getFullYear() < 1970) {
        return {
          isValid: false,
          errorType: "range" as const,
          message: "Year must be 1970 or later",
          severity: "error" as const,
          suggestions: [
            "Unix timestamps start from January 1970",
            "Use a year of 1970 or later",
          ],
        };
      }
      return {
        isValid: true,
        errorType: undefined,
        message: "Valid date configuration",
        severity: "info" as const,
      };
    },
  });

  // Add keyboard shortcuts
  useKeyboardShortcuts({
    onFocusInput: () => inputRef.current?.focus(),
    onConvert: () => {
      // No separate convert function needed, input change triggers formatResults
      if (input.trim()) {
        inputRef.current?.focus();
      }
    },
    onCopy: () => {
      if (results) {
        navigator.clipboard.writeText(
          results.utcDate || results.timestamp?.toString() || ""
        );
      }
    },
    onClear: () => {
      setInput("");
      clearMainValidation();
      inputRef.current?.focus();
    },
  });

  // 初始化
  useEffect(() => {
    // 检测用户时区
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);

    // 设置 canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute("href", "https://tsconv.com/");
    } else {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      canonical.setAttribute("href", "https://tsconv.com/");
      document.head.appendChild(canonical);
    }
  }, []);

  // 更新当前时间
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // 智能解析输入
  const parseInput = (
    value: string
  ): { type: "timestamp" | "date"; value: number } | null => {
    if (!value.trim()) return null;

    const trimmed = value.trim();

    // 移除可能的逗号分隔符
    const cleanedNumber = trimmed.replace(/,/g, "");

    // 尝试解析为时间戳
    if (/^\d+$/.test(cleanedNumber)) {
      const num = parseInt(cleanedNumber);

      // 10位时间戳 (2001-2286年): 1000000000 - 9999999999
      if (num >= 1000000000 && num <= 9999999999) {
        return { type: "timestamp" as const, value: num * 1000 };
      }

      // 13位时间戳 (毫秒): 1000000000000 - 9999999999999
      if (num >= 1000000000000 && num <= 9999999999999) {
        return { type: "timestamp" as const, value: num };
      }

      // 9位时间戳 (1973-2001年): 100000000 - 999999999
      if (num >= 100000000 && num <= 999999999) {
        return { type: "timestamp" as const, value: num * 1000 };
      }
    }

    // 尝试解析为日期字符串
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return { type: "date" as const, value: date.getTime() };
    }

    return null;
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // 格式化结果
  const formatResults = () => {
    const parsed = parseInput(input);
    if (!parsed) return null;

    const date = new Date(parsed.value);
    const timestamp = Math.floor(parsed.value / 1000);

    const result = {
      utcDate: date.toUTCString(),
      localDate: date.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      }),
      timestamp: timestamp,
      iso8601: date.toISOString(),
      relative: getRelativeTime(date),
    };

    return result;
  };

  // Save to history when input changes and produces valid results
  useEffect(() => {
    if (!input.trim()) return;

    const timeoutId = setTimeout(() => {
      const parsed = parseInput(input);
      if (parsed) {
        // 检查是否是完整的时间戳（9位、10位或13位）或有效日期
        const trimmed = input.trim();
        const cleanedNumber = trimmed.replace(/,/g, "");
        let isCompleteTimestamp = false;

        if (/^\d+$/.test(cleanedNumber)) {
          const num = parseInt(cleanedNumber);
          isCompleteTimestamp =
            (num >= 100000000 && num <= 9999999999) ||
            (num >= 1000000000000 && num <= 9999999999999);
        }

        const isValidDate =
          !isCompleteTimestamp && !isNaN(new Date(trimmed).getTime());

        if (isCompleteTimestamp || isValidDate) {
          const date = new Date(parsed.value);
          const timestamp = Math.floor(parsed.value / 1000);
          const output =
            parsed.type === "timestamp"
              ? date.toUTCString()
              : timestamp.toString();
          addToHistory(input.trim(), output, parsed.type);
        }
      }
    }, 800); // 800ms 防抖，给用户足够时间输入

    return () => clearTimeout(timeoutId);
  }, [input, addToHistory]);

  // 获取相对时间
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (Math.abs(diffSec) < 60) return "just now";
    if (Math.abs(diffMin) < 60)
      return `${Math.abs(diffMin)} minute${
        Math.abs(diffMin) !== 1 ? "s" : ""
      } ${diffMin > 0 ? "from now" : "ago"}`;
    if (Math.abs(diffHour) < 24)
      return `${Math.abs(diffHour)} hour${
        Math.abs(diffHour) !== 1 ? "s" : ""
      } ${diffHour > 0 ? "from now" : "ago"}`;
    return `${Math.abs(diffDay)} day${Math.abs(diffDay) !== 1 ? "s" : ""} ${
      diffDay > 0 ? "from now" : "ago"
    }`;
  };

  // 批量转换功能
  const processBatchConversion = () => {
    const lines = batchInput
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    const results = lines.map((line) => {
      const trimmed = line.trim();
      const parsed = parseInput(trimmed);
      if (!parsed) return `${trimmed} → Invalid format`;

      const date = new Date(parsed.value);
      if (parsed.type === "timestamp") {
        return `${trimmed} → ${date.toISOString()} (${date.toLocaleString()})`;
      } else {
        return `${trimmed} → ${Math.floor(parsed.value / 1000)}`;
      }
    });
    return results.join("\n");
  };

  // 手动日期转换
  const getManualTimestamp = () => {
    const date = new Date(
      manualDate.year,
      manualDate.month - 1,
      manualDate.day,
      manualDate.hour,
      manualDate.minute,
      manualDate.second
    );
    return Math.floor(date.getTime() / 1000);
  };

  const updateManualDate = (field: string, value: number) => {
    setManualDate((prev) => ({ ...prev, [field]: value }));
    setTimeout(() => validateManualDateInput(""), 0);
  };

  useEffect(() => {
    validateManualDateInput("");
  }, [manualDate, validateManualDateInput]);

  const results = formatResults();
  const currentTimestamp = Math.floor(currentTime.getTime() / 1000);

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"
      }`}
    >
      <SEO
        title="Timestamp Converter - Unix & Epoch Time | tsconv.com"
        description="Convert Unix timestamps to human-readable dates and vice versa. Fast, simple, and accurate timestamp conversion tool with real-time results."
        canonical="https://tsconv.com/"
        ogTitle="Timestamp Converter - Unix & Epoch Time"
        ogDescription="Convert Unix timestamps to human-readable dates and vice versa. Fast, simple, and accurate timestamp conversion tool with real-time results."
        keywords="timestamp converter, unix timestamp, epoch time, date converter, time conversion, unix time"
      />
      <Header />
      {/* 转换器主要内容 */}
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Timestamp Converter
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Convert Unix timestamps to human-readable dates and vice versa
          </p>
        </div>

        {/* Input */}
        <div className="mb-6 sm:mb-8">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                validateMainInput(e.target.value);
              }}
              placeholder={t("converter.placeholder")}
              className={`w-full p-4 sm:p-6 text-base sm:text-lg border-2 rounded-xl transition-all duration-200 pr-24 ${
                isDark
                  ? "bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500"
                  : "bg-white border-slate-300 placeholder-slate-500 focus:border-blue-500"
              } ${
                validationState === "invalid"
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : ""
              }
              ${
                validationState === "valid"
                  ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
                  : ""
              }
              ${
                isValidating ? "border-blue-500" : ""
              } focus:outline-none focus:ring-4`}
              aria-invalid={
                validationState === "invalid" || validationState === "warning"
              }
              aria-describedby={
                validationResult ? "input-validation-feedback" : undefined
              }
              aria-busy={isValidating}
              role="combobox"
              aria-expanded={showHistory}
            />
            <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              <ValidationIndicator
                state={validationState}
                size="md"
                animated={true}
              />

              {/* History Button */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? "hover:bg-slate-700 text-slate-400"
                    : "hover:bg-slate-100 text-slate-500"
                }`}
                title="Show history"
                aria-label="Show conversion history"
              >
                <Clock className="w-5 h-5" />
              </button>

              {/* Clear Button */}
              {input && (
                <button
                  onClick={() => setInput("")}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark
                      ? "hover:bg-slate-700 text-slate-400"
                      : "hover:bg-slate-100 text-slate-500"
                  }`}
                  aria-label="Clear input"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* History Panel */}
            <HistoryPanel
              history={history}
              onSelectItem={(value: string) => setInput(value)}
              onClear={clearHistory}
              isOpen={showHistory}
              onClose={() => setShowHistory(false)}
            />
          </div>
        </div>

        {/* Validation Feedback */}
        {validationResult && validationResult.severity === "error" && (
          <div
            id="input-validation-feedback"
            className="mt-2 space-y-2"
            role="alert"
            aria-live="polite"
          >
            <ErrorMessage result={validationResult} />
            <RecoverySuggestions result={validationResult} />
          </div>
        )}

        {validationResult && validationResult.severity === "warning" && (
          <div
            id="input-validation-feedback"
            className="mt-2 space-y-2"
            role="alert"
            aria-live="polite"
          >
            <ErrorMessage result={validationResult} />
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4 sm:space-y-6 mb-8">
            {/* Primary Results */}
            <div className="space-y-3 sm:space-y-4">
              {/* UTC Date */}
              <div
                className={`p-3 sm:p-4 rounded-lg ${
                  isDark ? "bg-slate-800" : "bg-slate-50"
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs sm:text-sm ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      } mb-1`}
                    >
                      Human readable date (UTC)
                    </div>
                    <div className="text-sm sm:text-lg font-mono break-all">
                      {results.utcDate}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(results.utcDate, "utc")}
                    className={`flex-shrink-0 p-2 rounded transition-colors ${
                      isDark ? "hover:bg-slate-700" : "hover:bg-slate-200"
                    }`}
                    aria-label="Copy UTC date"
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
              <div
                className={`p-3 sm:p-4 rounded-lg ${
                  isDark ? "bg-slate-800" : "bg-slate-50"
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs sm:text-sm ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      } mb-1`}
                    >
                      Your timezone: {userTimezone}
                    </div>
                    <div className="text-sm sm:text-lg font-mono break-all">
                      {results.localDate}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(results.localDate, "local")}
                    className={`flex-shrink-0 p-2 rounded transition-colors ${
                      isDark ? "hover:bg-slate-700" : "hover:bg-slate-200"
                    }`}
                    aria-label="Copy local date"
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
              <div
                className={`p-3 sm:p-4 rounded-lg ${
                  isDark ? "bg-slate-800" : "bg-slate-50"
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs sm:text-sm ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      } mb-1`}
                    >
                      Unix timestamp (seconds)
                    </div>
                    <div className="text-sm sm:text-lg font-mono break-all">
                      {results.timestamp}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(results.timestamp.toString(), "timestamp")
                    }
                    className={`flex-shrink-0 p-2 rounded transition-colors ${
                      isDark ? "hover:bg-slate-700" : "hover:bg-slate-200"
                    }`}
                    aria-label="Copy timestamp"
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
            <details
              className={`${isDark ? "text-slate-400" : "text-slate-600"}`}
            >
              <summary className="cursor-pointer hover:text-current transition-colors text-sm sm:text-base">
                More formats
              </summary>
              <div className="mt-3 sm:mt-4 space-y-3">
                <div className="flex justify-between items-center gap-3">
                  <span className="text-sm">Relative time:</span>
                  <span className="font-mono text-sm break-all">
                    {results.relative}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3">
                  <span className="text-sm flex-shrink-0">ISO 8601:</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs sm:text-sm break-all">
                      {results.iso8601}
                    </span>
                    <button
                      onClick={() => copyToClipboard(results.iso8601, "iso")}
                      className={`flex-shrink-0 p-1 rounded transition-colors ${
                        isDark ? "hover:bg-slate-700" : "hover:bg-slate-200"
                      }`}
                      aria-label="Copy ISO 8601 date"
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
          <div
            className={`p-4 sm:p-6 rounded-xl border-2 ${
              isDark
                ? "bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/30"
                : "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
            }`}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm sm:text-base font-medium mb-2 ${
                    isDark ? "text-blue-300" : "text-blue-700"
                  }`}
                >
                  {t("current.title")}
                </div>
                <div
                  className={`text-xl sm:text-2xl font-mono font-bold break-all ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {currentTimestamp}
                </div>
                <div
                  className={`text-xs sm:text-sm mt-1 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {isPaused ? t("current.paused") : t("current.updates")}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`flex-shrink-0 p-3 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "hover:bg-blue-800/50 bg-blue-900/30 border border-blue-500/30"
                      : "hover:bg-blue-100 bg-blue-50 border border-blue-200"
                  }`}
                  title={isPaused ? t("current.resume") : t("current.pause")}
                >
                  {isPaused ? (
                    <svg
                      className={`w-5 h-5 ${
                        isDark ? "text-blue-300" : "text-blue-600"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className={`w-5 h-5 ${
                        isDark ? "text-blue-300" : "text-blue-600"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() =>
                    copyToClipboard(currentTimestamp.toString(), "current")
                  }
                  className={`flex-shrink-0 p-3 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "hover:bg-blue-800/50 bg-blue-900/30 border border-blue-500/30"
                      : "hover:bg-blue-100 bg-blue-50 border border-blue-200"
                  }`}
                >
                  {copiedStates.current ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy
                      className={`w-5 h-5 ${
                        isDark ? "text-blue-300" : "text-blue-600"
                      }`}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Date & Time section */}
        <div className="mb-8">
          <div
            className={`p-4 sm:p-6 rounded-xl border ${
              isDark
                ? "bg-slate-800 border-slate-700"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <h2 className="text-lg font-medium mb-4">{t("manual.title")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              <div>
                <label
                  htmlFor="manual-year"
                  className={`block text-xs mb-1 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {t("manual.year")}
                </label>
                <input
                  id="manual-year"
                  type="number"
                  value={manualDate.year}
                  onChange={(e) =>
                    updateManualDate(
                      "year",
                      parseInt(e.target.value) || new Date().getFullYear()
                    )
                  }
                  className={`w-full p-2 text-sm border rounded ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white"
                      : "bg-white border-slate-300"
                  } ${
                    manualDateValidation?.severity === "error"
                      ? "border-red-500"
                      : ""
                  }
                  ${
                    manualDateValidation?.severity === "info"
                      ? "border-green-500"
                      : ""
                  }`}
                  aria-invalid={
                    manualDateValidation?.severity === "error" ||
                    manualDateValidation?.severity === "warning"
                  }
                  aria-describedby={
                    manualDateValidation ? "manual-date-validation" : undefined
                  }
                  min="1970"
                  max="3000"
                  step="1"
                />
              </div>
              <div>
                <label
                  htmlFor="manual-month"
                  className={`block text-xs mb-1 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {t("manual.month")}
                </label>
                <input
                  id="manual-month"
                  type="number"
                  min="1"
                  max="12"
                  value={manualDate.month}
                  onChange={(e) =>
                    updateManualDate(
                      "month",
                      Math.max(1, Math.min(12, parseInt(e.target.value) || 1))
                    )
                  }
                  className={`w-full p-2 text-sm border rounded ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white"
                      : "bg-white border-slate-300"
                  }`}
                  aria-describedby={
                    manualDateValidation ? "manual-date-validation" : undefined
                  }
                  aria-invalid={
                    manualDateValidation?.severity === "error" ||
                    manualDateValidation?.severity === "warning"
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="manual-day"
                  className={`block text-xs mb-1 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {t("manual.day")}
                </label>
                <input
                  id="manual-day"
                  type="number"
                  min="1"
                  max="31"
                  value={manualDate.day}
                  onChange={(e) =>
                    updateManualDate(
                      "day",
                      Math.max(1, Math.min(31, parseInt(e.target.value) || 1))
                    )
                  }
                  className={`w-full p-2 text-sm border rounded ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white"
                      : "bg-white border-slate-300"
                  }`}
                />
              </div>
              <div>
                <label
                  htmlFor="manual-hour"
                  className={`block text-xs mb-1 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {t("manual.hour")}
                </label>
                <input
                  id="manual-hour"
                  type="number"
                  min="0"
                  max="23"
                  value={manualDate.hour}
                  onChange={(e) =>
                    updateManualDate(
                      "hour",
                      Math.max(0, Math.min(23, parseInt(e.target.value) || 0))
                    )
                  }
                  className={`w-full p-2 text-sm border rounded ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white"
                      : "bg-white border-slate-300"
                  }`}
                />
              </div>
              <div>
                <label
                  htmlFor="manual-minute"
                  className={`block text-xs mb-1 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {t("manual.minute")}
                </label>
                <input
                  id="manual-minute"
                  type="number"
                  min="0"
                  max="59"
                  value={manualDate.minute}
                  onChange={(e) =>
                    updateManualDate(
                      "minute",
                      Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                    )
                  }
                  className={`w-full p-2 text-sm border rounded ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white"
                      : "bg-white border-slate-300"
                  }`}
                />
              </div>
              <div>
                <label
                  htmlFor="manual-second"
                  className={`block text-xs mb-1 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {t("manual.second")}
                </label>
                <input
                  id="manual-second"
                  type="number"
                  min="0"
                  max="59"
                  value={manualDate.second}
                  onChange={(e) =>
                    updateManualDate(
                      "second",
                      Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                    )
                  }
                  className={`w-full p-2 text-sm border rounded ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white"
                      : "bg-white border-slate-300"
                  }`}
                />
              </div>
            </div>
            <div>
              <ValidationIndicator
                state={
                  manualDateValidation?.severity === "error"
                    ? "invalid"
                    : manualDateValidation?.severity === "info"
                    ? "valid"
                    : "idle"
                }
                size="sm"
                animated={true}
              />
            </div>

            {manualDateValidation &&
              manualDateValidation.severity === "error" && (
                <div className="mt-2 space-y-2" role="alert" aria-live="polite">
                  <ErrorMessage result={manualDateValidation} />
                </div>
              )}

            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                  {t("manual.timestamp")}:
                </span>
                <span className="font-mono font-bold">
                  {getManualTimestamp()}
                </span>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(getManualTimestamp().toString(), "manual")
                }
                className={`p-2 rounded transition-colors ${
                  isDark ? "hover:bg-slate-700" : "hover:bg-slate-200"
                }`}
                aria-label="Copy manual timestamp"
              >
                {copiedStates.manual ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Batch Converter */}
        <div className="mb-8">
          <button
            onClick={() => setShowBatchConverter(!showBatchConverter)}
            className={`w-full p-4 rounded-lg border-2 border-dashed transition-colors ${
              isDark
                ? "border-slate-600 hover:border-slate-500 hover:bg-slate-800/50"
                : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>{t("batch.title")}</span>
            </div>
          </button>

          {showBatchConverter && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                isDark
                  ? "bg-slate-800 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <h2 className="text-lg font-medium mb-3">{t("batch.title")}</h2>
              <label
                htmlFor="batch-input"
                className={`text-sm mb-3 block ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {t("batch.description")}
              </label>
              <textarea
                id="batch-input"
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder="1640995200&#10;2022-01-01&#10;1672531200"
                rows={4}
                className={`w-full p-3 border rounded-lg text-sm font-mono ${
                  isDark
                    ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    : "bg-white border-slate-300 placeholder-slate-500"
                }`}
              />
              {batchInput.trim() && (
                <div className="mt-3">
                  <h3 className="font-medium mb-2">Results:</h3>
                  <pre
                    className={`p-3 rounded text-xs font-mono whitespace-pre-wrap ${
                      isDark
                        ? "bg-slate-900 text-slate-300"
                        : "bg-white text-slate-700"
                    }`}
                  >
                    {processBatchConversion()}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(processBatchConversion(), "batch")
                    }
                    className={`mt-2 px-3 py-1 text-sm rounded transition-colors ${
                      isDark
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                    aria-label="Copy batch results"
                  >
                    {copiedStates.batch ? "Copied!" : "Copy Results"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* What is Unix Timestamp */}
        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4">
            {t("unix.what.title")}
          </h2>
          <p
            className={`${
              isDark ? "text-slate-400" : "text-slate-600"
            } leading-relaxed text-sm sm:text-base`}
          >
            {t("unix.what.description")}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
