export default function JavaScriptTimestamps() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">JavaScript Timestamp Gotchas</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          JavaScript's approach to handling timestamps can be confusing, especially when working with APIs 
          and databases. Here are the most common pitfalls and how to avoid them.
        </p>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg mb-8 border-l-4 border-red-400">
        <h2 className="text-xl font-semibold mb-3 text-red-800 dark:text-red-200">
          ⚠️ The #1 JavaScript Timestamp Mistake
        </h2>
        <p className="mb-3">JavaScript uses <strong>milliseconds</strong>, while Unix systems use <strong>seconds</strong>!</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-red-100 dark:bg-red-800/30 p-4 rounded">
            <p className="font-medium text-red-800 dark:text-red-200 mb-2">❌ Wrong</p>
            <code className="text-sm">new Date(1640995200)</code>
            <p className="text-xs mt-1 text-red-600 dark:text-red-300">Results in 1970-01-20 (way off!)</p>
          </div>
          <div className="bg-green-100 dark:bg-green-800/30 p-4 rounded">
            <p className="font-medium text-green-800 dark:text-green-200 mb-2">✅ Correct</p>
            <code className="text-sm">new Date(1640995200 * 1000)</code>
            <p className="text-xs mt-1 text-green-600 dark:text-green-300">Results in 2022-01-01</p>
          </div>
        </div>
      </div>

      <h2>Common JavaScript Timestamp Pitfalls</h2>

      <div className="space-y-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800 dark:text-yellow-200">
            🕐 Pitfall #1: Milliseconds vs Seconds Confusion
          </h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`// ❌ Wrong: Using Unix timestamp directly
const date = new Date(1640995200); // Results in 1970-01-20 (way off!)

// ✅ Correct: Convert seconds to milliseconds
const date = new Date(1640995200 * 1000); // Results in 2022-01-01

// Pro tip: Always multiply by 1000 when receiving Unix timestamps
const apiTimestamp = 1640995200;
const jsDate = new Date(apiTimestamp * 1000);`}</code></pre>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-orange-800 dark:text-orange-200">
            🌍 Pitfall #2: Timezone Interpretation Nightmares
          </h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`// ❌ Dangerous: Browser interprets this in user's timezone
const date = new Date('2022-01-01'); // Could be Dec 31, 2021 in some timezones!

// ✅ Safe: Always specify UTC with 'Z' suffix
const date = new Date('2022-01-01T00:00:00Z');

// ✅ Even better: Use timestamps for precision
const date = new Date(1640995200000); // Unambiguous`}</code></pre>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
            🚫 Pitfall #3: Invalid Date Detection
          </h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`// ❌ Fragile: No validation
function formatUserDate(timestamp) {
  return new Date(timestamp).toLocaleDateString();
  // Returns "Invalid Date" string if timestamp is bad
}

// ✅ Robust: Always validate first
function formatUserDate(timestamp) {
  const date = new Date(timestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date provided';
  }
  
  return date.toLocaleDateString();
}

// ✅ Even better: Type checking for TypeScript users
function formatUserDate(timestamp: number): string {
  if (typeof timestamp !== 'number' || timestamp < 0) {
    throw new Error('Invalid timestamp: must be positive number');
  }
  
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}`}</code></pre>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-purple-800 dark:text-purple-200">
            🔄 Pitfall #4: Daylight Saving Time Edge Cases
          </h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`// ❌ Problematic: Local time calculations during DST
const startOfDay = new Date('2023-03-12T00:00:00'); // DST transition day
const endOfDay = new Date('2023-03-12T23:59:59');
const duration = endOfDay - startOfDay; // Might not be 24 hours!

// ✅ Reliable: Use UTC for calculations, convert for display
const startUTC = new Date('2023-03-12T00:00:00Z');
const endUTC = new Date('2023-03-12T23:59:59Z');
const duration = endUTC - startUTC; // Always predictable`}</code></pre>
        </div>
      </div>

      <h2>JavaScript Timestamp Best Practices</h2>
      
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">1. Server Communication</h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`// Always send timestamps as numbers, not date strings
const payload = {
  user_id: 123,
  created_at: Math.floor(Date.now() / 1000), // Unix timestamp
  expires_at: Math.floor((Date.now() + 3600000) / 1000) // 1 hour later
};

// When receiving from API
fetch('/api/events')
  .then(response => response.json())
  .then(data => {
    // Convert Unix timestamp to JavaScript Date
    const eventDate = new Date(data.timestamp * 1000);
    console.log(eventDate.toLocaleString());
  });`}</code></pre>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">2. User Interface Display</h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`// Convert timestamps to user-friendly formats only for display
function displayTimestamp(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  
  return {
    absolute: date.toLocaleString(),
    relative: getRelativeTime(date),
    iso: date.toISOString(),
    formatted: date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
}

function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return \`\${diffMins} minutes ago\`;
  if (diffMins < 1440) return \`\${Math.floor(diffMins / 60)} hours ago\`;
  return \`\${Math.floor(diffMins / 1440)} days ago\`;
}`}</code></pre>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">3. Date Arithmetic</h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`// Working with time ranges
function isWithinLastWeek(timestamp) {
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  return (timestamp * 1000) > weekAgo;
}

// Adding time to timestamps
function addDays(timestamp, days) {
  return timestamp + (days * 24 * 60 * 60);
}

// Comparing timestamps
function isNewer(timestamp1, timestamp2) {
  return timestamp1 > timestamp2;
}`}</code></pre>
        </div>
      </div>

      <h2>When to Use Date Libraries</h2>
      <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
        <p className="mb-4">Consider using libraries like <code>date-fns</code>, <code>dayjs</code>, or <code>moment.js</code> when you need:</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Complex Operations:</h4>
            <ul className="space-y-1 text-sm">
              <li>✅ Adding months, years (variable lengths)</li>
              <li>✅ Advanced formatting options</li>
              <li>✅ Timezone-aware calculations</li>
              <li>✅ Parsing various date string formats</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Native JS is Fine For:</h4>
            <ul className="space-y-1 text-sm">
              <li>✅ Simple timestamp conversions</li>
              <li>✅ Basic date arithmetic</li>
              <li>✅ UTC operations</li>
              <li>✅ Performance-critical code</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-400">
        <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">💡 Pro Tip</h3>
        <p>
          Native JavaScript Date handling is sufficient for most timestamp conversion tasks. 
          Only add external libraries when you need their specific features. This keeps your bundle size small 
          and reduces dependencies.
        </p>
      </div>
    </article>
  );
}
