export default function CommonPatterns() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Common Timestamp Patterns</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Frequently used timestamp patterns and best practices for real-world applications. 
          Includes caching, rate limiting, session management, and more.
        </p>
      </div>

      <div className="space-y-8">
        {/* Rate Limiting */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-red-500">🚦</span> Rate Limiting
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`// JavaScript: Simple rate limiter
class RateLimiter {
  constructor(maxRequests, windowSeconds) {
    this.maxRequests = maxRequests;
    this.windowSeconds = windowSeconds;
    this.requests = new Map();
  }
  
  isAllowed(userId) {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - this.windowSeconds;
    
    if (!this.requests.has(userId)) {
      this.requests.set(userId, []);
    }
    
    const userRequests = this.requests.get(userId);
    
    // Remove old requests
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    return true;
  }
}

// Usage: 5 requests per minute
const limiter = new RateLimiter(5, 60);
console.log(limiter.isAllowed('user123')); // true or false`}</code></pre>
        </div>

        {/* Session Management */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-500">🔐</span> Session Management
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`// Session with expiration
class SessionManager {
  constructor(sessionDurationSeconds = 3600) { // 1 hour default
    this.sessions = new Map();
    this.duration = sessionDurationSeconds;
  }
  
  createSession(userId) {
    const sessionId = this.generateSessionId();
    const expiresAt = Math.floor(Date.now() / 1000) + this.duration;
    
    this.sessions.set(sessionId, {
      userId,
      createdAt: Math.floor(Date.now() / 1000),
      expiresAt,
      lastActivity: Math.floor(Date.now() / 1000)
    });
    
    return sessionId;
  }
  
  isValidSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const now = Math.floor(Date.now() / 1000);
    if (now > session.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }
    
    // Update last activity
    session.lastActivity = now;
    return true;
  }
  
  extendSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.expiresAt = Math.floor(Date.now() / 1000) + this.duration;
    }
  }
}`}</code></pre>
        </div>

        {/* Cache with TTL */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-purple-500">💾</span> Cache with TTL
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`// Time-based cache implementation
class TTLCache {
  constructor(defaultTTL = 300) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }
  
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Math.floor(Date.now() / 1000)
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    const now = Math.floor(Date.now() / 1000);
    if (now > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  cleanup() {
    const now = Math.floor(Date.now() / 1000);
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage
const cache = new TTLCache(600); // 10 minutes
cache.set('user:123', userData, 300); // 5 minutes TTL
const user = cache.get('user:123');`}</code></pre>
        </div>

        {/* Event Scheduling */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-blue-500">⏰</span> Event Scheduling
          </h2>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto"><code>{`// Simple event scheduler
class EventScheduler {
  constructor() {
    this.events = [];
    this.running = false;
  }
  
  schedule(callback, delaySeconds, data = null) {
    const executeAt = Math.floor(Date.now() / 1000) + delaySeconds;
    const event = {
      id: Date.now() + Math.random(),
      callback,
      executeAt,
      data,
      createdAt: Math.floor(Date.now() / 1000)
    };
    
    this.events.push(event);
    this.events.sort((a, b) => a.executeAt - b.executeAt);
    
    if (!this.running) {
      this.start();
    }
    
    return event.id;
  }
  
  start() {
    this.running = true;
    this.tick();
  }
  
  tick() {
    if (!this.running) return;
    
    const now = Math.floor(Date.now() / 1000);
    
    while (this.events.length > 0 && this.events[0].executeAt <= now) {
      const event = this.events.shift();
      try {
        event.callback(event.data);
      } catch (error) {
        console.error('Event execution failed:', error);
      }
    }
    
    setTimeout(() => this.tick(), 1000); // Check every second
  }
}

// Usage
const scheduler = new EventScheduler();
scheduler.schedule(() => console.log('Hello!'), 10); // Execute in 10 seconds`}</code></pre>
        </div>

        {/* Best Practices Summary */}
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border-l-4 border-green-400">
          <h2 className="text-xl font-semibold mb-4 text-green-800 dark:text-green-200">🎯 Pattern Best Practices</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Performance:</h3>
              <ul className="space-y-1">
                <li>✅ Use timestamps for efficient sorting</li>
                <li>✅ Index timestamp columns in databases</li>
                <li>✅ Implement cleanup routines for expired data</li>
                <li>✅ Use batch operations for bulk timestamp updates</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Reliability:</h3>
              <ul className="space-y-1">
                <li>✅ Always validate timestamp ranges</li>
                <li>✅ Handle clock skew in distributed systems</li>
                <li>✅ Use monotonic timestamps for ordering</li>
                <li>✅ Implement graceful degradation for time failures</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}