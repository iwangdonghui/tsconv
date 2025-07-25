#!/usr/bin/env node

/**
 * Frontend Features Testing Script
 * Tests all new frontend pages and their integration with APIs
 */

import https from 'https';

const BASE_URL = 'https://tsconv.com';

// Test cases for frontend pages
const FRONTEND_TESTS = [
  {
    name: 'Workdays Calculator Page',
    url: '/workdays',
    description: 'Test workdays calculator page loads',
    expectedContent: ['Workdays Calculator', 'Start Date', 'Calculate']
  },
  {
    name: 'Date Difference Calculator Page',
    url: '/date-diff',
    description: 'Test date difference calculator page loads',
    expectedContent: ['Date Difference Calculator', 'Start Date', 'End Date']
  },
  {
    name: 'Format Tool Page',
    url: '/format',
    description: 'Test format tool page loads',
    expectedContent: ['Date Format Tool', 'Input Type', 'Format Template']
  },
  {
    name: 'Timezone Explorer Page',
    url: '/timezones',
    description: 'Test timezone explorer page loads',
    expectedContent: ['Timezone Explorer', 'Search timezones', 'All Regions']
  },
  {
    name: 'Main Page Navigation',
    url: '/',
    description: 'Test main page has navigation to new tools',
    expectedContent: ['Tools', 'Workdays Calculator', 'Date Difference']
  }
];

// API integration tests
const API_INTEGRATION_TESTS = [
  {
    name: 'Workdays API Integration',
    url: '/api/workdays?startDate=2024-01-01&endDate=2024-01-31',
    description: 'Test workdays API returns valid data',
    expectedFields: ['success', 'data', 'metadata']
  },
  {
    name: 'Date Diff API Integration',
    url: '/api/date-diff?startDate=2024-01-01&endDate=2024-12-31',
    description: 'Test date difference API returns valid data',
    expectedFields: ['success', 'data', 'metadata']
  },
  {
    name: 'Format API Integration',
    url: '/api/format?timestamp=1640995200&format=readable',
    description: 'Test format API returns valid data',
    expectedFields: ['success', 'data', 'metadata']
  },
  {
    name: 'Format Templates API',
    url: '/api/format/templates',
    description: 'Test format templates API returns templates',
    expectedFields: ['success', 'data']
  },
  {
    name: 'Timezones API Integration',
    url: '/api/timezones?format=simple&limit=5',
    description: 'Test timezones API returns valid data',
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
        'User-Agent': 'Frontend-Features-Test/1.0',
        'Accept': 'text/html,application/json,*/*',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const isJson = res.headers['content-type']?.includes('application/json');
        
        let parsedData = data;
        if (isJson) {
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            // Keep as string if JSON parsing fails
          }
        }
        
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          data: parsedData,
          responseTime,
          isJson,
          contentType: res.headers['content-type'] || ''
        });
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

    req.end();
  });
}

function validatePageContent(result, expectedContent) {
  if (!result.success || result.isJson) {
    return { valid: false, missing: expectedContent, found: [] };
  }

  const content = result.data.toLowerCase();
  const found = expectedContent.filter(text => content.includes(text.toLowerCase()));
  const missing = expectedContent.filter(text => !content.includes(text.toLowerCase()));
  
  return {
    valid: missing.length === 0,
    missing,
    found,
    contentLength: content.length
  };
}

function validateApiResponse(result, expectedFields) {
  if (!result.success || !result.isJson) {
    return { valid: false, missing: expectedFields, found: [] };
  }

  const data = result.data;
  const found = expectedFields.filter(field => field in data);
  const missing = expectedFields.filter(field => !(field in data));
  
  return {
    valid: missing.length === 0,
    missing,
    found,
    hasData: data.success === true
  };
}

