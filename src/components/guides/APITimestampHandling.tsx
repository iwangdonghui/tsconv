export default function APITimestampHandling() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">API Timestamp Design Patterns</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Best practices for handling timestamps in REST APIs, GraphQL, and real-time applications.
        </p>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg mb-8 border-l-4 border-red-400">
        <h2 className="text-xl font-semibold mb-3 text-red-800 dark:text-red-200">
          ⚠️ The #1 API Timestamp Mistake
        </h2>
        <p className="mb-3">Sending timestamps in <strong>local timezone</strong> without timezone information!</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-red-100 dark:bg-red-800/30 p-4 rounded">
            <p className="font-medium text-red-800 dark:text-red-200 mb-2">❌ Wrong</p>
            <code className="text-sm">"created_at": "2024-01-01 10:30:00"</code>
            <p className="text-xs mt-1 text-red-600 dark:text-red-300">Which timezone? Ambiguous!</p>
          </div>
          <div className="bg-green-100 dark:bg-green-800/30 p-4 rounded">
            <p className="font-medium text-green-800 dark:text-green-200 mb-2">✅ Correct</p>
            <code className="text-sm">"created_at": "2024-01-01T10:30:00Z"</code>
            <p className="text-xs mt-1 text-green-600 dark:text-green-300">Clear UTC timestamp</p>
          </div>
        </div>
      </div>

      <h2>REST API Best Practices</h2>

      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-green-800 dark:text-green-200">
            📡 Response Format Standards
          </h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`// ✅ Consistent timestamp format
{
  "id": 123,
  "title": "Product Launch",
  "created_at": "2024-01-01T10:30:00.000Z",    // ISO 8601 UTC
  "updated_at": "2024-01-01T15:45:30.123Z",    // Include milliseconds
  "scheduled_for": "2024-12-25T00:00:00.000Z", // Future events
  "metadata": {
    "timezone": "UTC",
    "timestamp": 1704106200  // Unix timestamp for convenience
  }
}`}</code></pre>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
            🔍 Query Parameters for Time Filtering
          </h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`// ✅ Support multiple time filter formats
GET /api/events?created_after=2024-01-01T00:00:00Z
GET /api/events?created_after=1704067200
GET /api/events?created_between=2024-01-01,2024-01-31
GET /api/events?last_7_days=true

// ✅ Express.js middleware for timestamp parsing
app.use('/api', (req, res, next) => {
  // Parse timestamp query parameters
  ['created_after', 'created_before', 'updated_after'].forEach(param => {
    if (req.query[param]) {
      const timestamp = new Date(req.query[param]);
      if (isNaN(timestamp.getTime())) {
        return res.status(400).json({
          error: \`Invalid timestamp format for \${param}\`
        });
      }
      req.query[param] = timestamp.toISOString();
    }
  });
  next();
});`}</code></pre>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-purple-800 dark:text-purple-200">
            🚀 Node.js/Express Implementation
          </h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`// ✅ Timestamp utility functions
const timestampUtils = {
  now: () => Math.floor(Date.now() / 1000),
  toISO: (timestamp) => new Date(timestamp * 1000).toISOString(),
  fromISO: (isoString) => Math.floor(new Date(isoString).getTime() / 1000),
  
  // Validate timestamp range
  isValid: (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.getTime() > 0 && date.getFullYear() > 1970;
  }
};

// ✅ API endpoint with proper timestamp handling
app.get('/api/events', async (req, res) => {
  try {
    const { created_after, limit = 50 } = req.query;
    
    const query = {};
    if (created_after) {
      query.created_at = { $gte: new Date(created_after) };
    }
    
    const events = await Event.find(query)
      .limit(parseInt(limit))
      .sort({ created_at: -1 });
    
    res.json({
      success: true,
      data: events.map(event => ({
        ...event.toObject(),
        created_at: event.created_at.toISOString(),
        updated_at: event.updated_at.toISOString()
      })),
      meta: {
        count: events.length,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`}</code></pre>
        </div>
      </div>

      <h2>GraphQL Timestamp Handling</h2>
      
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">1. Schema Definition</h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`# ✅ Custom DateTime scalar
scalar DateTime

type Event {
  id: ID!
  title: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  scheduledFor: DateTime
}

type Query {
  events(
    createdAfter: DateTime
    createdBefore: DateTime
    limit: Int = 50
  ): [Event!]!
}

# ✅ Resolver implementation
const resolvers = {
  DateTime: GraphQLDateTime, // Use graphql-iso-date package
  
  Query: {
    events: async (_, { createdAfter, createdBefore, limit }) => {
      const filter = {};
      
      if (createdAfter) {
        filter.created_at = { ...filter.created_at, $gte: createdAfter };
      }
      if (createdBefore) {
        filter.created_at = { ...filter.created_at, $lte: createdBefore };
      }
      
      return await Event.find(filter).limit(limit);
    }
  }
};`}</code></pre>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">2. Client Queries</h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`# ✅ GraphQL query with timestamp filtering
query GetRecentEvents($since: DateTime!) {
  events(createdAfter: $since, limit: 20) {
    id
    title
    createdAt
    updatedAt
  }
}

# Variables
{
  "since": "2024-01-01T00:00:00.000Z"
}`}</code></pre>
        </div>
      </div>

      <h2>Real-time Applications</h2>
      <div className="space-y-6">
        <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
          <h3 className="font-semibold mb-3 text-orange-800 dark:text-orange-200">WebSocket Timestamp Sync</h3>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`// ✅ Server-side WebSocket with timestamps
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  // Send server time on connection
  ws.send(JSON.stringify({
    type: 'server_time',
    timestamp: Date.now(),
    iso: new Date().toISOString()
  }));
  
  // Handle incoming messages with timestamp validation
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    const now = Date.now();
    const messageAge = now - message.timestamp;
    
    // Reject old messages (older than 30 seconds)
    if (messageAge > 30000) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Message too old',
        server_time: now
      }));
      return;
    }
    
    // Process message with server timestamp
    processMessage({
      ...message,
      received_at: now,
      server_iso: new Date().toISOString()
    });
  });
});`}</code></pre>
        </div>
      </div>

      <h2>API Versioning and Timestamps</h2>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg">
        <h3 className="font-semibold mb-3 text-yellow-800 dark:text-yellow-200">Backward Compatibility</h3>
        <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`// ✅ Support multiple timestamp formats for different API versions
app.get('/api/v1/events', (req, res) => {
  // v1: Unix timestamps
  res.json({
    events: events.map(e => ({
      ...e,
      created_at: Math.floor(e.created_at.getTime() / 1000)
    }))
  });
});

app.get('/api/v2/events', (req, res) => {
  // v2: ISO 8601 strings
  res.json({
    events: events.map(e => ({
      ...e,
      created_at: e.created_at.toISOString(),
      updated_at: e.updated_at.toISOString()
    }))
  });
});`}</code></pre>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-400">
        <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">💡 API Timestamp Checklist</h3>
        <ul className="space-y-2">
          <li>✅ Always use UTC timestamps in API responses</li>
          <li>✅ Support ISO 8601 format with timezone info</li>
          <li>✅ Validate timestamp inputs on the server</li>
          <li>✅ Include server timestamp in error responses</li>
          <li>✅ Use consistent field naming (created_at, updated_at)</li>
          <li>✅ Support multiple query formats for flexibility</li>
          <li>✅ Document timestamp formats in API documentation</li>
        </ul>
      </div>
    </article>
  );
}
