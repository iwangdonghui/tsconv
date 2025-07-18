export default function TimezonesGuide() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Timezone Handling: A Developer's Complete Guide</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Timezone management is one of the most error-prone aspects of software development. 
          This guide provides practical solutions for common timezone challenges.
        </p>
      </div>

      <h2>Real-World Case Study: Global E-commerce Flash Sale</h2>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg mb-8 border-l-4 border-yellow-400">
        <h3 className="font-semibold mb-3 text-yellow-800 dark:text-yellow-200">🛒 The Challenge</h3>
        <p className="mb-3"><strong>Black Friday sale starts at midnight - but which midnight?</strong></p>
        
        <div className="bg-yellow-100 dark:bg-yellow-800/30 p-4 rounded mb-4">
          <h4 className="font-medium mb-2">The Problem: Different interpretations lead to chaos</h4>
          <ul className="space-y-1 text-sm">
            <li>🇺🇸 New York customers expect EST midnight (05:00 UTC)</li>
            <li>🇬🇧 London customers expect GMT midnight (00:00 UTC)</li>
            <li>🇯🇵 Tokyo customers expect JST midnight (15:00 UTC previous day)</li>
            <li>📢 Marketing wants "simultaneous global launch"</li>
          </ul>
        </div>

        <div className="bg-green-100 dark:bg-green-800/30 p-4 rounded">
          <h4 className="font-medium mb-2 text-green-800 dark:text-green-200">✅ The Solution</h4>
          <p className="text-sm">Store one UTC timestamp, display local times to each user with clear timezone indicators.</p>
        </div>
      </div>

      <h2>Solution Comparison: Wrong vs Right Approaches</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border-l-4 border-red-400">
          <h3 className="font-semibold text-red-800 dark:text-red-200 mb-3">❌ Problematic Approach</h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded text-xs overflow-x-auto"><code>{`// Database stores ambiguous local time
sale_start = "2023-11-24 00:00:00"

// Questions arise:
// - Which timezone?
// - Daylight saving time?
// - How do global users interpret this?

// Frontend confusion
if (currentTime > saleStartTime) {
  showSaleItems(); // But which timezone?
}`}</code></pre>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border-l-4 border-green-400">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">✅ Robust Solution</h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded text-xs overflow-x-auto"><code>{`// Database stores UTC timestamp
sale_start_utc = 1700784000  // Nov 24, 2023 00:00 UTC

// Frontend converts to user's timezone
const userTimezone = Intl.DateTimeFormat()
  .resolvedOptions().timeZone;
const localSaleTime = new Date(sale_start_utc * 1000)
  .toLocaleString('en-US', { 
    timeZone: userTimezone,
    timeZoneName: 'short'
  });

// Clear user communication
"Sale starts: Nov 23, 7:00 PM EST (your local time)"`}</code></pre>
        </div>
      </div>

      <h2>UTC vs GMT: What's the Practical Difference?</h2>
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg mb-8 border-l-4 border-blue-400">
        <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-200">🌍 For Developers</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">GMT (Greenwich Mean Time)</h4>
            <ul className="text-sm space-y-1">
              <li>🇬🇧 British civil time</li>
              <li>🔄 Observes daylight saving</li>
              <li>📅 GMT = UTC in winter</li>
              <li>☀️ GMT = UTC+1 in summer (BST)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">UTC (Coordinated Universal Time)</h4>
            <ul className="text-sm space-y-1">
              <li>⚛️ International atomic time standard</li>
              <li>🔒 Never changes</li>
              <li>💻 Use in code</li>
              <li>🌐 Global reference point</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800/30 rounded">
          <p className="text-sm font-medium">💡 In Practice: Use UTC in code, say GMT in casual conversation</p>
        </div>
      </div>

      <h2>Daylight Saving Time: The Hidden Complexity</h2>
      <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg mb-8 border-l-4 border-orange-400">
        <h3 className="font-semibold mb-3 text-orange-800 dark:text-orange-200">🕐 The Problem: Time "jumps" twice per year</h3>
        
        <div className="space-y-4">
          <div className="bg-orange-100 dark:bg-orange-800/30 p-4 rounded">
            <h4 className="font-medium mb-2">Spring Forward (March)</h4>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto"><code>{`// March 12, 2023 - US Eastern Time
// 01:59:59 EST → 03:00:00 EDT (spring forward)
// The hour 02:00-02:59 doesn't exist!`}</code></pre>
          </div>
          
          <div className="bg-orange-100 dark:bg-orange-800/30 p-4 rounded">
            <h4 className="font-medium mb-2">Fall Back (November)</h4>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto"><code>{`// November 5, 2023 - US Eastern Time  
// 01:59:59 EDT → 01:00:00 EST (fall back)
// The hour 01:00-01:59 happens twice!`}</code></pre>
          </div>
          
          <div className="bg-green-100 dark:bg-green-800/30 p-4 rounded">
            <h4 className="font-medium mb-2 text-green-800 dark:text-green-200">✅ Solution: Always store and calculate in UTC</h4>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto"><code>{`const utcTimestamp = 1678608000;  // Unambiguous
const userLocalTime = new Date(utcTimestamp * 1000)
  .toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    timeZoneName: 'short'
  });
