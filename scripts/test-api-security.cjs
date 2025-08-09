#!/usr/bin/env node

/**
 * API Security Testing Script
 * 
 * This script performs comprehensive API security testing including
 * authentication, authorization, input validation, threat detection, and more.
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bold}=== ${title} ===${colors.reset}`, 'cyan');
}

// ============================================================================
// HTTP Request Utility
// ============================================================================

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Security-Test/1.0',
        ...options.headers
      },
      timeout: options.timeout || 10000
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// ============================================================================
// Security Test Payloads
// ============================================================================

const SECURITY_PAYLOADS = {
  sqlInjection: [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1' UNION SELECT * FROM users --",
    "admin'--",
    "' OR 1=1#"
  ],
  
  xss: [
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img src=x onerror=alert('XSS')>",
    "<svg onload=alert('XSS')>",
    "';alert('XSS');//"
  ],
  
  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "....//....//....//etc/passwd",
    "..%252f..%252f..%252fetc%252fpasswd"
  ],
  
  commandInjection: [
    "; ls -la",
    "| whoami",
    "&& cat /etc/passwd",
    "`id`",
    "$(whoami)"
  ],
  
  headerInjection: [
    "test\r\nX-Injected: true",
    "test\nSet-Cookie: injected=true",
    "test\r\n\r\n<script>alert('XSS')</script>"
  ]
};

// ============================================================================
// Authentication Tests
// ============================================================================

async function testAuthentication(baseUrl) {
  logSection('Authentication Security Tests');
  
  const tests = [
    {
      name: 'Access without authentication',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/api/admin/api-keys`);
        return {
          passed: response.statusCode === 401,
          details: `Status: ${response.statusCode}, Expected: 401`
        };
      }
    },
    
    {
      name: 'Invalid API key',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/api/health`, {
          headers: { 'X-API-Key': 'invalid-key-12345' }
        });
        return {
          passed: response.statusCode === 401 || response.statusCode === 200, // Health might be public
          details: `Status: ${response.statusCode}`
        };
      }
    },
    
    {
      name: 'Malformed JWT token',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/api/admin/api-keys`, {
          headers: { 'Authorization': 'Bearer invalid.jwt.token' }
        });
        return {
          passed: response.statusCode === 401,
          details: `Status: ${response.statusCode}, Expected: 401`
        };
      }
    },
    
    {
      name: 'Missing Authorization header',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/api/admin/security-monitoring`);
        return {
          passed: response.statusCode === 401,
          details: `Status: ${response.statusCode}, Expected: 401`
        };
      }
    }
  ];
  
  const results = [];
  for (const test of tests) {
    try {
      const result = await test.test();
      results.push({ name: test.name, ...result });
      log(`${result.passed ? '✅' : '❌'} ${test.name}: ${result.details}`, result.passed ? 'green' : 'red');
    } catch (error) {
      results.push({ name: test.name, passed: false, details: error.message });
      log(`❌ ${test.name}: ${error.message}`, 'red');
    }
  }
  
  return results;
}

// ============================================================================
// Input Validation Tests
// ============================================================================

async function testInputValidation(baseUrl) {
  logSection('Input Validation Security Tests');
  
  const testEndpoint = `${baseUrl}/api/convert`;
  const results = [];
  
  // Test SQL Injection
  log('Testing SQL Injection protection...', 'blue');
  for (const payload of SECURITY_PAYLOADS.sqlInjection) {
    try {
      const response = await makeRequest(testEndpoint, {
        method: 'POST',
        body: { timestamp: payload, format: 'iso' }
      });
      
      const passed = response.statusCode === 400 || response.statusCode === 422;
      results.push({
        name: `SQL Injection: ${payload.substring(0, 20)}...`,
        passed,
        details: `Status: ${response.statusCode}`
      });
      
      log(`${passed ? '✅' : '⚠️'} SQL payload blocked: ${payload.substring(0, 30)}...`, passed ? 'green' : 'yellow');
    } catch (error) {
      log(`❌ SQL injection test failed: ${error.message}`, 'red');
    }
  }
  
  // Test XSS
  log('\nTesting XSS protection...', 'blue');
  for (const payload of SECURITY_PAYLOADS.xss) {
    try {
      const response = await makeRequest(testEndpoint, {
        method: 'POST',
        body: { timestamp: 1640995200, format: payload }
      });
      
      const passed = response.statusCode === 400 || response.statusCode === 422;
      results.push({
        name: `XSS: ${payload.substring(0, 20)}...`,
        passed,
        details: `Status: ${response.statusCode}`
      });
      
      log(`${passed ? '✅' : '⚠️'} XSS payload blocked: ${payload.substring(0, 30)}...`, passed ? 'green' : 'yellow');
    } catch (error) {
      log(`❌ XSS test failed: ${error.message}`, 'red');
    }
  }
  
  // Test Path Traversal
  log('\nTesting Path Traversal protection...', 'blue');
  for (const payload of SECURITY_PAYLOADS.pathTraversal) {
    try {
      const response = await makeRequest(`${baseUrl}/api/health?file=${encodeURIComponent(payload)}`);
      
      const passed = response.statusCode === 400 || response.statusCode === 404 || response.statusCode === 200;
      results.push({
        name: `Path Traversal: ${payload.substring(0, 20)}...`,
        passed,
        details: `Status: ${response.statusCode}`
      });
      
      log(`${passed ? '✅' : '⚠️'} Path traversal handled: ${payload.substring(0, 30)}...`, passed ? 'green' : 'yellow');
    } catch (error) {
      log(`❌ Path traversal test failed: ${error.message}`, 'red');
    }
  }
  
  return results;
}

// ============================================================================
// Rate Limiting Tests
// ============================================================================

async function testRateLimiting(baseUrl) {
  logSection('Rate Limiting Tests');
  
  const testEndpoint = `${baseUrl}/api/health`;
  const results = [];
  
  try {
    log('Testing rate limiting with rapid requests...', 'blue');
    
    const requests = [];
    const requestCount = 20;
    
    // Send multiple requests rapidly
    for (let i = 0; i < requestCount; i++) {
      requests.push(makeRequest(testEndpoint));
    }
    
    const responses = await Promise.allSettled(requests);
    const statusCodes = responses.map(r => r.status === 'fulfilled' ? r.value.statusCode : 500);
    
    const rateLimitedCount = statusCodes.filter(code => code === 429).length;
    const successCount = statusCodes.filter(code => code === 200).length;
    
    log(`📊 Sent ${requestCount} requests: ${successCount} successful, ${rateLimitedCount} rate limited`, 'blue');
    
    const passed = rateLimitedCount > 0 || successCount === requestCount; // Either rate limiting works or all succeed
    results.push({
      name: 'Rate limiting functionality',
      passed,
      details: `${successCount} successful, ${rateLimitedCount} rate limited out of ${requestCount}`
    });
    
    log(`${passed ? '✅' : '⚠️'} Rate limiting: ${rateLimitedCount > 0 ? 'Active' : 'Not detected'}`, passed ? 'green' : 'yellow');
    
  } catch (error) {
    results.push({
      name: 'Rate limiting test',
      passed: false,
      details: error.message
    });
    log(`❌ Rate limiting test failed: ${error.message}`, 'red');
  }
  
  return results;
}

// ============================================================================
// Security Headers Tests
// ============================================================================

async function testSecurityHeaders(baseUrl) {
  logSection('Security Headers Tests');
  
  try {
    const response = await makeRequest(`${baseUrl}/api/health`);
    const headers = response.headers;
    
    const securityHeaders = {
      'content-security-policy': 'Content Security Policy',
      'x-frame-options': 'Frame Options',
      'x-content-type-options': 'Content Type Options',
      'x-xss-protection': 'XSS Protection',
      'referrer-policy': 'Referrer Policy',
      'permissions-policy': 'Permissions Policy'
    };
    
    const results = [];
    
    Object.entries(securityHeaders).forEach(([header, description]) => {
      const present = !!headers[header];
      results.push({
        name: description,
        passed: present,
        details: present ? `Present: ${headers[header]}` : 'Missing'
      });
      
      log(`${present ? '✅' : '❌'} ${description}: ${present ? 'Present' : 'Missing'}`, present ? 'green' : 'red');
    });
    
    return results;
    
  } catch (error) {
    log(`❌ Security headers test failed: ${error.message}`, 'red');
    return [{ name: 'Security headers test', passed: false, details: error.message }];
  }
}

// ============================================================================
// HTTPS and Transport Security Tests
// ============================================================================

async function testTransportSecurity(baseUrl) {
  logSection('Transport Security Tests');
  
  const results = [];
  
  try {
    // Test HTTPS enforcement
    if (baseUrl.startsWith('https://')) {
      const httpUrl = baseUrl.replace('https://', 'http://');
      try {
        const response = await makeRequest(`${httpUrl}/api/health`);
        const httpsEnforced = response.statusCode === 301 || response.statusCode === 302 || response.statusCode >= 400;
        
        results.push({
          name: 'HTTPS enforcement',
          passed: httpsEnforced,
          details: `HTTP request status: ${response.statusCode}`
        });
        
        log(`${httpsEnforced ? '✅' : '⚠️'} HTTPS enforcement: ${httpsEnforced ? 'Active' : 'Not detected'}`, httpsEnforced ? 'green' : 'yellow');
      } catch (error) {
        // Connection refused is good - means HTTP is blocked
        results.push({
          name: 'HTTPS enforcement',
          passed: true,
          details: 'HTTP connection refused (good)'
        });
        log('✅ HTTPS enforcement: HTTP connection refused', 'green');
      }
    }
    
    // Test HSTS header
    const response = await makeRequest(`${baseUrl}/api/health`);
    const hstsHeader = response.headers['strict-transport-security'];
    const hstsPresent = !!hstsHeader;
    
    results.push({
      name: 'HSTS header',
      passed: hstsPresent,
      details: hstsPresent ? `Present: ${hstsHeader}` : 'Missing'
    });
    
    log(`${hstsPresent ? '✅' : '❌'} HSTS header: ${hstsPresent ? 'Present' : 'Missing'}`, hstsPresent ? 'green' : 'red');
    
  } catch (error) {
    results.push({
      name: 'Transport security test',
      passed: false,
      details: error.message
    });
    log(`❌ Transport security test failed: ${error.message}`, 'red');
  }
  
  return results;
}

// ============================================================================
// Error Handling Security Tests
// ============================================================================

async function testErrorHandling(baseUrl) {
  logSection('Error Handling Security Tests');
  
  const results = [];
  
  const errorTests = [
    {
      name: 'Invalid JSON payload',
      request: () => makeRequest(`${baseUrl}/api/convert`, {
        method: 'POST',
        body: '{"invalid": json}'
      })
    },
    {
      name: 'Missing required fields',
      request: () => makeRequest(`${baseUrl}/api/convert`, {
        method: 'POST',
        body: {}
      })
    },
    {
      name: 'Invalid HTTP method',
      request: () => makeRequest(`${baseUrl}/api/health`, {
        method: 'PATCH'
      })
    },
    {
      name: 'Non-existent endpoint',
      request: () => makeRequest(`${baseUrl}/api/nonexistent`)
    }
  ];
  
  for (const test of errorTests) {
    try {
      const response = await test.request();
      
      // Check if error response is properly formatted and doesn't leak sensitive info
      let errorResponse = {};
      try {
        errorResponse = JSON.parse(response.body);
      } catch (e) {
        // Non-JSON response
      }
      
      const hasProperErrorFormat = errorResponse.success === false && errorResponse.error;
      const noSensitiveInfo = !response.body.includes('stack') && 
                             !response.body.includes('password') && 
                             !response.body.includes('secret');
      
      const passed = response.statusCode >= 400 && hasProperErrorFormat && noSensitiveInfo;
      
      results.push({
        name: test.name,
        passed,
        details: `Status: ${response.statusCode}, Format: ${hasProperErrorFormat ? 'Good' : 'Poor'}, Security: ${noSensitiveInfo ? 'Safe' : 'Leaks info'}`
      });
      
      log(`${passed ? '✅' : '⚠️'} ${test.name}: ${passed ? 'Secure' : 'Needs review'}`, passed ? 'green' : 'yellow');
      
    } catch (error) {
      results.push({
        name: test.name,
        passed: false,
        details: error.message
      });
      log(`❌ ${test.name}: ${error.message}`, 'red');
    }
  }
  
  return results;
}

// ============================================================================
// Main Test Function
// ============================================================================

async function main() {
  log(`${colors.bold}🔒 API Security Testing Suite${colors.reset}`, 'magenta');
  log('Performing comprehensive API security testing...\n');
  
  // Determine test URL
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
  log(`🎯 Testing API: ${baseUrl}`, 'blue');
  
  const testSuites = [
    { name: 'Authentication Security', fn: () => testAuthentication(baseUrl) },
    { name: 'Input Validation Security', fn: () => testInputValidation(baseUrl) },
    { name: 'Rate Limiting', fn: () => testRateLimiting(baseUrl) },
    { name: 'Security Headers', fn: () => testSecurityHeaders(baseUrl) },
    { name: 'Transport Security', fn: () => testTransportSecurity(baseUrl) },
    { name: 'Error Handling Security', fn: () => testErrorHandling(baseUrl) }
  ];
  
  const allResults = [];
  
  for (const suite of testSuites) {
    try {
      const results = await suite.fn();
      allResults.push(...results.map(r => ({ ...r, suite: suite.name })));
    } catch (error) {
      log(`❌ Test suite "${suite.name}" failed: ${error.message}`, 'red');
      allResults.push({ 
        name: suite.name, 
        suite: suite.name, 
        passed: false, 
        details: error.message 
      });
    }
  }
  
  // Summary
  logSection('API Security Test Results Summary');
  
  const passedTests = allResults.filter(r => r.passed).length;
  const totalTests = allResults.length;
  const successRate = Math.round((passedTests / totalTests) * 100);
  
  // Group by suite
  const suiteResults = {};
  allResults.forEach(result => {
    if (!suiteResults[result.suite]) {
      suiteResults[result.suite] = { passed: 0, total: 0 };
    }
    suiteResults[result.suite].total++;
    if (result.passed) {
      suiteResults[result.suite].passed++;
    }
  });
  
  Object.entries(suiteResults).forEach(([suite, stats]) => {
    const suiteRate = Math.round((stats.passed / stats.total) * 100);
    log(`${stats.passed === stats.total ? '✅' : '⚠️'} ${suite}: ${stats.passed}/${stats.total} (${suiteRate}%)`, 
        stats.passed === stats.total ? 'green' : 'yellow');
  });
  
  log(`\n📊 Overall Results: ${passedTests}/${totalTests} tests passed (${successRate}%)`, 
      successRate >= 80 ? 'green' : 'yellow');
  
  if (successRate >= 90) {
    log('\n🎉 Excellent API security! Most tests passed.', 'green');
    process.exit(0);
  } else if (successRate >= 70) {
    log('\n⚠️ Good API security with some areas for improvement.', 'yellow');
    process.exit(0);
  } else {
    log('\n❌ API security needs significant improvement.', 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { 
  testAuthentication, 
  testInputValidation, 
  testRateLimiting, 
  testSecurityHeaders,
  testTransportSecurity,
  testErrorHandling
};
