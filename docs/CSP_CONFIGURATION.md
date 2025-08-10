# 🔒 Content Security Policy (CSP) Configuration

This document provides comprehensive information about the Content Security
Policy implementation in the TypeScript Converter project.

## Overview

Content Security Policy (CSP) is a security standard that helps prevent
Cross-Site Scripting (XSS), data injection attacks, and other code injection
attacks by controlling which resources the browser is allowed to load.

## Features

- **Environment-Specific Policies**: Different CSP configurations for
  development, testing, and production
- **Nonce Generation**: Cryptographically secure nonces for inline scripts and
  styles
- **Violation Reporting**: Comprehensive CSP violation reporting and analysis
- **Flexible Configuration**: Easy-to-customize CSP directives
- **Security Headers**: Complete security headers suite including HSTS, frame
  options, etc.

## CSP Directives Configuration

### Production Configuration

```typescript
const PRODUCTION_CSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'strict-dynamic'",
    'https://cdn.jsdelivr.net',
    'https://www.google-analytics.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS
    'https://fonts.googleapis.com',
  ],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", 'https://api.tsconv.com'],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': true,
  'block-all-mixed-content': true,
};
```

### Development Configuration

```typescript
const DEVELOPMENT_CSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'", // Required for dev tools
    'localhost:*',
    '127.0.0.1:*',
  ],
  'style-src': ["'self'", "'unsafe-inline'", 'localhost:*'],
  'connect-src': [
    "'self'",
    'localhost:*',
    'ws://localhost:*', // WebSocket for HMR
    'wss://localhost:*',
  ],
};
```

## Usage

### Basic Implementation

```typescript
import { defaultCSPMiddleware } from './api/middleware/security-headers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CSP and security headers
  defaultCSPMiddleware(req, res);

  // Your API logic here
  res.json({ message: 'Hello World' });
}
```

### Custom CSP Configuration

```typescript
import { createCSPMiddleware } from './api/middleware/csp';

const customCSP = createCSPMiddleware({
  directives: {
    'script-src': ["'self'", "'nonce-{nonce}'"],
    'style-src': ["'self'", "'unsafe-inline'"],
  },
  useNonces: true,
  enableViolationReporting: true,
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  customCSP(req, res);
  // Your logic here
}
```

### Environment-Specific Configuration

```typescript
import {
  defaultCSPMiddleware,
  developmentCSPMiddleware,
  apiSecurityHeadersMiddleware,
} from './api/middleware/security-headers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const environment = process.env.NODE_ENV;

  switch (environment) {
    case 'development':
      developmentCSPMiddleware(req, res);
      break;
    case 'production':
      defaultCSPMiddleware(req, res);
      break;
    default:
      apiSecurityHeadersMiddleware(req, res); // Strict API-only CSP
  }

  // Your logic here
}
```

## Nonce System

### How Nonces Work

Nonces (Number Used Once) are cryptographically secure random values that allow
specific inline scripts and styles while blocking all others.

```typescript
// Nonce is automatically generated and added to CSP
const nonce = generateNonce(16); // 16-byte random value
// CSP: script-src 'self' 'nonce-abc123def456'

// In your HTML/JSX:
<script nonce={req.cspNonce}>
  // This script will execute
  console.log('Allowed by nonce');
</script>

<script>
  // This script will be blocked
  console.log('Blocked by CSP');
</script>
```

### Accessing Nonces

```typescript
export default function handler(req: VercelRequest, res: VercelResponse) {
  defaultCSPMiddleware(req, res);

  // Nonce is available in request context
  const nonce = (req as any).cspNonce;

  // Also available in response header
  const nonceFromHeader = res.getHeader('X-CSP-Nonce');

  res.json({ nonce });
}
```

## Violation Reporting

### Report Endpoint

CSP violations are automatically reported to `/api/csp-report`:

```typescript
// Sample violation report
{
  "csp-report": {
    "document-uri": "https://example.com/page",
    "violated-directive": "script-src",
    "blocked-uri": "https://evil.com/script.js",
    "line-number": 1,
    "column-number": 1
  }
}
```

### Violation Processing

The system automatically:

1. **Categorizes violations** (script, style, image, etc.)
2. **Assesses severity** (high, medium, low)
3. **Filters false positives** (browser extensions, etc.)
4. **Stores for analysis** (development: console, production: monitoring
   service)
5. **Reports to monitoring** (high/medium severity only)

### Violation Categories

- `unsafe-script-execution`: Inline scripts or eval() usage
- `external-script-blocked`: Third-party scripts
- `inline-style-blocked`: Inline CSS
- `image-source-blocked`: External images
- `connection-blocked`: XHR/fetch requests
- `frame-blocked`: Iframe embedding attempts

## Security Headers Suite

### Complete Headers Applied

```typescript
{
  // CSP
  'Content-Security-Policy': '...',

  // HSTS (HTTPS only)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Clickjacking protection
  'X-Frame-Options': 'DENY',

  // MIME sniffing protection
  'X-Content-Type-Options': 'nosniff',

  // XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Feature policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',

  // Cross-origin policies
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
}
```

### Environment-Specific Headers

**Production:**

- Full security headers with strict policies
- HSTS enabled with preload
- Cross-origin policies enforced

**Development:**

- Relaxed CSP for development tools
- No HSTS (HTTP allowed)
- Permissive cross-origin policies

**API Endpoints:**

- Minimal CSP (no scripts/styles needed)
- Strict cross-origin policies
- Enhanced security for data endpoints