// Result: "3/12/2023, 3:00:00 AM EDT"`}</code></pre>
          </div>
        </div>
      </div>

      <h2>Timezone Database: IANA Time Zone Identifiers</h2>
      <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg mb-8 border-l-4 border-purple-400">
        <h3 className="font-semibold mb-3 text-purple-800 dark:text-purple-200">🏷️ Use specific timezone identifiers, not abbreviations</h3>
        
        <div className="space-y-4">
          <div className="bg-red-100 dark:bg-red-800/30 p-4 rounded">
            <h4 className="font-medium mb-2 text-red-800 dark:text-red-200">❌ Ambiguous abbreviations</h4>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto"><code>{`"EST"  // Eastern Standard Time? Australian Eastern Standard Time?
"CST"  // Central Standard Time? China Standard Time? Cuba Standard Time?
"PST"  // Pacific Standard Time? Pakistan Standard Time?`}</code></pre>
          </div>
          
          <div className="bg-green-100 dark:bg-green-800/30 p-4 rounded">
            <h4 className="font-medium mb-2 text-green-800 dark:text-green-200">✅ Precise IANA identifiers</h4>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto"><code>{`"America/New_York"     // Handles EST/EDT automatically
"America/Chicago"      // Handles CST/CDT automatically  
"Europe/London"        // Handles GMT/BST automatically
"Asia/Tokyo"           // No DST, always JST
"Australia/Sydney"     // Handles AEST/AEDT automatically

// JavaScript example
const tokyoTime = new Date().toLocaleString('en-US', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short'
});`}</code></pre>
          </div>
        </div>
      </div>

      <h2>Best Practices for Global Applications</h2>
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border-l-4 border-green-400">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">1. Data Storage Strategy</h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded text-sm overflow-x-auto"><code>{`-- Database schema
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  start_time TIMESTAMP WITH TIME ZONE,  -- PostgreSQL
  created_at BIGINT  -- Unix timestamp alternative
);

-- Always store in UTC
INSERT INTO events (name, start_time) 
VALUES ('Product Launch', '2023-11-24 00:00:00+00');`}</code></pre>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border-l-4 border-green-400">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">2. API Design Patterns</h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded text-sm overflow-x-auto"><code>{`// RESTful API response
{
  "event_id": 123,
  "name": "Black Friday Sale",
  "start_time": "2023-11-24T00:00:00Z",  // ISO 8601 with UTC
  "start_timestamp": 1700784000,          // Unix timestamp
  "timezone_info": {
    "utc_offset": "+00:00",
    "timezone_name": "UTC"
  }
}

// Client-side processing
const eventTime = new Date(response.start_time);
const userLocalTime = eventTime.toLocaleString(undefined, {
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
});`}</code></pre>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border-l-4 border-green-400">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">3. User Interface Guidelines</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Display Best Practices:</h4>
              <ul className="text-sm space-y-1">
                <li>✅ Always show timezone information</li>
                <li>✅ Provide timezone selection in preferences</li>
                <li>✅ Show relative times ("2 hours ago")</li>
                <li>✅ Use clear labels: "Your local time"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Example Implementation:</h4>
              <pre className="bg-slate-800 text-slate-100 p-2 rounded text-xs"><code>{`<div className="time-display">
  <span className="absolute-time">
    Nov 24, 2023 7:00 PM
  </span>
  <span className="timezone-info">
    EST (your local time)
  </span>
  <span className="relative-time">
    in 2 hours
  </span>
</div>`}</code></pre>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border-l-4 border-green-400">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">4. Testing Strategy</h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded text-sm overflow-x-auto"><code>{`// Test across multiple timezones
const testTimezones = [
  'America/New_York',    // EST/EDT
  'Europe/London',       // GMT/BST  
  'Asia/Tokyo',          // JST (no DST)
  'Australia/Sydney',    // AEST/AEDT
  'America/Los_Angeles'  // PST/PDT
];

testTimezones.forEach(tz => {
  // Test DST transitions
  testDSTTransition(tz, '2023-03-12'); // Spring forward
  testDSTTransition(tz, '2023-11-05'); // Fall back
  
  // Test midnight boundary conditions
  testMidnightBoundary(tz);
  
  // Test leap year handling
  testLeapYear(tz, 2024);
});`}</code></pre>
        </div>
      </div>

      <h2>Quick Reference: Timezone Implementation Checklist</h2>
      <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">✅ Essential Steps</h3>
            <ol className="text-sm space-y-2">
              <li>1. Store all timestamps in UTC (database and backend)</li>
              <li>2. Use ISO 8601 format for API communication</li>
              <li>3. Convert to user's local timezone only in presentation layer</li>
              <li>4. Use IANA timezone identifiers, not abbreviations</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold mb-3">🔍 Quality Assurance</h3>
            <ol className="text-sm space-y-2" start={5}>
              <li>5. Handle DST transitions gracefully</li>
              <li>6. Test with users in different timezones</li>
              <li>7. Provide clear timezone indicators in UI</li>
              <li>8. Consider using established libraries (moment.js, date-fns, dayjs)</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-400">
        <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">🎯 Golden Rule</h3>
        <p className="text-lg">
          <strong>"Store UTC, Display Local, Label Clearly"</strong>
        </p>
        <p className="text-sm mt-2">
          This simple principle solves 90% of timezone problems. Store everything in UTC, 
          convert to user's timezone only for display, and always show which timezone you're displaying.
        </p>
      </div>
    </article>
  );
}
