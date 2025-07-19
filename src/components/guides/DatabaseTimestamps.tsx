export default function DatabaseTimestamps() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Database Timestamp Best Practices</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          How to properly store, index, and query timestamps in different database systems.
          Learn the differences between MySQL, PostgreSQL, MongoDB, and more.
        </p>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg mb-8 border-l-4 border-red-400">
        <h2 className="text-xl font-semibold mb-3 text-red-800 dark:text-red-200">
          ⚠️ The #1 Database Timestamp Mistake
        </h2>
        <p className="mb-3">Storing timestamps as <strong>strings</strong> instead of proper timestamp types!</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-red-100 dark:bg-red-800/30 p-4 rounded">
            <p className="font-medium text-red-800 dark:text-red-200 mb-2">❌ Wrong</p>
            <code className="text-sm">created_at VARCHAR(50)</code>
            <p className="text-xs mt-1 text-red-600 dark:text-red-300">Slow queries, no timezone info</p>
          </div>
          <div className="bg-green-100 dark:bg-green-800/30 p-4 rounded">
            <p className="font-medium text-green-800 dark:text-green-200 mb-2">✅ Correct</p>
            <code className="text-sm">created_at TIMESTAMP</code>
            <p className="text-xs mt-1 text-green-600 dark:text-green-300">Fast indexing, proper sorting</p>
          </div>
        </div>
      </div>

      <h2>Database-Specific Best Practices</h2>

      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
            🐘 PostgreSQL: The Gold Standard
          </h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`-- ✅ Best: Use TIMESTAMPTZ for timezone awareness
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ✅ Index for performance
CREATE INDEX idx_events_created_at ON events(created_at);

-- ✅ Query with timezone conversion
SELECT name, created_at AT TIME ZONE 'America/New_York' as local_time
FROM events 
WHERE created_at > NOW() - INTERVAL '7 days';`}</code></pre>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-orange-800 dark:text-orange-200">
            🐬 MySQL: Handle with Care
          </h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`-- ⚠️ MySQL TIMESTAMP has limitations (1970-2038)
-- ✅ Use DATETIME for wider range
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ✅ Store Unix timestamps for precision
CREATE TABLE events_v2 (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  created_at_unix BIGINT,
  INDEX idx_created_at (created_at_unix)
);`}</code></pre>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-green-800 dark:text-green-200">
            🍃 MongoDB: Document Flexibility
          </h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`// ✅ Use Date objects for automatic indexing
db.events.insertOne({
  name: "Product Launch",
  createdAt: new Date(),
  scheduledFor: new Date("2024-12-25T00:00:00Z")
});

// ✅ Index for time-based queries
db.events.createIndex({ "createdAt": 1 });

// ✅ Query recent events
db.events.find({
  createdAt: {
    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
});`}</code></pre>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-purple-800 dark:text-purple-200">
            ⚡ Redis: Caching Timestamps
          </h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`// ✅ Use Unix timestamps for TTL and sorting
ZADD user_sessions 1640995200 "user:123"
ZADD user_sessions 1640995260 "user:456"

// ✅ Get sessions from last hour
ZRANGEBYSCORE user_sessions (1640991600 +inf

// ✅ Set expiration with Unix timestamp
EXPIREAT session:123 1640995200`}</code></pre>
        </div>
      </div>

      <h2>Performance Optimization Strategies</h2>
      
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">1. Indexing Strategies</h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`-- ✅ Composite index for common queries
CREATE INDEX idx_user_activity 
ON user_events(user_id, created_at DESC);

-- ✅ Partial index for recent data
CREATE INDEX idx_recent_events 
ON events(created_at) 
WHERE created_at > '2024-01-01';

-- ✅ Hash partitioning by time (PostgreSQL)
CREATE TABLE events_2024 PARTITION OF events
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');`}</code></pre>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">2. Query Optimization</h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`-- ❌ Avoid functions on timestamp columns
SELECT * FROM events 
WHERE DATE(created_at) = '2024-01-01';

-- ✅ Use range queries instead
SELECT * FROM events 
WHERE created_at >= '2024-01-01' 
  AND created_at < '2024-01-02';

-- ✅ Use prepared statements for repeated queries
PREPARE recent_events AS
SELECT * FROM events 
WHERE created_at > $1;`}</code></pre>
        </div>
      </div>

      <h2>Migration and Data Consistency</h2>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg">
        <h3 className="font-semibold mb-3 text-yellow-800 dark:text-yellow-200">Safe Migration Example</h3>
        <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`-- Step 1: Add new column
ALTER TABLE events ADD COLUMN created_at_new TIMESTAMPTZ;

-- Step 2: Populate with converted data
UPDATE events 
SET created_at_new = TO_TIMESTAMP(created_at_unix);

-- Step 3: Add index
CREATE INDEX CONCURRENTLY idx_events_created_at_new 
ON events(created_at_new);

-- Step 4: Update application code to use new column
-- Step 5: Drop old column after verification
ALTER TABLE events DROP COLUMN created_at_unix;
ALTER TABLE events RENAME COLUMN created_at_new TO created_at;`}</code></pre>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-400">
        <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">💡 Pro Tips</h3>
        <ul className="space-y-2">
          <li>✅ Always store timestamps in UTC</li>
          <li>✅ Use database-native timestamp types</li>
          <li>✅ Index timestamp columns for range queries</li>
          <li>✅ Consider partitioning for large time-series data</li>
          <li>✅ Use connection pooling for timestamp-heavy applications</li>
        </ul>
      </div>
    </article>
  );
}