async function testFrontendPages() {
  console.log('🎨 Testing Frontend Pages\n');
  
  const results = [];
  let passedTests = 0;

  for (const test of FRONTEND_TESTS) {
    process.stdout.write(`  ${test.name}... `);
    
    const result = await makeRequest(`${BASE_URL}${test.url}`);
    const validation = validatePageContent(result, test.expectedContent);
    
    if (result.success && validation.valid) {
      console.log(`✅ PASS (${result.responseTime}ms)`);
      passedTests++;
    } else {
      console.log(`❌ FAIL (${result.responseTime}ms)`);
      if (!result.success) {
        console.log(`    Error: HTTP ${result.status} ${result.error || ''}`);
      } else if (validation.missing.length > 0) {
        console.log(`    Missing content: ${validation.missing.join(', ')}`);
      }
    }
    
    results.push({
      ...test,
      result,
      validation,
      passed: result.success && validation.valid
    });
  }

  return { results, passedTests, totalTests: FRONTEND_TESTS.length };
}

async function testApiIntegration() {
  console.log('\n🔗 Testing API Integration\n');
  
  const results = [];
  let passedTests = 0;

  for (const test of API_INTEGRATION_TESTS) {
    process.stdout.write(`  ${test.name}... `);
    
    const result = await makeRequest(`${BASE_URL}${test.url}`);
    const validation = validateApiResponse(result, test.expectedFields);
    
    if (result.success && validation.valid && validation.hasData) {
      console.log(`✅ PASS (${result.responseTime}ms)`);
      passedTests++;
    } else {
      console.log(`❌ FAIL (${result.responseTime}ms)`);
      if (!result.success) {
        console.log(`    Error: HTTP ${result.status} ${result.error || ''}`);
      } else if (!validation.hasData) {
        console.log(`    API returned success: false`);
      } else if (validation.missing.length > 0) {
        console.log(`    Missing fields: ${validation.missing.join(', ')}`);
      }
    }
    
    results.push({
      ...test,
      result,
      validation,
      passed: result.success && validation.valid && validation.hasData
    });
  }

  return { results, passedTests, totalTests: API_INTEGRATION_TESTS.length };
}

async function runFrontendFeaturesTests() {
  console.log('🎨 Frontend Features Testing\n');
  console.log('=' .repeat(60));
  
  // Test frontend pages
  const frontendResults = await testFrontendPages();
  
  // Test API integration
  const apiResults = await testApiIntegration();
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Frontend Features Test Summary\n');
  
  console.log(`Frontend Pages: ${frontendResults.passedTests}/${frontendResults.totalTests} passed (${Math.round(frontendResults.passedTests/frontendResults.totalTests*100)}%)`);
  console.log(`API Integration: ${apiResults.passedTests}/${apiResults.totalTests} passed (${Math.round(apiResults.passedTests/apiResults.totalTests*100)}%)`);
  
  const totalTests = frontendResults.totalTests + apiResults.totalTests;
  const totalPassed = frontendResults.passedTests + apiResults.passedTests;
  
  console.log(`\nOverall: ${totalPassed}/${totalTests} tests passed (${Math.round(totalPassed/totalTests*100)}%)`);
  
  // Calculate average response times
  const allResults = [...frontendResults.results, ...apiResults.results];
  const avgResponseTime = allResults.reduce((sum, r) => sum + r.result.responseTime, 0) / totalTests;
  console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);

  // Status summary
  console.log('\n💡 Frontend Features Status:');
  
  if (frontendResults.passedTests === frontendResults.totalTests) {
    console.log('  ✅ All frontend pages are loading correctly');
  } else {
    console.log('  ⚠️  Some frontend pages need attention');
  }
  
  if (apiResults.passedTests === apiResults.totalTests) {
    console.log('  ✅ All API integrations are working');
  } else {
    console.log('  ⚠️  Some API integrations need fixing');
  }
  
  if (totalPassed === totalTests) {
    console.log('\n🎉 All frontend features are fully functional!');
    console.log('✅ Users can now access all new tools through the web interface');
  } else {
    console.log('\n🔧 Some frontend features need attention');
    console.log('📝 Please review and fix the failing components');
  }

  return {
    frontend: frontendResults,
    api: apiResults,
    overall: { passed: totalPassed, total: totalTests, avgResponseTime }
  };
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFrontendFeaturesTests().catch(console.error);
}

export { runFrontendFeaturesTests };
