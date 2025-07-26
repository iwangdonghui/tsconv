#!/usr/bin/env node

/**
 * Test script for unified handlers
 * Tests the new unified convert and health handlers
 */

import https from 'https';

const BASE_URL = 'https://tsconv.com';

// Test cases for unified convert handler
const CONVERT_TESTS = [
  {
    name: 'Simple Convert - GET',
    url: '/api/handlers/simple-convert?timestamp=1705315845&mode=simple',
    method: 'GET',
    expectedFields: ['success', 'data']
  },
  {
    name: 'Working Convert - GET',
    url: '/api/handlers/working-convert?timestamp=now&metadata=true&relative=true',
    method: 'GET',
    expectedFields: ['success', 'data']
  },
  {
    name: 'Standalone Convert - GET',
    url: '/api/handlers/standalone-convert?timestamp=1705315845&formats=unix,iso,human',
    method: 'GET',
    expectedFields: ['success', 'data']
  },
  {
    name: 'Unified Convert - POST Simple',
    url: '/api/handlers/unified-convert',
    method: 'POST',
    body: {
      timestamp: 1705315845,
      options: {
        mode: 'simple',
        includeMetadata: false
      }
    },
    expectedFields: ['success', 'data']
  },
  {
    name: 'Unified Convert - POST Working',
    url: '/api/handlers/unified-convert',
    method: 'POST',
    body: {
      timestamp: 'now',
      outputFormats: ['unix', 'iso', 'human', 'relative'],
      timezone: 'America/New_York',
      options: {
        mode: 'working',
        includeMetadata: true,
        includeRelative: true,
        priority: 'high'
      }
    },
    expectedFields: ['success', 'data']
  }
];

// Test cases for unified health handler
const HEALTH_TESTS = [
  {
    name: 'Simple Health Check',
    url: '/api/handlers/simple-health?services=true',
    method: 'GET',
    expectedFields: ['status', 'timestamp', 'uptime']
  },
  {
    name: 'Working Health Check',
    url: '/api/handlers/working-health?services=true&metrics=true',
    method: 'GET',
    expectedFields: ['status', 'timestamp', 'services', 'metrics']
  },
  {
    name: 'Standalone Health Check',
    url: '/api/handlers/standalone-health',
    method: 'GET',
    expectedFields: ['status', 'timestamp', 'system', 'checks']
  },
  {
    name: 'Unified Health - Simple Mode',
    url: '/api/handlers/unified-health?mode=simple&services=true',
    method: 'GET',
    expectedFields: ['status', 'timestamp', 'uptime']
  },
  {
    name: 'Unified Health - Working Mode',
    url: '/api/handlers/unified-health?mode=working&services=true&metrics=true',
    method: 'GET',
    expectedFields: ['status', 'timestamp', 'services', 'metrics']
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + test.url);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Unified-Handler-Test/1.0'
      }
    };

    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        try {
          const jsonData = JSON.parse(data);
          
          // Check if all expected fields are present
          const missingFields = test.expectedFields.filter(field => {
            return !hasNestedProperty(jsonData, field);
          });
          
          const result = {
            name: test.name,
            success: res.statusCode >= 200 && res.statusCode < 300 && missingFields.length === 0,
            statusCode: res.statusCode,
            responseTime,
            missingFields,
            data: jsonData
          };
          
          resolve(result);
        } catch (error) {
          resolve({
            name: test.name,
            success: false,
            statusCode: res.statusCode,
            responseTime,
            error: 'Invalid JSON response',
            rawData: data
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        name: test.name,
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
    });

    // Send POST data if present
    if (test.body) {
      req.write(JSON.stringify(test.body));
    }
    
    req.end();
  });
}

function hasNestedProperty(obj, path) {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return false;
    }
    current = current[key];
  }
  
  return true;
}

async function runAllTests() {
  console.log('🧪 Testing Unified Handlers\n');
  console.log('=' .repeat(60));
  
  // Test convert handlers
  console.log('\n📊 Convert Handler Tests');
  console.log('-'.repeat(40));
  
  let convertResults = [];
  for (const test of CONVERT_TESTS) {
    console.log(`Testing: ${test.name}...`);
    const result = await runTest(test);
    convertResults.push(result);
    
    if (result.success) {
      console.log(`✅ ${test.name} - ${result.responseTime}ms`);
    } else {
      console.log(`❌ ${test.name} - ${result.error || 'Failed'}`);
      if (result.missingFields && result.missingFields.length > 0) {
        console.log(`   Missing fields: ${result.missingFields.join(', ')}`);
      }
    }
  }
  
  // Test health handlers
  console.log('\n🏥 Health Handler Tests');
  console.log('-'.repeat(40));
  
  let healthResults = [];
  for (const test of HEALTH_TESTS) {
    console.log(`Testing: ${test.name}...`);
    const result = await runTest(test);
    healthResults.push(result);
    
    if (result.success) {
      console.log(`✅ ${test.name} - ${result.responseTime}ms`);
    } else {
      console.log(`❌ ${test.name} - ${result.error || 'Failed'}`);
      if (result.missingFields && result.missingFields.length > 0) {
        console.log(`   Missing fields: ${result.missingFields.join(', ')}`);
      }
    }
  }
  
  // Summary
  console.log('\n📈 Test Summary');
  console.log('=' .repeat(60));
  
  const allResults = [...convertResults, ...healthResults];
  const successCount = allResults.filter(r => r.success).length;
  const totalCount = allResults.length;
  const successRate = ((successCount / totalCount) * 100).toFixed(1);
  
  console.log(`Total Tests: ${totalCount}`);
  console.log(`Passed: ${successCount}`);
  console.log(`Failed: ${totalCount - successCount}`);
  console.log(`Success Rate: ${successRate}%`);
  
  // Performance stats
  const responseTimes = allResults
    .filter(r => r.responseTime)
    .map(r => r.responseTime);
  
  if (responseTimes.length > 0) {
    const avgResponseTime = (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(0);
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    console.log(`\n⚡ Performance:`);
    console.log(`Average Response Time: ${avgResponseTime}ms`);
    console.log(`Min Response Time: ${minResponseTime}ms`);
    console.log(`Max Response Time: ${maxResponseTime}ms`);
  }
  
  // Failed tests details
  const failedTests = allResults.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests Details:');
    console.log('-'.repeat(40));
    
    failedTests.forEach(test => {
      console.log(`\n${test.name}:`);
      console.log(`  Status: ${test.statusCode || 'N/A'}`);
      console.log(`  Error: ${test.error || 'Unknown'}`);
      if (test.missingFields && test.missingFields.length > 0) {
        console.log(`  Missing Fields: ${test.missingFields.join(', ')}`);
      }
    });
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 Unified Handler Testing Complete!');
  
  // Exit with appropriate code
  process.exit(successRate === 100 ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});