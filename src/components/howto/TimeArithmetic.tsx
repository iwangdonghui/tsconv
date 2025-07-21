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
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`const timestamp = 1640995200; // 2022-01-01 00:00:00 UTC
const date = new Date(timestamp * 1000);

// Add time
const oneHour = 60 * 60; // 3600 seconds
const oneDay = 24 * 60 * 60; // 86400 seconds
const oneWeek = 7 * 24 * 60 * 60; // 604800 seconds

const futureTimestamp = timestamp + oneDay;
const pastTimestamp = timestamp - oneWeek;

// Using Date object
const futureDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
const pastDate = new Date(date.getTime() - (7 * 24 * 60 * 60 * 1000));

console.log(futureTimestamp); // 1641081600 (next day)
console.log(pastTimestamp);   // 1640390400 (week ago)`}</code></pre>
            </div>
            <div>
              <h3 className="font-medium mb-2">Calculate Time Difference</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`const start = 1640995200; // 2022-01-01
const end = 1641081600;   // 2022-01-02

const diffSeconds = end - start;
const diffMinutes = diffSeconds / 60;
const diffHours = diffSeconds / 3600;
const diffDays = diffSeconds / 86400;

console.log(\`Difference: \${diffDays} days\`); // 1 days`}</code></pre>
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
              <h3 className="font-medium mb-2">Add/Subtract Time</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`from datetime import datetime, timedelta
import time

timestamp = 1640995200
dt = datetime.fromtimestamp(timestamp)

# Add time using timedelta
future_dt = dt + timedelta(days=1)
past_dt = dt - timedelta(weeks=1)

# Convert back to timestamp
future_timestamp = int(future_dt.timestamp())
past_timestamp = int(past_dt.timestamp())

print(f"Original: {timestamp}")
print(f"Future: {future_timestamp}")
print(f"Past: {past_timestamp}")

# Direct timestamp arithmetic
one_day = 24 * 60 * 60
future_direct = timestamp + one_day
past_direct = timestamp - (7 * one_day)`}</code></pre>
            </div>
            <div>
              <h3 className="font-medium mb-2">Calculate Time Difference</h3>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`start_timestamp = 1640995200
end_timestamp = 1641081600

# Method 1: Direct subtraction
diff_seconds = end_timestamp - start_timestamp
diff_days = diff_seconds / (24 * 60 * 60)

# Method 2: Using datetime
start_dt = datetime.fromtimestamp(start_timestamp)
end_dt = datetime.fromtimestamp(end_timestamp)
diff = end_dt - start_dt

print(f"Difference: {diff.days} days, {diff.seconds} seconds")
print(f"Total seconds: {diff.total_seconds()}")`}</code></pre>
            </div>
          </div>
        </div>

        {/* Java */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-red-500">☕</span> Java
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`import java.time.*;
import java.time.temporal.ChronoUnit;

long timestamp = 1640995200L;
Instant instant = Instant.ofEpochSecond(timestamp);

// Add/subtract time
Instant futureInstant = instant.plus(1, ChronoUnit.DAYS);
Instant pastInstant = instant.minus(7, ChronoUnit.DAYS);

// Convert back to timestamp
long futureTimestamp = futureInstant.getEpochSecond();
long pastTimestamp = pastInstant.getEpochSecond();

// Calculate difference
long startTimestamp = 1640995200L;
long endTimestamp = 1641081600L;
long diffSeconds = endTimestamp - startTimestamp;
long diffDays = diffSeconds / (24 * 60 * 60);

System.out.println("Difference: " + diffDays + " days");`}</code></pre>
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
                <li>365 days = 31,536,000</li>
                <li>Leap year = 31,622,400</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
