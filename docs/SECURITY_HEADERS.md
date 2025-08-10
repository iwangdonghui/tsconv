# 🛡️ Security Headers Configuration

This document provides comprehensive information about the HTTP security headers
implementation in the TypeScript Converter project.

## Overview

HTTP security headers are crucial for protecting web applications from various
attacks including XSS, clickjacking, MIME sniffing, and other security
vulnerabilities. Our implementation provides enterprise-grade security with
flexible configuration options.

## Features

- **Comprehensive Coverage**: 13+ security headers including advanced policies
- **Environment-Specific Configuration**: Different settings for development,
  testing, and production
- **Automated Auditing**: Built-in security scoring and compliance checking
- **Flexible Configuration**: Easy customization for specific requirements
- **Performance Optimized**: Minimal overhead with maximum security

## Security Headers Implemented

### Core Security Headers

#### 1. Content Security Policy (CSP)

```typescript
'Content-Security-Policy': "default-src 'self'; script-src 'self' 'strict-dynamic'"
```

- **Purpose**: Prevents XSS and data injection attacks
- **Severity**: Critical
- **Features**: Nonce support, strict-dynamic, violation reporting

#### 2. HTTP Strict Transport Security (HSTS)

```typescript
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
```

- **Purpose**: Enforces HTTPS connections
- **Severity**: High
- **Features**: Configurable max-age, subdomain inclusion, preload support

#### 3. X-Frame-Options

```typescript
'X-Frame-Options': 'DENY'
```

- **Purpose**: Prevents clickjacking attacks
- **Severity**: High
- **Options**: DENY, SAMEORIGIN, ALLOW-FROM

#### 4. X-Content-Type-Options

```typescript
'X-Content-Type-Options': 'nosniff'
```

- **Purpose**: Prevents MIME type sniffing
- **Severity**: Medium
- **Value**: Always set to 'nosniff'

#### 5. X-XSS-Protection

```typescript
'X-XSS-Protection': '1; mode=block'
```

- **Purpose**: Enables browser XSS filtering
- **Severity**: Medium
- **Options**: Block mode, report mode

### Advanced Security Headers

#### 6. Referrer Policy

```typescript
'Referrer-Policy': 'strict-origin-when-cross-origin'
```

- **Purpose**: Controls referrer information leakage
- **Options**: no-referrer, strict-origin, strict-origin-when-cross-origin

#### 7. Permissions Policy

```typescript
'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
```

- **Purpose**: Controls browser feature access
- **Features**: Granular control over 20+ browser APIs

#### 8. Cross-Origin Policies

```typescript
'Cross-Origin-Embedder-Policy': 'require-corp'
'Cross-Origin-Opener-Policy': 'same-origin'
'Cross-Origin-Resource-Policy': 'same-origin'
```

- **Purpose**: Enhanced cross-origin isolation
- **Benefits**: Improved security, SharedArrayBuffer support

#### 9. Certificate Transparency (Expect-CT)

```typescript
'Expect-CT': 'max-age=86400, enforce, report-uri="/api/ct-report"'
```

- **Purpose**: Enforces Certificate Transparency compliance
- **Features**: Enforcement mode, violation reporting

#### 10. Additional Headers

```typescript
'X-DNS-Prefetch-Control': 'off'
'X-Download-Options': 'noopen'
'X-Permitted-Cross-Domain-Policies': 'none'
```

- **Purpose**: Various security enhancements
- **Benefits**: Reduced attack surface, legacy browser protection

## Configuration

### Environment-Specific Settings

#### Production Configuration

```typescript
const productionConfig = {
  hsts: {
    enabled: true,
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  frameOptions: 'DENY',
  referrerPolicy: 'no-referrer',
  crossOriginEmbedderPolicy: 'require-corp',
  expectCT: {
    enabled: true,
    maxAge: 86400,
    enforce: true,
  },
};
```

#### Development Configuration

```typescript
const developmentConfig = {
  hsts: {
    enabled: false, // HTTP allowed in development
  },
  frameOptions: 'SAMEORIGIN',
  crossOriginEmbedderPolicy: 'unsafe-none',
  crossOriginResourcePolicy: 'cross-origin',
  dnsPrefetchControl: true,
};
```

### Custom Configuration

```typescript
import { createEnhancedSecurityHeadersMiddleware } from './api/middleware/enhanced-security-headers';

const customSecurity = createEnhancedSecurityHeadersMiddleware({
  hsts: {
    enabled: true,
    maxAge: 31536000,
    includeSubDomains: true,
  },
  permissionsPolicy: {
    camera: ['self'],
    microphone: [],
    geolocation: ['self', 'https://maps.example.com'],
  },
  customHeaders: {
    'X-Custom-Security': 'enabled',
  },
});
```

## Usage

### Basic Implementation

```typescript
import { maximumSecurityHeadersMiddleware } from './api/middleware/enhanced-security-headers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Apply maximum security headers
  maximumSecurityHeadersMiddleware(req, res);

  // Your API logic here
  res.json({ message: 'Secure endpoint' });
}
```

### Balanced Security

```typescript
import { balancedSecurityHeadersMiddleware } from './api/middleware/enhanced-security-headers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Apply balanced security headers
  balancedSecurityHeadersMiddleware(req, res);

  // Your logic here
}
```

