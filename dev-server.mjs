import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Timestamp Converter API',
    version: '1.0.0',
    endpoints: {
      convert: {
        method: 'GET',
        path: '/api/convert',
        description: 'Convert timestamps and dates',
        examples: [
          '/api/convert?timestamp=1753118988',
          '/api/convert?date=2025-07-21'
        ]
      },
      formats: {
        method: 'GET', 
        path: '/api/formats',
        description: 'Get available date/time formats'
      },
      now: {
        method: 'GET',
        path: '/api/now',
        description: 'Get current timestamp in multiple formats'
      },
      'enhanced-batch': {
        method: 'POST',
        path: '/api/enhanced-batch',
        description: 'Convert multiple timestamps/dates in batch'
      },
      health: {
        method: 'GET',
        path: '/api/health',
        description: 'Check API health and status'
      },
      'timezone-difference': {
        method: 'GET',
        path: '/api/timezone-difference',
        description: 'Calculate timezone differences and conversions',
        examples: [
          '/api/timezone-difference?from=UTC&to=America/New_York',
          '/api/timezone-difference?from=UTC&to=Asia/Tokyo&timestamp=1753118988'
        ]
      },
      visualization: {
        method: 'GET',
        path: '/api/visualization',
        description: 'Generate charts and visualization data',
        examples: [
          '/api/visualization?type=timezone-chart',
          '/api/visualization?type=timeline',
          '/api/visualization?type=heatmap'
        ]
      }
    },
    documentation: 'http://localhost:5173/api-docs',
    status: 'running'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: {
        redis: 'mock (memory fallback)',
        cache: 'active',
        rateLimiter: 'mock'
      },
      metrics: {
        totalRequests: 100,
        cacheHitRate: 0.85,
        avgResponseTime: 25
      }
    },
    meta: {
      endpoint: '/api/health',
      method: 'GET',
      timestamp: new Date().toISOString()
    }
  });
});

// Convert endpoint
app.get('/api/convert', (req, res) => {
  const { timestamp, date, format, timezone, targetTimezone } = req.query;
  
  let inputValue = timestamp || date;
  if (!inputValue) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PARAMETER',
        message: 'Either timestamp or date parameter is required'
      }
    });
  }

  const ts = timestamp ? parseInt(timestamp) : Math.floor(new Date(date).getTime() / 1000);
  
  if (isNaN(ts)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FORMAT',
        message: 'Invalid timestamp or date format'
      }
    });
  }

  const dateObj = new Date(ts * 1000);
  
  res.json({
    success: true,
    data: {
      input: inputValue,
      timestamp: ts,
      formats: {
        iso8601: dateObj.toISOString(),
        utc: dateObj.toUTCString(),
        timestamp: ts,
        local: dateObj.toLocaleString(),
        unix: ts,
        relative: 'now'
      }
    },
    meta: {
      timezone: timezone || 'UTC',
      targetTimezone: targetTimezone || 'UTC',
      processingTime: 2,
      cacheHit: false
    }
  });
});

// Formats endpoint
app.get('/api/formats', (req, res) => {
  res.json({
    success: true,
    data: {
      formats: [
        { name: 'ISO 8601', value: 'iso8601', description: 'International standard date format', example: '2024-01-15T14:30:00.000Z', category: 'standard' },
        { name: 'UTC String', value: 'utc', description: 'UTC date string format', example: 'Mon, 15 Jan 2024 14:30:00 GMT', category: 'standard' },
        { name: 'Unix Timestamp', value: 'timestamp', description: 'Seconds since Unix epoch', example: '1705321800', category: 'technical' },
        { name: 'Local String', value: 'local', description: 'Browser local format', example: '1/15/2024, 2:30:00 PM', category: 'standard' },
        { name: 'Relative Time', value: 'relative', description: 'Human-readable relative time', example: '2 hours ago', category: 'human' }
      ],
      categories: ['standard', 'human', 'regional', 'technical'],
      total: 5
    },
    meta: {
      timestamp: new Date().toISOString(),
      cacheHit: true
    }
  });
});

// Now endpoint
app.get('/api/now', (req, res) => {
  const now = new Date();
  const timestamp = Math.floor(now.getTime() / 1000);
  
  res.json({
    success: true,
    data: {
      current: {
        timestamp: timestamp,
        date: now.toISOString(),
        formats: {
          iso8601: now.toISOString(),
          utc: now.toUTCString(),
          timestamp: timestamp,
          local: now.toLocaleString(),
          unix: timestamp
        }
      }
    },
    meta: {
      timestamp: now.toISOString()
    }
  });
});

// Batch endpoint
app.post('/api/enhanced-batch', (req, res) => {
  const { inputs = [] } = req.body;
  
  const results = inputs.map(input => {
    try {
      const ts = typeof input === 'string' && isNaN(input) ? 
        Math.floor(new Date(input).getTime() / 1000) : 
        parseInt(input);
      
      if (isNaN(ts)) {
        return {
          input: input,
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Unable to parse as timestamp or date'
          }
        };
      }

      const dateObj = new Date(ts * 1000);
      
      return {
        input: input,
        success: true,
        data: {
          original: input,
          timestamp: ts,
          date: dateObj.toISOString(),
          formats: {
            iso8601: dateObj.toISOString(),
            utc: dateObj.toUTCString(),
            timestamp: ts,
            local: dateObj.toLocaleString(),
            unix: ts
          }
        }
      };
    } catch (error) {
      return {
        input: input,
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error.message
        }
      };
    }
  });

  res.json({
    success: true,
    data: {
      results: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    },
    meta: {
      processingTime: 5,
      batchSize: results.length,
      maxBatchSize: 100
    }
  });
});

