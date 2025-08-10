# Detailed API Usage Examples

This document provides comprehensive examples for using the Timestamp Converter
API, focusing on batch conversion, timezone conversion, and formatting
operations.

## Table of Contents

1. [Batch Conversion Examples](#batch-conversion-examples)
2. [Timezone Conversion Examples](#timezone-conversion-examples)
3. [Formatting Examples](#formatting-examples)
4. [Error Handling Examples](#error-handling-examples)
5. [SDK Integration Examples](#sdk-integration-examples)

## Batch Conversion Examples

### Basic Batch Conversion

Convert multiple timestamps to ISO 8601 format:

```bash
curl -X POST "https://tsconv.com/api/batch-convert" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [1640995200, 1641081600, 1641168000],
    "outputFormats": ["iso8601"]
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "input": 1640995200,
        "success": true,
        "data": {
          "timestamp": 1640995200,
          "formats": {
            "iso8601": "2022-01-01T00:00:00.000Z"
          }
        }
      },
      {
        "input": 1641081600,
        "success": true,
        "data": {
          "timestamp": 1641081600,
          "formats": {
            "iso8601": "2022-01-02T00:00:00.000Z"
          }
        }
      },
      {
        "input": 1641168000,
        "success": true,
        "data": {
          "timestamp": 1641168000,
          "formats": {
            "iso8601": "2022-01-03T00:00:00.000Z"
          }
        }
      }
    ],
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0
    }
  },
  "metadata": {
    "processingTime": 15,
    "itemCount": 3
  }
}
```

### Mixed Input Types with Timezone Conversion

Convert a mix of timestamps and date strings with timezone conversion:

```bash
curl -X POST "https://tsconv.com/api/enhanced-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [1640995200, "2022-01-02", "2022-01-03T12:30:45Z"],
    "outputFormat": ["iso8601", "us-date", "relative"],
    "timezone": "UTC",
    "targetTimezone": "America/New_York",
    "options": {
      "continueOnError": true
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "input": 1640995200,
        "success": true,
        "data": {
          "timestamp": 1640995200,
          "formats": {
            "iso8601": "2021-12-31T19:00:00.000Z",
            "us-date": "12/31/2021",
            "relative": "2 years ago"
          },
          "timezone": {
            "original": "UTC",
            "target": "America/New_York"
          }
        }
      },
      {
        "input": "2022-01-02",
        "success": true,
        "data": {
          "timestamp": 1641081600,
          "formats": {
            "iso8601": "2022-01-01T19:00:00.000Z",
            "us-date": "01/01/2022",
            "relative": "2 years ago"
          },
          "timezone": {
            "original": "UTC",
            "target": "America/New_York"
          }
        }
      },
      {
        "input": "2022-01-03T12:30:45Z",
        "success": true,
        "data": {
          "timestamp": 1641212245,
          "formats": {
            "iso8601": "2022-01-03T07:30:45.000Z",
            "us-date": "01/03/2022",
            "relative": "2 years ago"
          },
          "timezone": {
            "original": "UTC",
            "target": "America/New_York"
          }
        }
      }
    ],
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0
    }
  }
}
```

### Handling Errors in Batch Processing

Process a batch with some invalid items using the `continueOnError` option:

```bash
curl -X POST "https://tsconv.com/api/enhanced-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [1640995200, "invalid-date", "2022-01-03T12:30:45Z"],
    "outputFormat": ["iso8601"],
    "options": {
      "continueOnError": true
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "input": 1640995200,
        "success": true,
        "data": {
          "timestamp": 1640995200,
          "formats": {
            "iso8601": "2022-01-01T00:00:00.000Z"
          }
        }
      },
      {
        "input": "invalid-date",
        "success": false,
        "error": {
          "code": "INVALID_FORMAT",
          "message": "Unable to parse as timestamp or date"
        }
      },
      {
        "input": "2022-01-03T12:30:45Z",
        "success": true,
        "data": {
          "timestamp": 1641212245,
          "formats": {
            "iso8601": "2022-01-03T12:30:45.000Z"
          }
        }
      }
    ],
    "summary": {
      "total": 3,
      "successful": 2,
      "failed": 1
    }
  }
}
```

### Large Batch Processing

Process a large batch of timestamps (truncated for brevity):

```bash
curl -X POST "https://tsconv.com/api/enhanced-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [1640995200, 1641081600, 1641168000, 1641254400, 1641340800, 1641427200, 1641513600, 1641600000, 1641686400, 1641772800],
    "outputFormat": ["iso8601", "unix-timestamp"],
    "options": {
      "maxItems": 100
    }
  }'
```

**Response (truncated):**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "input": 1640995200,
        "success": true,
        "data": {
          "timestamp": 1640995200,
          "formats": {
            "iso8601": "2022-01-01T00:00:00.000Z",
            "unix-timestamp": "1640995200"
          }
        }
      }
      // ... additional results omitted for brevity
    ],
    "summary": {
      "total": 10,
      "successful": 10,
      "failed": 0
    }
  }
}
```

## Timezone Conversion Examples

### Basic Timezone Conversion

Convert a timestamp from UTC to New York time:

```bash
curl "https://tsconv.com/api/timezone-convert?timestamp=1640995200&fromTimezone=UTC&toTimezone=America/New_York"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "originalTimestamp": 1640995200,
    "convertedTimestamp": 1640977200,
    "originalDate": "2022-01-01T00:00:00.000Z",
    "convertedDate": "2021-12-31T19:00:00.000Z",
    "fromTimezone": "UTC",
    "toTimezone": "America/New_York",
    "offsetDifference": -300
  }
}
```

### Converting Current Time Between Timezones

Convert the current time from Tokyo to London:

```bash
curl "https://tsconv.com/api/timezone-convert?fromTimezone=Asia/Tokyo&toTimezone=Europe/London"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "originalTimestamp": 1642248600,
    "convertedTimestamp": 1642219800,
    "originalDate": "2022-01-15T14:30:00.000Z",
    "convertedDate": "2022-01-15T06:30:00.000Z",
    "fromTimezone": "Asia/Tokyo",
    "toTimezone": "Europe/London",
    "offsetDifference": -540
  }
}
```

### Timezone Difference Analysis

Get detailed information about the difference between two timezones:

```bash
curl "https://tsconv.com/api/timezone-difference?from=UTC&to=America/Los_Angeles&includeHistorical=true&includeBusiness=true"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "difference": {
      "fromTimezone": "UTC",
      "toTimezone": "America/Los_Angeles",
      "currentOffset": -480,
      "offsetHours": 8,
      "offsetMinutes": 0,
      "direction": "behind",
      "isDST": {
        "from": false,
        "to": false
      }
    },
    "historical": [
      {
        "date": "2022-01-01",
        "offset": -480,
        "isDST1": false,
        "isDST2": false
      },
      {
        "date": "2022-03-13",
        "offset": -420,
        "isDST1": false,
        "isDST2": true,
        "transition": "DST start"
      },
      {
        "date": "2022-11-06",
        "offset": -480,
        "isDST1": false,
        "isDST2": false,
        "transition": "DST end"
      }
    ],
    "businessHours": {
      "overlap": {
        "hours": 0,
        "minutes": 0,
        "percentage": 0
      },
      "workingHours": {
        "fromTimezone": {
          "start": "09:00",
          "end": "17:00",
          "hours": 8
        },
        "toTimezone": {
          "start": "09:00",
          "end": "17:00",
          "hours": 8
        }
      }
    }
  }
}
```

### Finding Optimal Meeting Times

Find optimal meeting times between multiple timezones:

```bash
curl "https://tsconv.com/api/timezone-difference?from=America/New_York&to=Asia/Tokyo&optimalMeeting=true"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "difference": {
      "fromTimezone": "America/New_York",
      "toTimezone": "Asia/Tokyo",
      "currentOffset": 840,
      "offsetHours": 14,
      "offsetMinutes": 0,
      "direction": "ahead",
      "isDST": {
        "from": false,
        "to": false
      }
    },
    "optimalMeetingTimes": [
      {
        "time": "2022-01-15T21:00:00.000Z",
        "timezone1": {
          "localTime": "16:00",
          "day": "Saturday",
          "isBusinessHours": false
        },
        "timezone2": {
          "localTime": "06:00",
          "day": "Sunday",
          "isBusinessHours": false
        },
        "score": 0.6
      },
      {
        "time": "2022-01-15T22:00:00.000Z",
        "timezone1": {
          "localTime": "17:00",
          "day": "Saturday",
          "isBusinessHours": false
        },
        "timezone2": {
          "localTime": "07:00",
          "day": "Sunday",
          "isBusinessHours": false
        },
        "score": 0.7
      },
      {
        "time": "2022-01-17T13:00:00.000Z",
        "timezone1": {
          "localTime": "08:00",
          "day": "Monday",
          "isBusinessHours": false
        },
        "timezone2": {
          "localTime": "22:00",
          "day": "Monday",
          "isBusinessHours": false
        },
        "score": 0.8
      }
    ]
  }
}
```

### Timezone Information

Get detailed information about a specific timezone:

```bash
curl "https://tsconv.com/api/timezone-info?timezone=Australia/Sydney&includeTransitions=true"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "identifier": "Australia/Sydney",
    "displayName": "Australian Eastern Time",
    "currentOffset": 660,
    "isDST": true,
    "region": "Australia",
    "countryCode": "AU",
    "aliases": ["AET", "AEST", "AEDT"],
    "transitions": [
      {
        "date": "2022-04-03T02:00:00+11:00",
        "type": "DST end",
        "offsetBefore": 660,
        "offsetAfter": 600
      },
      {
        "date": "2022-10-02T02:00:00+10:00",
        "type": "DST start",
        "offsetBefore": 600,
        "offsetAfter": 660
      }
    ]
  }
}
```

## Formatting Examples

### Getting Available Formats

Retrieve all available date/time formats:

```bash
curl "https://tsconv.com/api/formats"
```

**Response (truncated):**

```json
{
  "success": true,
  "data": {
    "formats": {
      "standard": [
        {
          "name": "ISO 8601",
          "pattern": "YYYY-MM-DDTHH:mm:ss.sssZ",
          "description": "ISO 8601 format with timezone",
          "example": "2024-01-15T14:30:00.000Z",
          "category": "standard"
        },
        {
          "name": "Unix Timestamp",
          "pattern": "X",
          "description": "Unix timestamp in seconds",
          "example": "1642248600",
          "category": "standard"
        }
      ],
      "regional": [
        {
          "name": "US Date",
          "pattern": "MM/DD/YYYY",
          "description": "US date format",
          "example": "01/15/2024",
          "category": "regional"
        }
      ]
    },
    "categories": ["standard", "regional", "human", "technical"],
    "totalCount": 20
  }
}
```

### Filtering Formats by Category

Get formats for a specific category:

```bash
curl "https://tsconv.com/api/formats?category=technical"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "name": "SQL DateTime",
      "pattern": "YYYY-MM-DD HH:mm:ss",
      "description": "SQL datetime format",
      "example": "2024-01-15 14:30:00",
      "category": "technical"
    },
    {
      "name": "Log Timestamp",
      "pattern": "YYYY-MM-DD HH:mm:ss.SSS",
      "description": "Log file timestamp format",
      "example": "2024-01-15 14:30:00.123",
      "category": "technical"
    },
    {
      "name": "Filename Date",
      "pattern": "YYYYMMDD",
      "description": "Date format suitable for filenames",
      "example": "20240115",
      "category": "technical"
    },
    {
      "name": "Filename DateTime",
      "pattern": "YYYYMMDD_HHmmss",
      "description": "Datetime format suitable for filenames",
      "example": "20240115_143000",
      "category": "technical"
    }
  ],
  "metadata": {
    "category": "technical",
    "count": 4
  }
}
```

### Getting Details for a Specific Format

Get detailed information about a specific format:

```bash
curl "https://tsconv.com/api/formats?format=us-datetime"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "US DateTime",
    "pattern": "MM/DD/YYYY h:mm A",
    "description": "US datetime format",
    "example": "01/15/2024 2:30 PM",
    "category": "regional"
  }
}
```

### Converting with Custom Format

Convert a timestamp using a specific format:

```bash
curl "https://tsconv.com/api/convert?timestamp=1642248600&format=filename-datetime"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "input": "1642248600",
    "timestamp": 1642248600,
    "formats": {
      "iso8601": "2022-01-15T14:30:00.000Z",
      "utc": "Sat, 15 Jan 2022 14:30:00 GMT",
      "timestamp": 1642248600,
      "local": "1/15/2022, 2:30:00 PM",
      "relative": "2 years ago",
      "custom": "20220115_143000"
    }
  }
}
```

### Including Multiple Formats

Convert a timestamp and include multiple format variations:

```bash
curl "https://tsconv.com/api/convert?timestamp=1642248600&includeFormats=true"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "input": "1642248600",
    "timestamp": 1642248600,
    "formats": {
      "iso8601": "2022-01-15T14:30:00.000Z",
      "utc": "Sat, 15 Jan 2022 14:30:00 GMT",
      "timestamp": 1642248600,
      "local": "1/15/2022, 2:30:00 PM",
      "relative": "2 years ago",
      "rfc2822": "Sat, 15 Jan 2022 14:30:00 GMT",
      "unix": 1642248600,
      "short": "1/15/2022",
      "time": "2:30:00 PM"
    }
  }
}
```

## Error Handling Examples

### Handling Invalid Timezone

Example of an error when providing an invalid timezone:

```bash
curl "https://tsconv.com/api/timezone-convert?timestamp=1642248600&fromTimezone=UTC&toTimezone=Invalid/Timezone"
```

**Response:**

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid toTimezone: Invalid/Timezone",
    "details": {
      "suggestions": ["America/New_York", "Europe/London", "Asia/Tokyo"]
    },
    "timestamp": "2024-01-15T12:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### Handling Invalid Date Format

Example of an error when providing an invalid date:

```bash
curl "https://tsconv.com/api/convert?date=2022-13-45"
```

**Response:**

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid date format",
    "details": {
      "suggestions": [
        "Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)"
      ]
    },
    "timestamp": "2024-01-15T12:00:00.000Z",
    "requestId": "req_def456"
  }
}
```

