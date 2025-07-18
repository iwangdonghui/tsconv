export default function PythonDatetime() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Python Datetime vs Timestamp</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Python offers multiple ways to handle time data, but choosing between datetime objects and 
          timestamps can be confusing. This guide explains when and why to use each approach.
        </p>
      </div>

      <h2>Decision Matrix: When to Use What</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border-l-4 border-green-400">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">
            🐍 Use datetime objects when:
          </h3>
          <ul className="space-y-2 text-sm">
            <li>✅ Building user interfaces that display dates</li>
            <li>✅ Performing complex date arithmetic (adding months/years)</li>
            <li>✅ Working with timezone conversions</li>
            <li>✅ Formatting dates for human consumption</li>
            <li>✅ Parsing various date string formats</li>
            <li>✅ Need calendar-aware operations</li>
          </ul>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-400">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
            ⚡ Use timestamps when:
          </h3>
          <ul className="space-y-2 text-sm">
            <li>✅ Storing dates in databases or JSON APIs</li>
            <li>✅ Performing simple time comparisons</li>
            <li>✅ Optimizing for performance and memory usage</li>
            <li>✅ Working with system logs or event tracking</li>
            <li>✅ Interfacing with Unix systems or JavaScript</li>
            <li>✅ Need precise time measurements</li>
          </ul>
        </div>
      </div>

      <h2>Real-World Python Scenarios</h2>

      <div className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h3 className="font-semibold mb-4">Scenario 1: Building a Logging System</h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`import time
import json
from datetime import datetime, timezone
import requests

class EventLogger:
    def log_event(self, event_type, user_id, data=None):
        # Use timestamp for storage - compact and sortable
        timestamp = time.time()
        
        log_entry = {
            'timestamp': timestamp,
            'event_type': event_type,
            'user_id': user_id,
            'data': data or {}
        }
        
        # Store in database (timestamp is efficient for indexing)
        self.store_log(log_entry)
        return timestamp
    
    def get_recent_events(self, hours=24):
        # Calculate timestamp range - simple arithmetic
        end_time = time.time()
        start_time = end_time - (hours * 3600)
        
        # Query database with timestamp range
        return self.query_logs(start_time, end_time)
    
    def format_logs_for_display(self, logs):
        formatted = []
        
        for log in logs:
            # Convert to datetime only for display
            dt = datetime.fromtimestamp(log['timestamp'], tz=timezone.utc)
            
            log['human_time'] = dt.strftime('%Y-%m-%d %H:%M:%S UTC')
            log['relative_time'] = self.get_relative_time(dt)
            formatted.append(log)
        
        return formatted`}</code></pre>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
          <h3 className="font-semibold mb-4">Scenario 2: API Data Processing</h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto"><code>{`from datetime import datetime, timezone, timedelta
import time

class APIDataProcessor:
    def fetch_user_activity(self, user_id, days_back=7):
        # Calculate timestamp range for API query
        end_timestamp = time.time()
        start_timestamp = end_timestamp - (days_back * 24 * 3600)
        
        # API expects Unix timestamps
        response = requests.get(f'/api/activity/{user_id}', params={
            'start': int(start_timestamp),
            'end': int(end_timestamp)
        })
        
        return response.json()
    
    def process_activity_data(self, raw_data):
        processed = []
        
        for item in raw_data:
            # Convert timestamp to datetime for processing
            activity_time = datetime.fromtimestamp(
                item['timestamp'], 
                tz=timezone.utc
            )
            
            # Add human-readable fields
            item['date_string'] = activity_time.strftime('%Y-%m-%d')
            item['time_string'] = activity_time.strftime('%H:%M:%S')
            item['day_of_week'] = activity_time.strftime('%A')
            item['is_weekend'] = activity_time.weekday() >= 5
            
            # Keep original timestamp for sorting/filtering
            processed.append(item)
        
        return processed
    
    def generate_daily_summary(self, activities):
        # Group by date using datetime objects
        daily_counts = {}
        
        for activity in activities:
            dt = datetime.fromtimestamp(activity['timestamp'], tz=timezone.utc)
            date_key = dt.date()  # Get date without time
            
            if date_key not in daily_counts:
                daily_counts[date_key] = {
                    'count': 0,
                    'first_activity': dt.time(),
                    'last_activity': dt.time()
                }
            
            daily_counts[date_key]['count'] += 1
            daily_counts[date_key]['last_activity'] = dt.time()
        
        return daily_counts`}</code></pre>
        </div>
      </div>

      <h2>Common Python Datetime Mistakes to Avoid</h2>

      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border-l-4 border-red-400">
          <h3 className="font-semibold mb-3 text-red-800 dark:text-red-200">❌ Timezone Confusion</h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`# ❌ Dangerous: Assumes local timezone
