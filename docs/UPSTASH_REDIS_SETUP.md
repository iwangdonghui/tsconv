# Upstash Redis Integration Setup Guide

This guide explains how to set up and use Upstash Serverless Redis with the timestamp converter API.

## Overview

The API now supports Upstash Serverless Redis for both caching and rate limiting, with automatic fallback to in-memory storage when Redis is unavailable.

## Features

- ✅ **Serverless Redis**: Upstash Redis integration with HTTP API
- ✅ **Automatic Fallback**: Falls back to memory cache when Redis is unavailable
- ✅ **Health Monitoring**: Built-in health checks and connection monitoring
- ✅ **Performance Metrics**: Comprehensive performance monitoring and metrics
- ✅ **Rate Limiting**: Distributed rate limiting using Redis
- ✅ **Batch Operations**: Optimized batch get/set operations
- ✅ **Connection Resilience**: Automatic reconnection with exponential backoff

## Setup Instructions

### 1. Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Choose your preferred region (closer to your deployment for better performance)
4. Copy the REST URL and Token from the database details

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Upstash Redis Configuration (Primary)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Redis Configuration (Fallback)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Cache Configuration
CACHING_ENABLED=true
CACHE_DEFAULT_TTL=300
USE_UPSTASH_REDIS=true
REDIS_FALLBACK_ENABLED=true
REDIS_MAX_RETRIES=3

# Rate Limiting
RATE_LIMITING_ENABLED=true
ANONYMOUS_RATE_LIMIT=100
AUTHENTICATED_RATE_LIMIT=1000

# Performance Monitoring
METRICS_ENABLED=true
```

### 3. Deployment

For Vercel deployment, add the environment variables in your Vercel dashboard:

1. Go to your project settings
2. Navigate to Environment Variables
3. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Deploy your application

## Usage

### Cache Service

The cache service automatically uses Upstash Redis when configured:

```typescript
import { getCacheService } from './api/services/cache-factory';

const cacheService = getCacheService();

// Basic operations
await cacheService.set('key', { data: 'value' }, 300000); // 5 minutes TTL
const value = await cacheService.get('key');
await cacheService.del('key');

// Batch operations
const values = await cacheService.mget(['key1', 'key2', 'key3']);
await cacheService.mset([
  { key: 'key1', value: 'value1', ttl: 300000 },
  { key: 'key2', value: 'value2', ttl: 600000 }
]);

// Health check
const health = await cacheService.healthCheck();
console.log(health.status); // 'healthy', 'degraded', or 'unhealthy'
```

### Rate Limiter

The rate limiter uses Redis for distributed limiting:

```typescript
import { getRateLimiter } from './api/services/rate-limiter-factory';

const rateLimiter = getRateLimiter();

const rule = {
  identifier: 'anonymous',
  limit: 100,
  window: 60000, // 1 minute
  type: 'ip' as const
};

const result = await rateLimiter.increment('user-ip', rule);
console.log(result.allowed); // true/false
console.log(result.remaining); // requests remaining
```

### Performance Monitoring

Access performance metrics through the metrics API:

```bash
# Overview metrics
GET /api/metrics

# Performance metrics
GET /api/metrics?type=performance&timeRange=hour

# Cache metrics
GET /api/metrics?type=cache&timeRange=day

# System metrics
GET /api/metrics?type=system
```

### Health Checks

Enhanced health checks with Redis status:

```bash
# Quick health check
GET /api/health

# Detailed health check
GET /api/health?detailed=true
```

## Architecture

### Service Factory Pattern

The implementation uses a factory pattern to automatically choose the appropriate service:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Request   │───▶│  Service Factory │───▶│ Upstash Redis   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                │                        ▼
                                │               ┌─────────────────┐
                                └──────────────▶│ Memory Fallback │
                                                └─────────────────┘
```

### Fallback Strategy

