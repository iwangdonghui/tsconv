export default function WhatIsUnixTimestamp() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">What is a Unix Timestamp?</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          A Unix timestamp represents the number of seconds that have elapsed since January 1, 1970, at 00:00:00 UTC. 
          This system is fundamental to how computers handle time across different platforms and programming languages.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-3 text-blue-800 dark:text-blue-200">Quick Example</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="font-medium mb-2">Unix Timestamp:</p>
            <code className="bg-white dark:bg-slate-800 px-3 py-2 rounded text-lg font-mono">1640995200</code>
          </div>
          <div>
            <p className="font-medium mb-2">Human Readable:</p>
            <code className="bg-white dark:bg-slate-800 px-3 py-2 rounded text-lg font-mono">Jan 1, 2022 00:00:00 UTC</code>
          </div>
        </div>
      </div>

      <h2>Why Does Unix Time Start in 1970?</h2>
      <p>The choice of January 1, 1970, as the Unix epoch wasn't arbitrary. Here's the historical context:</p>
      <ul>
        <li><strong>Unix Development:</strong> Unix operating system was developed in the early 1970s at Bell Labs</li>
        <li><strong>Reference Point:</strong> Developers needed a consistent reference point for time calculations</li>
        <li><strong>Practical Choice:</strong> 1970 provided a "recent enough" starting point that wouldn't cause overflow issues</li>
        <li><strong>Technical Convenience:</strong> The date falls on a convenient boundary for 32-bit integer calculations</li>
      </ul>

      <h2>Real-World Applications of Unix Timestamps</h2>
      
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-green-800 dark:text-green-200">
            📊 Database Storage Optimization
          </h3>
          <p className="mb-3">Most modern databases prefer timestamps because they offer:</p>
          <ul className="space-y-1">
            <li>✅ Compact storage (4-8 bytes vs. string dates)</li>
            <li>✅ Lightning-fast sorting and indexing</li>
            <li>✅ Universal timezone consistency</li>
            <li>✅ Simple arithmetic operations for date calculations</li>
          </ul>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-purple-800 dark:text-purple-200">
            🔗 API Communication Standards
          </h3>
          <p className="mb-3">When building REST APIs, timestamps eliminate timezone confusion:</p>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`// Frontend sends clean timestamp
{
  "event_time": 1640995200,
  "user_id": 12345
}

// Backend processes without timezone guesswork
// Display layer handles local time conversion`}</code></pre>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-orange-800 dark:text-orange-200">
            📝 Log File Management
          </h3>
          <p className="mb-3">System administrators love timestamps for:</p>
          <ul className="space-y-1">
            <li>✅ Chronological log sorting across multiple servers</li>
            <li>✅ Efficient log rotation and archival</li>
            <li>✅ Cross-system event correlation</li>
            <li>✅ Performance monitoring and debugging</li>
          </ul>
        </div>
      </div>

      <h2>Common Unix Timestamp Misconceptions</h2>
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-l-4 border-red-400">
          <p className="font-medium text-red-800 dark:text-red-200">❌ Myth: "Unix timestamps are just the current time"</p>
          <p className="text-red-700 dark:text-red-300">✅ Reality: "Unix timestamps count seconds since the 1970 epoch"</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-l-4 border-red-400">
          <p className="font-medium text-red-800 dark:text-red-200">❌ Myth: "All timestamps are in my local timezone"</p>
          <p className="text-red-700 dark:text-red-300">✅ Reality: "Unix timestamps are always UTC-based, regardless of your location"</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-l-4 border-red-400">
          <p className="font-medium text-red-800 dark:text-red-200">❌ Myth: "Timestamps are hard to work with"</p>
          <p className="text-red-700 dark:text-red-300">✅ Reality: "Timestamps are actually simpler than date strings for calculations"</p>
        </div>
      </div>

      <h2>The Year 2038 Problem</h2>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border-l-4 border-yellow-400">
        <h3 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">⚠️ Important Note for Developers</h3>
        <p className="mb-3">
          32-bit systems will face the "Year 2038 Problem" when timestamps overflow on 
          <strong> January 19, 2038 at 03:14:07 UTC</strong>.
        </p>
        <div className="bg-yellow-100 dark:bg-yellow-800/30 p-4 rounded mt-3">
          <p className="font-medium mb-2">Solutions:</p>
          <ul className="space-y-1">
            <li>✅ Use 64-bit systems (extends limit to ~292 billion years)</li>
            <li>✅ Modern programming languages handle this automatically</li>
            <li>✅ Database systems like PostgreSQL use 64-bit timestamps</li>
            <li>✅ JavaScript uses milliseconds (different scale, no 2038 problem)</li>
          </ul>
        </div>
      </div>

      <h2>Quick Reference</h2>
      <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Key Facts</h3>
            <ul className="space-y-2 text-sm">
              <li>📅 Epoch: January 1, 1970, 00:00:00 UTC</li>
              <li>⏱️ Unit: Seconds (not milliseconds)</li>
              <li>🌍 Timezone: Always UTC</li>
              <li>🔢 Format: Integer (e.g., 1640995200)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Best Practices</h3>
            <ul className="space-y-2 text-sm">
              <li>✅ Store timestamps in databases</li>
              <li>✅ Convert to local time only for display</li>
              <li>✅ Use 64-bit integers for future-proofing</li>
              <li>✅ Validate timestamp ranges in your code</li>
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}
