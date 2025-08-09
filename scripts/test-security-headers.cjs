#!/usr/bin/env node

/**
 * Comprehensive Security Headers Testing Script
 * 
 * This script performs thorough testing of all security headers including
 * advanced headers, configuration validation, and security scoring.
 */

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
// Security Headers Testing
// ============================================================================

/**
 * Comprehensive security headers test
 */
async function testAllSecurityHeaders(url) {
  logSection('Comprehensive Security Headers Test');
  
  try {
    const response = await makeRequest(url);
    const headers = response.headers;
    
    const securityHeaders = {
      // Core security headers
      'Content-Security-Policy': {
        required: true,
        description: 'Content Security Policy',
        validator: (value) => value && value.includes('default-src'),
        severity: 'critical'
      },
      'Strict-Transport-Security': {
        required: true,
        description: 'HTTP Strict Transport Security',
        validator: (value) => value && value.includes('max-age='),
        severity: 'high'
      },
      'X-Frame-Options': {
        required: true,
        description: 'Frame Options (Clickjacking protection)',
        validator: (value) => ['DENY', 'SAMEORIGIN'].includes(value?.toUpperCase()),
        severity: 'high'
      },
      'X-Content-Type-Options': {
        required: true,
        description: 'Content Type Options (MIME sniffing protection)',
        validator: (value) => value?.toLowerCase() === 'nosniff',
        severity: 'medium'
      },
      'X-XSS-Protection': {
        required: true,
        description: 'XSS Protection',
        validator: (value) => value && value.startsWith('1'),
        severity: 'medium'
      },
      'Referrer-Policy': {
        required: true,
        description: 'Referrer Policy',
        validator: (value) => value && !value.includes('unsafe-url'),
        severity: 'medium'
      },
      
      // Advanced security headers
      'Permissions-Policy': {
        required: true,
        description: 'Permissions Policy (Feature Policy)',
        validator: (value) => value && value.includes('camera=()'),
        severity: 'medium'
      },
      'Cross-Origin-Embedder-Policy': {
        required: false,
        description: 'Cross-Origin Embedder Policy',
        validator: (value) => ['require-corp', 'credentialless', 'unsafe-none'].includes(value),
        severity: 'low'
      },
      'Cross-Origin-Opener-Policy': {
        required: false,
        description: 'Cross-Origin Opener Policy',
        validator: (value) => ['same-origin', 'same-origin-allow-popups', 'unsafe-none'].includes(value),
        severity: 'low'
      },
      'Cross-Origin-Resource-Policy': {
        required: false,
        description: 'Cross-Origin Resource Policy',
        validator: (value) => ['same-site', 'same-origin', 'cross-origin'].includes(value),
        severity: 'low'
      },
      'Expect-CT': {
        required: false,
        description: 'Certificate Transparency',
        validator: (value) => value && value.includes('max-age='),
        severity: 'low'
      },
      'X-DNS-Prefetch-Control': {
        required: false,
        description: 'DNS Prefetch Control',
        validator: (value) => ['on', 'off'].includes(value),
        severity: 'info'
      },
      'X-Download-Options': {
        required: false,
        description: 'Download Options (IE)',
        validator: (value) => value === 'noopen',
        severity: 'info'
      },
      'X-Permitted-Cross-Domain-Policies': {
        required: false,
        description: 'Cross Domain Policies',
        validator: (value) => value === 'none',
        severity: 'info'
      }
    };
    
    const results = {};
    let score = 0;
    let maxScore = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;
    
    Object.entries(securityHeaders).forEach(([headerName, config]) => {
      const headerValue = headers[headerName.toLowerCase()] || headers[headerName];
      const isPresent = !!headerValue;
      const isValid = isPresent && (!config.validator || config.validator(headerValue));
      
      let headerScore = 0;
      let status = '❌';
      let statusColor = 'red';
      
      if (isValid) {
        headerScore = 100;
        status = '✅';
        statusColor = 'green';
      } else if (isPresent) {
        headerScore = 50; // Partial credit for presence
        status = '⚠️';
        statusColor = 'yellow';
      } else if (!config.required) {
        headerScore = 75; // Partial credit for optional headers
        status = '⚠️';
        statusColor = 'yellow';
      }
      
      if (config.required) {
        maxScore += 100;
        score += headerScore;
        
        if (!isValid) {
          if (config.severity === 'critical') criticalIssues++;
          else if (config.severity === 'high') highIssues++;
          else if (config.severity === 'medium') mediumIssues++;
          else if (config.severity === 'low') lowIssues++;
        }
      }
      
      log(`${status} ${config.description}: ${headerValue || 'Missing'}`, statusColor);
      
      results[headerName] = {
        present: isPresent,
        valid: isValid,
        value: headerValue,
        score: headerScore,
        severity: config.severity
      };
    });
    
    const overallScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const grade = calculateGrade(overallScore);
    
    log(`\n📊 Security Headers Summary:`, 'blue');
    log(`   Overall Score: ${overallScore}/100 (Grade: ${grade})`, overallScore >= 80 ? 'green' : 'yellow');
    log(`   Critical Issues: ${criticalIssues}`, criticalIssues > 0 ? 'red' : 'green');
    log(`   High Issues: ${highIssues}`, highIssues > 0 ? 'red' : 'green');
    log(`   Medium Issues: ${mediumIssues}`, mediumIssues > 0 ? 'yellow' : 'green');
    log(`   Low Issues: ${lowIssues}`, lowIssues > 0 ? 'yellow' : 'green');
    
    return {
      passed: overallScore >= 80 && criticalIssues === 0,
      details: {
        score: overallScore,
        grade,
        results,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues
      }
    };
    
  } catch (error) {
    log(`❌ Security headers test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

/**
 * Tests CSP policy for security issues
 */
async function testCSPPolicy(url) {
  logSection('CSP Policy Security Analysis');
  
  try {
    const response = await makeRequest(url);
    const cspHeader = response.headers['content-security-policy'];
    
    if (!cspHeader) {
      log('❌ No CSP header found', 'red');
      return { passed: false, details: 'CSP header missing' };
    }
    
    log(`📋 CSP Policy: ${cspHeader.substring(0, 100)}...`, 'blue');
    
    const issues = [];
    const warnings = [];
    
    // Check for unsafe directives
    if (cspHeader.includes("'unsafe-inline'")) {
      issues.push("Contains 'unsafe-inline' directive");
    }
    
    if (cspHeader.includes("'unsafe-eval'")) {
      issues.push("Contains 'unsafe-eval' directive");
    }
    
    if (cspHeader.includes('*') && !cspHeader.includes('*.')) {
      warnings.push("Contains wildcard (*) source");
    }
    
    // Check for missing important directives
    const importantDirectives = ['default-src', 'script-src', 'object-src', 'base-uri'];
    importantDirectives.forEach(directive => {
      if (!cspHeader.includes(directive)) {
        warnings.push(`Missing '${directive}' directive`);
      }
    });
    
    // Check for good practices
    if (cspHeader.includes("'strict-dynamic'")) {
      log("✅ Uses 'strict-dynamic' for enhanced security", 'green');
    }
    
    if (cspHeader.includes("'nonce-")) {
      log("✅ Uses nonces for inline scripts", 'green');
    }
    
    if (cspHeader.includes("object-src 'none'")) {
      log("✅ Blocks object sources", 'green');
    }
    
    if (cspHeader.includes("base-uri 'self'")) {
      log("✅ Restricts base URI", 'green');
    }
    
    // Report issues
    if (issues.length > 0) {
      log('❌ Security Issues:', 'red');
      issues.forEach(issue => log(`   ${issue}`, 'red'));
    }
    
    if (warnings.length > 0) {
      log('⚠️ Warnings:', 'yellow');
      warnings.forEach(warning => log(`   ${warning}`, 'yellow'));
    }
    
    if (issues.length === 0 && warnings.length === 0) {
      log('✅ CSP policy looks secure', 'green');
    }
    
    return {
      passed: issues.length === 0,
      details: {
        policy: cspHeader,
        issues,
        warnings,
        score: Math.max(0, 100 - (issues.length * 30) - (warnings.length * 10))
      }
    };
    
  } catch (error) {
    log(`❌ CSP policy test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

/**
 * Tests HSTS configuration
 */
async function testHSTSConfiguration(url) {
  logSection('HSTS Configuration Test');
  
  try {
    const response = await makeRequest(url);
    const hstsHeader = response.headers['strict-transport-security'];
    
    if (!hstsHeader) {
      log('❌ No HSTS header found', 'red');
      return { passed: false, details: 'HSTS header missing' };
    }
    
    log(`🔒 HSTS Header: ${hstsHeader}`, 'blue');
    
    const issues = [];
    const recommendations = [];
    
    // Check max-age
    const maxAgeMatch = hstsHeader.match(/max-age=(\d+)/);
    if (maxAgeMatch) {
      const maxAge = parseInt(maxAgeMatch[1]);
      if (maxAge < 31536000) { // Less than 1 year
        issues.push(`max-age is too short: ${maxAge} seconds (recommend at least 31536000)`);
      } else {
        log(`✅ Good max-age: ${maxAge} seconds`, 'green');
      }
    } else {
      issues.push('Missing max-age directive');
    }
    
    // Check includeSubDomains
    if (hstsHeader.includes('includeSubDomains')) {
      log('✅ Includes subdomains', 'green');
    } else {
      recommendations.push('Consider adding includeSubDomains directive');
    }
    
    // Check preload
    if (hstsHeader.includes('preload')) {
      log('✅ Preload enabled', 'green');
    } else {
      recommendations.push('Consider adding preload directive');
    }
    
    if (issues.length > 0) {
      log('❌ HSTS Issues:', 'red');
      issues.forEach(issue => log(`   ${issue}`, 'red'));
    }
    
    if (recommendations.length > 0) {
      log('💡 HSTS Recommendations:', 'yellow');
      recommendations.forEach(rec => log(`   ${rec}`, 'yellow'));
    }
    
    return {
      passed: issues.length === 0,
      details: {
        header: hstsHeader,
        issues,
        recommendations,
        score: Math.max(0, 100 - (issues.length * 25))
      }
    };
    
  } catch (error) {
    log(`❌ HSTS test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

/**
 * Tests security audit API endpoint
 */
async function testSecurityAuditAPI(baseUrl) {
  logSection('Security Audit API Test');
  
  try {
    const auditUrl = `${baseUrl}/api/security-audit`;
    const response = await makeRequest(auditUrl);
    
    if (response.statusCode === 200) {
      log('✅ Security audit API is accessible', 'green');
      
      try {
        const data = JSON.parse(response.body);
        if (data.success && data.data.audit) {
          const audit = data.data.audit;
          log(`📊 API Audit Score: ${audit.overallScore}/100 (${audit.grade})`, 'blue');
          log(`🔍 Critical Issues: ${audit.criticalIssues}`, audit.criticalIssues > 0 ? 'red' : 'green');
          
          return { passed: true, details: audit };
        } else {
          log('⚠️ Unexpected API response format', 'yellow');
          return { passed: false, details: 'Invalid response format' };
        }
      } catch (parseError) {
        log('⚠️ Failed to parse API response', 'yellow');
        return { passed: false, details: 'JSON parse error' };
      }
    } else {
      log(`❌ Security audit API returned status ${response.statusCode}`, 'red');
      return { passed: false, details: `HTTP ${response.statusCode}` };
    }
    
  } catch (error) {
    log(`❌ Security audit API test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function calculateGrade(score) {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ============================================================================
// Main Test Function
// ============================================================================

async function main() {
  log(`${colors.bold}🔒 Comprehensive Security Headers Testing Suite${colors.reset}`, 'magenta');
  log('Testing all security headers, policies, and configurations...\n');
  
  // Determine test URL
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
  const testEndpoint = `${baseUrl}/api/health`;
  
  log(`🎯 Testing endpoint: ${testEndpoint}`, 'blue');
  
  const tests = [
    { name: 'All Security Headers', fn: () => testAllSecurityHeaders(testEndpoint) },
    { name: 'CSP Policy Security', fn: () => testCSPPolicy(testEndpoint) },
    { name: 'HSTS Configuration', fn: () => testHSTSConfiguration(testEndpoint) },
    { name: 'Security Audit API', fn: () => testSecurityAuditAPI(baseUrl) }
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
      log(`❌ ${result.name}`, 'red');
    }
  });
  
  const totalTests = results.length;
  const successRate = Math.round((passedCount / totalTests) * 100);
  
  log(`\n📊 Overall Results: ${passedCount}/${totalTests} tests passed (${successRate}%)`, 
      passedCount === totalTests ? 'green' : 'yellow');
  
  if (passedCount === totalTests) {
    log('\n🎉 All security header tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️ Some tests failed. Please review the security configuration.', 'yellow');
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
  testAllSecurityHeaders, 
  testCSPPolicy, 
  testHSTSConfiguration, 
  testSecurityAuditAPI 
};
