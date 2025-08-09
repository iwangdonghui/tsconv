# 🔐 API Security Enhancement

This document provides comprehensive information about the API security enhancements implemented in the TypeScript Converter project.

## Overview

The API security system provides enterprise-grade protection through multiple layers of security including authentication, authorization, input validation, threat detection, and comprehensive monitoring.

## Features

- **Multi-layer Authentication**: API keys, JWT tokens, and role-based access control
- **Advanced Threat Detection**: Real-time detection of SQL injection, XSS, and other attacks
- **Input Sanitization**: Automatic cleaning and validation of all inputs
- **Request Fingerprinting**: Unique identification and tracking of requests
- **Security Monitoring**: Comprehensive logging and analysis of security events
- **Rate Limiting**: Protection against abuse and DoS attacks
- **API Key Management**: Full lifecycle management of API keys

## Security Architecture

### 1. Authentication Layer
```typescript
// API Key Authentication
X-API-Key: ak_1234567890abcdef...

// JWT Authentication
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Role-based Access Control
{
  "roles": ["admin", "user"],
  "permissions": ["read", "write", "delete"]
}
```

### 2. Security Middleware Stack
```typescript
// Complete security stack
defaultAPISecurityMiddleware(req, res, () => {
  optionalAuthMiddleware(req, res, () => {
    maximumSecurityHeadersMiddleware(req, res);
    // Your API logic here
  });
});
```

### 3. Threat Detection Engine
- **SQL Injection Detection**: Pattern-based detection of SQL injection attempts
- **XSS Protection**: Detection and blocking of cross-site scripting attacks
- **Path Traversal Prevention**: Protection against directory traversal attacks
- **Command Injection Blocking**: Prevention of command injection attempts

## Authentication & Authorization

### API Key Management

#### Creating API Keys
```bash
POST /api/admin/api-keys
{
  "name": "Production API Key",
  "userId": "user123",
  "roles": ["user"],
  "permissions": ["read", "write"],
  "expiresIn": "1y"
}
```

#### API Key Features
- **Secure Generation**: Cryptographically secure random keys
- **Hashed Storage**: Keys are hashed using SHA-256
- **Role-based Permissions**: Granular access control
- **Expiration Support**: Automatic expiration handling
- **Usage Tracking**: Last used timestamps and statistics

#### Using API Keys
```typescript
// In your API requests
const response = await fetch('/api/endpoint', {
  headers: {
    'X-API-Key': 'ak_your_api_key_here',
    'Content-Type': 'application/json'
  }
});
```

### JWT Token Authentication

#### Token Structure
```typescript
{
  "sub": "user123",           // User ID
  "iat": 1640995200,         // Issued at
  "exp": 1640998800,         // Expires at
  "roles": ["admin"],        // User roles
  "permissions": ["*"],      // User permissions
  "metadata": {              // Additional data
    "sessionId": "sess_123"
  }
}
```

#### Using JWT Tokens
```typescript
// Generate token
const token = jwtManager.generateToken({
  sub: 'user123',
  roles: ['admin'],
  permissions: ['*']
}, '1h');

// Use in requests
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Role-Based Access Control

#### Available Roles
- **admin**: Full system access
- **user**: Standard user access
- **readonly**: Read-only access
- **api**: API-only access

#### Permission System
```typescript
// Check permissions
if (hasPermission(user.permissions, 'write')) {
  // Allow write operation
}

// Check roles
if (hasRole(user.roles, 'admin')) {
  // Allow admin operation
}
```

## Input Validation & Sanitization

### Automatic Sanitization
```typescript
// Input sanitization is applied automatically
const sanitized = InputSanitizer.sanitizeInput(userInput);

// Specific sanitization methods
const xssSafe = InputSanitizer.sanitizeXSS(input);
const sqlSafe = InputSanitizer.sanitizeSQL(input);
const pathSafe = InputSanitizer.sanitizePathTraversal(input);
```

### Threat Detection
```typescript
// Automatic threat detection
const threats = ThreatDetector.analyzeRequest(req);

