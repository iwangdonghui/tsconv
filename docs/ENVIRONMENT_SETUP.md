# Environment Variables Setup Guide

## 🏠 Local Development (.env file)

Create a `.env` file in your project root:

```bash
# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Feature Flags
USE_UPSTASH_REDIS=true
CACHING_ENABLED=true
RATE_LIMITING_ENABLED=true

# Cache Settings
CACHE_DEFAULT_TTL=300
REDIS_FALLBACK_ENABLED=true
REDIS_MAX_RETRIES=3

# Rate Limiting
ANONYMOUS_RATE_LIMIT=100
AUTHENTICATED_RATE_LIMIT=1000

# Environment
NODE_ENV=development
```

## ☁️ Vercel Deployment

### Method 1: Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add these variables:

| Name                       | Value                           | Environment                      |
| -------------------------- | ------------------------------- | -------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | `https://your-redis.upstash.io` | Production, Preview, Development |
| `UPSTASH_REDIS_REST_TOKEN` | `your-token-here`               | Production, Preview, Development |
| `USE_UPSTASH_REDIS`        | `true`                          | Production, Preview, Development |
| `CACHING_ENABLED`          | `true`                          | Production, Preview              |
| `RATE_LIMITING_ENABLED`    | `true`                          | Production, Preview              |

### Method 2: Vercel CLI

```bash
# Set production environment variables
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel env add USE_UPSTASH_REDIS production

# Set preview environment variables
vercel env add UPSTASH_REDIS_REST_URL preview
vercel env add UPSTASH_REDIS_REST_TOKEN preview
vercel env add USE_UPSTASH_REDIS preview
```

### Method 3: vercel.json

```json
{
  "env": {
    "UPSTASH_REDIS_REST_URL": "@upstash-redis-url",
    "UPSTASH_REDIS_REST_TOKEN": "@upstash-redis-token",
    "USE_UPSTASH_REDIS": "true"
  }
}
```

## 🐳 Docker Environment

### Dockerfile

```dockerfile
ENV UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
ENV UPSTASH_REDIS_REST_TOKEN=your-token
ENV USE_UPSTASH_REDIS=true
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
      - UPSTASH_REDIS_REST_TOKEN=your-token
      - USE_UPSTASH_REDIS=true
    ports:
      - '3000:3000'
```

## 🚀 Other Deployment Platforms

### Netlify

1. Go to Site Settings → Environment Variables
2. Add the variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `USE_UPSTASH_REDIS=true`

### Railway

```bash
railway variables set UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
railway variables set UPSTASH_REDIS_REST_TOKEN=your-token
railway variables set USE_UPSTASH_REDIS=true
```

### Heroku

```bash
heroku config:set UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
heroku config:set UPSTASH_REDIS_REST_TOKEN=your-token
heroku config:set USE_UPSTASH_REDIS=true
```

## 🔐 Security Best Practices

### 1. Never Commit Secrets

Add to `.gitignore`:

```
.env
.env.local
.env.production
```

### 2. Use Different Databases for Different Environments

- **Development**: `timestamp-converter-dev`
- **Staging**: `timestamp-converter-staging`
- **Production**: `timestamp-converter-prod`

### 3. Rotate Tokens Regularly

- Generate new tokens monthly
- Update all environments simultaneously
- Monitor for unauthorized access

## 🧪 Testing Configuration

### Test Environment Variables

```bash
# .env.test
UPSTASH_REDIS_REST_URL=https://test-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=test-token
USE_UPSTASH_REDIS=false  # Use memory cache for tests
CACHING_ENABLED=false
RATE_LIMITING_ENABLED=false
NODE_ENV=test
```

## 🔍 Verification

### Check if Variables are Set

```bash
# Local development
echo $UPSTASH_REDIS_REST_URL

# In your application
console.log('Redis URL:', process.env.UPSTASH_REDIS_REST_URL);
console.log('Redis Token:', process.env.UPSTASH_REDIS_REST_TOKEN ? '***' : 'NOT SET');
```

### Test Connection

```bash
# Test API health with Redis
curl http://localhost:3000/api/health?detailed=true

# Check metrics
curl http://localhost:3000/api/metrics?type=cache
```

## 🚨 Troubleshooting

### Common Issues

1. **Variables Not Loading**

   ```bash
   # Check if .env file exists
   ls -la .env

   # Restart development server
   npm run dev
   ```

2. **Vercel Environment Variables Not Working**
   - Ensure variables are set for correct environment
     (Production/Preview/Development)
   - Redeploy after adding variables
   - Check Vercel function logs

3. **Connection Errors**
   ```bash
   # Test direct connection to Upstash
   curl "https://your-redis.upstash.io/ping" \
     -H "Authorization: Bearer your-token"
   ```

### Debug Commands

```bash
# Check environment in Node.js
node -e "console.log(process.env.UPSTASH_REDIS_REST_URL)"

# Test health endpoint
curl -v http://localhost:3000/api/health?detailed=true

# Check application logs
vercel logs your-project-name
```

## 📋 Environment Checklist

- [ ] Created Upstash Redis database
- [ ] Copied REST URL and Token
- [ ] Added variables to local `.env` file
- [ ] Added variables to deployment platform
- [ ] Tested local development
- [ ] Verified production deployment
- [ ] Checked health endpoint
- [ ] Monitored cache metrics
- [ ] Set up different databases for different environments
- [ ] Added `.env` to `.gitignore`