datetime.now()  # Could be any timezone!

# ❌ Also problematic: Naive datetime
datetime(2023, 1, 1, 12, 0, 0)  # No timezone info

# ✅ Better: Be explicit about timezone
from datetime import timezone
datetime.now(timezone.utc)  # Always UTC

# ✅ Best: Use timezone-aware datetimes
from zoneinfo import ZoneInfo  # Python 3.9+
datetime(2023, 1, 1, 12, 0, 0, tzinfo=ZoneInfo('UTC'))`}</code></pre>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border-l-4 border-red-400">
          <h3 className="font-semibold mb-3 text-red-800 dark:text-red-200">❌ Mixing Naive and Aware Datetimes</h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`# ❌ This will raise TypeError
naive_dt = datetime(2023, 1, 1, 12, 0, 0)
aware_dt = datetime.now(timezone.utc)
difference = aware_dt - naive_dt  # TypeError!

# ✅ Make both timezone-aware
naive_dt = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
aware_dt = datetime.now(timezone.utc)
difference = aware_dt - naive_dt  # Works!`}</code></pre>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border-l-4 border-red-400">
          <h3 className="font-semibold mb-3 text-red-800 dark:text-red-200">❌ Incorrect Timestamp Conversion</h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"><code>{`# ❌ Wrong: Assumes local timezone
timestamp = 1640995200
dt = datetime.fromtimestamp(timestamp)  # Local timezone!

# ✅ Correct: Specify UTC
dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)

# ✅ Alternative: Use utcfromtimestamp (deprecated in 3.12)
dt = datetime.utcfromtimestamp(timestamp).replace(tzinfo=timezone.utc)`}</code></pre>
        </div>
      </div>

      <h2>Performance Considerations</h2>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border-l-4 border-yellow-400">
        <h3 className="font-semibold mb-3 text-yellow-800 dark:text-yellow-200">⚡ Benchmark Results</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Timestamp Operations (Fast)</h4>
            <ul className="text-sm space-y-1">
              <li>✅ Comparison: ~10x faster</li>
              <li>✅ Storage: 8 bytes vs 32+ bytes</li>
              <li>✅ Sorting: Native integer sort</li>
              <li>✅ JSON serialization: Direct</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Datetime Operations (Feature-rich)</h4>
            <ul className="text-sm space-y-1">
              <li>✅ Human-readable formatting</li>
              <li>✅ Calendar arithmetic</li>
              <li>✅ Timezone conversions</li>
              <li>✅ Date component access</li>
            </ul>
          </div>
        </div>
      </div>

      <h2>Best Practices Summary</h2>

      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-green-800 dark:text-green-200">✅ Do This</h3>
          <ul className="text-sm space-y-1">
            <li>Store timestamps in databases for performance</li>
            <li>Use timezone-aware datetime objects for display</li>
            <li>Always specify timezone when creating datetime objects</li>
            <li>Convert timestamps to datetime only when needed</li>
            <li>Use UTC for all internal calculations</li>
          </ul>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-red-800 dark:text-red-200">❌ Avoid This</h3>
          <ul className="text-sm space-y-1">
            <li>Mixing naive and timezone-aware datetimes</li>
            <li>Using datetime.now() without timezone</li>
            <li>Storing datetime objects in JSON APIs</li>
            <li>Assuming local timezone in timestamp conversions</li>
            <li>Using datetime for high-frequency operations</li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-400">
        <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">💡 Rule of Thumb</h3>
        <p>
          <strong>Store as timestamps, process as datetime, display as formatted strings.</strong>
          This approach gives you the best of both worlds: performance for storage and operations, 
          plus flexibility for user-facing features.
        </p>
      </div>
    </article>
  );
}
