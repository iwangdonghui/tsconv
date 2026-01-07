#!/usr/bin/env node

/**
 * Migration Testing Script
 * Tests API endpoints on both Vercel and Cloudflare to ensure compatibility
 */

const https = require('https');
const http = require('http');

// Configuration
const VERCEL_URL = process.env.VERCEL_URL || 'https://your-vercel-domain.com';
const CLOUDFLARE_URL = process.env.CLOUDFLARE_URL || 'https://your-project.pages.dev';

// Test endpoints
const TEST_ENDPOINTS = [
  {
    path: '/api/health',
    method: 'GET',
    description: 'Health check',
  },
  {
    path: '/api/now',
    method: 'GET',
    description: 'Current timestamp',
  },
  {
    path: '/api/convert?timestamp=1640995200',
    method: 'GET',
    description: 'Convert timestamp (GET)',
  },
  {
    path: '/api/v1/health',
    method: 'GET',
    description: 'V1 Health check',
  },
  {
    path: '/api/v1/formats',
    method: 'GET',
    description: 'Available formats',
  },
];

const POST_TESTS = [
  {
    path: '/api/convert',
    method: 'POST',
    body: { timestamp: 1640995200, outputFormats: ['iso', 'utc'] },
    description: 'Convert timestamp (POST)',
  },
  {
    path: '/api/v1/convert',
    method: 'POST',
    body: { timestamp: 1640995200, includeMetadata: true },
    description: 'V1 Convert with metadata',
  },
  {
    path: '/api/v1/batch',
    method: 'POST',
    body: { timestamps: [1640995200, 1641081600] },
    description: 'Batch conversion',
  },
];

// Utility function to make HTTP requests
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
        'User-Agent': 'Migration-Test-Script/1.0',
        ...options.headers,
      },
    };

    const req = client.request(requestOptions, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            responseTime: Date.now() - startTime,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data,
            responseTime: Date.now() - startTime,
          });
        }
      });
    });

    req.on('error', reject);

    const startTime = Date.now();

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test a single endpoint
async function testEndpoint(baseUrl, endpoint) {
  const url = baseUrl + endpoint.path;
  const options = {
    method: endpoint.method,
    body: endpoint.body,
  };

  try {
    const result = await makeRequest(url, options);
    return {
      success: result.status >= 200 && result.status < 300,
      status: result.status,
      responseTime: result.responseTime,
      data: result.data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      responseTime: 0,
      data: null,
      error: error.message,
    };
  }
}

// Compare results between Vercel and Cloudflare
function compareResults(vercelResult, cloudflareResult, endpoint) {
  const comparison = {
    endpoint: endpoint.description,
    path: endpoint.path,
    method: endpoint.method,
    vercel: {
      success: vercelResult.success,
      status: vercelResult.status,
      responseTime: vercelResult.responseTime,
      error: vercelResult.error,
    },
    cloudflare: {
      success: cloudflareResult.success,
      status: cloudflareResult.status,
      responseTime: cloudflareResult.responseTime,
      error: cloudflareResult.error,
    },
    compatible: vercelResult.success === cloudflareResult.success,
    fasterPlatform:
      vercelResult.responseTime < cloudflareResult.responseTime ? 'vercel' : 'cloudflare',
  };

  // Check data compatibility (basic check)
  if (vercelResult.data && cloudflareResult.data) {
    try {
      const vercelKeys = Object.keys(vercelResult.data);
      const cloudflareKeys = Object.keys(cloudflareResult.data);
      comparison.dataCompatible = vercelKeys.length === cloudflareKeys.length;
    } catch (e) {
      comparison.dataCompatible = false;
    }
  }

  return comparison;
}

