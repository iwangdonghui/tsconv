#!/usr/bin/env node

/**
 * Migration Verification Script
 * Verifies that all domains and API endpoints are working correctly after migration
 */

import https from 'https';

// Test endpoints
const ENDPOINTS = [
  // Main domain
  { url: 'https://tsconv.com', type: 'frontend', description: 'Main website' },
  { url: 'https://www.tsconv.com', type: 'frontend', description: 'WWW redirect' },

  // API endpoints via main domain
  { url: 'https://tsconv.com/api/health', type: 'api', description: 'Health check (main domain)' },
  { url: 'https://tsconv.com/api/now', type: 'api', description: 'Current time (main domain)' },
  {
    url: 'https://tsconv.com/api/convert?timestamp=1640995200',
    type: 'api',
    description: 'Convert API (main domain)',
  },

  // API endpoints via subdomain (should work if configured)
  { url: 'https://api.tsconv.com/health', type: 'api', description: 'Health check (subdomain)' },
  { url: 'https://api.tsconv.com/now', type: 'api', description: 'Current time (subdomain)' },
  {
    url: 'https://api.tsconv.com/convert?timestamp=1640995200',
    type: 'api',
    description: 'Convert API (subdomain)',
  },
];

function makeRequest(url) {
  return new Promise(resolve => {
    const startTime = Date.now();

    const req = https.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          url,
          status: res.statusCode,
          responseTime,
          contentType: res.headers['content-type'],
          isJson: res.headers['content-type']?.includes('application/json'),
          dataLength: data.length,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', error => {
      resolve({
        url,
        status: 0,
        responseTime: Date.now() - startTime,
        error: error.message,
        success: false,
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url,
        status: 0,
        responseTime: Date.now() - startTime,
        error: 'Timeout',
        success: false,
      });
    });
  });
}

async function verifyMigration() {
  console.log('🔍 Verifying Migration Status\n');
  console.log('Testing all domains and API endpoints...\n');

  const results = [];

  for (const endpoint of ENDPOINTS) {
    process.stdout.write(`Testing ${endpoint.description}... `);

    const result = await makeRequest(endpoint.url);
    result.type = endpoint.type;
    result.description = endpoint.description;
    results.push(result);

    if (result.success) {
      console.log(`✅ ${result.status} (${result.responseTime}ms)`);
    } else {
      console.log(`❌ ${result.error || result.status} (${result.responseTime}ms)`);
    }
  }

  console.log('\n📊 Migration Verification Report\n');

  // Frontend results
  const frontendResults = results.filter(r => r.type === 'frontend');
  console.log('🌐 Frontend Domains:');
  frontendResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${result.description}: ${result.status} (${result.responseTime}ms)`);
  });

  // API results via main domain
  const mainApiResults = results.filter(r => r.type === 'api' && r.url.includes('tsconv.com/api'));
  console.log('\n🔗 API via Main Domain (tsconv.com/api/*):');
  mainApiResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const jsonStatus = result.isJson ? '📄 JSON' : '📝 HTML';
    console.log(
      `  ${status} ${result.description}: ${result.status} ${jsonStatus} (${result.responseTime}ms)`
    );
  });

  // API results via subdomain
  const subdomainApiResults = results.filter(
    r => r.type === 'api' && r.url.includes('api.tsconv.com')
  );
  console.log('\n🌐 API via Subdomain (api.tsconv.com/*):');
  subdomainApiResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const jsonStatus = result.isJson ? '📄 JSON' : '📝 HTML';
    console.log(
      `  ${status} ${result.description}: ${result.status} ${jsonStatus} (${result.responseTime}ms)`
    );
  });

  // Summary
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const apiTests = results.filter(r => r.type === 'api').length;
  const workingApiTests = results.filter(r => r.type === 'api' && r.success && r.isJson).length;

  console.log('\n📈 Summary:');
  console.log(
    `  Total Tests: ${successfulTests}/${totalTests} passed (${Math.round((successfulTests / totalTests) * 100)}%)`
  );
  console.log(`  API Tests: ${workingApiTests}/${apiTests} working correctly`);

  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
  console.log(`  Average Response Time: ${Math.round(avgResponseTime)}ms`);

  // Migration status
  console.log('\n🎯 Migration Status:');

  const frontendWorking = frontendResults.every(r => r.success);
  const mainApiWorking = mainApiResults.every(r => r.success && r.isJson);
  const subdomainApiWorking = subdomainApiResults.every(r => r.success && r.isJson);

  if (frontendWorking && mainApiWorking && subdomainApiWorking) {
    console.log('✅ MIGRATION COMPLETE - All domains and APIs working perfectly!');
  } else if (frontendWorking && mainApiWorking) {
    console.log(
      '⚠️  MIGRATION MOSTLY COMPLETE - Main domain working, subdomain needs configuration'
    );
    console.log('   Recommendation: Update API documentation to use tsconv.com/api/* endpoints');
  } else {
    console.log('❌ MIGRATION INCOMPLETE - Issues detected that need attention');
  }

  // Next steps
  if (!subdomainApiWorking && mainApiWorking) {
    console.log('\n💡 Next Steps:');
    console.log('1. Configure api.tsconv.com subdomain routing in Cloudflare Pages');
    console.log('2. OR update API documentation to use tsconv.com/api/* endpoints');
    console.log('3. Test API documentation examples with new endpoints');
  }

  return {
    totalTests,
    successfulTests,
    frontendWorking,
    mainApiWorking,
    subdomainApiWorking,
    avgResponseTime,
  };
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyMigration().catch(console.error);
}

export { verifyMigration };