### Handling Rate Limiting

Example of a rate limit error:

```bash
curl "https://tsconv.com/api/convert?timestamp=1642248600"
```

**Response:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetTime": 1642249200000
    },
    "timestamp": "2024-01-15T12:00:00.000Z",
    "requestId": "req_ghi789"
  }
}
```

## SDK Integration Examples

### JavaScript/Node.js

```javascript
// Basic conversion
async function convertTimestamp() {
  try {
    const response = await fetch(
      'https://tsconv.com/api/convert?timestamp=1640995200'
    );
    const data = await response.json();

    if (!data.success) {
      console.error('Error:', data.error.message);
      return;
    }

    console.log('Converted timestamp:', data.data.formats.iso8601);
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Batch conversion with error handling
async function batchConvert() {
  try {
    const response = await fetch('https://tsconv.com/api/enhanced-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [1640995200, 1641081600, 'invalid-date'],
        outputFormat: ['iso8601', 'us-date'],
        options: { continueOnError: true },
      }),
    });

    const data = await response.json();

    if (!data.success) {
      console.error('Error:', data.error.message);
      return;
    }

    // Process successful conversions
    const successful = data.data.results.filter(result => result.success);
    console.log(`Successfully converted ${successful.length} items`);

    // Handle failed conversions
    const failed = data.data.results.filter(result => !result.success);
    if (failed.length > 0) {
      console.warn(
        `Failed to convert ${failed.length} items:`,
        failed.map(item => `${item.input}: ${item.error.message}`)
      );
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Implementing retry with exponential backoff
async function fetchWithRetry(url, options, maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!data.success && data.error.code === 'RATE_LIMITED') {
        const retryAfter = response.headers.get('Retry-After') || 1;
        const delay = retryAfter * 1000 * Math.pow(2, retries);
        console.log(`Rate limited. Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        continue;
      }

      return data;
    } catch (error) {
      if (retries >= maxRetries - 1) throw error;

      const delay = 1000 * Math.pow(2, retries);
      console.log(`Request failed. Retrying after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }
}
```

### Python

```python
import requests
import time
from typing import Dict, List, Union, Any

# Basic conversion
def convert_timestamp(timestamp: int) -> Dict[str, Any]:
    try:
        response = requests.get(f'https://tsconv.com/api/convert', params={
            'timestamp': timestamp
        })
        data = response.json()

        if not data.get('success'):
            print(f"Error: {data['error']['message']}")
            return {}

        return data['data']
    except Exception as e:
        print(f"Request failed: {e}")
        return {}

# Batch conversion with error handling
def batch_convert(items: List[Union[int, str]]) -> Dict[str, Any]:
    try:
        response = requests.post('https://tsconv.com/api/enhanced-batch', json={
            'items': items,
            'outputFormat': ['iso8601', 'us-date'],
            'options': {'continueOnError': True}
        })
        data = response.json()

        if not data.get('success'):
            print(f"Error: {data['error']['message']}")
            return {}

        # Process successful conversions
        successful = [r for r in data['data']['results'] if r.get('success')]
        print(f"Successfully converted {len(successful)} items")

        # Handle failed conversions
        failed = [r for r in data['data']['results'] if not r.get('success')]
        if failed:
            print(f"Failed to convert {len(failed)} items:")
            for item in failed:
                print(f"  {item['input']}: {item['error']['message']}")

        return data['data']
    except Exception as e:
        print(f"Request failed: {e}")
        return {}

# Implementing retry with exponential backoff
def fetch_with_retry(url: str, method: str = 'get', data: Dict = None,
                    max_retries: int = 3) -> Dict[str, Any]:
    retries = 0

    while retries < max_retries:
        try:
            if method.lower() == 'get':
                response = requests.get(url, params=data)
            else:
                response = requests.post(url, json=data)

            result = response.json()

            if not result.get('success') and result.get('error', {}).get('code') == 'RATE_LIMITED':
                retry_after = int(response.headers.get('Retry-After', 1))
                delay = retry_after * (2 ** retries)
                print(f"Rate limited. Retrying after {delay}s...")
                time.sleep(delay)
                retries += 1
                continue

            return result
        except Exception as e:
            if retries >= max_retries - 1:
                raise e

            delay = (2 ** retries)
            print(f"Request failed. Retrying after {delay}s...")
            time.sleep(delay)
            retries += 1

    return {}

# Example usage
if __name__ == "__main__":
    # Convert a single timestamp
    result = convert_timestamp(1640995200)
    print(f"Converted timestamp: {result.get('formats', {}).get('iso8601')}")

    # Batch convert multiple timestamps
    batch_result = batch_convert([1640995200, 1641081600, "invalid-date"])

    # Using retry mechanism for timezone conversion
    timezone_result = fetch_with_retry(
        'https://tsconv.com/api/timezone-convert',
        'get',
        {
            'timestamp': 1640995200,
            'fromTimezone': 'UTC',
            'toTimezone': 'America/New_York'
        }
    )

    if timezone_result.get('success'):
        print(f"Converted timezone: {timezone_result['data']['convertedDate']}")
```

### PHP

```php
<?php

// Basic conversion
function convertTimestamp($timestamp) {
    try {
        $response = file_get_contents("https://tsconv.com/api/convert?timestamp={$timestamp}");
        $data = json_decode($response, true);

        if (!$data['success']) {
            echo "Error: " . $data['error']['message'] . "\n";
            return [];
        }

        return $data['data'];
    } catch (Exception $e) {
        echo "Request failed: " . $e->getMessage() . "\n";
        return [];
    }
}

// Batch conversion with error handling
function batchConvert($items) {
    try {
        $postData = json_encode([
            'items' => $items,
            'outputFormat' => ['iso8601', 'us-date'],
            'options' => ['continueOnError' => true]
        ]);

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n" .
                            "Content-Length: " . strlen($postData) . "\r\n",
                'content' => $postData
            ]
        ]);

        $response = file_get_contents('https://tsconv.com/api/enhanced-batch', false, $context);
        $data = json_decode($response, true);

        if (!$data['success']) {
            echo "Error: " . $data['error']['message'] . "\n";
            return [];
        }

        // Process successful conversions
        $successful = array_filter($data['data']['results'], function($result) {
            return $result['success'];
        });
        echo "Successfully converted " . count($successful) . " items\n";

        // Handle failed conversions
        $failed = array_filter($data['data']['results'], function($result) {
            return !$result['success'];
        });

        if (count($failed) > 0) {
            echo "Failed to convert " . count($failed) . " items:\n";
            foreach ($failed as $item) {
                echo "  " . $item['input'] . ": " . $item['error']['message'] . "\n";
            }
        }

        return $data['data'];
    } catch (Exception $e) {
        echo "Request failed: " . $e->getMessage() . "\n";
        return [];
    }
}