// Timezone difference endpoint
app.get('/api/timezone-difference', (req, res) => {
  const { from, to, timestamp } = req.query;
  
  if (!from || !to) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PARAMETER',
        message: 'Both from and to timezone parameters are required'
      }
    });
  }

  const ts = timestamp ? parseInt(timestamp) : Math.floor(Date.now() / 1000);
  
  try {
    const fromDate = new Date(ts * 1000);
    const toDate = new Date(ts * 1000);
    
    // Mock timezone offsets for demo
    const timezoneOffsets = {
      'UTC': 0,
      'America/New_York': -5,
      'America/Los_Angeles': -8,
      'America/Chicago': -6,
      'Europe/London': 0,
      'Europe/Paris': 1,
      'Asia/Tokyo': 9,
      'Asia/Shanghai': 8,
      'Asia/Kolkata': 5.5,
      'Australia/Sydney': 10
    };
    
    const fromOffset = timezoneOffsets[from] || 0;
    const toOffset = timezoneOffsets[to] || 0;
    
    const diffHours = toOffset - fromOffset;
    const diffMinutes = diffHours * 60;
    
    res.json({
      success: true,
      data: {
        from: {
          timezone: from,
          time: new Date(ts * 1000 + (fromOffset * 3600 * 1000)).toISOString(),
          offset: fromOffset
        },
        to: {
          timezone: to,
          time: new Date(ts * 1000 + (toOffset * 3600 * 1000)).toISOString(),
          offset: toOffset
        },
        difference: {
          hours: diffHours,
          minutes: diffMinutes
        },
        timestamp: ts
      },
      meta: {
        calculationTime: 1,
        source: 'mock_timezone_data'
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_TIMEZONE',
        message: `Invalid timezone: ${error.message}`
      }
    });
  }
});

// Visualization endpoint
app.get('/api/visualization', (req, res) => {
  const { type, data, timezone } = req.query;
  
  if (!type) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PARAMETER',
        message: 'type parameter is required (timezone-chart, timeline, heatmap)'
      }
    });
  }

  const mockData = {
    'timezone-chart': {
      type: 'timezone-chart',
      title: 'Timezone Distribution',
      data: [
        { timezone: 'UTC', count: 150, percentage: 25 },
        { timezone: 'America/New_York', count: 120, percentage: 20 },
        { timezone: 'America/Los_Angeles', count: 100, percentage: 16.7 },
        { timezone: 'Europe/London', count: 90, percentage: 15 },
        { timezone: 'Asia/Tokyo', count: 80, percentage: 13.3 },
        { timezone: 'Asia/Shanghai', count: 60, percentage: 10 }
      ],
      total: 600,
      chartConfig: {
        type: 'pie',
        labels: true,
        colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
      }
    },
    timeline: {
      type: 'timeline',
      title: '24-Hour Activity Timeline',
      data: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        requests: Math.floor(Math.random() * 100) + 10,
        label: `${hour}:00`,
        formattedTime: new Date(Date.now() - (23-hour) * 3600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      })),
      chartConfig: {
        type: 'line',
        xAxis: 'hour',
        yAxis: 'requests',
        stroke: '#3b82f6'
      }
    },
    heatmap: {
      type: 'heatmap',
      title: 'Weekly Usage Heatmap',
      data: Array.from({ length: 7 }, (_, day) => ({
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
        dayIndex: day,
        hours: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          value: Math.floor(Math.random() * 100),
          label: `${day}-${hour}`
        }))
      })),
      chartConfig: {
        type: 'heatmap',
        colors: ['#f3f4f6', '#fef3c7', '#fde68a', '#fbbf24', '#f59e0b', '#d97706', '#b45309']
      }
    }
  };

  const result = mockData[type];
  if (!result) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_TYPE',
        message: `Invalid visualization type: ${type}. Available: ${Object.keys(mockData).join(', ')}`
      }
    });
  }

  res.json({
    success: true,
    data: result,
    meta: {
      type,
      generatedAt: new Date().toISOString(),
      timezone: timezone || 'UTC'
    }
  });
});

// Fallback for other API endpoints
app.get('/api/*', (req, res) => {
  const endpoint = req.path;
  res.json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${endpoint} not found`,
      available: [
        '/api',
        '/api/convert',
        '/api/formats',
        '/api/now',
        '/api/enhanced-batch',
        '/api/health',
        '/api/timezone-difference',
        '/api/visualization'
      ]
    }
  });
});

console.log('🔧 Development API server running on http://localhost:3000');
console.log('🔗 Available endpoints:');
console.log('   GET  /api/convert?timestamp=1753118988');
console.log('   GET  /api/formats');
console.log('   GET  /api/now');
console.log('   POST /api/enhanced-batch');
console.log('   GET  /api/health');
console.log('   GET  /api/timezone-difference?from=UTC&to=America/New_York');
console.log('   GET  /api/visualization?type=timezone-chart');

app.listen(port, () => {
  console.log(`✅ Server listening on port ${port}`);
});