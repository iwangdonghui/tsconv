#!/usr/bin/env node

/**
 * CSP Headers Testing Script
 * 
 * This script tests the Content Security Policy headers and other security headers
 * to ensure they are properly configured and working as expected.
 */

const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

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
      headers: options.headers || {},
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
      req.write(options.body);
    }
    
    req.end();
  });
}

// ============================================================================
// CSP Testing Functions
// ============================================================================

/**
 * Tests CSP header presence and basic structure
 */
async function testCSPHeader(url) {
  logSection('CSP Header Test');
  
  try {
    const response = await makeRequest(url);
    const cspHeader = response.headers['content-security-policy'] || 
                     response.headers['content-security-policy-report-only'];
    
    if (!cspHeader) {
      log('❌ No CSP header found', 'red');
      return { passed: false, details: 'CSP header missing' };
    }
    
    log('✅ CSP header found', 'green');
    log(`📋 CSP Policy: ${cspHeader.substring(0, 100)}...`, 'blue');
    
    // Parse CSP directives
    const directives = cspHeader.split(';').map(d => d.trim()).filter(d => d);
    const directiveMap = {};
    
    directives.forEach(directive => {
      const [name, ...values] = directive.split(' ');
      directiveMap[name] = values;
    });
    
    // Check for important directives
    const importantDirectives = [
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'connect-src',
      'frame-ancestors'
    ];
    
    const missingDirectives = importantDirectives.filter(d => !directiveMap[d]);
    const presentDirectives = importantDirectives.filter(d => directiveMap[d]);
    
    log(`✅ Present directives (${presentDirectives.length}): ${presentDirectives.join(', ')}`, 'green');
    
    if (missingDirectives.length > 0) {
      log(`⚠️ Missing directives (${missingDirectives.length}): ${missingDirectives.join(', ')}`, 'yellow');
    }
    
    // Check for unsafe directives
    const unsafePatterns = ['unsafe-inline', 'unsafe-eval', '*'];
    const unsafeDirectives = [];
    
    Object.entries(directiveMap).forEach(([directive, values]) => {
      const unsafeValues = values.filter(v => unsafePatterns.some(pattern => v.includes(pattern)));
      if (unsafeValues.length > 0) {
        unsafeDirectives.push(`${directive}: ${unsafeValues.join(', ')}`);
      }
    });
    
    if (unsafeDirectives.length > 0) {
      log(`⚠️ Potentially unsafe directives found:`, 'yellow');
      unsafeDirectives.forEach(directive => log(`   ${directive}`, 'yellow'));
    } else {
      log('✅ No unsafe directives detected', 'green');
    }
    
    return {
      passed: true,
      details: {
        policy: cspHeader,
        directives: directiveMap,
        presentDirectives,
        missingDirectives,
        unsafeDirectives
      }
    };
    
  } catch (error) {
    log(`❌ CSP test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

/**
 * Tests other security headers
 */
async function testSecurityHeaders(url) {
  logSection('Security Headers Test');
  
  try {
    const response = await makeRequest(url);
    const headers = response.headers;
    
    const securityHeaders = {
      'Content-Security-Policy': {
        required: true,
        description: 'Content Security Policy'
      },
      'Strict-Transport-Security': {
        required: false, // Only for HTTPS
        description: 'HTTP Strict Transport Security'
      },
      'X-Frame-Options': {
        required: true,
        description: 'Frame Options (Clickjacking protection)'
      },
      'X-Content-Type-Options': {
        required: true,
        description: 'Content Type Options (MIME sniffing protection)'
      },
      'X-XSS-Protection': {
        required: true,
        description: 'XSS Protection'
      },
      'Referrer-Policy': {
        required: true,
        description: 'Referrer Policy'
      },
      'Permissions-Policy': {
        required: true,
        description: 'Permissions Policy (Feature Policy)'
      },
      'Cross-Origin-Embedder-Policy': {
        required: false,
        description: 'Cross-Origin Embedder Policy'
      },
      'Cross-Origin-Opener-Policy': {
        required: false,
        description: 'Cross-Origin Opener Policy'
      },
      'Cross-Origin-Resource-Policy': {
        required: false,
        description: 'Cross-Origin Resource Policy'
      }
    };
    
    const results = {};
    let passedCount = 0;
    let totalRequired = 0;
    
    Object.entries(securityHeaders).forEach(([headerName, config]) => {
      const headerValue = headers[headerName.toLowerCase()] || headers[headerName];
      const isPresent = !!headerValue;
      
      if (config.required) {
        totalRequired++;
      }
      
      if (isPresent) {
        log(`✅ ${config.description}: ${headerValue}`, 'green');
        if (config.required) passedCount++;
        results[headerName] = { present: true, value: headerValue };
      } else {
        const severity = config.required ? 'red' : 'yellow';
        const icon = config.required ? '❌' : '⚠️';
        log(`${icon} ${config.description}: Missing`, severity);
        results[headerName] = { present: false, value: null };
      }
    });
    
    log(`\n📊 Security Headers Summary: ${passedCount}/${totalRequired} required headers present`, 
        passedCount === totalRequired ? 'green' : 'yellow');
    
    return {
      passed: passedCount === totalRequired,
      details: {
        results,
        passedCount,
        totalRequired,
        score: Math.round((passedCount / totalRequired) * 100)
      }
    };
    
  } catch (error) {
    log(`❌ Security headers test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

/**
 * Tests CSP violation reporting
 */
async function testCSPReporting(baseUrl) {
  logSection('CSP Violation Reporting Test');
  
  try {
    const reportUrl = `${baseUrl}/api/csp-report`;
    
    // Test with a sample CSP violation report
    const sampleReport = {
      'csp-report': {
        'document-uri': 'https://example.com/test',
        'referrer': '',
        'violated-directive': 'script-src',
        'effective-directive': 'script-src',
        'original-policy': "default-src 'self'; script-src 'self'",
        'disposition': 'enforce',
        'blocked-uri': 'https://evil.com/script.js',
        'line-number': 1,
        'column-number': 1,
        'source-file': 'https://example.com/test',
        'status-code': 200,
        'script-sample': ''
      }
    };
    
    const response = await makeRequest(reportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sampleReport)
    });
    
    if (response.statusCode === 200) {
      log('✅ CSP violation reporting endpoint is working', 'green');
      
      try {
        const responseData = JSON.parse(response.body);
        if (responseData.success) {
          log(`✅ Violation processed successfully: ${responseData.data?.violationId || 'N/A'}`, 'green');
        } else {
          log(`⚠️ Violation processed but with errors: ${responseData.error}`, 'yellow');
        }
      } catch (parseError) {
        log('⚠️ Response body is not valid JSON', 'yellow');
      }
      
      return { passed: true, details: 'CSP reporting endpoint functional' };
    } else {
      log(`❌ CSP reporting endpoint returned status ${response.statusCode}`, 'red');
      return { passed: false, details: `HTTP ${response.statusCode}` };
    }
    
  } catch (error) {
    log(`❌ CSP reporting test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

/**
 * Tests nonce generation and usage
 */
async function testCSPNonces(url) {
  logSection('CSP Nonce Test');
  
  try {
    const response = await makeRequest(url);
    const nonceHeader = response.headers['x-csp-nonce'];
    const cspHeader = response.headers['content-security-policy'];
    
    if (!nonceHeader) {
      log('⚠️ No CSP nonce header found', 'yellow');
      return { passed: false, details: 'Nonce header missing' };
    }
    
    log(`✅ CSP nonce found: ${nonceHeader}`, 'green');
    
    if (cspHeader && cspHeader.includes(`'nonce-${nonceHeader}'`)) {
      log('✅ Nonce is properly included in CSP policy', 'green');
      return { passed: true, details: 'Nonce system working correctly' };
    } else {
      log('⚠️ Nonce not found in CSP policy', 'yellow');
      return { passed: false, details: 'Nonce not in CSP policy' };
    }
    
  } catch (error) {
    log(`❌ CSP nonce test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

// ============================================================================
// Main Test Function
// ============================================================================

async function main() {
  log(`${colors.bold}🔒 CSP Headers Testing Suite${colors.reset}`, 'magenta');
  log('Testing Content Security Policy and security headers configuration...\n');
  
  // Determine test URL
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
  const testEndpoint = `${baseUrl}/api/health`;
  
  log(`🎯 Testing endpoint: ${testEndpoint}`, 'blue');
  
  const tests = [
    { name: 'CSP Header Configuration', fn: () => testCSPHeader(testEndpoint) },
    { name: 'Security Headers', fn: () => testSecurityHeaders(testEndpoint) },
    { name: 'CSP Nonce System', fn: () => testCSPNonces(testEndpoint) },
    { name: 'CSP Violation Reporting', fn: () => testCSPReporting(baseUrl) }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, ...result });
    } catch (error) {
      log(`❌ Test "${test.name}" failed with error: ${error.message}`, 'red');
      results.push({ name: test.name, passed: false, details: error.message });
    }
  }
  
  // Summary
  logSection('Test Results Summary');
  
  let passedCount = 0;
  results.forEach(result => {
    if (result.passed) {
      log(`✅ ${result.name}`, 'green');
      passedCount++;
    } else {
      log(`❌ ${result.name}: ${result.details}`, 'red');
    }
  });
  
  const totalTests = results.length;
  const successRate = Math.round((passedCount / totalTests) * 100);
  
  log(`\n📊 Overall Results: ${passedCount}/${totalTests} tests passed (${successRate}%)`, 
      passedCount === totalTests ? 'green' : 'yellow');
  
  if (passedCount === totalTests) {
    log('\n🎉 All CSP and security header tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️ Some tests failed. Please review the configuration.', 'yellow');
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
  testCSPHeader, 
  testSecurityHeaders, 
  testCSPReporting, 
  testCSPNonces 
};