1. **Primary**: Upstash Redis (when configured and available)
2. **Fallback**: In-memory cache/rate limiter
3. **Health Monitoring**: Continuous connection monitoring
4. **Auto-Recovery**: Automatic reconnection attempts

## Monitoring and Debugging

### Health Status

- **Healthy**: Redis connected and operational
- **Degraded**: Using memory fallback, Redis disconnected
- **Unhealthy**: Both Redis and fallback failing

### Logs

The service provides detailed logging:

```
✅ Upstash Redis connection established
⚠️ Upstash Redis connection failed (attempt 1): Error message
🔄 Falling back to memory cache after max connection attempts
```

### Metrics

Key metrics tracked:

- Cache hit/miss ratio
- Response times
- Error rates
- Memory usage
- Connection status
- Rate limit usage

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Check Upstash database status
   - Ensure network connectivity

2. **High Memory Usage**
   - Monitor cache size and TTL settings
   - Consider adjusting `CACHE_DEFAULT_TTL`
   - Check for memory leaks in fallback cache

3. **Rate Limiting Issues**
   - Verify rate limit configuration
   - Check Redis connection for distributed limiting
   - Monitor rate limit metrics

### Debug Commands

```bash
# Test Redis connection
curl "https://your-redis.upstash.io/ping" \
  -H "Authorization: Bearer your-token"

# Check health status
curl "http://localhost:3000/api/health?detailed=true"

# View metrics
curl "http://localhost:3000/api/metrics?type=cache"
```

## Performance Optimization

### Best Practices

1. **TTL Management**: Set appropriate TTL values for different data types
2. **Batch Operations**: Use `mget`/`mset` for multiple operations
3. **Connection Pooling**: Upstash handles this automatically
4. **Monitoring**: Regular health checks and metrics monitoring

### Configuration Tuning

```bash
# Optimize for your use case
CACHE_DEFAULT_TTL=300          # 5 minutes for general data
REDIS_MAX_RETRIES=3            # Connection retry attempts
ANONYMOUS_RATE_LIMIT=100       # Requests per minute
AUTHENTICATED_RATE_LIMIT=1000  # Higher limit for authenticated users
```

## Cost Optimization

### Upstash Pricing Tiers

- **Free Tier**: 10,000 requests/day
- **Pay-as-you-go**: $0.2 per 100K requests
- **Pro**: Fixed monthly pricing

### Cost Reduction Tips

1. Use appropriate TTL values to reduce redundant requests
2. Implement efficient cache key strategies
3. Monitor usage through Upstash dashboard
4. Use batch operations to reduce request count

## Security

### Best Practices

1. **Environment Variables**: Never commit tokens to version control
2. **Token Rotation**: Regularly rotate Upstash tokens
3. **Network Security**: Use HTTPS for all Redis communications
4. **Access Control**: Limit database access to necessary IPs

### Upstash Security Features

- TLS encryption in transit
- REST API authentication
- IP allowlisting
- Audit logs

## Migration Guide

### From Memory Cache

1. Add Upstash environment variables
2. Deploy with `USE_UPSTASH_REDIS=true`
3. Monitor health checks for successful connection
4. Verify cache hit rates and performance

### From Traditional Redis

1. Export existing Redis data (if needed)
2. Update environment variables to Upstash
3. Test connection and functionality
4. Monitor performance and adjust configuration

## Support

For issues and questions:

1. Check the health endpoint: `/api/health?detailed=true`
2. Review application logs for connection errors
3. Monitor metrics: `/api/metrics`
4. Consult Upstash documentation: https://docs.upstash.com/
5. Check GitHub issues for known problems

## Changelog

### v1.0.0 - Initial Upstash Integration
- ✅ Upstash Redis cache service
- ✅ Upstash Redis rate limiter
- ✅ Automatic fallback mechanism
- ✅ Health monitoring and metrics
- ✅ Performance monitoring middleware
- ✅ Comprehensive test coverage