export default function GetCurrentTimestamp() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Get Current Timestamp in 9 Programming Languages</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Complete guide to getting the current Unix timestamp across JavaScript, Python, Java, PHP, Go, C#, Ruby, Rust, and Swift.
        </p>
      </div>

      <div className="space-y-8">
        {/* JavaScript */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-yellow-500">📄</span> JavaScript
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Current timestamp (seconds)</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`// Method 1: Using Date.now()
const timestamp = Math.floor(Date.now() / 1000);
console.log(timestamp); // 1705708800

// Method 2: Using new Date()
const timestamp2 = Math.floor(new Date().getTime() / 1000);

// Method 3: Using Date constructor
const timestamp3 = Math.floor(+new Date() / 1000);`}</code></pre>
            </div>
            <div>
              <h3 className="font-medium mb-2">Current timestamp (milliseconds)</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`const timestampMs = Date.now();
console.log(timestampMs); // 1705708800000`}</code></pre>
            </div>
          </div>
        </div>

        {/* Python */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-blue-500">🐍</span> Python
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Using time module</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`import time

# Current timestamp
timestamp = int(time.time())
print(timestamp)  # 1705708800

# With decimal precision
timestamp_precise = time.time()
print(timestamp_precise)  # 1705708800.123456`}</code></pre>
            </div>
            <div>
              <h3 className="font-medium mb-2">Using datetime module</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`from datetime import datetime

# Current timestamp
timestamp = int(datetime.now().timestamp())
print(timestamp)  # 1705708800

# UTC timestamp
timestamp_utc = int(datetime.utcnow().timestamp())
print(timestamp_utc)  # 1705708800`}</code></pre>
            </div>
          </div>
        </div>

        {/* Java */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-red-500">☕</span> Java
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Using System.currentTimeMillis()</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`// Current timestamp in seconds
long timestamp = System.currentTimeMillis() / 1000;
System.out.println(timestamp); // 1705708800

// Current timestamp in milliseconds
long timestampMs = System.currentTimeMillis();
System.out.println(timestampMs); // 1705708800000`}</code></pre>
            </div>
            <div>
              <h3 className="font-medium mb-2">Using Instant (Java 8+)</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`import java.time.Instant;

// Current timestamp
long timestamp = Instant.now().getEpochSecond();
System.out.println(timestamp); // 1705708800

// With milliseconds
long timestampMs = Instant.now().toEpochMilli();
System.out.println(timestampMs); // 1705708800000`}</code></pre>
            </div>
          </div>
        </div>

        {/* PHP */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-purple-500">🐘</span> PHP
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`<?php
// Method 1: Using time()
$timestamp = time();
echo $timestamp; // 1705708800

// Method 2: Using DateTime
$timestamp2 = (new DateTime())->getTimestamp();
echo $timestamp2; // 1705708800

// Method 3: Using microtime for precision
$timestamp3 = (int) microtime(true);
echo $timestamp3; // 1705708800
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
    // Current timestamp in seconds
    timestamp := time.Now().Unix()
    fmt.Println(timestamp) // 1705708800
    
    // Current timestamp in milliseconds
    timestampMs := time.Now().UnixMilli()
    fmt.Println(timestampMs) // 1705708800000
    
    // Current timestamp in nanoseconds
    timestampNs := time.Now().UnixNano()
    fmt.Println(timestampNs) // 1705708800000000000
}`}</code></pre>
        </div>

        {/* More languages */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* C# */}
          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-green-500">🔷</span> C#
            </h2>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`// Current timestamp
long timestamp = DateTimeOffset.Now
    .ToUnixTimeSeconds();
Console.WriteLine(timestamp);

// UTC timestamp
long timestampUtc = DateTimeOffset.UtcNow
    .ToUnixTimeSeconds();`}</code></pre>
          </div>

          {/* Ruby */}
          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-red-500">💎</span> Ruby
            </h2>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`# Current timestamp
timestamp = Time.now.to_i
puts timestamp # 1705708800

# With decimal precision
timestamp_f = Time.now.to_f
puts timestamp_f # 1705708800.123`}</code></pre>
          </div>

          {/* Rust */}
          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-orange-500">🦀</span> Rust
            </h2>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`use std::time::{SystemTime, UNIX_EPOCH};

// Current timestamp
let timestamp = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_secs();
println!("{}", timestamp); // 1705708800`}</code></pre>
          </div>

          {/* Swift */}
          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-orange-500">🍎</span> Swift
            </h2>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`import Foundation

// Current timestamp
let timestamp = Int(Date().timeIntervalSince1970)
print(timestamp) // 1705708800

// With decimal precision
let timestampPrecise = Date().timeIntervalSince1970
print(timestampPrecise) // 1705708800.123`}</code></pre>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-400">
          <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">Quick Reference</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">One-liners:</h3>
              <ul className="space-y-1 font-mono text-xs">
                <li><strong>JS:</strong> Math.floor(Date.now()/1000)</li>
                <li><strong>Python:</strong> int(time.time())</li>
                <li><strong>Java:</strong> System.currentTimeMillis()/1000</li>
                <li><strong>PHP:</strong> time()</li>
                <li><strong>Go:</strong> time.Now().Unix()</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Remember:</h3>
              <ul className="space-y-1 text-xs">
                <li>✅ Unix timestamp = seconds since 1970-01-01 UTC</li>
                <li>✅ JavaScript Date.now() returns milliseconds</li>
                <li>✅ Always use UTC for consistency</li>
                <li>✅ Consider timezone when displaying to users</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
