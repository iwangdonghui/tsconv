#!/usr/bin/env node

/**
 * API Documentation Examples Testing Script
 * Tests all API endpoints mentioned in the documentation to ensure they work correctly
 */

import https from 'https';

// API endpoints from documentation
const API_EXAMPLES = [
  {
    name: 'Convert timestamp to date',
    url: 'https://tsconv.com/api/convert?timestamp=1640995200',
    expectedFields: ['success', 'data', 'metadata']
  },
  {
    name: 'Convert date to timestamp',
    url: 'https://tsconv.com/api/convert?date=2022-01-01',
    expectedFields: ['success', 'data', 'metadata']
  },
  {
    name: 'Convert ISO date to timestamp',
    url: 'https://tsconv.com/api/convert?date=2021-03-02T15:30:00Z',
    expectedFields: ['success', 'data', 'metadata']
  },
  {
    name: 'Get current timestamp',
    url: 'https://tsconv.com/api/now',
    expectedFields: ['timestamp', 'milliseconds', 'iso', 'utc', 'local']
  },
  {
    name: 'Health check',
    url: 'https://tsconv.com/api/health',
    expectedFields: ['status', 'timestamp', 'version']
  },
  {
    name: 'V1 Health check',
    url: 'https://tsconv.com/api/v1/health',
    expectedFields: ['status', 'version', 'timestamp']
  },
  {
    name: 'Available formats',
    url: 'https://tsconv.com/api/v1/formats',
    expectedFields: ['success', 'data']
  },
  {
    name: 'Available timezones',
    url: 'https://tsconv.com/api/v1/timezones',
    expectedFields: ['success', 'data']
  }
];

// POST API examples
const POST_EXAMPLES = [
  {
    name: 'V1 Convert with metadata',
    url: 'https://tsconv.com/api/v1/convert',
    method: 'POST',
    body: { timestamp: 1640995200, includeMetadata: true },
    expectedFields: ['success', 'data']
  },
  {
    name: 'Batch conversion',
    url: 'https://tsconv.com/api/v1/batch',
    method: 'POST',
    body: { timestamps: [1640995200, 1641081600] },
    expectedFields: ['success', 'data']
  },
  {
    name: 'Convert date via POST',
    url: 'https://tsconv.com/api/convert',
    method: 'POST',
    body: { date: '2021-03-02' },
    expectedFields: ['success', 'data', 'metadata']
  }
];

function makeRequest(url, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Docs-Test/1.0',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        try {
          const jsonData = JSON.parse(data);
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: jsonData,
            responseTime,
            isJson: true
          });
        } catch (e) {
          resolve({
            success: false,
            status: res.statusCode,
            data: data,
            responseTime,
            isJson: false,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        status: 0,
        responseTime: Date.now() - startTime,
        error: error.message,
        isJson: false
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        success: false,
        status: 0,
        responseTime: Date.now() - startTime,
        error: 'Timeout',
        isJson: false
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
    return { valid: false, missing: [], extra: [] };
  }

  const data = result.data;
  const missing = expectedFields.filter(field => !(field in data));
  const present = Object.keys(data);
  
  return {
    valid: missing.length === 0,
    missing,
    present,
    extra: present.filter(field => !expectedFields.includes(field))
  };
}

async function testApiDocumentation() {
  console.log('🧪 Testing API Documentation Examples\n');
  
  const results = [];
  let totalTests = 0;
  let passedTests = 0;

  // Test GET endpoints
  console.log('📡 Testing GET Endpoints:\n');
  
  for (const example of API_EXAMPLES) {
    totalTests++;
    process.stdout.write(`  Testing ${example.name}... `);
    
    const result = await makeRequest(example.url);
    const validation = validateResponse(result, example.expectedFields);
    
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
      ...example,
      result,
      validation,
      passed: result.success && validation.valid
    });
  }

  // Test POST endpoints
  console.log('\n📤 Testing POST Endpoints:\n');
  
  for (const example of POST_EXAMPLES) {
    totalTests++;
    process.stdout.write(`  Testing ${example.name}... `);
    
    const result = await makeRequest(example.url, {
      method: example.method,
      body: example.body
    });
    const validation = validateResponse(result, example.expectedFields);
    
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
      ...example,
      result,
      validation,
      passed: result.success && validation.valid
    });
  }

  // Summary
  console.log('\n📊 API Documentation Test Summary:\n');
  console.log(`  Total Tests: ${passedTests}/${totalTests} passed (${Math.round(passedTests/totalTests*100)}%)`);
  
  const avgResponseTime = results.reduce((sum, r) => sum + r.result.responseTime, 0) / totalTests;
  console.log(`  Average Response Time: ${Math.round(avgResponseTime)}ms`);

  // Failed tests details
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`  - ${test.name}: ${test.result.error || test.result.status || 'Validation failed'}`);
    });
  }

  // Success status
  if (passedTests === totalTests) {
    console.log('\n🎉 All API documentation examples are working correctly!');
    console.log('✅ API documentation is ready for users');
  } else {
    console.log('\n⚠️  Some API documentation examples need attention');
    console.log('🔧 Please review and fix the failing endpoints');
  }

  return {
    totalTests,
    passedTests,
    failedTests: failedTests.length,
    avgResponseTime,
    allPassed: passedTests === totalTests
  };
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testApiDocumentation().catch(console.error);
}

export { testApiDocumentation };