## Configuration Options

### Environment Variables

```bash
# CSP Configuration
CSP_ENABLED=true                    # Enable/disable CSP
CSP_REPORT_ONLY=false              # Report-only mode
CSP_USE_NONCES=true                # Enable nonce generation
CSP_VIOLATION_REPORTING=true       # Enable violation reporting
CSP_REPORT_ENDPOINT=/api/csp-report # Violation report endpoint

# HSTS Configuration
HSTS_ENABLED=true                  # Enable HSTS
HSTS_MAX_AGE=31536000             # HSTS max age (1 year)
HSTS_INCLUDE_SUBDOMAINS=true      # Include subdomains
HSTS_PRELOAD=true                 # Enable HSTS preload

# Other Security Headers
X_FRAME_OPTIONS=DENY              # Frame options
X_CONTENT_TYPE_OPTIONS=nosniff    # Content type options
REFERRER_POLICY=strict-origin-when-cross-origin
PERMISSIONS_POLICY=camera=(), microphone=()
```

### Programmatic Configuration

```typescript
import { createSecurityHeadersMiddleware } from './api/middleware/security-headers';

const customSecurity = createSecurityHeadersMiddleware({
  csp: {
    enabled: true,
    options: {
      directives: {
        'script-src': ["'self'", "'strict-dynamic'"],
        'style-src': ["'self'", "'unsafe-inline'"],
      },
      useNonces: true,
      reportOnly: false,
    },
  },
  hsts: {
    enabled: true,
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameOptions: 'SAMEORIGIN',
  referrerPolicy: 'strict-origin-when-cross-origin',
});
```

## Testing

### Automated Testing

```bash
# Test CSP headers and configuration
npm run test-csp

# Test all security headers
npm run test-security
```

### Manual Testing

1. **Browser Developer Tools:**
   - Check Console for CSP violations
   - Inspect Network tab for security headers
   - Use Security tab to verify HTTPS/HSTS

2. **Online Tools:**
   - [Mozilla Observatory](https://observatory.mozilla.org/)
   - [Security Headers](https://securityheaders.com/)
   - [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

3. **CSP Testing:**

   ```javascript
   // Test inline script blocking
   <script>alert('This should be blocked')</script>

   // Test external script blocking
   <script src="https://evil.com/script.js"></script>

   // Test nonce-based script allowing
   <script nonce="valid-nonce">console.log('Allowed')</script>
   ```

## Best Practices

### 1. Start with Report-Only Mode

```typescript
const reportOnlyCSP = createCSPMiddleware({
  reportOnly: true,
  enableViolationReporting: true,
});
```

### 2. Use Strict Dynamic for Scripts

```typescript
'script-src': ["'self'", "'strict-dynamic'", "'nonce-{nonce}'"]
```

### 3. Avoid Unsafe Directives

```typescript
// ❌ Avoid
'script-src': ["'unsafe-inline'", "'unsafe-eval'"]

// ✅ Prefer
'script-src': ["'self'", "'nonce-{nonce}'", "'strict-dynamic'"]
```

### 4. Monitor Violations Regularly

- Set up alerts for high-severity violations
- Review violation reports weekly
- Update CSP based on legitimate violations

### 5. Test Thoroughly

- Test in all supported browsers
- Test with browser extensions disabled
- Test both development and production builds

## Troubleshooting

### Common Issues

1. **Inline Styles Blocked:**

   ```typescript
   // Solution: Add 'unsafe-inline' or use nonces
   'style-src': ["'self'", "'unsafe-inline'"]
   ```

2. **Third-Party Scripts Blocked:**

   ```typescript
   // Solution: Add specific domains
   'script-src': ["'self'", "https://trusted-cdn.com"]
   ```

3. **WebSocket Connections Blocked:**

   ```typescript
   // Solution: Add WebSocket protocols
   'connect-src': ["'self'", "ws:", "wss:"]
   ```

4. **Development Tools Not Working:**
   ```typescript
   // Solution: Use development-specific CSP
   if (process.env.NODE_ENV === 'development') {
     'script-src': ["'self'", "'unsafe-eval'", "localhost:*"]
   }
   ```

### Debugging

1. **Check Browser Console:**
   - Look for CSP violation messages
   - Note the violated directive and blocked URI

2. **Review Violation Reports:**
   - Check `/api/csp-report` endpoint logs
   - Analyze violation patterns

3. **Use CSP Header Debugging:**
   ```typescript
   // Enable debug headers in development
   res.setHeader('X-CSP-Environment', 'development');
   res.setHeader('X-CSP-Policy-Length', policy.length);
   ```

## Migration Guide

### From Basic CSP to Advanced CSP

1. **Enable the new middleware:**

   ```typescript
   import { defaultCSPMiddleware } from './api/middleware/security-headers';
   ```

2. **Update existing CSP headers:**

   ```typescript
   // Replace manual CSP headers
   // res.setHeader('Content-Security-Policy', '...');

   // With middleware
   defaultCSPMiddleware(req, res);
   ```

3. **Test thoroughly:**

   ```bash
   npm run test-csp
   ```

4. **Monitor violations:**
   - Enable violation reporting
   - Review reports for issues
   - Adjust policies as needed

## Conclusion

The CSP implementation provides comprehensive protection against XSS and
injection attacks while maintaining flexibility for different environments and
use cases. Regular monitoring and testing ensure the policies remain effective
and don't interfere with legitimate functionality.
