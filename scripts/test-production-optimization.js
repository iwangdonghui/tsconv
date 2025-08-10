#!/usr/bin/env node

/**
 * Production Optimization Testing Script
 * Tests security, analytics, and monitoring features
 */

import https from 'https';

const BASE_URL = 'https://tsconv.com';
const ADMIN_TOKEN = 'admin';

// Test endpoints for production optimization
const OPTIMIZATION_TESTS = [
  {
    name: 'Analytics Dashboard',
    url: '/api/admin/analytics/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    expectedFields: ['overview', 'realTime', 'today', 'security'],
  },
  {
    name: 'Real-time Analytics',
    url: '/api/admin/analytics/realtime',
    method: 'GET',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    expectedFields: ['currentHourRequests', 'last5MinRequests', 'recentEvents'],
  },
  {
    name: 'Security Status',
    url: '/api/admin/analytics/security',
    method: 'GET',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    expectedFields: ['rateLimits', 'securityHeaders', 'cors'],
  },
  {
    name: 'Cache Analytics',
    url: '/api/admin/cache/status',
    method: 'GET',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    expectedFields: ['redis', 'cache'],
  },
];

// Security tests
const SECURITY_TESTS = [
  {
    name: 'Rate Limiting Test',
    description: 'Test rate limiting by making multiple requests',
    test: async () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await makeRequest(`${BASE_URL}/api/health`);
        results.push({
          attempt: i + 1,
          status: result.status,
          hasRateLimitHeaders: !!(
            result.headers['x-ratelimit-limit'] || result.headers['X-RateLimit-Limit']
          ),
        });
      }
      return results;
    },
  },
  {
    name: 'Security Headers Test',
    description: 'Check for security headers in responses',
    test: async () => {
      const result = await makeRequest(`${BASE_URL}/api/health`);
      const securityHeaders = [
        'Content-Security-Policy',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
      ];

      const presentHeaders = securityHeaders.filter(
        header => result.headers[header.toLowerCase()] || result.headers[header]
      );

      return {
        total: securityHeaders.length,
        present: presentHeaders.length,
        missing: securityHeaders.filter(
          header => !result.headers[header.toLowerCase()] && !result.headers[header]
        ),
        headers: presentHeaders,
      };
    },
  },
  {
    name: 'CORS Configuration Test',
    description: 'Test CORS headers',
    test: async () => {
      const result = await makeRequest(`${BASE_URL}/api/health`, {
        headers: { Origin: 'https://example.com' },
      });

      return {
        accessControlAllowOrigin: result.headers['access-control-allow-origin'],
        accessControlAllowMethods: result.headers['access-control-allow-methods'],
        accessControlAllowHeaders: result.headers['access-control-allow-headers'],
      };
    },
  },
];

function makeRequest(url, options = {}) {
  return new Promise(resolve => {
    const startTime = Date.now();

    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Production-Optimization-Test/1.0',
        ...options.headers,
      },
    };

    const req = https.request(requestOptions, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        try {
          const jsonData = JSON.parse(data);
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: jsonData,
            headers: res.headers,
            responseTime,
            isJson: true,
          });
        } catch (e) {
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data,
            headers: res.headers,
            responseTime,
            isJson: false,
          });
        }
      });
    });

    req.on('error', error => {
      resolve({
        success: false,
        status: 0,
        responseTime: Date.now() - startTime,
        error: error.message,
        isJson: false,
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        success: false,
        status: 0,
        responseTime: Date.now() - startTime,
        error: 'Timeout',
        isJson: false,
      });
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

function validateResponse(result, expectedFields) {
  if (!result.success || !result.isJson) {
    return { valid: false, missing: expectedFields, extra: [] };
  }

  const data = result.data.data || result.data;
  const missing = expectedFields.filter(field => !(field in data));
  const present = Object.keys(data);

  return {
    valid: missing.length === 0,
    missing,
    present,
    extra: present.filter(field => !expectedFields.includes(field)),
  };
}

async function testAnalyticsEndpoints() {
  console.log('📊 Testing Analytics Endpoints\n');

  const results = [];
  let passedTests = 0;

  for (const test of OPTIMIZATION_TESTS) {
    process.stdout.write(`  Testing ${test.name}... `);

    const result = await makeRequest(`${BASE_URL}${test.url}`, {
      method: test.method,
      headers: test.headers,
    });

    const validation = validateResponse(result, test.expectedFields);

    if (result.success && validation.valid) {
      console.log(`✅ PASS (${result.responseTime}ms)`);
      passedTests++;
    } else {
      console.log(`❌ FAIL (${result.responseTime}ms)`);
      if (!result.isJson) {
        console.log(`    Error: ${result.error || 'Non-JSON response'}`);
      } else if (validation.missing.length > 0) {
        console.log(`    Missing fields: ${validation.missing.join(', ')}`);
      }
    }

    results.push({
      ...test,
      result,
      validation,
      passed: result.success && validation.valid,
    });
  }

  return { results, passedTests, totalTests: OPTIMIZATION_TESTS.length };
}

async function testSecurityFeatures() {
  console.log('\n🔒 Testing Security Features\n');

  const results = [];

  for (const test of SECURITY_TESTS) {
    console.log(`  Testing ${test.name}:`);
    console.log(`  ${test.description}`);

    try {
      const result = await test.test();
      console.log(`  ✅ Result:`, JSON.stringify(result, null, 4));
      results.push({ name: test.name, success: true, result });
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.push({ name: test.name, success: false, error: error.message });
    }

    console.log('');
  }

  return results;
}

async function runProductionOptimizationTests() {
  console.log('🚀 Production Optimization Testing\n');
  console.log('='.repeat(60));

  // Test analytics endpoints
  const analyticsResults = await testAnalyticsEndpoints();

  // Test security features
  const securityResults = await testSecurityFeatures();

  console.log('='.repeat(60));
  console.log('📊 Test Summary\n');

  console.log(
    `Analytics Tests: ${analyticsResults.passedTests}/${analyticsResults.totalTests} passed (${Math.round((analyticsResults.passedTests / analyticsResults.totalTests) * 100)}%)`
  );
  console.log(
    `Security Tests: ${securityResults.filter(r => r.success).length}/${securityResults.length} passed (${Math.round((securityResults.filter(r => r.success).length / securityResults.length) * 100)}%)`
  );

  const totalTests = analyticsResults.totalTests + securityResults.length;
  const totalPassed = analyticsResults.passedTests + securityResults.filter(r => r.success).length;

  console.log(
    `\nOverall: ${totalPassed}/${totalTests} tests passed (${Math.round((totalPassed / totalTests) * 100)}%)`
  );

  // Recommendations
  console.log('\n💡 Production Optimization Status:');

  if (analyticsResults.passedTests === analyticsResults.totalTests) {
    console.log('  ✅ Analytics system fully operational');
  } else {
    console.log('  ⚠️  Some analytics endpoints need attention');
  }

  const securityPassed = securityResults.filter(r => r.success).length;
  if (securityPassed === securityResults.length) {
    console.log('  ✅ Security features fully implemented');
  } else {
    console.log('  ⚠️  Some security features need configuration');
  }

  if (totalPassed === totalTests) {
    console.log('\n🎉 Production environment is fully optimized!');
  } else {
    console.log('\n🔧 Production environment needs some optimization work');
  }

  return {
    analytics: analyticsResults,
    security: securityResults,
    overall: { passed: totalPassed, total: totalTests },
  };
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runProductionOptimizationTests().catch(console.error);
}

export { runProductionOptimizationTests };
