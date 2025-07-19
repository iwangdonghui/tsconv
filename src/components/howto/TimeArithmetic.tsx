export default function TimeArithmetic() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Time Arithmetic Operations</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Learn how to add, subtract, and calculate time differences using timestamps across different programming languages.
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
              <h3 className="font-medium mb-2">Add/Subtract Time</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`// Add 1 hour (3600 seconds)
const now = Math.floor(Date.now() / 1000);
const oneHourLater = now + 3600;

// Add 1 day (86400 seconds)
const oneDayLater = now + 86400;

// Add 1 week (604800 seconds)
const oneWeekLater = now + 604800;

// Subtract 30 days
const thirtyDaysAgo = now - (30 * 86400);`}</code></pre>
            </div>
            <div>
              <h3 className="font-medium mb-2">Calculate Differences</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`const start = 1640995200; // 2022-01-01
const end = 1672531200;   // 2023-01-01

const diffSeconds = end - start;
const diffDays = diffSeconds / 86400;
const diffHours = diffSeconds / 3600;

console.log(\`Difference: \${diffDays} days\`); // 365 days`}</code></pre>
            </div>
          </div>
        </div>

        {/* Python */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-blue-500">🐍</span> Python
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`import time
from datetime import datetime, timedelta

# Add/subtract using timestamps
now = int(time.time())
one_hour_later = now + 3600
one_day_ago = now - 86400

# Using datetime for more complex operations
dt = datetime.fromtimestamp(now)
future = dt + timedelta(days=7, hours=3, minutes=30)
future_timestamp = int(future.timestamp())

# Calculate difference
start = datetime(2022, 1, 1)
end = datetime(2023, 1, 1)
diff = end - start
print(f"Difference: {diff.days} days")  # 365 days`}</code></pre>
        </div>

        {/* Java */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-red-500">☕</span> Java
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Add/Subtract Time</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`import java.time.Instant;

// Current timestamp
long now = Instant.now().getEpochSecond();

// Add 1 hour (3600 seconds)
long oneHourLater = now + 3600;

// Add 1 day (86400 seconds)
long oneDayLater = now + 86400;

// Subtract 30 days
long thirtyDaysAgo = now - (30 * 86400);`}</code></pre>
            </div>
            <div>
              <h3 className="font-medium mb-2">Calculate Differences</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`long start = 1640995200L; // 2022-01-01
long end = 1672531200L;   // 2023-01-01

long diffSeconds = end - start;
long diffDays = diffSeconds / 86400;
long diffHours = diffSeconds / 3600;

System.out.println("Difference: " + diffDays + " days"); // 365 days`}</code></pre>
            </div>
          </div>
        </div>

        {/* PHP */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-purple-500">🐘</span> PHP
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`<?php
// Current timestamp
$now = time();

// Add/subtract time
$oneHourLater = $now + 3600;
$oneDayLater = $now + 86400;
$thirtyDaysAgo = $now - (30 * 86400);

// Calculate differences
$start = 1640995200; // 2022-01-01
$end = 1672531200;   // 2023-01-01
$diffSeconds = $end - $start;
$diffDays = $diffSeconds / 86400;

echo "Difference: " . $diffDays . " days"; // 365 days
?>`}</code></pre>
        </div>

        {/* Quick Reference */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-400">
          <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">Common Time Constants</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm font-mono">
            <div>
              <h3 className="font-medium mb-2">Seconds in:</h3>
              <ul className="space-y-1">
                <li>1 minute = 60</li>
                <li>1 hour = 3,600</li>
                <li>1 day = 86,400</li>
                <li>1 week = 604,800</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Longer periods:</h3>
              <ul className="space-y-1">
                <li>30 days = 2,592,000</li>
                <li>1 year = 31,536,000</li>
                <li>Leap year = 31,622,400</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
