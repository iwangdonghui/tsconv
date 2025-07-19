export default function DatabaseOperations() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Database Timestamp Operations</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Store, query, and manipulate timestamps in various databases. Best practices for timestamp handling in SQL and NoSQL databases.
        </p>
      </div>

      <div className="space-y-8">
        {/* MySQL */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-blue-500">🐬</span> MySQL
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`-- Create table with timestamp columns
CREATE TABLE events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    event_time INT UNSIGNED  -- Unix timestamp
);

-- Insert with current timestamp
INSERT INTO events (name, event_time) 
VALUES ('User Login', UNIX_TIMESTAMP());

-- Query by date range
SELECT * FROM events 
WHERE event_time BETWEEN 1640995200 AND 1672531200;

-- Convert timestamp to readable format
SELECT name, FROM_UNIXTIME(event_time) as readable_time 
FROM events;

-- Get records from last 24 hours
SELECT * FROM events 
WHERE event_time > UNIX_TIMESTAMP() - 86400;`}</code></pre>
        </div>

        {/* PostgreSQL */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-blue-600">🐘</span> PostgreSQL
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`-- Create table with timestamp columns
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_time INTEGER  -- Unix timestamp
);

-- Insert with Unix timestamp
INSERT INTO events (name, event_time) 
VALUES ('User Login', EXTRACT(EPOCH FROM NOW())::INTEGER);

-- Convert Unix timestamp to timestamptz
SELECT name, TO_TIMESTAMP(event_time) AT TIME ZONE 'UTC' as readable_time
FROM events;

-- Query last week's events
SELECT * FROM events 
WHERE event_time > EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days')::INTEGER;

-- Index for timestamp queries
CREATE INDEX idx_events_event_time ON events(event_time);`}</code></pre>
        </div>

        {/* MongoDB */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-500">🍃</span> MongoDB
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`// Insert document with timestamp
db.events.insertOne({
  name: "User Login",
  createdAt: new Date(),
  eventTime: Math.floor(Date.now() / 1000)  // Unix timestamp
});

// Query by date range
db.events.find({
  eventTime: {
    $gte: 1640995200,
    $lte: 1672531200
  }
});

// Query last 24 hours
const yesterday = Math.floor(Date.now() / 1000) - 86400;
db.events.find({
  eventTime: { $gte: yesterday }
});

// Create index for timestamp queries
db.events.createIndex({ eventTime: 1 });

// Aggregation with date operations
db.events.aggregate([
  {
    $addFields: {
      readableDate: {
        $dateFromParts: {
          year: { $year: { $toDate: { $multiply: ["$eventTime", 1000] } } },
          month: { $month: { $toDate: { $multiply: ["$eventTime", 1000] } } },
          day: { $dayOfMonth: { $toDate: { $multiply: ["$eventTime", 1000] } } }
        }
      }
    }
  }
]);`}</code></pre>
        </div>

        {/* Best Practices */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-400">
          <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">💡 Database Best Practices</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ <strong>Use UTC timestamps</strong> - Store all timestamps in UTC timezone</li>
            <li>✅ <strong>Index timestamp columns</strong> - Essential for range queries performance</li>
            <li>✅ <strong>Use appropriate data types</strong> - TIMESTAMP, TIMESTAMPTZ, or INTEGER for Unix timestamps</li>
            <li>✅ <strong>Consider partitioning</strong> - For large time-series data, partition by date</li>
            <li>✅ <strong>Validate timestamp ranges</strong> - Prevent invalid future/past dates</li>
            <li>✅ <strong>Use database functions</strong> - Leverage built-in date/time functions for calculations</li>
          </ul>
        </div>
      </div>
    </article>
  );
}