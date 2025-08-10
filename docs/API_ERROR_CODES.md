# API Error Codes Reference

This document provides a comprehensive list of error codes returned by the
Timestamp Converter API, along with detailed explanations and recovery
suggestions.

## Error Response Format

All API errors follow a standardized format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional information about the error",
      "suggestions": ["Suggestion 1", "Suggestion 2"]
    },
    "timestamp": "2024-01-15T12:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

The `requestId` field is particularly important when contacting support, as it
allows us to trace the exact request that caused the error.

## Client Error Codes (4xx)

### BAD_REQUEST (400)

Indicates that the request could not be processed due to invalid parameters or
malformed request data.

**Common Causes:**

- Missing required parameters
- Invalid parameter values
- Incompatible parameter combinations
- Malformed JSON in request body

**Recovery Suggestions:**

- Check your request parameters against the API documentation
- Ensure all required parameters are provided
- Validate parameter formats (e.g., timestamps, date strings, timezone
  identifiers)
- Verify JSON syntax in request bodies

**Examples:**

```
Invalid timestamp: Expected a number but received "abc"
Missing required parameter: 'items' is required for batch conversion
Incompatible parameters: Cannot specify both 'timestamp' and 'date'
```

### UNAUTHORIZED (401)

Indicates that authentication is required or the provided authentication is
invalid.

**Common Causes:**

- Missing API key
- Invalid or expired API key
- Insufficient permissions

**Recovery Suggestions:**

- Ensure your API key is included in the request
- Verify that your API key is valid and not expired
- Contact support if you believe you should have access

### FORBIDDEN (403)

Indicates that the authenticated user does not have permission to access the
requested resource.

**Common Causes:**

- Account restrictions
- Plan limitations
- Geographic restrictions

**Recovery Suggestions:**

- Verify your account permissions
- Check if your plan includes access to the requested feature
- Contact support for assistance with access issues

### NOT_FOUND (404)

Indicates that the requested resource could not be found.

**Common Causes:**

- Invalid API endpoint
- Non-existent resource ID
- Deleted or moved resource

**Recovery Suggestions:**

- Check the URL path for typos
- Verify that the resource identifier exists
- Consult the API documentation for correct endpoint paths

**Examples:**

```
Timezone not found: "America/NewYork" is not a valid IANA timezone identifier
Format not found: "custom-format" is not a registered format
```

### VALIDATION_ERROR (422)

Indicates that the request data failed validation checks.

**Common Causes:**

- Invalid data format
- Value out of allowed range
- Failed business rule validation
- Invalid timezone identifier
- Invalid format pattern

**Recovery Suggestions:**

- Check the error details for specific validation failures
- Refer to the API documentation for valid input formats
- Use the suggested alternatives provided in the error response

**Examples:**

```
Invalid timestamp: 32503683600 exceeds the maximum allowed value
Invalid timezone: "PST" is not a valid IANA timezone identifier, did you mean "America/Los_Angeles"?
Invalid format pattern: "YYYY/MM/DD" contains invalid format specifiers
```

### RATE_LIMITED (429)

Indicates that the client has sent too many requests in a given time period.

**Common Causes:**

- Exceeding rate limits for your plan
- Sending requests too frequently
- Batch processing too many items at once

**Recovery Suggestions:**

- Implement exponential backoff and retry logic
- Check the `Retry-After` header for the recommended wait time
- Reduce request frequency or batch size
- Consider upgrading your plan for higher rate limits

**Examples:**

```
Rate limit exceeded: 100 requests per minute allowed, please retry after 45 seconds
Batch size limit exceeded: Maximum 100 items per batch allowed
```

## Server Error Codes (5xx)

### INTERNAL_ERROR (500)

Indicates an unexpected error occurred on the server.

**Common Causes:**

- Server-side bugs
- Unexpected data conditions
- Infrastructure issues

**Recovery Suggestions:**

- Retry the request after a short delay
- Check the API status page for known issues
- Report the error with the request ID to support

### SERVICE_UNAVAILABLE (503)

Indicates that the service is temporarily unavailable.

**Common Causes:**

- Server maintenance
- Service overload
- Dependency failures

**Recovery Suggestions:**

- Retry the request after a longer delay (1-5 minutes)
- Implement circuit breaker pattern to avoid overwhelming the service
- Check the API status page for maintenance announcements

## Feature-Specific Error Codes

### TIMEZONE_ERROR

Indicates an error related to timezone operations.

**Common Causes:**

- Invalid timezone identifier
- Timezone database issues
- DST transition edge cases

**Recovery Suggestions:**

- Use IANA timezone identifiers (e.g., "America/New_York" instead of "EST")
- Check for typos in timezone names
- Use the timezone list endpoint to get valid timezone identifiers

**Examples:**

```
Invalid timezone: "EST" is not a valid IANA timezone identifier
Ambiguous time: 2023-03-12T02:30:00 occurs during DST transition
```

### FORMAT_ERROR

Indicates an error related to date/time formatting.

**Common Causes:**

- Invalid format pattern
- Unsupported format name
- Format parsing failure

**Recovery Suggestions:**

- Use the formats endpoint to get valid format names
- Check format pattern syntax
- Use predefined formats instead of custom patterns when possible

**Examples:**

```
Invalid format: "custom-format" is not a registered format
Format parsing error: Failed to parse "2023-02-30" with format "YYYY-MM-DD"
```

### BATCH_ERROR

Indicates an error related to batch processing.

**Common Causes:**

- Batch size too large
- Mixed incompatible types in batch
- Partial batch failures

**Recovery Suggestions:**

- Reduce batch size to within limits (max 100 items)
- Ensure consistent data types within batch
- Use the `continueOnError` option to process valid items despite errors

**Examples:**

```
Batch size exceeded: 150 items provided, maximum is 100
Mixed types: Cannot mix timestamp numbers and date strings in the same batch
```

### CACHE_ERROR

Indicates an error related to the caching system.

**Common Causes:**

- Cache service unavailable
- Cache key generation failure
- Cache eviction issues

**Recovery Suggestions:**

- Add `cacheControl=no-cache` parameter to bypass cache
- Retry the request
- Report persistent cache issues to support

## Error Handling Best Practices

1. **Always check the `success` field** in responses to determine if an error
   occurred
2. **Implement retry logic** with exponential backoff for 429 and 5xx errors
3. **Log the `requestId`** for troubleshooting and support
4. **Parse the `details` field** for specific error information
5. **Follow recovery suggestions** provided in error responses
6. **Implement graceful degradation** when services are unavailable

## Contacting Support

When contacting support about API errors, always include:

1. The complete error response including `code`, `message`, and `requestId`
2. The request that caused the error (URL, headers, and body)
3. Timestamp of when the error occurred
4. Any patterns or reproducible steps

Contact support at: support@tsconv.com