if (threats.length > 0) {
  // Log and potentially block request
  SecurityLogger.log({
    level: 'error',
    event: 'security_threat_detected',
    threat: threats[0]
  });
}
```

### Validation Schemas
```typescript
const apiKeySchema = {
  name: {
    required: true,
    type: 'string',
    min: 1,
    max: 100,
    pattern: /^[a-zA-Z0-9\s\-_]+$/
  },
  roles: {
    type: 'array',
    validator: (value) => Array.isArray(value) && 
                         value.every(role => typeof role === 'string')
  }
};
```

## Security Monitoring

### Security Logging
```typescript
// Automatic security event logging
SecurityLogger.log({
  level: 'warn',
  event: 'authentication_failure',
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  endpoint: '/api/admin/api-keys',
  method: 'POST',
  metadata: { reason: 'invalid_api_key' }
});
```

### Security Metrics
```bash
GET /api/admin/security-monitoring?action=metrics&period=24h
```

```json
{
  "totalRequests": 1250,
  "threatsDetected": 15,
  "blockedRequests": 8,
  "authenticationFailures": 3,
  "topThreats": [
    {
      "type": "sql-injection",
      "count": 8,
      "severity": "high"
    }
  ],
  "topIPs": [
    {
      "ip": "192.168.1.100",
      "requests": 45,
      "threats": 3
    }
  ]
}
```

### Security Reports
```bash
GET /api/admin/security-monitoring?action=report&period=7d
```

```json
{
  "summary": {
    "period": "7d",
    "totalEvents": 8750,
    "criticalEvents": 2,
    "highSeverityEvents": 15
  },
  "threats": {
    "sqlInjection": 8,
    "xss": 5,
    "pathTraversal": 2
  },
  "recommendations": [
    "Review input validation for /api/convert endpoint",
    "Consider blocking IP 192.168.1.100 due to repeated attacks"
  ]
}
```

## Configuration

### Environment Variables
```bash
# Authentication
JWT_SECRET=your-secret-key-here
API_KEY_HEADER=X-API-Key

# Security Settings
SECURITY_LOGGING_ENABLED=true
THREAT_DETECTION_ENABLED=true
INPUT_SANITIZATION_ENABLED=true
REQUIRE_HTTPS=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SECURITY_MONITORING_ENABLED=true
SECURITY_REPORT_RETENTION=30d
```

### Middleware Configuration
```typescript
// Custom security configuration
const customSecurity = createAPISecurityMiddleware({
  enableInputSanitization: true,
  enableThreatDetection: true,
  enableSecurityLogging: true,
  maxRequestSize: 1024 * 1024, // 1MB
  allowedContentTypes: ['application/json'],
  requireHTTPS: true,
  blockedUserAgents: [/bot/i, /crawler/i],
  blockedIPs: ['192.168.1.100']
});
```

## Usage Examples

### Securing an API Endpoint
```typescript
import { 
  defaultAPISecurityMiddleware,
  apiKeyAuthMiddleware 
} from './middleware/api-security';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Apply security middleware
  defaultAPISecurityMiddleware(req, res, () => {
    // Apply authentication
    apiKeyAuthMiddleware(req, res, () => {
      // Your secure API logic here
      res.json({ message: 'Secure endpoint accessed successfully' });
    });
  });
}
```

### Admin-Only Endpoint
```typescript
import { adminAuthMiddleware } from './middleware/auth';

export default function handler(req: VercelRequest, res: VercelResponse) {
  adminAuthMiddleware(req, res, () => {
    // Admin-only functionality
    res.json({ message: 'Admin access granted' });
  });
}
```

### Creating API Keys
```typescript
import { apiKeyManager } from './middleware/auth';