// Main testing function
async function runMigrationTests() {
  console.log('🧪 Starting Migration Compatibility Tests\n');
  console.log(`Vercel URL: ${VERCEL_URL}`);
  console.log(`Cloudflare URL: ${CLOUDFLARE_URL}\n`);

  const allEndpoints = [...TEST_ENDPOINTS, ...POST_TESTS];
  const results = [];

  for (const endpoint of allEndpoints) {
    console.log(`Testing: ${endpoint.description} (${endpoint.method} ${endpoint.path})`);

    const [vercelResult, cloudflareResult] = await Promise.all([
      testEndpoint(VERCEL_URL, endpoint),
      testEndpoint(CLOUDFLARE_URL, endpoint),
    ]);

    const comparison = compareResults(vercelResult, cloudflareResult, endpoint);
    results.push(comparison);

    // Print immediate results
    const vercelStatus = vercelResult.success ? '✅' : '❌';
    const cloudflareStatus = cloudflareResult.success ? '✅' : '❌';
    const compatible = comparison.compatible ? '✅' : '❌';

    console.log(
      `  Vercel: ${vercelStatus} ${vercelResult.status} (${vercelResult.responseTime}ms)`
    );
    console.log(
      `  Cloudflare: ${cloudflareStatus} ${cloudflareResult.status} (${cloudflareResult.responseTime}ms)`
    );
    console.log(`  Compatible: ${compatible}\n`);
  }

  // Summary
  console.log('📊 Migration Test Summary\n');

  const totalTests = results.length;
  const compatibleTests = results.filter(r => r.compatible).length;
  const vercelSuccesses = results.filter(r => r.vercel.success).length;
  const cloudflareSuccesses = results.filter(r => r.cloudflare.success).length;

  console.log(`Total Tests: ${totalTests}`);
  console.log(
    `Compatible: ${compatibleTests}/${totalTests} (${Math.round((compatibleTests / totalTests) * 100)}%)`
  );
  console.log(
    `Vercel Success Rate: ${vercelSuccesses}/${totalTests} (${Math.round((vercelSuccesses / totalTests) * 100)}%)`
  );
  console.log(
    `Cloudflare Success Rate: ${cloudflareSuccesses}/${totalTests} (${Math.round((cloudflareSuccesses / totalTests) * 100)}%)`
  );

  // Performance comparison
  const avgVercelTime = results.reduce((sum, r) => sum + r.vercel.responseTime, 0) / totalTests;
  const avgCloudflareTime =
    results.reduce((sum, r) => sum + r.cloudflare.responseTime, 0) / totalTests;

  console.log(`\n⚡ Performance Comparison:`);
  console.log(`Average Vercel Response Time: ${Math.round(avgVercelTime)}ms`);
  console.log(`Average Cloudflare Response Time: ${Math.round(avgCloudflareTime)}ms`);
  console.log(
    `Faster Platform: ${avgVercelTime < avgCloudflareTime ? 'Vercel' : 'Cloudflare'} (${Math.round(Math.abs(avgVercelTime - avgCloudflareTime))}ms difference)`
  );

  // Migration readiness
  console.log(`\n🚀 Migration Readiness:`);
  if (compatibleTests === totalTests && cloudflareSuccesses === totalTests) {
    console.log('✅ READY FOR MIGRATION - All tests passed and compatible');
  } else if (cloudflareSuccesses >= totalTests * 0.8) {
    console.log('⚠️  MOSTLY READY - Some issues detected, review before migration');
  } else {
    console.log('❌ NOT READY - Significant issues detected, fix before migration');
  }

  // Failed tests details
  const failedTests = results.filter(r => !r.compatible || !r.cloudflare.success);
  if (failedTests.length > 0) {
    console.log(`\n❌ Issues Found:`);
    failedTests.forEach(test => {
      console.log(
        `  - ${test.endpoint}: ${test.cloudflare.error || `Status ${test.cloudflare.status}`}`
      );
    });
  }

  return {
    totalTests,
    compatibleTests,
    vercelSuccesses,
    cloudflareSuccesses,
    avgVercelTime,
    avgCloudflareTime,
    ready: compatibleTests === totalTests && cloudflareSuccesses === totalTests,
  };
}

// Run tests if called directly
if (require.main === module) {
  runMigrationTests().catch(console.error);
}

module.exports = { runMigrationTests };
