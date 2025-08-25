var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-ZnJwIg/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/pages-IqqQDz/functionsWorker-0.945890114993989.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var urls2 = /* @__PURE__ */ new Set();
function checkURL2(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls2.has(url.toString())) {
      urls2.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL2, "checkURL");
__name2(checkURL2, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL2(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});
var onRequestOptions = /* @__PURE__ */ __name2(async () => {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}, "onRequestOptions");
var FORMAT_TEMPLATES = {
  iso: "YYYY-MM-DDTHH:mm:ss.sssZ",
  "iso-date": "YYYY-MM-DD",
  "iso-time": "HH:mm:ss",
  "us-date": "MM/DD/YYYY",
  "us-datetime": "MM/DD/YYYY HH:mm:ss",
  "eu-date": "DD/MM/YYYY",
  "eu-datetime": "DD/MM/YYYY HH:mm:ss",
  readable: "MMMM Do, YYYY",
  "readable-full": "dddd, MMMM Do, YYYY [at] h:mm A",
  compact: "YYYYMMDD",
  "compact-time": "YYYYMMDDHHmmss",
  unix: "X",
  "unix-ms": "x",
  rfc2822: "ddd, DD MMM YYYY HH:mm:ss ZZ",
  // Enhanced SQL formats for different databases and use cases
  sql: "YYYY-MM-DD HH:mm:ss",
  // Standard SQL DATETIME
  "sql-date": "YYYY-MM-DD",
  // SQL DATE format
  "sql-time": "HH:mm:ss",
  // SQL TIME format
  "sql-timestamp": "YYYY-MM-DD HH:mm:ss.SSS",
  // SQL TIMESTAMP with milliseconds
  "sql-mysql": "YYYY-MM-DD HH:mm:ss",
  // MySQL DATETIME format
  "sql-postgresql": "YYYY-MM-DD HH:mm:ss.SSS",
  // PostgreSQL TIMESTAMP format
  "sql-sqlserver": "YYYY-MM-DD HH:mm:ss.SSS",
  // SQL Server DATETIME2 format
  "sql-oracle": "DD-MMM-YYYY HH:mm:ss",
  // Oracle DATE format
  "sql-sqlite": "YYYY-MM-DD HH:mm:ss",
  // SQLite DATETIME format
  "sql-iso": "YYYY-MM-DDTHH:mm:ss",
  // SQL ISO format (without timezone)
  "sql-utc": "YYYY-MM-DD HH:mm:ss [UTC]",
  // SQL with UTC indicator
  filename: "YYYY-MM-DD_HH-mm-ss",
  log: "YYYY-MM-DD HH:mm:ss.SSS"
};
var onRequestGet = /* @__PURE__ */ __name2(async () => {
  const body = {
    success: true,
    data: { templates: FORMAT_TEMPLATES },
    metadata: { timestamp: (/* @__PURE__ */ new Date()).toISOString(), cached: false }
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}, "onRequestGet");
function calculateDateDifference(start, end, absolute = false) {
  let s = new Date(start), e = new Date(end);
  if (absolute && s > e) [s, e] = [e, s];
  const diffMs = e.getTime() - s.getTime();
  const isNeg = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const seconds = Math.floor(absMs / 1e3);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(days / 365.25);
  const parts = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
  if (months % 12 > 0) parts.push(`${months % 12} month${months % 12 !== 1 ? "s" : ""}`);
  if (days % 30 > 0)
    parts.push(`${Math.floor(days % 30)} day${Math.floor(days % 30) !== 1 ? "s" : ""}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 !== 1 ? "s" : ""}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 !== 1 ? "s" : ""}`);
  let humanReadable = parts.length > 0 ? parts.join(", ") : "0 seconds";
  if (isNeg && !absolute) humanReadable = `${humanReadable} ago`;
  return {
    milliseconds: absolute ? absMs : diffMs,
    seconds: absolute ? seconds : isNeg ? -seconds : seconds,
    minutes: absolute ? minutes : isNeg ? -minutes : minutes,
    hours: absolute ? hours : isNeg ? -hours : hours,
    days: absolute ? days : isNeg ? -days : days,
    weeks: absolute ? weeks : isNeg ? -weeks : weeks,
    months: absolute ? months : isNeg ? -months : months,
    years: absolute ? years : isNeg ? -years : years,
    humanReadable,
    isNegative: !absolute && isNeg,
    direction: isNeg ? "past" : "future"
  };
}
__name(calculateDateDifference, "calculateDateDifference");
__name2(calculateDateDifference, "calculateDateDifference");
function formatNumber(num) {
  return new Intl.NumberFormat().format(Math.abs(num));
}
__name(formatNumber, "formatNumber");
__name2(formatNumber, "formatNumber");
var onRequestOptions2 = /* @__PURE__ */ __name2(async () => new Response(null, {
  status: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
}), "onRequestOptions");
var onRequestGet2 = /* @__PURE__ */ __name2(async ({ request }) => {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const startTime = url.searchParams.get("startTime");
  const endTime = url.searchParams.get("endTime");
  const includeTime = url.searchParams.get("includeTime") === "true";
  const absolute = url.searchParams.get("absolute") === "true";
  if (!startDate || !endDate)
    return new Response(
      JSON.stringify({ success: false, error: "Both start date and end date are required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      }
    );
  let start, end;
  if (includeTime && startTime && endTime) {
    start = /* @__PURE__ */ new Date(`${startDate}T${startTime}`);
    end = /* @__PURE__ */ new Date(`${endDate}T${endTime}`);
  } else {
    start = new Date(startDate);
    end = new Date(endDate);
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return new Response(JSON.stringify({ success: false, error: "Invalid date format" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  const difference = calculateDateDifference(start, end, absolute);
  const result = {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    includeTime,
    absolute,
    difference,
    formatted: {
      years: formatNumber(difference.years),
      months: formatNumber(difference.months),
      weeks: formatNumber(difference.weeks),
      days: formatNumber(difference.days),
      hours: formatNumber(difference.hours),
      minutes: formatNumber(difference.minutes),
      seconds: formatNumber(difference.seconds)
    }
  };
  return new Response(
    JSON.stringify({
      success: true,
      data: result,
      metadata: { timestamp: (/* @__PURE__ */ new Date()).toISOString(), cached: false }
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    }
  );
}, "onRequestGet");
function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
__name(getOrdinalSuffix, "getOrdinalSuffix");
__name2(getOrdinalSuffix, "getOrdinalSuffix");
var monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var monthNamesShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function formatDate(date2, format) {
  const year = date2.getFullYear();
  const month = date2.getMonth() + 1;
  const day = date2.getDate();
  const hours = date2.getHours();
  const minutes = date2.getMinutes();
  const seconds = date2.getSeconds();
  const milliseconds = date2.getMilliseconds();
  if (format === "X") return Math.floor(date2.getTime() / 1e3).toString();
  if (format === "x") return date2.getTime().toString();
  let result = format.replace(/YYYY/g, year.toString()).replace(/YY/g, year.toString().slice(-2)).replace(/MMMM/g, monthNames[month - 1] || "").replace(/MMM/g, monthNamesShort[month - 1] || "").replace(/MM/g, month.toString().padStart(2, "0")).replace(/\bM\b/g, month.toString()).replace(/dddd/g, dayNames[date2.getDay()] || "").replace(/ddd/g, dayNamesShort[date2.getDay()] || "").replace(/Do/g, day.toString() + getOrdinalSuffix(day)).replace(/DD/g, day.toString().padStart(2, "0")).replace(/\bD\b/g, day.toString()).replace(/HH/g, hours.toString().padStart(2, "0")).replace(/hh/g, (hours % 12 || 12).toString().padStart(2, "0")).replace(/\bH\b/g, hours.toString()).replace(/\bh\b/g, (hours % 12 || 12).toString()).replace(/mm/g, minutes.toString().padStart(2, "0")).replace(/\bm\b/g, minutes.toString()).replace(/ss/g, seconds.toString().padStart(2, "0")).replace(/\bs\b/g, seconds.toString()).replace(/SSS/g, milliseconds.toString().padStart(3, "0")).replace(
    /SS/g,
    Math.floor(milliseconds / 10).toString().padStart(2, "0")
  ).replace(/S/g, Math.floor(milliseconds / 100).toString()).replace(/A/g, hours >= 12 ? "PM" : "AM").replace(/a/g, hours >= 12 ? "pm" : "am").replace(/ZZ/g, "+0000").replace(/Z/g, "+00:00");
  result = result.replace(/\[([^\]]+)\]/g, "$1");
  return result;
}
__name(formatDate, "formatDate");
__name2(formatDate, "formatDate");
var FORMAT_TEMPLATES2 = {
  iso: "YYYY-MM-DDTHH:mm:ss.sssZ",
  "iso-date": "YYYY-MM-DD",
  "iso-time": "HH:mm:ss",
  "us-date": "MM/DD/YYYY",
  "us-datetime": "MM/DD/YYYY HH:mm:ss",
  "eu-date": "DD/MM/YYYY",
  "eu-datetime": "DD/MM/YYYY HH:mm:ss",
  readable: "MMMM Do, YYYY",
  "readable-full": "dddd, MMMM Do, YYYY [at] h:mm A",
  compact: "YYYYMMDD",
  "compact-time": "YYYYMMDDHHmmss",
  unix: "X",
  "unix-ms": "x",
  rfc2822: "ddd, DD MMM YYYY HH:mm:ss ZZ",
  sql: "YYYY-MM-DD HH:mm:ss",
  "sql-date": "YYYY-MM-DD",
  "sql-time": "HH:mm:ss",
  "sql-timestamp": "YYYY-MM-DD HH:mm:ss.SSS",
  "sql-mysql": "YYYY-MM-DD HH:mm:ss",
  "sql-postgresql": "YYYY-MM-DD HH:mm:ss.SSS",
  "sql-sqlserver": "YYYY-MM-DD HH:mm:ss.SSS",
  "sql-oracle": "DD-MMM-YYYY HH:mm:ss",
  "sql-sqlite": "YYYY-MM-DD HH:mm:ss",
  "sql-iso": "YYYY-MM-DDTHH:mm:ss",
  "sql-utc": "YYYY-MM-DD HH:mm:ss [UTC]",
  filename: "YYYY-MM-DD_HH-mm-ss",
  log: "YYYY-MM-DD HH:mm:ss.SSS"
};
var onRequestOptions3 = /* @__PURE__ */ __name2(async () => new Response(null, {
  status: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
}), "onRequestOptions");
var onRequestGet3 = /* @__PURE__ */ __name2(async (ctx) => {
  const url = new URL(ctx.request.url);
  if (url.pathname.endsWith("/templates")) {
    const body = {
      success: true,
      data: { templates: FORMAT_TEMPLATES2 },
      metadata: { timestamp: (/* @__PURE__ */ new Date()).toISOString(), cached: false }
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
  const ts = url.searchParams.get("timestamp");
  const date2 = url.searchParams.get("date");
  const format = url.searchParams.get("format");
  if (!format) {
    return new Response(JSON.stringify({ success: false, error: "Format parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
  let targetDate;
  if (ts) {
    const parsed = parseInt(ts);
    if (Number.isNaN(parsed)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid timestamp format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    targetDate = new Date(parsed * 1e3);
  } else if (date2) {
    const d = new Date(date2);
    if (Number.isNaN(d.getTime())) {
      return new Response(JSON.stringify({ success: false, error: "Invalid date format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    targetDate = d;
  } else {
    targetDate = /* @__PURE__ */ new Date();
  }
  const formatPattern = FORMAT_TEMPLATES2[format] || format;
  const formatted = formatDate(targetDate, formatPattern);
  return new Response(
    JSON.stringify({
      success: true,
      data: { input: { ts, date: date2, format }, output: { formatted, timezone: "UTC" } },
      metadata: { timestamp: (/* @__PURE__ */ new Date()).toISOString(), cached: false }
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    }
  );
}, "onRequestGet");
var TIMEZONE_DATA = [
  {
    id: "America/New_York",
    name: "Eastern Time",
    region: "America",
    country: "United States",
    offset: "UTC-5",
    offsetMinutes: -300,
    currentTime: "",
    isDST: false,
    abbreviation: "EST"
  },
  {
    id: "America/Los_Angeles",
    name: "Pacific Time",
    region: "America",
    country: "United States",
    offset: "UTC-8",
    offsetMinutes: -480,
    currentTime: "",
    isDST: false,
    abbreviation: "PST"
  },
  {
    id: "Europe/London",
    name: "Greenwich Mean Time",
    region: "Europe",
    country: "United Kingdom",
    offset: "UTC+0",
    offsetMinutes: 0,
    currentTime: "",
    isDST: false,
    abbreviation: "GMT"
  },
  {
    id: "Europe/Paris",
    name: "Central European Time",
    region: "Europe",
    country: "France",
    offset: "UTC+1",
    offsetMinutes: 60,
    currentTime: "",
    isDST: false,
    abbreviation: "CET"
  },
  {
    id: "Asia/Tokyo",
    name: "Japan Standard Time",
    region: "Asia",
    country: "Japan",
    offset: "UTC+9",
    offsetMinutes: 540,
    currentTime: "",
    isDST: false,
    abbreviation: "JST"
  },
  {
    id: "Asia/Shanghai",
    name: "China Standard Time",
    region: "Asia",
    country: "China",
    offset: "UTC+8",
    offsetMinutes: 480,
    currentTime: "",
    isDST: false,
    abbreviation: "CST"
  },
  {
    id: "Australia/Sydney",
    name: "Australian Eastern Time",
    region: "Australia",
    country: "Australia",
    offset: "UTC+10",
    offsetMinutes: 600,
    currentTime: "",
    isDST: false,
    abbreviation: "AEST"
  },
  {
    id: "America/Chicago",
    name: "Central Time",
    region: "America",
    country: "United States",
    offset: "UTC-6",
    offsetMinutes: -360,
    currentTime: "",
    isDST: false,
    abbreviation: "CST"
  },
  {
    id: "Europe/Berlin",
    name: "Central European Time",
    region: "Europe",
    country: "Germany",
    offset: "UTC+1",
    offsetMinutes: 60,
    currentTime: "",
    isDST: false,
    abbreviation: "CET"
  },
  {
    id: "Asia/Dubai",
    name: "Gulf Standard Time",
    region: "Asia",
    country: "United Arab Emirates",
    offset: "UTC+4",
    offsetMinutes: 240,
    currentTime: "",
    isDST: false,
    abbreviation: "GST"
  }
];
function calculateCurrentTime(offsetMinutes) {
  const now = /* @__PURE__ */ new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 6e4;
  const targetTime = new Date(utc + offsetMinutes * 6e4);
  return targetTime.toISOString();
}
__name(calculateCurrentTime, "calculateCurrentTime");
__name2(calculateCurrentTime, "calculateCurrentTime");
function filterTimezones(timezones, filters) {
  let filtered = [...timezones];
  if (filters.q) {
    const q = filters.q.toLowerCase();
    filtered = filtered.filter(
      (tz) => tz.name.toLowerCase().includes(q) || tz.country.toLowerCase().includes(q) || tz.region.toLowerCase().includes(q) || tz.id.toLowerCase().includes(q)
    );
  }
  if (filters.region) filtered = filtered.filter((tz) => tz.region === filters.region);
  if (filters.country) filtered = filtered.filter((tz) => tz.country === filters.country);
  if (filters.offset) filtered = filtered.filter((tz) => tz.offset === filters.offset);
  return filtered;
}
__name(filterTimezones, "filterTimezones");
__name2(filterTimezones, "filterTimezones");
var onRequestOptions4 = /* @__PURE__ */ __name2(async () => new Response(null, {
  status: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
}), "onRequestOptions");
var onRequestGet4 = /* @__PURE__ */ __name2(async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || void 0;
  const region = url.searchParams.get("region") || void 0;
  const country = url.searchParams.get("country") || void 0;
  const offset = url.searchParams.get("offset") || void 0;
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const withTime = TIMEZONE_DATA.map((tz) => ({
    ...tz,
    currentTime: calculateCurrentTime(tz.offsetMinutes)
  }));
  const filtered = filterTimezones(withTime, { q, region, country, offset });
  const limited = filtered.slice(0, limit);
  const regions = [...new Set(TIMEZONE_DATA.map((tz) => tz.region))].sort();
  let availableCountries = TIMEZONE_DATA;
  if (region) availableCountries = TIMEZONE_DATA.filter((tz) => tz.region === region);
  const countries = [...new Set(availableCountries.map((tz) => tz.country))].sort();
  let availableOffsets = TIMEZONE_DATA;
  if (region) availableOffsets = availableOffsets.filter((tz) => tz.region === region);
  if (country) availableOffsets = availableOffsets.filter((tz) => tz.country === country);
  const offsets = [...new Set(availableOffsets.map((tz) => tz.offset))].sort();
  const body = {
    success: true,
    data: {
      timezones: limited,
      total: filtered.length,
      showing: limited.length,
      filters: { regions, countries, offsets },
      appliedFilters: {
        q: q || null,
        region: region || null,
        country: country || null,
        offset: offset || null,
        limit,
        format: "detailed"
      }
    },
    metadata: { timestamp: (/* @__PURE__ */ new Date()).toISOString(), cached: false }
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}, "onRequestGet");
var onRequestGet5 = /* @__PURE__ */ __name2(async () => {
  const body = {
    success: true,
    data: {
      version: process.env.GIT_COMMIT_SHA || "unknown",
      buildTime: (/* @__PURE__ */ new Date()).toISOString(),
      runtime: "cloudflare-pages-functions"
    }
  };
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
}, "onRequestGet");
var HOLIDAYS = {
  US: [
    { date: "2024-01-01", name: "New Year's Day", type: "federal" },
    { date: "2024-07-04", name: "Independence Day", type: "federal" },
    { date: "2024-12-25", name: "Christmas Day", type: "federal" }
  ],
  UK: [
    { date: "2024-01-01", name: "New Year's Day", type: "bank" },
    { date: "2024-12-25", name: "Christmas Day", type: "bank" },
    { date: "2024-12-26", name: "Boxing Day", type: "bank" }
  ],
  CN: [
    { date: "2024-01-01", name: "New Year's Day", type: "national" },
    { date: "2024-02-10", name: "Spring Festival", type: "national" },
    { date: "2024-10-01", name: "National Day", type: "national" }
  ]
};
function isWeekend(date2) {
  const d = date2.getDay();
  return d === 0 || d === 6;
}
__name(isWeekend, "isWeekend");
__name2(isWeekend, "isWeekend");
function isHoliday(date2, country) {
  const s = date2.toISOString().split("T")[0];
  return (HOLIDAYS[country] || []).find((h) => h.date === s) || null;
}
__name(isHoliday, "isHoliday");
__name2(isHoliday, "isHoliday");
function addBusinessDays(startDate, days, excludeWeekends, excludeHolidays, country) {
  const currentDate = new Date(startDate);
  let added = 0;
  while (added < days) {
    currentDate.setDate(currentDate.getDate() + 1);
    let count = true;
    if (excludeWeekends && isWeekend(currentDate)) count = false;
    if (excludeHolidays && isHoliday(currentDate, country)) count = false;
    if (count) added++;
  }
  return currentDate;
}
__name(addBusinessDays, "addBusinessDays");
__name2(addBusinessDays, "addBusinessDays");
function calculateWorkdays(startDate, endDate, excludeWeekends, excludeHolidays, country) {
  let workdays = 0, totalDays = 0, weekends = 0, holidays = 0;
  const excluded = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    totalDays++;
    let excludedFlag = false;
    let reason = "";
    let holidayName = "";
    if (excludeWeekends && isWeekend(cur)) {
      weekends++;
      excludedFlag = true;
      reason = "Weekend";
    }
    const h = excludeHolidays ? isHoliday(cur, country) : null;
    if (h) {
      holidays++;
      excludedFlag = true;
      reason = reason ? `${reason}, Holiday` : "Holiday";
      holidayName = h.name;
    }
    if (excludedFlag) {
      excluded.push({
        date: cur.toISOString().split("T")[0] ?? "",
        reason,
        ...holidayName ? { name: holidayName } : {}
      });
    } else {
      workdays++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { workdays, totalDays, weekends, holidays, excludedDates: excluded };
}
__name(calculateWorkdays, "calculateWorkdays");
__name2(calculateWorkdays, "calculateWorkdays");
var onRequestOptions5 = /* @__PURE__ */ __name2(async () => new Response(null, {
  status: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
}), "onRequestOptions");
var onRequestGet6 = /* @__PURE__ */ __name2(async ({ request }) => {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const days = url.searchParams.get("days");
  const excludeWeekends = url.searchParams.get("excludeWeekends") ?? "true";
  const excludeHolidays = url.searchParams.get("excludeHolidays") ?? "false";
  const country = url.searchParams.get("country") ?? "US";
  const mode = url.searchParams.get("mode") ?? "dateRange";
  if (!startDate)
    return new Response(JSON.stringify({ success: false, error: "Start date is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  const start = new Date(startDate);
  const excludeW = excludeWeekends === "true";
  const excludeH = excludeHolidays === "true";
  let result;
  if (mode === "dayCount") {
    if (!days)
      return new Response(
        JSON.stringify({ success: false, error: "Days parameter is required for dayCount mode" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        }
      );
    const target = addBusinessDays(start, parseInt(days), excludeW, excludeH, country);
    result = {
      mode: "dayCount",
      startDate: start.toISOString().split("T")[0],
      targetDate: target.toISOString().split("T")[0],
      requestedDays: parseInt(days),
      settings: { excludeWeekends: excludeW, excludeHolidays: excludeH, country }
    };
  } else {
    if (!endDate)
      return new Response(
        JSON.stringify({ success: false, error: "End date is required for dateRange mode" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        }
      );
    const end = new Date(endDate);
    const calc = calculateWorkdays(start, end, excludeW, excludeH, country);
    result = {
      mode: "dateRange",
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      ...calc,
      settings: { excludeWeekends: excludeW, excludeHolidays: excludeH, country }
    };
  }
  return new Response(
    JSON.stringify({
      success: true,
      data: result,
      metadata: { timestamp: (/* @__PURE__ */ new Date()).toISOString(), cached: false }
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    }
  );
}, "onRequestGet");
var MemoryCache = class {
  static {
    __name(this, "MemoryCache");
  }
  static {
    __name2(this, "MemoryCache");
  }
  cache = /* @__PURE__ */ new Map();
  maxSize = 1e3;
  // Limit memory usage
  set(key, value, ttlSeconds = 3600) {
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }
    const expiry = Date.now() + ttlSeconds * 1e3;
    this.cache.set(key, { value, expiry });
    return true;
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }
  del(key) {
    return this.cache.delete(key);
  }
  exists(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      const toRemove = entries.slice(0, Math.floor(this.maxSize * 0.2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }
  size() {
    this.cleanup();
    return this.cache.size;
  }
  clear() {
    this.cache.clear();
  }
};
var RedisClient = class {
  static {
    __name(this, "RedisClient");
  }
  static {
    __name2(this, "RedisClient");
  }
  redisUrl;
  redisToken;
  enabled;
  memoryCache;
  constructor(env) {
    this.redisUrl = env.UPSTASH_REDIS_REST_URL || null;
    this.redisToken = env.UPSTASH_REDIS_REST_TOKEN || null;
    this.enabled = !!(this.redisUrl && this.redisToken && env.REDIS_ENABLED !== "false");
    this.memoryCache = new MemoryCache();
  }
  async makeRedisRequest(command) {
    if (!this.enabled || !this.redisUrl || !this.redisToken) {
      throw new Error("Redis not configured");
    }
    try {
      const response = await fetch(this.redisUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(command)
      });
      if (!response.ok) {
        throw new Error(`Redis request failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Redis request error:", error);
      throw error;
    }
  }
  async set(key, value, ttlSeconds = 3600) {
    try {
      if (this.enabled) {
        const serialized = JSON.stringify(value);
        const result = await this.makeRedisRequest([
          "SETEX",
          key,
          ttlSeconds.toString(),
          serialized
        ]);
        return result.result === "OK";
      } else {
        return this.memoryCache.set(key, value, ttlSeconds);
      }
    } catch (error) {
      console.warn("Redis SET failed, using memory cache:", error);
      return this.memoryCache.set(key, value, ttlSeconds);
    }
  }
  async get(key) {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(["GET", key]);
        if (result.result === null) return null;
        return JSON.parse(result.result);
      } else {
        return this.memoryCache.get(key);
      }
    } catch (error) {
      console.warn("Redis GET failed, using memory cache:", error);
      return this.memoryCache.get(key);
    }
  }
  async del(key) {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(["DEL", key]);
        return result.result > 0;
      } else {
        return this.memoryCache.del(key);
      }
    } catch (error) {
      console.warn("Redis DEL failed, using memory cache:", error);
      return this.memoryCache.del(key);
    }
  }
  async exists(key) {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(["EXISTS", key]);
        return result.result > 0;
      } else {
        return this.memoryCache.exists(key);
      }
    } catch (error) {
      console.warn("Redis EXISTS failed, using memory cache:", error);
      return this.memoryCache.exists(key);
    }
  }
  async ping() {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(["PING"]);
        return result.result === "PONG";
      } else {
        return true;
      }
    } catch (error) {
      console.warn("Redis PING failed:", error);
      return false;
    }
  }
  async incr(key) {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(["INCR", key]);
        return result.result;
      } else {
        const current = this.memoryCache.get(key) || 0;
        const newValue = current + 1;
        this.memoryCache.set(key, newValue, 3600);
        return newValue;
      }
    } catch (error) {
      console.warn("Redis INCR failed, using memory cache:", error);
      const current = this.memoryCache.get(key) || 0;
      const newValue = current + 1;
      this.memoryCache.set(key, newValue, 3600);
      return newValue;
    }
  }
  async expire(key, ttlSeconds) {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(["EXPIRE", key, ttlSeconds.toString()]);
        return result.result === 1;
      } else {
        const value = this.memoryCache.get(key);
        if (value !== null) {
          return this.memoryCache.set(key, value, ttlSeconds);
        }
        return false;
      }
    } catch (error) {
      console.warn("Redis EXPIRE failed:", error);
      return false;
    }
  }
  isEnabled() {
    return this.enabled;
  }
  getStats() {
    return {
      enabled: this.enabled,
      type: this.enabled ? "redis" : "memory",
      size: this.enabled ? void 0 : this.memoryCache.size()
    };
  }
};
var CACHE_CONFIGS = {
  // API responses
  CONVERT_API: {
    ttl: 3600,
    // 1 hour
    keyPrefix: "api:convert:",
    enabled: true
  },
  NOW_API: {
    ttl: 60,
    // 1 minute (current time changes frequently)
    keyPrefix: "api:now:",
    enabled: true
  },
  HEALTH_API: {
    ttl: 300,
    // 5 minutes
    keyPrefix: "api:health:",
    enabled: true
  },
  // Static data
  TIMEZONES: {
    ttl: 86400,
    // 24 hours
    keyPrefix: "data:timezones:",
    enabled: true
  },
  FORMATS: {
    ttl: 86400,
    // 24 hours
    keyPrefix: "data:formats:",
    enabled: true
  },
  // User data
  USER_PREFERENCES: {
    ttl: 7200,
    // 2 hours
    keyPrefix: "user:prefs:",
    enabled: true
  },
  // Analytics
  STATS: {
    ttl: 1800,
    // 30 minutes
    keyPrefix: "stats:",
    enabled: true
  }
};
var CacheManager = class {
  static {
    __name(this, "CacheManager");
  }
  static {
    __name2(this, "CacheManager");
  }
  redis;
  stats;
  constructor(_env2) {
    this.redis = new RedisClient(_env2);
    this.stats = /* @__PURE__ */ new Map();
  }
  // Generate cache key with proper prefix and normalization
  generateKey(config, identifier) {
    const normalized = identifier.toLowerCase().replace(/[^a-z0-9]/g, "_");
    return `${config.keyPrefix}${normalized}`;
  }
  // Update cache statistics
  updateStats(configKey, hit) {
    const current = this.stats.get(configKey) || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0
    };
    if (hit) {
      current.hits++;
    } else {
      current.misses++;
    }
    current.totalRequests = current.hits + current.misses;
    current.hitRate = current.totalRequests > 0 ? current.hits / current.totalRequests * 100 : 0;
    this.stats.set(configKey, current);
  }
  // Get cached data
  async get(configKey, identifier) {
    const config = CACHE_CONFIGS[configKey];
    if (!config.enabled) return null;
    try {
      const key = this.generateKey(config, identifier);
      const cached = await this.redis.get(key);
      const hit = cached !== null;
      this.updateStats(configKey, hit);
      if (hit) {
        console.log(`Cache HIT: ${key}`);
        return cached;
      } else {
        console.log(`Cache MISS: ${key}`);
        return null;
      }
    } catch (error) {
      console.error(`Cache GET error for ${configKey}:`, error);
      this.updateStats(configKey, false);
      return null;
    }
  }
  // Set cached data
  async set(configKey, identifier, data) {
    const config = CACHE_CONFIGS[configKey];
    if (!config.enabled) return false;
    try {
      const key = this.generateKey(config, identifier);
      const success = await this.redis.set(key, data, config._ttl);
      if (success) {
        console.log(`Cache SET: ${key} (TTL: ${config.ttl}s)`);
      }
      return success;
    } catch (error) {
      console.error(`Cache SET error for ${configKey}:`, error);
      return false;
    }
  }
  // Delete cached data
  async del(configKey, identifier) {
    const config = CACHE_CONFIGS[configKey];
    try {
      const key = this.generateKey(config, identifier);
      const success = await this.redis.del(key);
      if (success) {
        console.log(`Cache DEL: ${key}`);
      }
      return success;
    } catch (error) {
      console.error(`Cache DEL error for ${configKey}:`, error);
      return false;
    }
  }
  // Cache wrapper for API functions
  async cached(configKey, identifier, fetchFunction) {
    const cached = await this.get(configKey, identifier);
    if (cached !== null) {
      return cached;
    }
    try {
      const data = await fetchFunction();
      this.set(configKey, identifier, data).catch((error) => {
        console.error(`Background cache SET failed for ${configKey}:`, error);
      });
      return data;
    } catch (error) {
      console.error(`Fetch function failed for ${configKey}:`, error);
      throw error;
    }
  }
  // Increment counter (useful for rate limiting and analytics)
  async increment(configKey, identifier) {
    const config = CACHE_CONFIGS[configKey];
    const key = this.generateKey(config, identifier);
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, config._ttl);
      }
      return count;
    } catch (error) {
      console.error(`Cache INCREMENT error for ${configKey}:`, error);
      return 1;
    }
  }
  // Get cache statistics
  getStats() {
    const result = {};
    for (const [key, stats] of this.stats.entries()) {
      result[key] = { ...stats };
    }
    return result;
  }
  // Get Redis client stats
  getRedisStats() {
    return this.redis.getStats();
  }
  // Health check
  async healthCheck() {
    try {
      const redisPing = await this.redis.ping();
      const redisStats = this.redis.getStats();
      const cacheStats = this.getStats();
      return {
        status: redisPing ? "healthy" : "degraded",
        redis: redisPing,
        stats: {
          redis: redisStats,
          cache: cacheStats
        }
      };
    } catch (error) {
      return {
        status: "unhealthy",
        redis: false,
        stats: { error: error instanceof Error ? error.message : "Unknown error" }
      };
    }
  }
  // Clear all cache (useful for testing)
  async clearAll() {
    console.warn("Clearing all cache statistics");
    this.stats.clear();
  }
};
var AnalyticsManager = class {
  static {
    __name(this, "AnalyticsManager");
  }
  static {
    __name2(this, "AnalyticsManager");
  }
  cacheManager;
  constructor(_env2) {
    this.cacheManager = new CacheManager(_env2);
  }
  // Record an API request event
  async recordEvent(event) {
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const hour = (/* @__PURE__ */ new Date()).getHours();
      await this.incrementCounter(`analytics:daily:${today}:requests`);
      await this.incrementCounter(`analytics:daily:${today}:endpoint:${event.endpoint}`);
      await this.incrementCounter(`analytics:daily:${today}:status:${event.status}`);
      await this.incrementCounter(`analytics:hourly:${today}:${hour}:requests`);
      const responseTimeBucket = this.getResponseTimeBucket(event.responseTime);
      await this.incrementCounter(`analytics:daily:${today}:response_time:${responseTimeBucket}`);
      if (event.cached) {
        await this.incrementCounter(`analytics:daily:${today}:cache_hits`);
      }
      if (event.country) {
        await this.incrementCounter(`analytics:daily:${today}:country:${event.country}`);
      }
      await this.addToRecentEvents(event);
    } catch (error) {
      if (true)
        console.error("Failed to record analytics event:", error);
    }
  }
  // Get analytics stats for a specific date
  async getStats(date2) {
    const targetDate = date2 || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    try {
      const totalRequests = await this.getCounter(`analytics:daily:${targetDate}:requests`) || 0;
      const cacheHits = await this.getCounter(`analytics:daily:${targetDate}:cache_hits`) || 0;
      const endpointStats = await this.getEndpointStats(targetDate);
      const statusCodes = await this.getStatusCodeStats(targetDate);
      const countries = await this.getCountryStats(targetDate);
      const avgResponseTime = await this.getAverageResponseTime(targetDate);
      const errorRequests = (statusCodes["4"] || 0) + (statusCodes["5"] || 0);
      const errorRate = totalRequests > 0 ? errorRequests / totalRequests * 100 : 0;
      const cacheHitRate = totalRequests > 0 ? cacheHits / totalRequests * 100 : 0;
      return {
        totalRequests,
        uniqueEndpoints: endpointStats.length,
        averageResponseTime: avgResponseTime,
        errorRate,
        cacheHitRate,
        topEndpoints: endpointStats.slice(0, 10),
        statusCodes,
        countries
      };
    } catch (error) {
      if (true)
        console.error("Failed to get analytics stats:", error);
      return this.getEmptyStats();
    }
  }
  // Get real-time stats (last hour)
  async getRealTimeStats() {
    const now = /* @__PURE__ */ new Date();
    const currentHour = now.getHours();
    const today = now.toISOString().split("T")[0];
    try {
      const hourlyRequests = await this.getCounter(`analytics:hourly:${today}:${currentHour}:requests`) || 0;
      const recentEvents = await this.getRecentEvents(100);
      const last5MinEvents = recentEvents.filter((event) => {
        const eventTime = new Date(event.timestamp);
        return now.getTime() - eventTime.getTime() < 5 * 60 * 1e3;
      });
      return {
        currentHourRequests: hourlyRequests,
        last5MinRequests: last5MinEvents.length,
        recentEvents: recentEvents.slice(0, 20),
        timestamp: now.toISOString()
      };
    } catch (error) {
      if (true)
        console.error("Failed to get real-time stats:", error);
      return {
        currentHourRequests: 0,
        last5MinRequests: 0,
        recentEvents: [],
        timestamp: now.toISOString()
      };
    }
  }
  // Helper methods
  async incrementCounter(key) {
    try {
      await this.cacheManager.increment("STATS", key);
    } catch (error) {
      if (true)
        console.error(`Failed to increment counter ${key}:`, error);
    }
  }
  async getCounter(key) {
    try {
      const value = await this.cacheManager.get("STATS", key);
      return typeof value === "number" ? value : 0;
    } catch (error) {
      if (true)
        console.error(`Failed to get counter ${key}:`, error);
      return 0;
    }
  }
  getResponseTimeBucket(responseTime) {
    if (responseTime < 100) return "fast";
    if (responseTime < 500) return "medium";
    if (responseTime < 1e3) return "slow";
    return "very_slow";
  }
  async addToRecentEvents(event) {
    try {
      const recentEvents = await this.getRecentEvents(999);
      recentEvents.unshift(event);
      await this.cacheManager.set("STATS", "recent_events", recentEvents.slice(0, 1e3));
    } catch (error) {
      if (true)
        console.error("Failed to add recent event:", error);
    }
  }
  async getRecentEvents(limit = 100) {
    try {
      const events = await this.cacheManager.get("STATS", "recent_events");
      return Array.isArray(events) ? events.slice(0, limit) : [];
    } catch (error) {
      console.error("Failed to get recent events:", error);
      return [];
    }
  }
  async getEndpointStats(_date2) {
    return [];
  }
  async getStatusCodeStats(date2) {
    const stats = {};
    for (const statusPrefix of ["2", "3", "4", "5"]) {
      const count = await this.getCounter(`analytics:daily:${date2}:status:${statusPrefix}xx`);
      if (count > 0) {
        stats[statusPrefix] = count;
      }
    }
    return stats;
  }
  async getCountryStats(_date2) {
    return {};
  }
  async getAverageResponseTime(_date2) {
    const fast = await this.getCounter(`analytics:daily:${date}:response_time:fast`) || 0;
    const medium = await this.getCounter(`analytics:daily:${date}:response_time:medium`) || 0;
    const slow = await this.getCounter(`analytics:daily:${date}:response_time:slow`) || 0;
    const verySlow = await this.getCounter(`analytics:daily:${date}:response_time:very_slow`) || 0;
    const total = fast + medium + slow + verySlow;
    if (total === 0) return 0;
    const weightedSum = fast * 50 + medium * 300 + slow * 750 + verySlow * 1500;
    return Math.round(weightedSum / total);
  }
  getEmptyStats() {
    return {
      totalRequests: 0,
      uniqueEndpoints: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      topEndpoints: [],
      statusCodes: {},
      countries: {}
    };
  }
};
var SecurityManager = class {
  static {
    __name(this, "SecurityManager");
  }
  static {
    __name2(this, "SecurityManager");
  }
  cacheManager;
  constructor(_env2) {
    this.cacheManager = new CacheManager(_env2);
  }
  // Rate limiting middleware
  async checkRateLimit(request, config) {
    try {
      const key = config.keyGenerator(_request);
      const now = Date.now();
      const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
      const rateLimitKey = `rate_limit:${key}:${windowStart}`;
      const currentCount = await this.cacheManager.get("STATS", rateLimitKey) || 0;
      if (currentCount >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowStart + config.windowMs
        };
      }
      await this.cacheManager.increment("STATS", rateLimitKey);
      const _ttl = Math.ceil((windowStart + config.windowMs - now) / 1e3);
      return {
        allowed: true,
        remaining: config.maxRequests - currentCount - 1,
        resetTime: windowStart + config.windowMs
      };
    } catch (error) {
      console.error("Rate limit check failed:", error);
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: Date.now() + config.windowMs
      };
    }
  }
  // Generate rate limit key based on IP and endpoint
  generateRateLimitKey(request) {
    const url = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
    const endpoint = url.pathname;
    return `${ip}:${endpoint}`;
  }
  // Check for suspicious activity
  async checkSuspiciousActivity(request) {
    try {
      const userAgent = request.headers.get("User-Agent") || "";
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const botPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python-requests/i
      ];
      const isBot = botPatterns.some((pattern) => pattern.test(userAgent));
      const suspiciousIPs = ["127.0.0.1"];
      const isSuspiciousIP = suspiciousIPs.includes(ip);
      const recentRequestCount = await this.getRecentRequestCount(ip);
      const isHighFrequency = recentRequestCount > 100;
      if (isBot && isHighFrequency) {
        return { suspicious: true, reason: "High frequency bot traffic" };
      }
      if (isSuspiciousIP) {
        return { suspicious: true, reason: "Suspicious IP address" };
      }
      return { suspicious: false };
    } catch (error) {
      console.error("Suspicious activity check failed:", error);
      return { suspicious: false };
    }
  }
  // Get security headers
  getSecurityHeaders() {
    return {
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
    };
  }
  // CORS configuration
  getCORSHeaders(origin) {
    const allowedOrigins = [
      "https://tsconv.com",
      "https://www.tsconv.com",
      "http://localhost:3000",
      "http://localhost:5173"
    ];
    const isAllowedOrigin = origin && allowedOrigins.includes(origin);
    return {
      "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "https://tsconv.com",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Allow-Credentials": "false"
    };
  }
  // Validate request input
  validateInput(input, rules) {
    const errors = [];
    for (const [field, rule] of Object.entries(rules)) {
      const value = input[field];
      if (rule.required && (value === void 0 || value === null || value === "")) {
        errors.push(`${field} is required`);
        continue;
      }
      if (value !== void 0 && value !== null) {
        if (rule.type && typeof value !== rule.type) {
          errors.push(`${field} must be of type ${rule.type}`);
        }
        if (rule.minLength && typeof value === "string" && value.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && typeof value === "string" && value.length > rule.maxLength) {
          errors.push(`${field} must be no more than ${rule.maxLength} characters`);
        }
        if (rule.min && typeof value === "number" && value < rule.min) {
          errors.push(`${field} must be at least ${rule.min}`);
        }
        if (rule.max && typeof value === "number" && value > rule.max) {
          errors.push(`${field} must be no more than ${rule.max}`);
        }
        if (rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  // Log security event
  async logSecurityEvent(event) {
    try {
      const securityLog = {
        ...event,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      const recentEvents = await this.cacheManager.get("STATS", "security_events") || [];
      recentEvents.unshift(securityLog);
      await this.cacheManager.set("STATS", "security_events", recentEvents.slice(0, 1e3));
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await this.cacheManager.increment("STATS", `security:daily:${today}:${event.type}`);
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }
  // Get recent request count for IP
  async getRecentRequestCount(ip) {
    try {
      const now = Date.now();
      const _oneMinuteAgo = now - 6e4;
      const key = `ip_requests:${ip}:${Math.floor(now / 6e4)}`;
      return await this.cacheManager.get("STATS", key) || 0;
    } catch (error) {
      console.error("Failed to get recent request count:", error);
      return 0;
    }
  }
};
var RATE_LIMITS = {
  API_GENERAL: {
    windowMs: 6e4,
    // 1 minute
    maxRequests: 100,
    // 100 requests per minute
    keyGenerator: /* @__PURE__ */ __name2((request) => {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      return `general:${ip}`;
    }, "keyGenerator")
  },
  API_CONVERT: {
    windowMs: 6e4,
    // 1 minute
    maxRequests: 60,
    // 60 requests per minute
    keyGenerator: /* @__PURE__ */ __name2((request) => {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      return `convert:${ip}`;
    }, "keyGenerator")
  },
  API_ADMIN: {
    windowMs: 6e4,
    // 1 minute
    maxRequests: 10,
    // 10 requests per minute
    keyGenerator: /* @__PURE__ */ __name2((request) => {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      return `admin:${ip}`;
    }, "keyGenerator")
  }
};
async function handleAnalytics(request, env, path) {
  const securityManager = new SecurityManager(_env);
  const analyticsManager = new AnalyticsManager(_env);
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.includes("Bearer debug") && !authHeader.includes("Bearer admin")) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Bearer token required for analytics endpoints"
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  const securityHeaders = securityManager.getSecurityHeaders();
  const corsHeaders = securityManager.getCORSHeaders(request.headers.get("Origin") || void 0);
  const responseHeaders = {
    "Content-Type": "application/json",
    ...securityHeaders,
    ...corsHeaders
  };
  try {
    const action = path[0] || "stats";
    switch (action) {
      case "stats":
        return await handleAnalyticsStats(analyticsManager, _request, responseHeaders);
      case "realtime":
        return await handleRealTimeStats(analyticsManager, responseHeaders);
      case "security":
        return await handleSecurityStats(securityManager, responseHeaders);
      case "dashboard":
        return await handleDashboard(analyticsManager, securityManager, responseHeaders);
      default:
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: `Analytics endpoint '${action}' not found`,
            availableEndpoints: ["stats", "realtime", "security", "dashboard"]
          }),
          {
            status: 404,
            headers: responseHeaders
          }
        );
    }
  } catch (error) {
    if (true) console.error("Analytics API error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: responseHeaders
      }
    );
  }
}
__name(handleAnalytics, "handleAnalytics");
__name2(handleAnalytics, "handleAnalytics");
async function handleAnalyticsStats(analyticsManager, request, headers) {
  const url = new URL(request.url);
  const date2 = url.searchParams.get("date");
  const stats = await analyticsManager.getStats(date2 || void 0);
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        date: date2 || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        stats,
        generated: (/* @__PURE__ */ new Date()).toISOString()
      }
    }),
    {
      headers
    }
  );
}
__name(handleAnalyticsStats, "handleAnalyticsStats");
__name2(handleAnalyticsStats, "handleAnalyticsStats");
async function handleRealTimeStats(analyticsManager, headers) {
  const realTimeStats = await analyticsManager.getRealTimeStats();
  return new Response(
    JSON.stringify({
      success: true,
      data: realTimeStats
    }),
    {
      headers
    }
  );
}
__name(handleRealTimeStats, "handleRealTimeStats");
__name2(handleRealTimeStats, "handleRealTimeStats");
async function handleSecurityStats(securityManager, headers) {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        rateLimits: {
          general: "Active",
          convert: "Active",
          admin: "Active"
        },
        securityHeaders: "Enabled",
        cors: "Configured",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    }),
    {
      headers
    }
  );
}
__name(handleSecurityStats, "handleSecurityStats");
__name2(handleSecurityStats, "handleSecurityStats");
async function handleDashboard(analyticsManager, securityManager, headers) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
  const [todayStats, yesterdayStats, realTimeStats] = await Promise.all([
    analyticsManager.getStats(today),
    analyticsManager.getStats(yesterday),
    analyticsManager.getRealTimeStats()
  ]);
  const requestsTrend = yesterdayStats.totalRequests > 0 ? (todayStats.totalRequests - yesterdayStats.totalRequests) / yesterdayStats.totalRequests * 100 : 0;
  const responseTimeTrend = yesterdayStats.averageResponseTime > 0 ? (todayStats.averageResponseTime - yesterdayStats.averageResponseTime) / yesterdayStats.averageResponseTime * 100 : 0;
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        overview: {
          todayRequests: todayStats.totalRequests,
          requestsTrend: Math.round(requestsTrend * 100) / 100,
          averageResponseTime: todayStats.averageResponseTime,
          responseTimeTrend: Math.round(responseTimeTrend * 100) / 100,
          errorRate: todayStats.errorRate,
          cacheHitRate: todayStats.cacheHitRate
        },
        realTime: realTimeStats,
        today: todayStats,
        yesterday: yesterdayStats,
        security: {
          rateLimitsActive: true,
          securityHeadersEnabled: true,
          corsConfigured: true
        },
        generated: (/* @__PURE__ */ new Date()).toISOString()
      }
    }),
    {
      headers
    }
  );
}
__name(handleDashboard, "handleDashboard");
__name2(handleDashboard, "handleDashboard");
async function recordAnalyticsMiddleware(request, response, env, startTime) {
  try {
    const analyticsManager = new AnalyticsManager(_env);
    const url = new URL(request.url);
    const event = {
      endpoint: url.pathname,
      method: request.method,
      status: response.status,
      responseTime: Date.now() - startTime,
      userAgent: request.headers.get("User-Agent") || void 0,
      country: request.headers.get("CF-IPCountry") || void 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      cached: response.headers.get("X-Cache-Status") === "HIT"
    };
    analyticsManager.recordEvent(event).catch((error) => {
      if (true)
        console.error("Failed to record analytics event:", error);
    });
  } catch (error) {
    if (true) console.error("Analytics middleware error:", error);
  }
}
__name(recordAnalyticsMiddleware, "recordAnalyticsMiddleware");
__name2(recordAnalyticsMiddleware, "recordAnalyticsMiddleware");
async function handleCacheAdmin(request, env, path) {
  const cacheManager = new CacheManager(_env);
  const action = path[0] || "status";
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Bearer token required for cache admin endpoints"
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    switch (action) {
      case "status":
        return await handleCacheStatus(cacheManager);
      case "stats":
        return await handleCacheStats(cacheManager);
      case "health":
        return await handleCacheHealth(cacheManager);
      case "clear":
        if (request.method !== "POST") {
          return new Response(
            JSON.stringify({
              error: "Method Not Allowed",
              message: "POST method required for cache clear"
            }),
            {
              status: 405,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
        return await handleCacheClear(cacheManager);
      default:
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: `Cache admin action '${action}' not found`,
            availableActions: ["status", "stats", "health", "clear"]
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" }
          }
        );
    }
  } catch (error) {
    if (true) console.error("Cache admin error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleCacheAdmin, "handleCacheAdmin");
__name2(handleCacheAdmin, "handleCacheAdmin");
async function handleCacheStatus(cacheManager) {
  const redisStats = cacheManager.getRedisStats();
  const cacheStats = cacheManager.getStats();
  const totalRequests = Object.values(cacheStats).reduce(
    (sum, stat) => sum + stat.totalRequests,
    0
  );
  const totalHits = Object.values(cacheStats).reduce((sum, stat) => sum + stat.hits, 0);
  const overallHitRate = totalRequests > 0 ? totalHits / totalRequests * 100 : 0;
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        redis: redisStats,
        cache: {
          overallHitRate: Math.round(overallHitRate * 100) / 100,
          totalRequests,
          totalHits,
          totalMisses: totalRequests - totalHits,
          categories: Object.keys(cacheStats).length
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(handleCacheStatus, "handleCacheStatus");
__name2(handleCacheStatus, "handleCacheStatus");
async function handleCacheStats(cacheManager) {
  const cacheStats = cacheManager.getStats();
  const redisStats = cacheManager.getRedisStats();
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        redis: redisStats,
        detailed: cacheStats,
        summary: {
          categories: Object.keys(cacheStats).length,
          totalRequests: Object.values(cacheStats).reduce(
            (sum, stat) => sum + stat.totalRequests,
            0
          ),
          averageHitRate: Object.values(cacheStats).length > 0 ? Object.values(cacheStats).reduce((sum, stat) => sum + stat.hitRate, 0) / Object.values(cacheStats).length : 0
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(handleCacheStats, "handleCacheStats");
__name2(handleCacheStats, "handleCacheStats");
async function handleCacheHealth(cacheManager) {
  const healthCheck = await cacheManager.healthCheck();
  return new Response(
    JSON.stringify({
      success: true,
      data: healthCheck,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(handleCacheHealth, "handleCacheHealth");
__name2(handleCacheHealth, "handleCacheHealth");
async function handleCacheClear(cacheManager) {
  try {
    await cacheManager.clearAll();
    return new Response(
      JSON.stringify({
        success: true,
        message: "Cache statistics cleared successfully",
        note: "Redis data is preserved for other applications",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to clear cache",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleCacheClear, "handleCacheClear");
__name2(handleCacheClear, "handleCacheClear");
async function handleCacheTest(request, _env2) {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Only GET method is supported"
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    const cacheManager = new CacheManager(_env2);
    const testKey = `test-key-${Date.now()}`;
    const testValue = { message: "Hello Cache!", timestamp: (/* @__PURE__ */ new Date()).toISOString() };
    const setResult = await cacheManager.set("CONVERT_API", testKey, testValue);
    const getResult = await cacheManager.get("CONVERT_API", testKey);
    const redisStats = cacheManager.getRedisStats();
    const cacheStats = cacheManager.getStats();
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          test: {
            key: testKey,
            setValue: testValue,
            setResult,
            getValue: getResult,
            cacheWorking: !!getResult && JSON.stringify(getResult) === JSON.stringify(testValue)
          },
          redis: redisStats,
          cache: cacheStats
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Cache test error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleCacheTest, "handleCacheTest");
__name2(handleCacheTest, "handleCacheTest");
async function handleEnvDebug(request, env) {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Only GET method is supported"
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.includes("Bearer debug") && !authHeader.includes("Bearer test")) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: 'Use "Bearer debug" token for environment debugging'
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    const redisUrl = env.UPSTASH_REDIS_REST_URL;
    const redisToken = env.UPSTASH_REDIS_REST_TOKEN;
    const redisEnabled = env.REDIS_ENABLED;
    const envCheck = {
      UPSTASH_REDIS_REST_URL: {
        configured: !!redisUrl,
        value: redisUrl ? `${redisUrl.substring(0, 20)}...` : null,
        length: redisUrl?.length || 0
      },
      UPSTASH_REDIS_REST_TOKEN: {
        configured: !!redisToken,
        value: redisToken ? `${redisToken.substring(0, 10)}...` : null,
        length: redisToken?.length || 0
      },
      REDIS_ENABLED: {
        configured: redisEnabled !== void 0,
        value: redisEnabled,
        type: typeof redisEnabled
      }
    };
    let connectionTest = null;
    if (redisUrl && redisToken) {
      try {
        const response = await fetch(redisUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${redisToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(["PING"])
        });
        if (response.ok) {
          const result = await response.json();
          connectionTest = {
            success: true,
            status: response.status,
            result: result.result
          };
        } else {
          connectionTest = {
            success: false,
            status: response.status,
            error: `HTTP ${response.status}`
          };
        }
      } catch (error) {
        connectionTest = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }
    const shouldBeEnabled = !!(redisUrl && redisToken && redisEnabled !== "false");
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          environment: envCheck,
          redis: {
            shouldBeEnabled,
            connectionTest,
            configurationComplete: !!(redisUrl && redisToken)
          },
          recommendations: generateRecommendations(envCheck, connectionTest, shouldBeEnabled)
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Environment debug error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleEnvDebug, "handleEnvDebug");
__name2(handleEnvDebug, "handleEnvDebug");
function generateRecommendations(envCheck, connectionTest, shouldBeEnabled) {
  const recommendations = [];
  if (!envCheck.UPSTASH_REDIS_REST_URL.configured) {
    recommendations.push(
      "Configure UPSTASH_REDIS_REST_URL in Cloudflare Pages environment variables"
    );
  }
  if (!envCheck.UPSTASH_REDIS_REST_TOKEN.configured) {
    recommendations.push(
      "Configure UPSTASH_REDIS_REST_TOKEN in Cloudflare Pages environment variables"
    );
  }
  if (envCheck.REDIS_ENABLED.value === "false") {
    recommendations.push("Set REDIS_ENABLED=true to enable Redis caching");
  }
  if (connectionTest && !connectionTest.success) {
    recommendations.push("Check Redis URL and token - connection test failed");
  }
  if (shouldBeEnabled && connectionTest?.success) {
    recommendations.push("\u2705 Redis configuration looks good! Cache should be working.");
  }
  if (!shouldBeEnabled) {
    recommendations.push("Complete Redis configuration to enable caching");
  }
  return recommendations;
}
__name(generateRecommendations, "generateRecommendations");
__name2(generateRecommendations, "generateRecommendations");
async function handleAdminRoutes(request, env, path) {
  const endpoint = path[0] || "";
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Bearer token required for admin endpoints"
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  switch (endpoint) {
    case "stats":
      return handleAdminStats(request, env);
    case "cache":
      return handleCacheAdmin(request, env, path.slice(1));
    case "health":
      return handleAdminHealth(request, env);
    case "env-debug":
      return handleEnvDebug(request, env);
    case "cache-test":
      return handleCacheTest(request, env);
    case "analytics":
      return handleAnalytics(request, env, path.slice(1));
    default:
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: `Admin endpoint /${path.join("/")} not found`,
          availableEndpoints: ["stats", "cache", "health", "env-debug", "cache-test", "analytics"]
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
  }
}
__name(handleAdminRoutes, "handleAdminRoutes");
__name2(handleAdminRoutes, "handleAdminRoutes");
async function handleAdminStats(request, env) {
  try {
    const stats = {
      requests: {
        total: 1e3,
        today: 150,
        lastHour: 25
      },
      endpoints: {
        "/api/convert": 450,
        "/api/now": 300,
        "/api/health": 100,
        "/api/v1/*": 150
      },
      performance: {
        averageResponseTime: "45ms",
        uptime: "99.9%"
      },
      cache: {
        hits: 750,
        misses: 250,
        hitRate: "75%"
      }
    };
    return new Response(
      JSON.stringify({
        success: true,
        data: stats,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleAdminStats, "handleAdminStats");
__name2(handleAdminStats, "handleAdminStats");
async function handleAdminHealth(request, env) {
  try {
    const health = {
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      services: {
        api: "healthy",
        cache: "unknown",
        database: "not-applicable"
      },
      environment: {
        platform: "cloudflare-pages",
        runtime: "cloudflare-workers",
        region: "auto"
      }
    };
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const response = await fetch(`${env.UPSTASH_REDIS_REST_URL}/ping`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
            "Content-Type": "application/json"
          }
        });
        health.services.cache = response.ok ? "healthy" : "unhealthy";
      } catch (error) {
        health.services.cache = "error";
      }
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: health
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleAdminHealth, "handleAdminHealth");
__name2(handleAdminHealth, "handleAdminHealth");
function parseTimestamp(timestampParam, dateParam) {
  if (!timestampParam && !dateParam) {
    throw new Error("Either timestamp or date parameter is required");
  }
  if (timestampParam) {
    const timestamp = parseInt(timestampParam, 10);
    if (isNaN(timestamp)) {
      throw new Error("Invalid timestamp format");
    }
    return timestamp;
  }
  if (dateParam) {
    const parsedDate = new Date(dateParam);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(
        "Invalid date format. Use ISO format like 2021-03-02 or 2021-03-02T10:30:00Z"
      );
    }
    return Math.floor(parsedDate.getTime() / 1e3);
  }
  throw new Error("Either timestamp or date parameter is required");
}
__name(parseTimestamp, "parseTimestamp");
__name2(parseTimestamp, "parseTimestamp");
function parseGetRequest(url) {
  const timestampParam = url.searchParams.get("timestamp");
  const dateParam = url.searchParams.get("date");
  const timestamp = parseTimestamp(timestampParam, dateParam);
  const timezone = url.searchParams.get("timezone") || void 0;
  const targetTimezone = url.searchParams.get("targetTimezone") || void 0;
  const formatsParam = url.searchParams.get("formats");
  const outputFormats = formatsParam ? formatsParam.split(",") : [];
  return { timestamp, timezone, targetTimezone, outputFormats };
}
__name(parseGetRequest, "parseGetRequest");
__name2(parseGetRequest, "parseGetRequest");
function parsePostRequest(body) {
  const timestamp = parseTimestamp(body.timestamp?.toString(), body.date?.toString());
  const timezone = body.timezone;
  const targetTimezone = body.targetTimezone;
  const outputFormats = body.outputFormats || [];
  return { timestamp, timezone, targetTimezone, outputFormats };
}
__name(parsePostRequest, "parsePostRequest");
__name2(parsePostRequest, "parsePostRequest");
async function parseConvertRequest(request) {
  if (request.method === "GET") {
    const url = new URL(request.url);
    return parseGetRequest(url);
  } else {
    const body = await request.json();
    return parsePostRequest(body);
  }
}
__name(parseConvertRequest, "parseConvertRequest");
__name2(parseConvertRequest, "parseConvertRequest");
function validateConvertParams(params) {
  if (!params.timestamp || isNaN(params.timestamp)) {
    throw new Error("Invalid timestamp");
  }
  if (params.timestamp < 0) {
    throw new Error("Timestamp cannot be negative");
  }
}
__name(validateConvertParams, "validateConvertParams");
__name2(validateConvertParams, "validateConvertParams");
function convertTimezone(date2, fromTz, toTz) {
  void fromTz;
  void toTz;
  try {
    const utcTime = date2.getTime() + date2.getTimezoneOffset() * 6e4;
    const targetTime = new Date(utcTime);
    return targetTime;
  } catch (error) {
    return date2;
  }
}
__name(convertTimezone, "convertTimezone");
__name2(convertTimezone, "convertTimezone");
function buildDateFormats(params) {
  const date2 = new Date(params.timestamp * 1e3);
  const result = {
    timestamp: params.timestamp,
    iso: date2.toISOString(),
    utc: date2.toUTCString(),
    local: date2.toLocaleString(),
    formats: {}
  };
  for (const format of params.outputFormats) {
    try {
      switch (format.toLowerCase()) {
        case "iso":
          result.formats.iso = date2.toISOString();
          break;
        case "utc":
          result.formats.utc = date2.toUTCString();
          break;
        case "local":
          result.formats.local = date2.toLocaleString();
          break;
        default:
          result.formats[format] = date2.toLocaleString("en-US", { timeZone: format });
      }
    } catch (error) {
      result.formats[format] = "Invalid format";
    }
  }
  if (params.timezone && params.targetTimezone) {
    try {
      const convertedDate = convertTimezone(date2, params.timezone, params.targetTimezone);
      result.converted = {
        timestamp: Math.floor(convertedDate.getTime() / 1e3),
        iso: convertedDate.toISOString(),
        local: convertedDate.toLocaleString()
      };
    } catch (error) {
      result.conversionError = "Invalid timezone conversion";
    }
  }
  return result;
}
__name(buildDateFormats, "buildDateFormats");
__name2(buildDateFormats, "buildDateFormats");
function buildConvertResponse(result, startTime, cached) {
  return new Response(
    JSON.stringify({
      success: true,
      data: result,
      metadata: {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        processingTime: `${Date.now() - startTime}ms`,
        cached
      }
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(buildConvertResponse, "buildConvertResponse");
__name2(buildConvertResponse, "buildConvertResponse");
function buildErrorResponse(error, status = 400) {
  return new Response(
    JSON.stringify({
      error: status === 500 ? "Internal Server Error" : "Bad Request",
      message: error
    }),
    {
      status,
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(buildErrorResponse, "buildErrorResponse");
__name2(buildErrorResponse, "buildErrorResponse");
function generateCacheKey(params) {
  return `${params.timestamp}_${params.outputFormats.join(",")}_${params.timezone || "none"}_${params.targetTimezone || "none"}`;
}
__name(generateCacheKey, "generateCacheKey");
__name2(generateCacheKey, "generateCacheKey");
async function handleConvert(request, env) {
  if (request.method !== "POST" && request.method !== "GET") {
    return buildErrorResponse("Only GET and POST methods are supported", 405);
  }
  const cacheManager = new CacheManager(env);
  const startTime = Date.now();
  try {
    const params = await parseConvertRequest(request);
    validateConvertParams(params);
    const cacheKey = generateCacheKey(params);
    const cachedResult = await cacheManager.get("CONVERT_API", cacheKey);
    if (cachedResult) {
      return buildConvertResponse(cachedResult, startTime, true);
    }
    const result = buildDateFormats(params);
    try {
      await cacheManager.set("CONVERT_API", cacheKey, result);
    } catch (error) {
    }
    return buildConvertResponse(result, startTime, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isClientError = error instanceof Error && (message.includes("timestamp") || message.includes("date") || message.includes("Invalid") || message.includes("required") || message.includes("negative") || message.includes("cannot"));
    const status = isClientError ? 400 : 500;
    return buildErrorResponse(message, status);
  }
}
__name(handleConvert, "handleConvert");
__name2(handleConvert, "handleConvert");
async function handleHealth(request, env) {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Only GET method is supported"
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    const url = new URL(request.url);
    const detailed = url.searchParams.get("detailed") === "true";
    const startTime = Date.now();
    const cacheManager = new CacheManager(env);
    const health = {
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: 0,
      // Not available in Cloudflare Workers
      version: "1.0.0",
      environment: env.NODE_ENV || "production",
      responseTime: 0
    };
    const cacheHealth = await cacheManager.healthCheck();
    const redisStatus = cacheHealth.redis ? "healthy" : "degraded";
    const responseTime = Date.now() - startTime;
    health.responseTime = responseTime;
    const result = {
      ...health,
      services: {
        api: "healthy",
        cache: cacheHealth.status,
        redis: redisStatus
      }
    };
    if (detailed) {
      result.details = {
        memory: {
          used: "N/A (Cloudflare)",
          total: "N/A (Cloudflare)"
        },
        system: {
          platform: "cloudflare-pages",
          runtime: "cloudflare-workers"
        },
        performance: {
          responseTime: `${responseTime}ms`,
          requestsPerSecond: "N/A"
        },
        cache: {
          ...cacheHealth.stats,
          enabled: cacheManager.getRedisStats().enabled
        }
      };
    }
    if (redisStatus === "error" || redisStatus === "unhealthy") {
      result.status = "degraded";
    }
    const statusCode = result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503;
    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Health API Error:", error);
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleHealth, "handleHealth");
__name2(handleHealth, "handleHealth");
async function handleNow(request, _env2) {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Only GET method is supported"
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    const url = new URL(request.url);
    const timezone = url.searchParams.get("timezone");
    const format = url.searchParams.get("format") || "all";
    const now = /* @__PURE__ */ new Date();
    const timestamp = Math.floor(now.getTime() / 1e3);
    const result = {
      timestamp,
      milliseconds: now.getTime(),
      iso: now.toISOString(),
      utc: now.toUTCString(),
      local: now.toLocaleString()
    };
    if (timezone) {
      try {
        result.timezone = {
          name: _timezone,
          time: now.toLocaleString("en-US", { timeZone: timezone }),
          iso: `${now.toLocaleString("sv-SE", { timeZone: timezone }).replace(" ", "T")}Z`
        };
      } catch (error) {
        result.timezoneError = "Invalid timezone";
      }
    }
    if (format !== "all") {
      const filteredResult = { timestamp };
      switch (format.toLowerCase()) {
        case "iso":
          filteredResult.iso = result.iso;
          break;
        case "utc":
          filteredResult.utc = result.utc;
          break;
        case "local":
          filteredResult.local = result.local;
          break;
        case "milliseconds":
          filteredResult.milliseconds = result.milliseconds;
          break;
        default:
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });
      }
      return new Response(JSON.stringify(filteredResult), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Now API Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleNow, "handleNow");
__name2(handleNow, "handleNow");
async function handleV1Routes(request, env, path) {
  const endpoint = path[0] || "";
  switch (endpoint) {
    case "convert":
      return handleV1Convert(request, env);
    case "batch":
      return handleV1Batch(request, env);
    case "formats":
      return handleV1Formats(request, env);
    case "timezones":
      return handleV1Timezones(request, env);
    case "health":
      return handleV1Health(request, env);
    default:
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: `V1 API endpoint /${path.join("/")} not found`,
          availableEndpoints: ["convert", "batch", "formats", "timezones", "health"]
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
  }
}
__name(handleV1Routes, "handleV1Routes");
__name2(handleV1Routes, "handleV1Routes");
async function handleV1Convert(request, _env2) {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Only POST method is supported for v1/convert"
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    const body = await request.json();
    const {
      timestamp,
      outputFormats = [],
      _timezone: _timezone2,
      targetTimezone,
      includeMetadata = false
    } = body;
    if (!timestamp || isNaN(timestamp)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Valid timestamp is required"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const date2 = new Date(timestamp * 1e3);
    const result = {
      input: { timestamp, _timezone: _timezone2, targetTimezone },
      output: {
        timestamp,
        iso: date2.toISOString(),
        utc: date2.toUTCString(),
        local: date2.toLocaleString(),
        unix: timestamp,
        milliseconds: timestamp * 1e3
      }
    };
    if (outputFormats.length > 0) {
      result.output.formats = {};
      for (const format of outputFormats) {
        try {
          result.output.formats[format] = date2.toLocaleString("en-US", { timeZone: format });
        } catch (error) {
          result.output.formats[format] = "Invalid format";
        }
      }
    }
    if (includeMetadata) {
      result.metadata = {
        processingTime: `${Date.now() % 1e3}ms`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        version: "v1"
      };
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleV1Convert, "handleV1Convert");
__name2(handleV1Convert, "handleV1Convert");
async function handleV1Batch(request, _env2) {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Only POST method is supported for v1/batch"
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    const body = await request.json();
    const { timestamps, _outputFormats = [] } = body;
    if (!Array.isArray(timestamps) || timestamps.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Array of timestamps is required"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    if (timestamps.length > 100) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Maximum 100 timestamps allowed per batch"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const results = timestamps.map((timestamp) => {
      if (!timestamp || isNaN(timestamp)) {
        return { error: "Invalid timestamp", timestamp };
      }
      const date2 = new Date(timestamp * 1e3);
      return {
        timestamp,
        iso: date2.toISOString(),
        utc: date2.toUTCString(),
        local: date2.toLocaleString()
      };
    });
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results,
          count: results.length,
          processed: results.filter((r) => !r.error).length,
          errors: results.filter((r) => r.error).length
        }
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleV1Batch, "handleV1Batch");
__name2(handleV1Batch, "handleV1Batch");
async function handleV1Formats(_request2, _env2) {
  const formats = {
    timestamp: "Unix timestamp (seconds since epoch)",
    milliseconds: "Milliseconds since epoch",
    iso: "ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)",
    utc: "UTC string format",
    local: "Local string format",
    custom: "Custom timezone-specific format"
  };
  return new Response(
    JSON.stringify({
      success: true,
      data: { formats }
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(handleV1Formats, "handleV1Formats");
__name2(handleV1Formats, "handleV1Formats");
async function handleV1Timezones(_request2, _env2) {
  const timezones = [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney"
  ];
  return new Response(
    JSON.stringify({
      success: true,
      data: { timezones, count: timezones.length }
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(handleV1Timezones, "handleV1Timezones");
__name2(handleV1Timezones, "handleV1Timezones");
async function handleV1Health(_request2, _env2) {
  return new Response(
    JSON.stringify({
      status: "healthy",
      version: "v1",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(handleV1Health, "handleV1Health");
__name2(handleV1Health, "handleV1Health");
async function handleDateDiff(request, env) {
  const startTime = Date.now();
  const securityManager = new SecurityManager(env);
  const cacheManager = new CacheManager(env);
  const securityCheck = await securityManager.checkRateLimit(_request, RATE_LIMITS.API_GENERAL);
  if (!securityCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate Limit Exceeded",
        message: "Too many requests. Please try again later."
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Only GET and POST methods are supported"
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    let params;
    if (request.method === "GET") {
      const url = new URL(request.url);
      params = {
        startDate: url.searchParams.get("startDate") || "",
        endDate: url.searchParams.get("endDate") || "",
        unit: url.searchParams.get("unit") || "all",
        absolute: url.searchParams.get("absolute") !== "false",
        includeTime: url.searchParams.get("includeTime") === "true"
      };
    } else {
      const body = await request.json();
      params = {
        unit: "all",
        absolute: true,
        includeTime: false,
        ...body
      };
    }
    const validation = securityManager.validateInput(params, {
      startDate: { required: true, type: "string" },
      endDate: { required: true, type: "string" },
      unit: { type: "string" }
    });
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid input parameters",
          details: validation.errors
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const cacheKey = JSON.stringify(params);
    const cachedResult = await cacheManager.get("CONVERT_API", cacheKey);
    if (cachedResult) {
      const response2 = new Response(
        JSON.stringify({
          success: true,
          data: cachedResult,
          metadata: {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            processingTime: `${Date.now() - startTime}ms`,
            cached: true
          }
        }),
        {
          headers: { "Content-Type": "application/json" }
        }
      );
      recordAnalyticsMiddleware(_request, response2, _env, startTime);
      return response2;
    }
    const result = calculateDateDifference2(params);
    try {
      await cacheManager.set("CONVERT_API", cacheKey, result);
    } catch (error) {
      console.error("Failed to cache date diff result:", error);
    }
    const response = new Response(
      JSON.stringify({
        success: true,
        data: result,
        metadata: {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          processingTime: `${Date.now() - startTime}ms`,
          cached: false
        }
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
    recordAnalyticsMiddleware(_request, response, _env, startTime);
    return response;
  } catch (error) {
    console.error("Date diff API error:", error);
    const response = new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
    recordAnalyticsMiddleware(_request, response, _env, startTime);
    return response;
  }
}
__name(handleDateDiff, "handleDateDiff");
__name2(handleDateDiff, "handleDateDiff");
function calculateDateDifference2(params) {
  let startDate;
  let endDate;
  try {
    startDate = new Date(params.startDate);
    endDate = new Date(params.endDate);
  } catch (error) {
    throw new Error("Invalid date format");
  }
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid date format");
  }
  const rawDiff = endDate.getTime() - startDate.getTime();
  const absoluteDiff = Math.abs(rawDiff);
  const direction = rawDiff >= 0 ? "future" : "past";
  const diff = params.absolute ? absoluteDiff : rawDiff;
  const milliseconds = diff;
  const seconds = Math.floor(diff / 1e3);
  const minutes = Math.floor(diff / (1e3 * 60));
  const hours = Math.floor(diff / (1e3 * 60 * 60));
  const days = Math.floor(diff / (1e3 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  let months = 0;
  let years = 0;
  if (params.includeTime) {
    months = Math.floor(days / 30.44);
    years = Math.floor(days / 365.25);
  } else {
    const tempStart = new Date(startDate);
    const tempEnd = new Date(endDate);
    years = tempEnd.getFullYear() - tempStart.getFullYear();
    months = (tempEnd.getFullYear() - tempStart.getFullYear()) * 12 + (tempEnd.getMonth() - tempStart.getMonth());
    if (tempEnd.getDate() < tempStart.getDate()) {
      months--;
    }
    years = Math.floor(months / 12);
  }
  const humanReadable = generateHumanReadable(absoluteDiff, direction, params.absolute);
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    difference: {
      milliseconds,
      seconds,
      minutes,
      hours,
      days,
      weeks,
      months: Math.abs(months),
      years: Math.abs(years)
    },
    humanReadable,
    direction,
    absolute: params.absolute || false
  };
}
__name(calculateDateDifference2, "calculateDateDifference2");
__name2(calculateDateDifference2, "calculateDateDifference");
function generateHumanReadable(diff, direction, absolute) {
  const days = Math.floor(diff / (1e3 * 60 * 60 * 24));
  const hours = Math.floor(diff % (1e3 * 60 * 60 * 24) / (1e3 * 60 * 60));
  const minutes = Math.floor(diff % (1e3 * 60 * 60) / (1e3 * 60));
  const seconds = Math.floor(diff % (1e3 * 60) / 1e3);
  const parts = [];
  if (days > 0) {
    parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  }
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
  }
  if (seconds > 0 && parts.length < 2) {
    parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);
  }
  if (parts.length === 0) {
    return "Less than a second";
  }
  let result = parts.slice(0, 2).join(", ");
  if (!absolute && direction === "past") {
    result += " ago";
  } else if (!absolute && direction === "future") {
    result = `in ${result}`;
  }
  return result;
}
__name(generateHumanReadable, "generateHumanReadable");
__name2(generateHumanReadable, "generateHumanReadable");
var FORMAT_TEMPLATES3 = {
  iso: "YYYY-MM-DDTHH:mm:ss.sssZ",
  "iso-date": "YYYY-MM-DD",
  "iso-time": "HH:mm:ss",
  "us-date": "MM/DD/YYYY",
  "us-datetime": "MM/DD/YYYY HH:mm:ss",
  "eu-date": "DD/MM/YYYY",
  "eu-datetime": "DD/MM/YYYY HH:mm:ss",
  readable: "MMMM Do, YYYY",
  "readable-full": "dddd, MMMM Do, YYYY [at] h:mm A",
  compact: "YYYYMMDD",
  "compact-time": "YYYYMMDDHHmmss",
  unix: "X",
  "unix-ms": "x",
  rfc2822: "ddd, DD MMM YYYY HH:mm:ss ZZ",
  sql: "YYYY-MM-DD HH:mm:ss",
  filename: "YYYY-MM-DD_HH-mm-ss",
  log: "YYYY-MM-DD HH:mm:ss.SSS"
};
async function handleFormat(request, env) {
  const startTime = Date.now();
  const securityManager = new SecurityManager(env);
  const cacheManager = new CacheManager(env);
  const securityCheck = await securityManager.checkRateLimit(request, RATE_LIMITS.API_GENERAL);
  if (!securityCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate Limit Exceeded",
        message: "Too many requests. Please try again later."
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Only GET and POST methods are supported"
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    let params;
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/templates")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              templates: FORMAT_TEMPLATES3,
              examples: generateTemplateExamples()
            },
            metadata: {
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              processingTime: `${Date.now() - startTime}ms`
            }
          }),
          {
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      params = {
        timestamp: url.searchParams.get("timestamp") ? parseInt(url.searchParams.get("timestamp")) : void 0,
        date: url.searchParams.get("date") || void 0,
        format: url.searchParams.get("format") || "iso",
        timezone: url.searchParams.get("timezone") || void 0,
        locale: url.searchParams.get("locale") || "en"
      };
    } else {
      const body = await request.json();
      params = {
        format: "iso",
        locale: "en",
        ...body
      };
    }
    const validation = securityManager.validateInput(params, {
      format: { required: true, type: "string", maxLength: 100 },
      timezone: { type: "string", maxLength: 50 },
      locale: { type: "string", maxLength: 10 }
    });
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid input parameters",
          details: validation.errors
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    if (!params.timestamp && !params._date) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Either timestamp or date parameter is required"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const cacheKey = JSON.stringify(params);
    const cachedResult = await cacheManager.get("CONVERT_API", cacheKey);
    if (cachedResult) {
      const response2 = new Response(
        JSON.stringify({
          success: true,
          data: cachedResult,
          metadata: {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            processingTime: `${Date.now() - startTime}ms`,
            cached: true
          }
        }),
        {
          headers: { "Content-Type": "application/json" }
        }
      );
      recordAnalyticsMiddleware(_request, response2, _env, startTime);
      return response2;
    }
    const result = formatDate2(params);
    try {
      await cacheManager.set("CONVERT_API", cacheKey, result);
    } catch (error) {
      console.error("Failed to cache format result:", error);
    }
    const response = new Response(
      JSON.stringify({
        success: true,
        data: result,
        metadata: {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          processingTime: `${Date.now() - startTime}ms`,
          cached: false
        }
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
    recordAnalyticsMiddleware(_request, response, _env, startTime);
    return response;
  } catch (error) {
    console.error("Format API error:", error);
    const response = new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
    recordAnalyticsMiddleware(_request, response, _env, startTime);
    return response;
  }
}
__name(handleFormat, "handleFormat");
__name2(handleFormat, "handleFormat");
function formatDate2(params) {
  let date2;
  if (params.timestamp) {
    date2 = new Date(params.timestamp * 1e3);
  } else if (params._date) {
    date2 = new Date(params._date);
  } else {
    throw new Error("No date provided");
  }
  if (isNaN(date2.getTime())) {
    throw new Error("Invalid date");
  }
  let formatString = params.format;
  if (FORMAT_TEMPLATES3[params.format]) {
    formatString = FORMAT_TEMPLATES3[params.format];
  }
  const formatted = applyFormat(_date, formatString, params._timezone, params._locale);
  return {
    input: {
      timestamp: params.timestamp,
      date: params._date,
      format: params.format,
      timezone: params._timezone,
      locale: params._locale
    },
    output: {
      formatted,
      formatString,
      originalDate: date2.toISOString()
    },
    template: FORMAT_TEMPLATES3[params.format] ? {
      name: params.format,
      pattern: FORMAT_TEMPLATES3[params.format]
    } : null
  };
}
__name(formatDate2, "formatDate2");
__name2(formatDate2, "formatDate");
function applyFormat(date2, format, _timezone2, _locale) {
  const year = date2.getFullYear();
  const month = date2.getMonth() + 1;
  const day = date2.getDate();
  const hours = date2.getHours();
  const minutes = date2.getMinutes();
  const seconds = date2.getSeconds();
  const milliseconds = date2.getMilliseconds();
  const monthNames2 = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const monthNamesShort2 = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  const dayNames2 = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayNamesShort2 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const getOrdinalSuffix2 = /* @__PURE__ */ __name2((day2) => {
    if (day2 >= 11 && day2 <= 13) return "th";
    switch (day2 % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }, "getOrdinalSuffix");
  if (format === "X") {
    return Math.floor(date2.getTime() / 1e3).toString();
  }
  if (format === "x") {
    return date2.getTime().toString();
  }
  let result = format.replace(/YYYY/g, year.toString()).replace(/YY/g, year.toString().slice(-2)).replace(/MMMM/g, monthNames2[month - 1]).replace(/MMM/g, monthNamesShort2[month - 1]).replace(/MM/g, month.toString().padStart(2, "0")).replace(/\bM\b/g, month.toString()).replace(/dddd/g, dayNames2[date2.getDay()]).replace(/ddd/g, dayNamesShort2[date2.getDay()]).replace(/Do/g, day.toString() + getOrdinalSuffix2(day)).replace(/DD/g, day.toString().padStart(2, "0")).replace(/\bD\b/g, day.toString()).replace(/HH/g, hours.toString().padStart(2, "0")).replace(/hh/g, (hours % 12 || 12).toString().padStart(2, "0")).replace(/\bH\b/g, hours.toString()).replace(/\bh\b/g, (hours % 12 || 12).toString()).replace(/mm/g, minutes.toString().padStart(2, "0")).replace(/\bm\b/g, minutes.toString()).replace(/ss/g, seconds.toString().padStart(2, "0")).replace(/\bs\b/g, seconds.toString()).replace(/SSS/g, milliseconds.toString().padStart(3, "0")).replace(/sss/g, milliseconds.toString().padStart(3, "0")).replace(/A/g, hours >= 12 ? "PM" : "AM").replace(/a/g, hours >= 12 ? "pm" : "am");
  if (result.includes("Z")) {
    result = result.replace(/Z/g, "Z");
  }
  return result;
}
__name(applyFormat, "applyFormat");
__name2(applyFormat, "applyFormat");
function generateTemplateExamples() {
  const now = /* @__PURE__ */ new Date();
  const examples = {};
  for (const [name, template] of Object.entries(FORMAT_TEMPLATES3)) {
    try {
      examples[name] = applyFormat(now, template);
    } catch (error) {
      examples[name] = "Error formatting";
    }
  }
  return examples;
}
__name(generateTemplateExamples, "generateTemplateExamples");
__name2(generateTemplateExamples, "generateTemplateExamples");
var TIMEZONE_DATA2 = [
  {
    id: "America/New_York",
    name: "Eastern Time",
    abbreviation: "EST/EDT",
    offset: "-05:00",
    offsetMinutes: -300,
    country: "US",
    region: "America",
    city: "New York",
    isDST: false,
    utcOffset: "UTC-5"
  },
  {
    id: "America/Los_Angeles",
    name: "Pacific Time",
    abbreviation: "PST/PDT",
    offset: "-08:00",
    offsetMinutes: -480,
    country: "US",
    region: "America",
    city: "Los Angeles",
    isDST: false,
    utcOffset: "UTC-8"
  },
  {
    id: "Europe/London",
    name: "Greenwich Mean Time",
    abbreviation: "GMT/BST",
    offset: "+00:00",
    offsetMinutes: 0,
    country: "GB",
    region: "Europe",
    city: "London",
    isDST: false,
    utcOffset: "UTC+0"
  },
  {
    id: "Europe/Paris",
    name: "Central European Time",
    abbreviation: "CET/CEST",
    offset: "+01:00",
    offsetMinutes: 60,
    country: "FR",
    region: "Europe",
    city: "Paris",
    isDST: false,
    utcOffset: "UTC+1"
  },
  {
    id: "Asia/Tokyo",
    name: "Japan Standard Time",
    abbreviation: "JST",
    offset: "+09:00",
    offsetMinutes: 540,
    country: "JP",
    region: "Asia",
    city: "Tokyo",
    isDST: false,
    utcOffset: "UTC+9"
  },
  {
    id: "Asia/Shanghai",
    name: "China Standard Time",
    abbreviation: "CST",
    offset: "+08:00",
    offsetMinutes: 480,
    country: "CN",
    region: "Asia",
    city: "Shanghai",
    isDST: false,
    utcOffset: "UTC+8"
  },
  {
    id: "Australia/Sydney",
    name: "Australian Eastern Time",
    abbreviation: "AEST/AEDT",
    offset: "+10:00",
    offsetMinutes: 600,
    country: "AU",
    region: "Australia",
    city: "Sydney",
    isDST: false,
    utcOffset: "UTC+10"
  },
  {
    id: "UTC",
    name: "Coordinated Universal Time",
    abbreviation: "UTC",
    offset: "+00:00",
    offsetMinutes: 0,
    country: "",
    region: "UTC",
    city: "",
    isDST: false,
    utcOffset: "UTC+0"
  }
];
async function handleTimezonesEnhanced(request, env) {
  const startTime = Date.now();
  const securityManager = new SecurityManager(env);
  const cacheManager = new CacheManager(env);
  const securityCheck = await securityManager.checkRateLimit(request, RATE_LIMITS.API_GENERAL);
  if (!securityCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate Limit Exceeded",
        message: "Too many requests. Please try again later."
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Only GET method is supported"
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const region = url.searchParams.get("region") || "";
    const country = url.searchParams.get("country") || "";
    const offset = url.searchParams.get("offset") || "";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const format = url.searchParams.get("format") || "detailed";
    const cacheKey = `timezones:${query}:${region}:${country}:${offset}:${limit}:${format}`;
    const cachedResult = await cacheManager.get("TIMEZONES", cacheKey);
    if (cachedResult) {
      const response2 = new Response(
        JSON.stringify({
          success: true,
          data: cachedResult,
          metadata: {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            processingTime: `${Date.now() - startTime}ms`,
            cached: true
          }
        }),
        {
          headers: { "Content-Type": "application/json" }
        }
      );
      recordAnalyticsMiddleware(_request, response2, _env, startTime);
      return response2;
    }
    let filteredTimezones = TIMEZONE_DATA2;
    if (query) {
      const searchTerm = query.toLowerCase();
      filteredTimezones = filteredTimezones.filter(
        (tz) => tz.id.toLowerCase().includes(searchTerm) || tz.name.toLowerCase().includes(searchTerm) || tz.city.toLowerCase().includes(searchTerm) || tz.abbreviation.toLowerCase().includes(searchTerm)
      );
    }
    if (region) {
      filteredTimezones = filteredTimezones.filter(
        (tz) => tz.region.toLowerCase() === region.toLowerCase()
      );
    }
    if (country) {
      filteredTimezones = filteredTimezones.filter(
        (tz) => tz.country.toLowerCase() === country.toLowerCase()
      );
    }
    if (offset) {
      filteredTimezones = filteredTimezones.filter(
        (tz) => tz.offset === offset || tz.utcOffset.toLowerCase().includes(offset.toLowerCase())
      );
    }
    const limitedTimezones = filteredTimezones.slice(0, Math.min(limit, 100));
    let result;
    if (format === "simple") {
      result = {
        timezones: limitedTimezones.map((tz) => ({
          id: tz.id,
          name: tz.name,
          offset: tz.offset
        })),
        total: limitedTimezones.length,
        filtered: filteredTimezones.length
      };
    } else {
      result = {
        timezones: limitedTimezones,
        total: limitedTimezones.length,
        filtered: filteredTimezones.length,
        regions: getUniqueRegions(),
        countries: getUniqueCountries(),
        offsets: getUniqueOffsets(),
        search: {
          query,
          region,
          country,
          offset,
          limit
        }
      };
    }
    try {
      await cacheManager.set("TIMEZONES", cacheKey, result);
    } catch (error) {
      console.error("Failed to cache timezones result:", error);
    }
    const response = new Response(
      JSON.stringify({
        success: true,
        data: result,
        metadata: {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          processingTime: `${Date.now() - startTime}ms`,
          cached: false
        }
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
    recordAnalyticsMiddleware(_request, response, _env, startTime);
    return response;
  } catch (error) {
    console.error("Timezones API error:", error);
    const response = new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
    recordAnalyticsMiddleware(_request, response, _env, startTime);
    return response;
  }
}
__name(handleTimezonesEnhanced, "handleTimezonesEnhanced");
__name2(handleTimezonesEnhanced, "handleTimezonesEnhanced");
function getUniqueRegions() {
  return [...new Set(TIMEZONE_DATA2.map((tz) => tz.region))].filter(Boolean).sort();
}
__name(getUniqueRegions, "getUniqueRegions");
__name2(getUniqueRegions, "getUniqueRegions");
function getUniqueCountries() {
  return [...new Set(TIMEZONE_DATA2.map((tz) => tz.country))].filter(Boolean).sort();
}
__name(getUniqueCountries, "getUniqueCountries");
__name2(getUniqueCountries, "getUniqueCountries");
function getUniqueOffsets() {
  return [...new Set(TIMEZONE_DATA2.map((tz) => tz.offset))].sort();
}
__name(getUniqueOffsets, "getUniqueOffsets");
__name2(getUniqueOffsets, "getUniqueOffsets");
var COMMON_HOLIDAYS = {
  US: [
    "2024-01-01",
    "2024-07-04",
    "2024-12-25",
    // New Year, Independence Day, Christmas
    "2025-01-01",
    "2025-07-04",
    "2025-12-25"
  ],
  UK: [
    "2024-01-01",
    "2024-12-25",
    "2024-12-26",
    // New Year, Christmas, Boxing Day
    "2025-01-01",
    "2025-12-25",
    "2025-12-26"
  ],
  CN: [
    "2024-01-01",
    "2024-02-10",
    "2024-10-01",
    // New Year, Spring Festival, National Day
    "2025-01-01",
    "2025-01-29",
    "2025-10-01"
  ]
};
async function handleWorkdays(request, env) {
  const startTime = Date.now();
  const securityManager = new SecurityManager(env);
  const cacheManager = new CacheManager(env);
  const securityCheck = await securityManager.checkRateLimit(request, RATE_LIMITS.API_GENERAL);
  if (!securityCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate Limit Exceeded",
        message: "Too many requests. Please try again later."
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Only GET and POST methods are supported"
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    let params;
    if (request.method === "GET") {
      const url = new URL(request.url);
      params = {
        startDate: url.searchParams.get("startDate") || "",
        endDate: url.searchParams.get("endDate") || void 0,
        days: url.searchParams.get("days") ? parseInt(url.searchParams.get("days")) : void 0,
        excludeWeekends: url.searchParams.get("excludeWeekends") !== "false",
        excludeHolidays: url.searchParams.get("excludeHolidays") === "true",
        country: url.searchParams.get("country") || void 0,
        includeStartDate: url.searchParams.get("includeStartDate") !== "false",
        includeEndDate: url.searchParams.get("includeEndDate") !== "false"
      };
    } else {
      const body = await request.json();
      params = {
        excludeWeekends: true,
        excludeHolidays: false,
        includeStartDate: true,
        includeEndDate: true,
        ...body
      };
    }
    const validation = securityManager.validateInput(params, {
      startDate: { required: true, type: "string", pattern: /^\d{4}-\d{2}-\d{2}$/ },
      endDate: { type: "string", pattern: /^\d{4}-\d{2}-\d{2}$/ },
      days: { type: "number", min: 1, max: 3650 },
      // Max 10 years
      country: { type: "string", maxLength: 2 }
    });
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid input parameters",
          details: validation.errors
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const cacheKey = JSON.stringify(params);
    const cachedResult = await cacheManager.get("CONVERT_API", cacheKey);
    if (cachedResult) {
      const response2 = new Response(
        JSON.stringify({
          success: true,
          data: cachedResult,
          metadata: {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            processingTime: `${Date.now() - startTime}ms`,
            cached: true
          }
        }),
        {
          headers: { "Content-Type": "application/json" }
        }
      );
      recordAnalyticsMiddleware(request, response2, env, startTime);
      return response2;
    }
    const result = calculateWorkdays2(params);
    try {
      await cacheManager.set("CONVERT_API", cacheKey, result);
    } catch (error) {
      console.error("Failed to cache workdays result:", error);
    }
    const response = new Response(
      JSON.stringify({
        success: true,
        data: result,
        metadata: {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          processingTime: `${Date.now() - startTime}ms`,
          cached: false
        }
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
    recordAnalyticsMiddleware(request, response, env, startTime);
    return response;
  } catch (error) {
    console.error("Workdays API error:", error);
    const response = new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
    recordAnalyticsMiddleware(request, response, env, startTime);
    return response;
  }
}
__name(handleWorkdays, "handleWorkdays");
__name2(handleWorkdays, "handleWorkdays");
function calculateWorkdays2(params) {
  const startDate = new Date(params.startDate);
  let endDate;
  if (params.endDate) {
    endDate = new Date(params.endDate);
  } else if (params.days) {
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + params.days - 1);
  } else {
    throw new Error("Either endDate or days parameter is required");
  }
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid date format");
  }
  if (endDate < startDate) {
    throw new Error("End date must be after start date");
  }
  const holidays = params.holidays || (params.country ? COMMON_HOLIDAYS[params.country.toUpperCase()] || [] : []);
  const holidaySet = new Set(holidays);
  let totalDays = 0;
  let workdays = 0;
  let weekends = 0;
  let holidayCount = 0;
  const excludedDates = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayOfWeek = currentDate.getDay();
    totalDays++;
    let isExcluded = false;
    if (params.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      weekends++;
      isExcluded = true;
      excludedDates.push(`${dateStr} (weekend)`);
    }
    if (params.excludeHolidays && holidaySet.has(dateStr)) {
      holidayCount++;
      isExcluded = true;
      excludedDates.push(`${dateStr} (holiday)`);
    }
    if (!isExcluded) {
      workdays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  let businessDaysOnly = 0;
  const businessDate = new Date(startDate);
  while (businessDate <= endDate) {
    const dayOfWeek = businessDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysOnly++;
    }
    businessDate.setDate(businessDate.getDate() + 1);
  }
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    totalDays,
    workdays,
    weekends,
    holidays: holidayCount,
    excludedDates,
    businessDaysOnly
  };
}
__name(calculateWorkdays2, "calculateWorkdays2");
__name2(calculateWorkdays2, "calculateWorkdays");
async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const hostname = url.hostname;
  const path = params.path || [];
  const isApiSubdomain = hostname === "api.tsconv.com";
  const apiPath = isApiSubdomain ? path : path;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    let response;
    if (apiPath.length === 0) {
      response = new Response(
        JSON.stringify({
          message: "Timestamp Converter API",
          version: "1.0.0",
          domain: hostname,
          endpoints: isApiSubdomain ? [
            "/convert",
            "/now",
            "/health",
            "/workdays",
            "/date-diff",
            "/format",
            "/timezones",
            "/timezone-convert",
            "/timezone-difference",
            "/timezone-info",
            "/batch-convert",
            "/formats",
            "/visualization",
            "/v1/*",
            "/admin/*"
          ] : [
            "/api/convert",
            "/api/now",
            "/api/health",
            "/api/workdays",
            "/api/date-diff",
            "/api/format",
            "/api/timezones",
            "/api/timezone-convert",
            "/api/timezone-difference",
            "/api/timezone-info",
            "/api/batch-convert",
            "/api/formats",
            "/api/visualization",
            "/api/v1/*",
            "/api/admin/*"
          ]
        }),
        {
          headers: { "Content-Type": "application/json" }
        }
      );
    } else if (apiPath[0] === "convert") {
      response = await handleConvert(request, env);
    } else if (apiPath[0] === "now") {
      response = await handleNow(request, env);
    } else if (apiPath[0] === "health") {
      response = await handleHealth(request, env);
    } else if (apiPath[0] === "v1") {
      response = await handleV1Routes(request, env, apiPath.slice(1));
    } else if (apiPath[0] === "admin") {
      response = await handleAdminRoutes(request, env, apiPath.slice(1));
    } else if (apiPath[0] === "workdays") {
      response = await handleWorkdays(request, env);
    } else if (apiPath[0] === "date-diff") {
      response = await handleDateDiff(request, env);
    } else if (apiPath[0] === "format") {
      response = await handleFormat(request, env);
    } else if (apiPath[0] === "timezones") {
      response = await handleTimezonesEnhanced(request, env);
    } else {
      response = new Response(
        JSON.stringify({
          error: "Not Found",
          message: `API endpoint /${apiPath.join("/")} not found`,
          domain: hostname,
          availableEndpoints: isApiSubdomain ? ["/convert", "/now", "/health", "/v1/*", "/admin/*"] : ["/api/convert", "/api/now", "/api/health", "/v1/*", "/api/admin/*"]
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    return new Response(response.body, { ...response, headers: newHeaders });
  } catch (error) {
    console.error("API Error:", error);
    const errorResponse = new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
    return errorResponse;
  }
}
__name(onRequest, "onRequest");
__name2(onRequest, "onRequest");
var routes = [
  {
    routePath: "/api/format/templates",
    mountPath: "/api/format",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/format/templates",
    mountPath: "/api/format",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/date-diff",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/date-diff",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions2]
  },
  {
    routePath: "/api/format",
    mountPath: "/api/format",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/format",
    mountPath: "/api/format",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions3]
  },
  {
    routePath: "/api/timezones",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/timezones",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions4]
  },
  {
    routePath: "/api/version",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/workdays",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/workdays",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions5]
  },
  {
    routePath: "/api/:path*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-ZnJwIg/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-ZnJwIg/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.945890114993989.js.map