// Create a new API key
const apiKey = apiKeyManager.createAPIKey({
  name: 'Mobile App Key',
  userId: 'user123',
  roles: ['user'],
  permissions: ['read', 'write'],
  rateLimit: {
    requests: 1000,
    window: 3600000 // 1 hour
  },
  expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
});

console.log('New API Key:', apiKey.key); // Only shown once
```

## Testing

### Automated Security Testing
```bash
# Run comprehensive API security tests
npm run test-api-security

# Test authentication specifically
npm run test-api-auth

# Full security audit
npm run security-audit
```

### Manual Testing
```bash
# Test authentication
curl -H "X-API-Key: invalid-key" http://localhost:3000/api/admin/api-keys

# Test SQL injection protection
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '{"timestamp": "1640995200; DROP TABLE users;--"}'

# Test XSS protection
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '{"format": "<script>alert(\"XSS\")</script>"}'
```

### Security Test Results
```bash
🔒 API Security Testing Suite
Performing comprehensive API security testing...

=== Authentication Security Tests ===
✅ Access without authentication: Status: 401, Expected: 401
✅ Invalid API key: Status: 401
✅ Malformed JWT token: Status: 401, Expected: 401

=== Input Validation Security Tests ===
✅ SQL payload blocked: '; DROP TABLE users; --
✅ XSS payload blocked: <script>alert('XSS')</script>
✅ Path traversal handled: ../../../etc/passwd

📊 Overall Results: 15/18 tests passed (83%)
```

## Best Practices

### 1. Use Strong Authentication
```typescript
// ✅ Use API keys for service-to-service
const apiKey = generateAPIKey('production');

// ✅ Use JWT for user sessions
const token = generateToken({ sub: userId }, '1h');

// ❌ Don't use simple passwords
const auth = 'Basic ' + btoa('user:password');
```

### 2. Implement Proper Authorization
```typescript
// ✅ Check permissions before operations
if (!hasPermission(user.permissions, 'delete')) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}

// ✅ Use role-based access control
if (!hasRole(user.roles, 'admin')) {
  return res.status(403).json({ error: 'Admin access required' });
}
```

### 3. Validate All Inputs
```typescript
// ✅ Always validate and sanitize inputs
const sanitizedInput = InputSanitizer.sanitizeInput(req.body);
const threats = ThreatDetector.analyzeRequest(req);

if (threats.length > 0) {
  return res.status(400).json({ error: 'Invalid input detected' });
}
```

### 4. Monitor Security Events
```typescript
// ✅ Log security events
SecurityLogger.log({
  level: 'warn',
  event: 'suspicious_activity',
  ip: req.ip,
  details: 'Multiple failed authentication attempts'
});

// ✅ Regular security reviews
const report = SecurityAnalytics.generateSecurityReport(logs, '7d');
```

### 5. Use HTTPS Everywhere
```typescript
// ✅ Enforce HTTPS in production
if (process.env.NODE_ENV === 'production' && !req.secure) {
  return res.status(400).json({ error: 'HTTPS required' });
}
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
```typescript
// Check API key format
if (!apiKey.startsWith('ak_')) {
  console.log('Invalid API key format');
}

// Check JWT token expiration
const payload = jwtManager.validateToken(token);
if (!payload) {
  console.log('Token expired or invalid');
}
```

#### 2. False Positive Threat Detection
```typescript
// Adjust threat detection sensitivity
const customSecurity = createAPISecurityMiddleware({
  enableThreatDetection: true,
  // Add custom patterns or whitelist certain inputs
});
```

#### 3. Rate Limiting Issues
```typescript
// Check rate limit configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
};
```

### Debug Mode
```typescript
// Enable debug logging
process.env.SECURITY_DEBUG = 'true';

// Check security context
console.log('Security context:', req.security);
console.log('Auth context:', req.auth);
```

## Conclusion

The API security enhancement system provides comprehensive protection against common web application vulnerabilities while maintaining performance and usability. Regular monitoring and testing ensure continued security effectiveness as threats evolve.
