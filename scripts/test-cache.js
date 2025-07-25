#!/usr/bin/env node

/**
 * Cache Testing Script
 * Tests cache functionality and performance improvements
 */

import https from 'https';

const BASE_URL = 'https://tsconv.com';

// Test endpoints for cache testing
const CACHE_TESTS = [
  {
    name: 'Convert API - Same timestamp',
    url: '/api/convert?timestamp=1640995200',
    expectedCached: true,
    description: 'Should be cached after first request'
  },
  {
    name: 'Convert API - Different timestamp',
    url: '/api/convert?timestamp=1641081600',
    expectedCached: false,
    description: 'Different timestamp should not be cached initially'
  },
  {
    name: 'Convert API - With formats',
    url: '/api/convert?timestamp=1640995200&formats=iso,utc',
    expectedCached: false,
    description: 'Different cache key due to formats parameter'
  },
  {
    name: 'Health API',
    url: '/api/health',
    expectedCached: true,
    description: 'Health check should be cached'
  }
];

function makeRequest(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = https.get(url, (res) => {
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
            cached: jsonData.metadata?.cached || false
          });
        } catch (e) {
          resolve({
            success: false,
            status: res.statusCode,
            responseTime,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        success: false,
        responseTime: Date.now() - startTime,
        error: 'Timeout'
      });
    });
  });
}

async function testCachePerformance() {
  console.log('🧪 Cache Performance Testing\n');
  
  const results = [];
  
  for (const test of CACHE_TESTS) {
    console.log(`Testing: ${test.name}`);
    console.log(`Description: ${test.description}\n`);
    
    const url = `${BASE_URL}${test.url}`;
    
    // First request (should not be cached)
    console.log('  First request (cold cache)...');
    const firstResult = await makeRequest(url);
    
    if (!firstResult.success) {
      console.log(`  ❌ Failed: ${firstResult.error || firstResult.status}\n`);
      continue;
    }
    
    console.log(`  ✅ ${firstResult.status} (${firstResult.responseTime}ms) - Cached: ${firstResult.cached}`);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Second request (should be cached if cache is working)
    console.log('  Second request (warm cache)...');
    const secondResult = await makeRequest(url);
    
    if (!secondResult.success) {
      console.log(`  ❌ Failed: ${secondResult.error || secondResult.status}\n`);
      continue;
    }
    
    console.log(`  ✅ ${secondResult.status} (${secondResult.responseTime}ms) - Cached: ${secondResult.cached}`);
    
    // Analyze results
    const speedImprovement = firstResult.responseTime > 0 
      ? ((firstResult.responseTime - secondResult.responseTime) / firstResult.responseTime) * 100
      : 0;
    
    const cacheWorking = secondResult.cached === true;
    const performanceImproved = secondResult.responseTime < firstResult.responseTime;
    
    console.log(`  📊 Analysis:`);
    console.log(`    Cache Working: ${cacheWorking ? '✅ Yes' : '❌ No'}`);
    console.log(`    Performance Improved: ${performanceImproved ? '✅ Yes' : '❌ No'}`);
    console.log(`    Speed Improvement: ${speedImprovement > 0 ? '+' : ''}${speedImprovement.toFixed(1)}%`);
    
    results.push({
      ...test,
      firstRequest: firstResult,
      secondRequest: secondResult,
      cacheWorking,
      performanceImproved,
      speedImprovement
    });
    
    console.log('');
  }
  
  return results;
}

async function testCacheStatus() {
  console.log('🔍 Cache System Status\n');
  
  try {
    const healthUrl = `${BASE_URL}/api/health?detailed=true`;
    const healthResult = await makeRequest(healthUrl);
    
    if (!healthResult.success) {
      console.log('❌ Failed to get health status');
      return null;
    }
    
    const cacheInfo = healthResult.data.details?.cache;
    const services = healthResult.data.services;
    
    console.log('Cache System Status:');
    console.log(`  API Status: ${services?.api || 'unknown'}`);
    console.log(`  Cache Status: ${services?.cache || 'unknown'}`);
    console.log(`  Redis Status: ${services?.redis || 'unknown'}`);
    
    if (cacheInfo) {
      console.log('\nCache Details:');
      console.log(`  Redis Enabled: ${cacheInfo.redis?.enabled ? '✅ Yes' : '❌ No'}`);
      console.log(`  Cache Type: ${cacheInfo.redis?.type || 'unknown'}`);
      console.log(`  Memory Cache Size: ${cacheInfo.redis?.size || 0} entries`);
      
      if (cacheInfo.cache && Object.keys(cacheInfo.cache).length > 0) {
        console.log('\nCache Statistics:');
        for (const [category, stats] of Object.entries(cacheInfo.cache)) {
          console.log(`  ${category}:`);
          console.log(`    Requests: ${stats.totalRequests || 0}`);
          console.log(`    Hit Rate: ${(stats.hitRate || 0).toFixed(1)}%`);
        }
      }
    }
    
    return cacheInfo;
  } catch (error) {
    console.log(`❌ Error checking cache status: ${error.message}`);
    return null;
  }
}

async function runCacheTests() {
  console.log('🚀 Cache System Testing\n');
  console.log('=' .repeat(50));
  
  // Check cache system status first
  const cacheStatus = await testCacheStatus();
  
  console.log('\n' + '=' .repeat(50));
  
  // Run performance tests
  const performanceResults = await testCachePerformance();
  
  console.log('=' .repeat(50));
  console.log('📊 Test Summary\n');
  
  const totalTests = performanceResults.length;
  const workingCache = performanceResults.filter(r => r.cacheWorking).length;
  const improvedPerformance = performanceResults.filter(r => r.performanceImproved).length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Cache Working: ${workingCache}/${totalTests} (${Math.round(workingCache/totalTests*100)}%)`);
  console.log(`Performance Improved: ${improvedPerformance}/${totalTests} (${Math.round(improvedPerformance/totalTests*100)}%)`);
  
  const avgSpeedImprovement = performanceResults.reduce((sum, r) => sum + r.speedImprovement, 0) / totalTests;
  console.log(`Average Speed Improvement: ${avgSpeedImprovement.toFixed(1)}%`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  if (!cacheStatus?.redis?.enabled) {
    console.log('  🔧 Configure Redis environment variables in Cloudflare Pages for better caching');
  }
  
  if (workingCache < totalTests) {
    console.log('  🔧 Some cache functionality may need debugging');
  }
  
  if (avgSpeedImprovement < 10) {
    console.log('  📈 Cache performance could be improved with Redis backend');
  } else {
    console.log('  ✅ Cache is providing good performance improvements');
  }
  
  return {
    totalTests,
    workingCache,
    improvedPerformance,
    avgSpeedImprovement,
    cacheStatus
  };
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCacheTests().catch(console.error);
}

export { runCacheTests };
