export default function TimezoneConversion() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Timezone Conversion</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Convert timestamps between different timezones programmatically. Learn best practices for handling timezone-aware applications.
        </p>
      </div>

      <div className="space-y-8">
        {/* JavaScript */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-yellow-500">📄</span> JavaScript
          </h2>
        </div>

        {/* Python */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-blue-500">🐍</span> Python
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`from datetime import datetime
import pytz

timestamp = 1640995200
utc_dt = datetime.fromtimestamp(timestamp, tz=pytz.UTC)

# Convert to different timezones
ny_tz = pytz.timezone('America/New_York')
tokyo_tz = pytz.timezone('Asia/Tokyo')
london_tz = pytz.timezone('Europe/London')

ny_time = utc_dt.astimezone(ny_tz)
tokyo_time = utc_dt.astimezone(tokyo_tz)
london_time = utc_dt.astimezone(london_tz)

print(f"UTC: {utc_dt}")
print(f"New York: {ny_time}")
print(f"Tokyo: {tokyo_time}")
print(f"London: {london_time}")

# Convert back to timestamp
local_timestamp = int(ny_time.timestamp())
print(f"Same timestamp: {local_timestamp}")  # Still 1640995200`}</code></pre>
        </div>

        {/* Java */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-red-500">☕</span> Java
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`import java.time.*;
import java.time.format.DateTimeFormatter;

long timestamp = 1640995200L;
Instant instant = Instant.ofEpochSecond(timestamp);

// Convert to different timezones
ZonedDateTime nyTime = instant.atZone(ZoneId.of("America/New_York"));
ZonedDateTime tokyoTime = instant.atZone(ZoneId.of("Asia/Tokyo"));
ZonedDateTime londonTime = instant.atZone(ZoneId.of("Europe/London"));

DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z");

System.out.println("UTC: " + instant);
System.out.println("New York: " + nyTime.format(formatter));
System.out.println("Tokyo: " + tokyoTime.format(formatter));
System.out.println("London: " + londonTime.format(formatter));

// Get timezone offset
ZoneOffset offset = nyTime.getOffset();
System.out.println("NY offset: " + offset); // -05:00 or -04:00 (DST)`}</code></pre>
        </div>

        {/* PHP */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-purple-500">🐘</span> PHP
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`<?php
$timestamp = 1640995200;

// Create DateTime in UTC
$utcDate = new DateTime("@$timestamp", new DateTimeZone('UTC'));

// Convert to different timezones
$nyDate = clone $utcDate;
$nyDate->setTimezone(new DateTimeZone('America/New_York'));

$tokyoDate = clone $utcDate;
$tokyoDate->setTimezone(new DateTimeZone('Asia/Tokyo'));

$londonDate = clone $utcDate;
$londonDate->setTimezone(new DateTimeZone('Europe/London'));

echo "UTC: " . $utcDate->format('Y-m-d H:i:s T') . "\n";
echo "New York: " . $nyDate->format('Y-m-d H:i:s T') . "\n";
echo "Tokyo: " . $tokyoDate->format('Y-m-d H:i:s T') . "\n";
echo "London: " . $londonDate->format('Y-m-d H:i:s T') . "\n";

// Get timezone offset
echo "NY offset: " . $nyDate->format('P') . "\n"; // -05:00 or -04:00
?>`}</code></pre>
        </div>

        {/* Go */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-cyan-500">🐹</span> Go
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`package main

import (
    "fmt"
    "time"
)

func main() {
    timestamp := int64(1640995200)
    utcTime := time.Unix(timestamp, 0).UTC()
    
    // Load timezones
    nyLoc, _ := time.LoadLocation("America/New_York")
    tokyoLoc, _ := time.LoadLocation("Asia/Tokyo")
    londonLoc, _ := time.LoadLocation("Europe/London")
    
    // Convert to different timezones
    nyTime := utcTime.In(nyLoc)
    tokyoTime := utcTime.In(tokyoLoc)
    londonTime := utcTime.In(londonLoc)
    
    fmt.Printf("UTC: %s\n", utcTime.Format("2006-01-02 15:04:05 MST"))
    fmt.Printf("New York: %s\n", nyTime.Format("2006-01-02 15:04:05 MST"))
    fmt.Printf("Tokyo: %s\n", tokyoTime.Format("2006-01-02 15:04:05 MST"))
    fmt.Printf("London: %s\n", londonTime.Format("2006-01-02 15:04:05 MST"))
    
    // Get timezone offset
    _, offset := nyTime.Zone()
    fmt.Printf("NY offset: %d hours\n", offset/3600)
}`}</code></pre>
        </div>

        {/* C# */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-500">🔷</span> C#
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`using System;

long timestamp = 1640995200;
DateTimeOffset utcTime = DateTimeOffset.FromUnixTimeSeconds(timestamp);

// Convert to different timezones
TimeZoneInfo nyTz = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
TimeZoneInfo tokyoTz = TimeZoneInfo.FindSystemTimeZoneById("Tokyo Standard Time");
TimeZoneInfo londonTz = TimeZoneInfo.FindSystemTimeZoneById("GMT Standard Time");

DateTimeOffset nyTime = TimeZoneInfo.ConvertTime(utcTime, nyTz);
DateTimeOffset tokyoTime = TimeZoneInfo.ConvertTime(utcTime, tokyoTz);
DateTimeOffset londonTime = TimeZoneInfo.ConvertTime(utcTime, londonTz);

Console.WriteLine($"UTC: {utcTime:yyyy-MM-dd HH:mm:ss zzz}");
Console.WriteLine($"New York: {nyTime:yyyy-MM-dd HH:mm:ss zzz}");
Console.WriteLine($"Tokyo: {tokyoTime:yyyy-MM-dd HH:mm:ss zzz}");
Console.WriteLine($"London: {londonTime:yyyy-MM-dd HH:mm:ss zzz}");

// Get timezone offset
Console.WriteLine($"NY offset: {nyTime.Offset}");`}</code></pre>
        </div>

        {/* Best Practices */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border-l-4 border-yellow-400">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800 dark:text-yellow-200">⚠️ Important Rules</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ <strong>Always store timestamps in UTC</strong> - Unix timestamps are UTC by definition</li>
            <li>✅ <strong>Convert to local timezone only for display</strong> - Keep calculations in UTC</li>
            <li>✅ <strong>Use IANA timezone identifiers</strong> - "America/New_York" not "EST"</li>
            <li>✅ <strong>Handle DST transitions</strong> - Timezone libraries handle this automatically</li>
            <li>❌ <strong>Never store local time without timezone info</strong> - Ambiguous and error-prone</li>
          </ul>
        </div>
      </div>
    </article>
  );
}
