# 🚀 Deployment Guide for TSConv

This guide explains how to deploy TSConv to different platforms and resolve common deployment issues.

## 📋 Overview

TSConv uses a **hybrid architecture**:
- **Frontend**: React SPA that can be deployed to static hosting (Cloudflare Pages, Netlify, etc.)
- **Backend**: Node.js API that runs on Vercel serverless functions

## 🔧 Architecture & API Configuration

The application automatically detects the deployment environment and configures API endpoints accordingly:

### Environment Detection Logic
```typescript
// src/config/api.ts
- Development: Uses Vite proxy (relative URLs)
- Cloudflare Pages: Uses Vercel API (https://tsconv.vercel.app/api)
- Vercel: Uses relative URLs (/api)
- Custom: Configurable via VITE_API_BASE_URL
```

## 🌐 Deployment Platforms

### 1. Vercel (Full Stack) ✅ Recommended
**Best for**: Complete deployment with both frontend and API

```bash
# Deploy to Vercel
npm install -g vercel
vercel

# Or connect GitHub repository to Vercel dashboard
```

**Environment Variables:**
```env
# .env.production (Vercel)
VITE_API_BASE_URL=/api
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 2. Cloudflare Pages (Frontend Only) ⚠️ Requires API Setup
**Best for**: Fast global CDN, but needs external API

#### Step 1: Configure Environment Variables
In Cloudflare Pages dashboard, add:
```env
VITE_API_BASE_URL=https://tsconv.vercel.app/api
VITE_SENTRY_DSN=your-sentry-dsn
VITE_APP_VERSION=1.0.0
```

#### Step 2: Build Settings
```yaml
Build command: npm run build
Build output directory: dist
Node.js version: 18
```

#### Step 3: Deploy API to Vercel
The frontend on Cloudflare will call the API on Vercel:
```bash
# Deploy API separately to Vercel
cd api/
vercel
```

### 3. Netlify (Frontend Only)
Similar to Cloudflare Pages setup:

```env
# Netlify environment variables
VITE_API_BASE_URL=https://tsconv.vercel.app/api
```

## 🐛 Common Issues & Solutions

### Issue 1: Blank Page on Cloudflare ❌
**Symptoms**: White/blank page, no content loads
**Cause**: API calls failing due to incorrect endpoint configuration

**Solution**: ✅
1. Set `VITE_API_BASE_URL=https://tsconv.vercel.app/api` in Cloudflare environment variables
2. Ensure Vercel API is deployed and accessible
3. Check browser console for API errors

### Issue 2: CORS Errors ❌
**Symptoms**: API calls blocked by CORS policy
**Cause**: Cross-origin requests not properly configured

**Solution**: ✅
```typescript
// API endpoints already include CORS headers
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
```

### Issue 3: Environment Variables Not Working ❌
**Symptoms**: Features not working, API calls to wrong endpoints
**Cause**: Environment variables not properly set or named incorrectly

**Solution**: ✅
- Use `VITE_` prefix for frontend environment variables
- Set variables in platform dashboard (not just .env files)
- Verify variables are available: `console.log(import.meta.env)`

## 🔍 Debugging Deployment Issues

### 1. Check API Connectivity
```bash
# Test API endpoints
curl https://tsconv.vercel.app/api/health
curl https://tsconv.vercel.app/api/format/templates
```

### 2. Browser Console Debugging
```javascript
// Check environment variables
console.log('Environment:', import.meta.env);
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);

// Test API configuration
import { getApiBaseUrl, buildApiUrl } from './src/config/api';
console.log('Resolved API Base:', getApiBaseUrl());
console.log('Format API URL:', buildApiUrl('api/format'));
```

### 3. Network Tab Analysis
- Check if API calls are going to correct URLs
- Verify response status codes (should be 200, not 404/500)
- Look for CORS or network errors

## 📦 Build Optimization

### Production Build
```bash
# Build with production environment
NODE_ENV=production npm run build

# Preview production build locally
npm run preview
```

### Environment-Specific Builds
```bash
# Build for Cloudflare (uses external API)
VITE_API_BASE_URL=https://tsconv.vercel.app/api npm run build

# Build for Vercel (uses relative API)
VITE_API_BASE_URL=/api npm run build
```

## 🔐 Security Considerations

### API Keys & Secrets
- Never expose API keys in frontend code
- Use server-side environment variables for sensitive data
- Frontend only needs `VITE_` prefixed variables

### CORS Configuration
- API allows all origins (`*`) for public API
- Consider restricting origins for production if needed

## 📊 Monitoring & Analytics

### Sentry Integration
```env
VITE_SENTRY_DSN=your-sentry-dsn
VITE_ENABLE_ERROR_TRACKING=true
```

### Performance Monitoring
```env
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_PERFORMANCE_SAMPLE_RATE=0.1
```

## 🚀 Quick Deployment Checklist

### For Cloudflare Pages:
- [ ] Set `VITE_API_BASE_URL=https://tsconv.vercel.app/api`
- [ ] Deploy API to Vercel separately
- [ ] Test API endpoints are accessible
- [ ] Verify frontend can load and make API calls

### For Vercel:
- [ ] Connect GitHub repository
- [ ] Set Redis environment variables
- [ ] Deploy (auto-detects Next.js/Vite config)
- [ ] Test both frontend and API endpoints

### For Other Platforms:
- [ ] Build static files: `npm run build`
- [ ] Set `VITE_API_BASE_URL` to your API location
- [ ] Upload `dist/` folder to static hosting
- [ ] Deploy API separately to serverless platform

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify API endpoints are accessible
3. Confirm environment variables are set correctly
4. Test with different deployment platforms

The hybrid architecture ensures maximum flexibility while maintaining performance and reliability across different hosting platforms.