// Example usage
$result = convertTimestamp(1640995200);
echo "Converted timestamp: " . $result['formats']['iso8601'] . "\n";

$batchResult = batchConvert([1640995200, 1641081600, "invalid-date"]);
?>
```

## Advanced Use Cases

### Combining Multiple API Features

This example demonstrates how to combine timezone conversion with custom
formatting:

```javascript
// Step 1: Get timezone information
async function getTimezoneAndFormat(
  timestamp,
  fromTimezone,
  toTimezone,
  format
) {
  try {
    // First, convert the timestamp between timezones
    const tzResponse = await fetch(
      `https://tsconv.com/api/timezone-convert?timestamp=${timestamp}&fromTimezone=${fromTimezone}&toTimezone=${toTimezone}`
    );
    const tzData = await tzResponse.json();

    if (!tzData.success) {
      throw new Error(`Timezone conversion failed: ${tzData.error.message}`);
    }

    // Then, format the converted timestamp
    const convertedTimestamp = tzData.data.convertedTimestamp;
    const formatResponse = await fetch(
      `https://tsconv.com/api/convert?timestamp=${convertedTimestamp}&format=${format}`
    );
    const formatData = await formatResponse.json();

    if (!formatData.success) {
      throw new Error(`Formatting failed: ${formatData.error.message}`);
    }

    return {
      originalTimestamp: timestamp,
      originalTimezone: fromTimezone,
      convertedTimestamp: convertedTimestamp,
      convertedTimezone: toTimezone,
      formattedDate: formatData.data.formats.custom,
      offsetDifference: tzData.data.offsetDifference,
    };
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

// Example usage
getTimezoneAndFormat(1640995200, 'UTC', 'America/New_York', 'us-datetime').then(
  result => {
    console.log('Formatted result:', result);
    // Output: {
    //   originalTimestamp: 1640995200,
    //   originalTimezone: 'UTC',
    //   convertedTimestamp: 1640977200,
    //   convertedTimezone: 'America/New_York',
    //   formattedDate: '12/31/2021 07:00 PM',
    //   offsetDifference: -300
    // }
  }
);
```

### Creating a Meeting Scheduler

This example demonstrates how to find optimal meeting times across multiple
timezones:

```javascript
async function findOptimalMeetingTime(participants) {
  try {
    // Get all unique timezone pairs
    const timezonePairs = [];
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        timezonePairs.push({
          from: participants[i].timezone,
          to: participants[j].timezone,
        });
      }
    }

    // Get timezone differences for each pair
    const differences = await Promise.all(
      timezonePairs.map(pair =>
        fetch(
          `https://tsconv.com/api/timezone-difference?from=${pair.from}&to=${pair.to}&optimalMeeting=true`
        ).then(res => res.json())
      )
    );

    // Collect all optimal meeting times
    const allMeetingTimes = differences.flatMap(diff =>
      diff.success ? diff.data.optimalMeetingTimes : []
    );

    // Score and sort meeting times
    const scoredTimes = allMeetingTimes
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Convert to all participants' timezones
    const result = await Promise.all(
      scoredTimes.map(async time => {
        const timestamp = Math.floor(new Date(time.time).getTime() / 1000);

        // Convert to each participant's timezone
        const conversions = await Promise.all(
          participants.map(participant =>
            fetch(
              `https://tsconv.com/api/convert?timestamp=${timestamp}&targetTimezone=${participant.timezone}`
            ).then(res => res.json())
          )
        );

        return {
          utcTime: time.time,
          score: time.score,
          participantTimes: participants.map((participant, index) => ({
            name: participant.name,
            timezone: participant.timezone,
            localTime: conversions[index].success
              ? conversions[index].data.formats.local
              : 'Unknown',
          })),
        };
      })
    );

    return result;
  } catch (error) {
    console.error('Error finding optimal meeting time:', error);
    return [];
  }
}

// Example usage
const participants = [
  { name: 'Alice', timezone: 'America/New_York' },
  { name: 'Bob', timezone: 'Europe/London' },
  { name: 'Charlie', timezone: 'Asia/Tokyo' },
];

findOptimalMeetingTime(participants).then(meetingTimes => {
  console.log('Top 5 optimal meeting times:');
  meetingTimes.forEach((time, index) => {
    console.log(`\nOption ${index + 1} (Score: ${time.score}):`);
    console.log(`UTC: ${time.utcTime}`);
    time.participantTimes.forEach(pt => {
      console.log(`${pt.name} (${pt.timezone}): ${pt.localTime}`);
    });
  });
});
```
