const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

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
        rateLimiter: 'mock',
      },
      metrics: {
        totalRequests: 100,
        cacheHitRate: 0.85,
        avgResponseTime: 25,
      },
    },
    meta: {
      endpoint: '/api/health',
      method: 'GET',
      timestamp: new Date().toISOString(),
    },
  });
});

// Convert endpoint
app.get('/api/convert', (req, res) => {
  const { timestamp, date, format, timezone, targetTimezone } = req.query;

  const inputValue = timestamp || date;
  if (!inputValue) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PARAMETER',
        message: 'Either timestamp or date parameter is required',
      },
    });
  }

  const ts = timestamp ? parseInt(timestamp) : Math.floor(new Date(date).getTime() / 1000);

  if (isNaN(ts)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FORMAT',
        message: 'Invalid timestamp or date format',
      },
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
        relative: 'now',
      },
    },
    meta: {
      timezone: timezone || 'UTC',
      targetTimezone: targetTimezone || 'UTC',
      processingTime: 2,
      cacheHit: false,
    },
  });
});

// Formats endpoint
app.get('/api/formats', (req, res) => {
  res.json({
    success: true,
    data: {
      formats: [
        {
          name: 'ISO 8601',
          value: 'iso8601',
          description: 'International standard date format',
          example: '2024-01-15T14:30:00.000Z',
          category: 'standard',
        },
        {
          name: 'UTC String',
          value: 'utc',
          description: 'UTC date string format',
          example: 'Mon, 15 Jan 2024 14:30:00 GMT',
          category: 'standard',
        },
        {
          name: 'Unix Timestamp',
          value: 'timestamp',
          description: 'Seconds since Unix epoch',
          example: '1705321800',
          category: 'technical',
        },
        {
          name: 'Local String',
          value: 'local',
          description: 'Browser local format',
          example: '1/15/2024, 2:30:00 PM',
          category: 'standard',
        },
        {
          name: 'Relative Time',
          value: 'relative',
          description: 'Human-readable relative time',
          example: '2 hours ago',
          category: 'human',
        },
      ],
      categories: ['standard', 'human', 'regional', 'technical'],
      total: 5,
    },
    meta: {
      timestamp: new Date().toISOString(),
      cacheHit: true,
    },
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
        timestamp,
        date: now.toISOString(),
        formats: {
          iso8601: now.toISOString(),
          utc: now.toUTCString(),
          timestamp,
          local: now.toLocaleString(),
          unix: timestamp,
        },
      },
    },
    meta: {
      timestamp: now.toISOString(),
    },
  });
});

// Batch endpoint
app.post('/api/enhanced-batch', (req, res) => {
  const { inputs = [] } = req.body;

  const results = inputs.map(input => {
    try {
      const ts =
        typeof input === 'string' && isNaN(input)
          ? Math.floor(new Date(input).getTime() / 1000)
          : parseInt(input);

      if (isNaN(ts)) {
        return {
          input,
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Unable to parse as timestamp or date',
          },
        };
      }

      const dateObj = new Date(ts * 1000);

      return {
        input,
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
            unix: ts,
          },
        },
      };
    } catch (error) {
      return {
        input,
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error.message,
        },
      };
    }
  });

  res.json({
    success: true,
    data: {
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    },
    meta: {
      processingTime: 5,
      batchSize: results.length,
      maxBatchSize: 100,
    },
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
      available: ['/api/convert', '/api/formats', '/api/now', '/api/enhanced-batch', '/api/health'],
    },
  });
});

console.log('Development API server running on http://localhost:3000');
console.log('Available endpoints:');
console.log('  GET  /api/convert?timestamp=1753118988');
console.log('  GET  /api/formats');
console.log('  GET  /api/now');
console.log('  POST /api/enhanced-batch');
console.log('  GET  /api/health');

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
