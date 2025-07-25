# API Documentation

## Overview

This is the enhanced API documentation for tsconv.com, providing comprehensive timestamp and date conversion capabilities with timezone support, custom formatting, caching, and monitoring.

## Interactive Documentation

We provide interactive API documentation using Swagger UI:

- **Swagger UI**: [/api/swagger](/api/swagger)
- **OpenAPI Specification**: [/api/openapi.json](/api/openapi.json)

The Swagger UI allows you to explore and test all API endpoints directly from your browser.

## Base URL

```
https://tsconv.com/api
```

## Authentication

No authentication is required for basic usage. Rate limiting is applied per IP address.

## Rate Limits

- **Standard endpoints**: 100 requests per minute per IP
- **Batch endpoints**: 50 requests per minute per IP
- **Health endpoints**: 10 requests per minute per IP

## Response Format

All API responses follow a standardized format:

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2024-01-15T12:00:00.000Z",
    "processingTime": 45,
    "cache": {
      "hit": true,
      "ttl": 300
    },
    "rateLimit": {
      "limit": 100,
      "remaining": 95,
      "resetTime": 1642249200000
    }
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid timestamp format",
    "details": {
      "suggestions": ["Use Unix timestamp format"]
    },
    "timestamp": "2024-01-15T12:00:00.000Z"
  }
}
```

## Endpoints

### 1. Convert Timestamp/Date

Convert between Unix timestamps and human-readable dates.

**Endpoint**: `GET /api/convert`

**Parameters**:
- `timestamp` (number): Unix timestamp in seconds
- `date` (string): ISO 8601 date string
- `format` (string): Custom format name (optional)
- `timezone` (string): Source timezone (optional)
- `targetTimezone` (string): Target timezone for conversion (optional)
- `includeFormats` (boolean): Include all available formats (optional)

**Example Request**:
```bash
GET /api/convert?timestamp=1640995200&targetTimezone=America/New_York&format=us-datetime
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "input": 1640995200,
    "timestamp": 1640995200,
    "formats": {
      "iso8601": "2022-01-01T00:00:00.000Z",
      "utc": "Sat, 01 Jan 2022 00:00:00 GMT",
      "local": "12/31/2021, 7:00:00 PM",
      "custom": "12/31/2021 07:00 PM",
      "relative": "2 years ago"
    }
  },
  "metadata": {
    "processingTime": 25,
    "cache": {
      "hit": false,
      "ttl": 300
    }
  }
}
```

### 2. Batch Conversion

Convert multiple timestamps or dates in a single request.

**Endpoint**: `POST /api/enhanced-batch`

**Request Body**:
```json
{
  "items": [1640995200, "2022-01-01", "2022-12-31T23:59:59Z"],
  "outputFormat": ["iso8601", "timestamp", "us-date"],
  "timezone": "UTC",
  "targetTimezone": "America/New_York",
  "options": {
    "continueOnError": true,
    "maxItems": 100
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "input": 1640995200,
      "success": true,
      "data": {
        "timestamp": 1640995200,
        "formats": {
          "iso8601": "2022-01-01T00:00:00.000Z",
          "timestamp": "1640995200",
          "us-date": "12/31/2021"
        }
      }
    }
  ],
  "metadata": {
    "totalItems": 3,
    "successCount": 3,
    "errorCount": 0,
    "processingTime": 120
  }
}
```

### 3. Timezone Information

Get comprehensive timezone information and perform conversions.

**Endpoints**:
- `GET /api/timezone` - Timezone info and conversion
- `GET /api/timezone-difference` - Calculate timezone differences
- `GET /api/timezone-list` - List available timezones

**Parameters**:
- `timezone` (string): Target timezone
- `from` (string): Source timezone
- `to` (string): Target timezone
- `timestamp` (number): Reference timestamp
- `includeTransitions` (boolean): Include DST transitions
- `includeHistorical` (boolean): Include historical data
- `includeBusiness` (boolean): Include business hours analysis
- `optimalMeeting` (boolean): Find optimal meeting times

**Example**:
```bash
GET /api/timezone-difference?from=UTC&to=America/New_York&includeHistorical=true
```

**Response**:
```json
{
  "success": true,
  "data": {
    "difference": {
      "fromTimezone": "UTC",
      "toTimezone": "America/New_York",
      "currentOffset": -300,
      "offsetHours": 5,
      "direction": "behind",
      "isDST": {
        "from": false,
        "to": true
      }
    },
    "historical": [
      {
        "date": "2022-01-01",
        "offset": -300,
        "isDST1": false,
        "isDST2": false
      }
    ],
    "optimalMeetingTimes": [
      {
        "time": "2022-01-01T14:00:00.000Z",
        "timezone1": {
          "localTime": "14:00",
          "day": "Saturday",
          "isBusinessHours": false
        },
        "timezone2": {
          "localTime": "09:00",
          "day": "Saturday",
          "isBusinessHours": false
        }
      }
    ]
  }
}
```

### 4. Format Management

Discover and use custom date/time formats.

**Endpoint**: `GET /api/formats`

**Parameters**:
- `category` (string): Filter by category (standard, human, regional, technical)
- `format` (string): Get specific format details

**Example**:
```bash
GET /api/formats?category=regional
```

**Response**:
```json
{
  "success": true,
  "data": {
    "category": "regional",
    "formats": [
      {
        "name": "US Date",
        "pattern": "MM/DD/YYYY",
        "description": "US date format",
        "example": "01/15/2024",
        "category": "regional"
      }
    ],
    "count": 5
  }
}
```

### 5. Visualization Data

Generate data for charts and visualizations.

**Endpoint**: `GET /api/visualization`

**Visualization Types**:
- `timezone-chart`: Timeline chart of timezone differences
- `business-heatmap`: Heatmap of business hours overlap
- `timestamp-distribution`: Distribution analysis of timestamps
- `conversion-timeline`: Timeline of converted timestamps
- `timezone-map`: Geographic timezone data

**Parameters**:
- `type` (string): Visualization type
- `fromTimezone` (string): Source timezone
- `toTimezone` (string): Target timezone
- `timestamps` (array): Array of timestamps for analysis
- `timezone` (string): Reference timezone
- `days` (number): Days for historical data

**Example**:
```bash
GET /api/visualization?type=timezone-chart&fromTimezone=UTC&toTimezone=America/New_York&days=30
```

**Response**:
```json
{
  "success": true,
  "data": {
    "labels": ["2022-01-01", "2022-01-02", ...],
    "datasets": [
      {
        "label": "Timezone Offset Difference",
        "data": [-300, -300, -240, ...],
        "borderColor": "rgb(75, 192, 192)",
        "backgroundColor": "rgba(75, 192, 192, 0.2)"
      }
    ]
  },
  "metadata": {
    "generatedAt": "2024-01-15T12:00:00.000Z",
    "timezone": "UTC",
    "format": "chart"
  }
}
```

### 6. Health Check

Monitor system health and performance.

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T12:00:00.000Z",
    "uptime": 3600000,
    "services": {
      "cache": {
        "status": "healthy",
        "responseTime": 15,
        "lastCheck": "2024-01-15T12:00:00.000Z"
      },
      "timezone": {
        "status": "healthy",
        "responseTime": 8,
        "lastCheck": "2024-01-15T12:00:00.000Z"
      }
    },
    "metrics": {
      "totalRequests": 1500,
      "errors": 5,
      "cacheHitRate": 0.85,
      "memoryUsage": {
        "used": 67108864,
        "total": 1073741824,
        "percentage": 6.25
      }
    },
    "errors": {
      "lastHour": 2,
      "lastDay": 5,
      "topErrorCodes": [
        { "code": "BAD_REQUEST", "count": 3 }
      ],
      "recoverySuggestions": {
        "BAD_REQUEST": "Check your request parameters..."
      }
    }
  }
}
```

