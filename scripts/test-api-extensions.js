#!/usr/bin/env node

/**
 * API Extensions Testing Script
 * Tests all new API endpoints and functionality
 */

import https from 'https';

const BASE_URL = 'https://tsconv.com';

// Test cases for new API endpoints
const API_EXTENSION_TESTS = [
  {
    name: 'Workdays API - Date Range',
    url: '/api/workdays?startDate=2024-01-01&endDate=2024-01-31',
    method: 'GET',
    expectedFields: ['startDate', 'endDate', 'totalDays', 'workdays', 'weekends', 'holidays'],
    description: 'Calculate workdays in January 2024'
  },
  {
    name: 'Workdays API - With Holidays',
    url: '/api/workdays?startDate=2024-01-01&endDate=2024-01-31&excludeHolidays=true&country=US',
    method: 'GET',
    expectedFields: ['startDate', 'endDate', 'totalDays', 'workdays', 'weekends', 'holidays'],
    description: 'Calculate workdays excluding US holidays'
  },
  {
    name: 'Date Diff API - Year Difference',
    url: '/api/date-diff?startDate=2024-01-01&endDate=2024-12-31',
    method: 'GET',
    expectedFields: ['startDate', 'endDate', 'difference', 'humanReadable', 'direction'],
    description: 'Calculate difference for a full year'
  },
  {
    name: 'Date Diff API - Past Date',
    url: '/api/date-diff?startDate=2024-01-01&endDate=2023-01-01&absolute=false',
    method: 'GET',
    expectedFields: ['startDate', 'endDate', 'difference', 'humanReadable', 'direction'],
    description: 'Calculate difference for past date'
  },
  {
    name: 'Format API - Readable Format',
    url: '/api/format?timestamp=1640995200&format=readable',
    method: 'GET',
    expectedFields: ['input', 'output', 'template'],
    description: 'Format timestamp with readable template'
  },
  {
    name: 'Format API - Custom Format',
    url: '/api/format?timestamp=1640995200&format=YYYY-MM-DD_HH-mm-ss',
    method: 'GET',
    expectedFields: ['input', 'output'],
    description: 'Format timestamp with custom pattern'
  },
  {
    name: 'Format Templates List',
    url: '/api/format/templates',
    method: 'GET',
    expectedFields: ['templates', 'examples'],
    description: 'Get available format templates'
  },
  {
    name: 'Timezones API - Search',
    url: '/api/timezones?q=america&limit=5',
    method: 'GET',
    expectedFields: ['timezones', 'total', 'filtered'],
    description: 'Search timezones by region'
  },
  {
    name: 'Timezones API - Filter by Country',
    url: '/api/timezones?country=US&format=simple',
    method: 'GET',
    expectedFields: ['timezones', 'total', 'filtered'],
    description: 'Filter timezones by country'
  },
  {
    name: 'Timezones API - All Regions',
    url: '/api/timezones?format=detailed',
    method: 'GET',
    expectedFields: ['timezones', 'total', 'regions', 'countries', 'offsets'],
    description: 'Get detailed timezone information'
  }
];

// POST method tests
const POST_TESTS = [
  {
    name: 'Workdays API - POST with Days',
    url: '/api/workdays',
    method: 'POST',
    body: { startDate: '2024-01-01', days: 30, excludeWeekends: true },
    expectedFields: ['startDate', 'endDate', 'totalDays', 'workdays'],
    description: 'Calculate workdays using POST method'
  },
  {
    name: 'Date Diff API - POST Method',
    url: '/api/date-diff',
    method: 'POST',
    body: { startDate: '2024-01-01', endDate: '2024-06-01', unit: 'all' },
    expectedFields: ['startDate', 'endDate', 'difference', 'humanReadable'],
    description: 'Calculate date difference using POST'
  },
  {
    name: 'Format API - POST with Date',
    url: '/api/format',
    method: 'POST',
    body: { date: '2024-01-01', format: 'us-date' },
    expectedFields: ['input', 'output'],
    description: 'Format date using POST method'
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
        'User-Agent': 'API-Extensions-Test/1.0',
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
    return { valid: false, missing: expectedFields, extra: [] };
  }

  const data = result.data.data || result.data;
  const missing = expectedFields.filter(field => !(field in data));
  const present = Object.keys(data);
  
  return {
    valid: missing.length === 0,
    missing,
    present,
    extra: present.filter(field => !expectedFields.includes(field))
  };
}

async function testApiExtensions() {
  console.log('🚀 API Extensions Testing\n');
  console.log('=' .repeat(60));
  
  const allTests = [...API_EXTENSION_TESTS, ...POST_TESTS];
  const results = [];
  let passedTests = 0;

  console.log('📡 Testing New API Endpoints:\n');

  for (const test of allTests) {
    process.stdout.write(`  ${test.name}... `);
    
    const result = await makeRequest(`${BASE_URL}${test.url}`, {
      method: test.method,
      body: test.body
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
      passed: result.success && validation.valid
    });
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📊 API Extensions Test Summary\n');
  
  const totalTests = allTests.length;
  console.log(`Total Tests: ${passedTests}/${totalTests} passed (${Math.round(passedTests/totalTests*100)}%)`);
  
  // Group results by API
  const apiGroups = {
    'Workdays API': results.filter(r => r.name.includes('Workdays')),
    'Date Diff API': results.filter(r => r.name.includes('Date Diff')),
    'Format API': results.filter(r => r.name.includes('Format')),
    'Timezones API': results.filter(r => r.name.includes('Timezones'))
  };

  console.log('📈 Results by API:');
  for (const [apiName, apiResults] of Object.entries(apiGroups)) {
    const apiPassed = apiResults.filter(r => r.passed).length;
    const apiTotal = apiResults.length;
    console.log(`  ${apiName}: ${apiPassed}/${apiTotal} (${Math.round(apiPassed/apiTotal*100)}%)`);
  }

  const avgResponseTime = results.reduce((sum, r) => sum + r.result.responseTime, 0) / totalTests;
  console.log(`\nAverage Response Time: ${Math.round(avgResponseTime)}ms`);

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
    console.log('\n🎉 All API extensions are working correctly!');
    console.log('✅ New API functionality is ready for production');
  } else {
    console.log('\n⚠️  Some API extensions need attention');
    console.log('🔧 Please review and fix the failing endpoints');
  }

  return {
    totalTests,
    passedTests,
    failedTests: failedTests.length,
    avgResponseTime,
    allPassed: passedTests === totalTests,
    apiGroups: Object.fromEntries(
      Object.entries(apiGroups).map(([name, tests]) => [
        name, 
        { passed: tests.filter(t => t.passed).length, total: tests.length }
      ])
    )
  };
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testApiExtensions().catch(console.error);
}

export { testApiExtensions };