### Development Mode

```typescript
import { developmentSecurityHeadersMiddleware } from './api/middleware/enhanced-security-headers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Apply development-friendly headers
  developmentSecurityHeadersMiddleware(req, res);

  // Your logic here
}
```

## Security Auditing

### Automated Auditing

```bash
# Run comprehensive security headers test
npm run test-security-headers

# Run security audit
npm run audit-security

# Test specific components
npm run test-csp
```

### Security Audit API

```typescript
// GET /api/security-audit
{
  "success": true,
  "data": {
    "audit": {
      "overallScore": 95,
      "grade": "A+",
      "criticalIssues": 0,
      "highIssues": 0,
      "results": [...]
    }
  }
}
```

### Manual Testing

```bash
# Check headers with curl
curl -I https://your-domain.com/api/health

# Test with online tools
# - Mozilla Observatory: https://observatory.mozilla.org/
# - Security Headers: https://securityheaders.com/
# - CSP Evaluator: https://csp-evaluator.withgoogle.com/
```

## Security Scoring

### Scoring System

- **A+ (95-100)**: Excellent security configuration
- **A (90-94)**: Very good security with minor improvements
- **B (80-89)**: Good security with some issues
- **C (70-79)**: Adequate security, improvements needed
- **D (60-69)**: Poor security, significant issues
- **F (0-59)**: Critical security problems

### Issue Severity

- **Critical**: Missing CSP, fundamental security flaws
- **High**: Missing HSTS, frame protection issues
- **Medium**: Missing content type protection, XSS issues
- **Low**: Missing advanced headers, optimization opportunities

## Best Practices

### 1. Start with Maximum Security

```typescript
// Begin with strictest settings
maximumSecurityHeadersMiddleware(req, res);

// Relax only as needed for functionality
```

### 2. Test Thoroughly

```typescript
// Test in all environments
if (process.env.NODE_ENV === 'development') {
  developmentSecurityHeadersMiddleware(req, res);
} else {
  maximumSecurityHeadersMiddleware(req, res);
}
```

### 3. Monitor Continuously

```typescript
// Regular security audits
const audit = await fetch('/api/security-audit');
const score = audit.data.audit.overallScore;

if (score < 90) {
  console.warn('Security score below threshold:', score);
}
```

### 4. Use Environment Variables

```bash
# .env.production
HSTS_MAX_AGE=63072000
HSTS_PRELOAD=true
CSP_REPORT_ONLY=false

# .env.development
HSTS_ENABLED=false
CSP_REPORT_ONLY=true
```

## Troubleshooting

### Common Issues

#### 1. HSTS Not Working

```typescript
// Ensure HTTPS is detected
const isSecure = req.headers['x-forwarded-proto'] === 'https';
if (!isSecure) {
  // HSTS only works over HTTPS
}
```

#### 2. CSP Blocking Resources

```typescript
// Check CSP violations in browser console
// Add necessary domains to allowlist
'script-src': ['self', 'https://trusted-cdn.com']
```

#### 3. Cross-Origin Issues

```typescript
// Adjust cross-origin policies for compatibility
crossOriginEmbedderPolicy: 'unsafe-none', // For development
crossOriginResourcePolicy: 'cross-origin' // For APIs
```

#### 4. Frame Embedding Issues

```typescript
// Allow same-origin framing if needed
frameOptions: 'SAMEORIGIN'

// Or use CSP frame-ancestors
'frame-ancestors': ['self', 'https://trusted-site.com']
```

### Debug Mode

```typescript
// Enable debug headers in development
if (process.env.NODE_ENV === 'development') {
  res.setHeader('X-Security-Debug', 'enabled');
  res.setHeader('X-Applied-Headers', appliedHeaders.join(','));
}
```

## Migration Guide

### From Basic to Enhanced Security

1. **Install Enhanced Middleware**

```typescript
import { maximumSecurityHeadersMiddleware } from './api/middleware/enhanced-security-headers';
```

2. **Replace Existing Headers**

```typescript
// Remove manual header setting
// res.setHeader('X-Frame-Options', 'DENY');

// Use middleware instead
maximumSecurityHeadersMiddleware(req, res);
```

3. **Test Thoroughly**

```bash
npm run test-security-headers
```

4. **Monitor and Adjust**

```typescript
// Check audit results
const audit = await fetch('/api/security-audit');
// Adjust configuration based on results
```

## Compliance

### Standards Compliance

- **OWASP**: Follows OWASP security best practices
- **Mozilla**: Meets Mozilla security guidelines
- **NIST**: Aligns with NIST cybersecurity framework

### Industry Requirements

- **PCI DSS**: Supports payment card industry requirements
- **GDPR**: Enhances privacy protection
- **SOC 2**: Meets security control requirements

## Performance Impact

### Minimal Overhead

- **Header Size**: ~2-4KB additional headers
- **Processing Time**: <1ms per request
- **Memory Usage**: Negligible impact

### Optimization Tips

```typescript
// Cache middleware instances
const securityMiddleware = maximumSecurityHeadersMiddleware;

// Reuse across requests
app.use(securityMiddleware);
```

## Conclusion

The enhanced security headers system provides comprehensive protection against
web security threats while maintaining flexibility and performance. Regular
auditing and monitoring ensure continued security effectiveness as threats
evolve.