## Supported Formats

### Standard Formats
- **iso8601**: `2024-01-15T12:00:00.000Z`
- **iso8601-date**: `2024-01-15`
- **iso8601-time**: `12:00:00`
- **rfc2822**: `Mon, 15 Jan 2024 12:00:00 +0000`
- **unix-timestamp**: `1642248000`
- **millis-timestamp**: `1642248000000`

### Regional Formats
- **us-date**: `01/15/2024`
- **us-datetime**: `01/15/2024 12:00 PM`
- **eu-date**: `15/01/2024`
- **eu-datetime**: `15/01/2024 12:00`
- **ja-date**: `2024年01月15日`
- **zh-date**: `2024年01月15日`

### Technical Formats
- **sql-datetime**: `2024-01-15 12:00:00`
- **log-timestamp**: `2024-01-15 12:00:00.000`
- **filename-date**: `20240115`
- **filename-datetime**: `20240115_120000`

### Human Readable
- **relative**: `2 hours ago`
- **calendar**: `Today at 12:00 PM`

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `BAD_REQUEST` | Invalid parameters | Check API documentation |
| `VALIDATION_ERROR` | Input validation failed | Review error details |
| `NOT_FOUND` | Resource not found | Verify URL and parameters |
| `RATE_LIMITED` | Rate limit exceeded | Implement backoff strategy |
| `INTERNAL_ERROR` | Server error | Retry after delay |
| `SERVICE_UNAVAILABLE` | Service temporarily down | Check health endpoint |

## Examples

### Basic Timestamp Conversion

```bash
curl "https://tsconv.com/api/convert?timestamp=1640995200"
```

### Timezone Conversion

```bash
curl "https://tsconv.com/api/convert?timestamp=1640995200&targetTimezone=Asia/Tokyo"
```

### Batch Processing

```bash
curl -X POST "https://tsconv.com/api/enhanced-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [1640995200, "2022-01-01", "2022-12-31"],
    "outputFormat": ["iso8601", "us-date"],
    "targetTimezone": "Europe/London"
  }'
```

### Timezone Difference Analysis

```bash
curl "https://tsconv.com/api/timezone-difference?from=UTC&to=Asia/Shanghai&includeBusiness=true&optimalMeeting=true"
```

### Visualization Data

```bash
curl "https://tsconv.com/api/visualization?type=timezone-chart&fromTimezone=UTC&toTimezone=America/Los_Angeles&days=90"
```

## SDK Examples

### JavaScript/Node.js

```javascript
// Basic conversion
const response = await fetch('https://tsconv.com/api/convert?timestamp=1640995200');
const data = await response.json();

// Batch conversion
const batchResponse = await fetch('https://tsconv.com/api/enhanced-batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [1640995200, 1641081600],
    outputFormat: ['iso8601'],
    targetTimezone: 'America/New_York'
  })
});
```

### Python

```python
import requests

# Basic conversion
response = requests.get('https://tsconv.com/api/convert', params={
    'timestamp': 1640995200,
    'targetTimezone': 'Asia/Tokyo'
})
data = response.json()

# Batch conversion
batch_response = requests.post('https://tsconv.com/api/enhanced-batch', json={
    'items': [1640995200, '2022-01-01'],
    'outputFormat': ['iso8601'],
    'targetTimezone': 'Europe/London'
})
```

## Webhook Support

Coming soon: Webhook notifications for batch job completion and system health alerts.

## Support

For issues and questions:
- Check the health endpoint: `/api/health`
- Review error messages and recovery suggestions
- Contact support with request ID from error responses