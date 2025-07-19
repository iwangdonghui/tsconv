export default function FormatTimestamps() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Format Timestamps</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Convert Unix timestamps to human-readable formats and custom date patterns across different programming languages.
        </p>
      </div>

      <div className="space-y-8">
        {/* JavaScript */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-yellow-500">📄</span> JavaScript
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`const timestamp = 1640995200; // 2022-01-01 00:00:00 UTC
const date = new Date(timestamp * 1000);

// Built-in formats
console.log(date.toString());        // Sat Jan 01 2022 00:00:00 GMT+0000
console.log(date.toISOString());     // 2022-01-01T00:00:00.000Z
console.log(date.toDateString());    // Sat Jan 01 2022
console.log(date.toTimeString());    // 00:00:00 GMT+0000

// Locale-specific formatting
console.log(date.toLocaleDateString('en-US')); // 1/1/2022
console.log(date.toLocaleDateString('en-GB')); // 01/01/2022
console.log(date.toLocaleDateString('de-DE')); // 1.1.2022

// Custom formatting with Intl.DateTimeFormat
const formatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});
console.log(formatter.format(date)); // January 1, 2022 at 12:00 AM`}</code></pre>
        </div>

        {/* Python */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-blue-500">🐍</span> Python
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`from datetime import datetime
import time

timestamp = 1640995200
dt = datetime.fromtimestamp(timestamp)

# Built-in formats
print(dt.isoformat())           # 2022-01-01T00:00:00
print(dt.strftime('%Y-%m-%d'))  # 2022-01-01
print(dt.strftime('%B %d, %Y')) # January 01, 2022
print(dt.strftime('%A, %b %d')) # Saturday, Jan 01

# Custom formats
print(dt.strftime('%Y-%m-%d %H:%M:%S'))     # 2022-01-01 00:00:00
print(dt.strftime('%d/%m/%Y %I:%M %p'))     # 01/01/2022 12:00 AM
print(dt.strftime('%c'))                    # Sat Jan  1 00:00:00 2022`}</code></pre>
        </div>

        {/* Java */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-red-500">☕</span> Java
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

long timestamp = 1640995200L;
Instant instant = Instant.ofEpochSecond(timestamp);
LocalDateTime dateTime = LocalDateTime.ofInstant(instant, ZoneId.systemDefault());

// Built-in formats
System.out.println(instant.toString());              // 2022-01-01T00:00:00Z
System.out.println(dateTime.toString());            // 2022-01-01T00:00:00

// Custom formatting
DateTimeFormatter formatter1 = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
DateTimeFormatter formatter2 = DateTimeFormatter.ofPattern("MMMM dd, yyyy");
DateTimeFormatter formatter3 = DateTimeFormatter.ofPattern("EEEE, MMM dd");

System.out.println(dateTime.format(formatter1));    // 2022-01-01 00:00:00
System.out.println(dateTime.format(formatter2));    // January 01, 2022
System.out.println(dateTime.format(formatter3));    // Saturday, Jan 01`}</code></pre>
        </div>

        {/* PHP */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-purple-500">🐘</span> PHP
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`<?php
$timestamp = 1640995200;
$date = new DateTime("@$timestamp");

// Built-in formats
echo $date->format('c');                    // 2022-01-01T00:00:00+00:00
echo $date->format('Y-m-d');               // 2022-01-01
echo $date->format('F j, Y');              // January 1, 2022
echo $date->format('l, M j');              // Saturday, Jan 1

// Custom formats
echo $date->format('Y-m-d H:i:s');         // 2022-01-01 00:00:00
echo $date->format('d/m/Y g:i A');         // 01/01/2022 12:00 AM
echo $date->format('r');                   // Sat, 01 Jan 2022 00:00:00 +0000
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
    t := time.Unix(timestamp, 0)
    
    // Built-in formats
    fmt.Println(t.Format(time.RFC3339))     // 2022-01-01T00:00:00Z
    fmt.Println(t.Format(time.RFC822))      // 01 Jan 22 00:00 UTC
    fmt.Println(t.Format("2006-01-02"))     // 2022-01-01
    
    // Custom formats (Go's reference time: Mon Jan 2 15:04:05 MST 2006)
    fmt.Println(t.Format("2006-01-02 15:04:05"))     // 2022-01-01 00:00:00
    fmt.Println(t.Format("January 2, 2006"))         // January 1, 2022
    fmt.Println(t.Format("Monday, Jan 2"))           // Saturday, Jan 1
}`}</code></pre>
        </div>

        {/* C# */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-500">🔷</span> C#
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`using System;

long timestamp = 1640995200;
DateTime dateTime = DateTimeOffset.FromUnixTimeSeconds(timestamp).DateTime;

// Built-in formats
Console.WriteLine(dateTime.ToString("O"));          // 2022-01-01T00:00:00.0000000
Console.WriteLine(dateTime.ToString("yyyy-MM-dd")); // 2022-01-01
Console.WriteLine(dateTime.ToString("MMMM dd, yyyy")); // January 01, 2022

// Custom formats
Console.WriteLine(dateTime.ToString("yyyy-MM-dd HH:mm:ss")); // 2022-01-01 00:00:00
Console.WriteLine(dateTime.ToString("dd/MM/yyyy h:mm tt"));  // 01/01/2022 12:00 AM
Console.WriteLine(dateTime.ToString("dddd, MMM dd"));        // Saturday, Jan 01`}</code></pre>
        </div>

        {/* Format Reference */}
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border-l-4 border-green-400">
          <h2 className="text-xl font-semibold mb-4 text-green-800 dark:text-green-200">Common Format Patterns</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Date Formats:</h3>
              <ul className="space-y-1 font-mono">
                <li>YYYY-MM-DD → 2022-01-01</li>
                <li>MM/DD/YYYY → 01/01/2022</li>
                <li>DD/MM/YYYY → 01/01/2022</li>
                <li>Month DD, YYYY → January 01, 2022</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Time Formats:</h3>
              <ul className="space-y-1 font-mono">
                <li>HH:MM:SS → 14:30:00</li>
                <li>HH:MM AM/PM → 02:30 PM</li>
                <li>ISO 8601 → 2022-01-01T14:30:00Z</li>
                <li>RFC 2822 → Sat, 01 Jan 2022 14:30:00 GMT</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
