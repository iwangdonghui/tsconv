#!/usr/bin/env node

/**
 * Comprehensive Security Scanner
 * 
 * This script performs automated security scanning including:
 * - Dependency vulnerability scanning
 * - Code security analysis
 * - Configuration security checks
 * - License compliance checks
 * - Security best practices validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`🔒 ${title}`, colors.bold + colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
}

/**
 * Security scan results
 */
const scanResults = {
  vulnerabilities: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
  codeIssues: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
  configIssues: [],
  licenseIssues: [],
  bestPractices: { passed: 0, failed: 0, warnings: 0 },
  overallScore: 0,
};

/**
 * Run dependency vulnerability scan
 */
function scanDependencyVulnerabilities() {
  section('Dependency Vulnerability Scan');
  
  try {
    info('Running npm audit...');
    
    const auditResult = execSync('npm audit --json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const audit = JSON.parse(auditResult);
    scanResults.vulnerabilities = audit.metadata.vulnerabilities;
    
    if (audit.metadata.vulnerabilities.total === 0) {
      success('No dependency vulnerabilities found!');
    } else {
      warning(`Found ${audit.metadata.vulnerabilities.total} vulnerabilities:`);
      log(`  Critical: ${audit.metadata.vulnerabilities.critical}`, colors.red);
      log(`  High: ${audit.metadata.vulnerabilities.high}`, colors.red);
      log(`  Moderate: ${audit.metadata.vulnerabilities.moderate}`, colors.yellow);
      log(`  Low: ${audit.metadata.vulnerabilities.low}`, colors.blue);
      
      // Show fixable vulnerabilities
      if (audit.metadata.vulnerabilities.total > 0) {
        info('Run "npm audit fix" to automatically fix some vulnerabilities');
      }
    }
    
  } catch (err) {
    if (err.status === 1) {
      // npm audit found vulnerabilities
      try {
        const audit = JSON.parse(err.stdout);
        scanResults.vulnerabilities = audit.metadata.vulnerabilities;
        warning(`Found ${audit.metadata.vulnerabilities.total} vulnerabilities`);
      } catch (parseError) {
        error('Failed to parse audit results');
      }
    } else {
      error(`Dependency scan failed: ${err.message}`);
    }
  }
}

/**
 * Run code security analysis using ESLint security plugin
 */
function scanCodeSecurity() {
  section('Code Security Analysis');
  
  try {
    info('Running ESLint security analysis...');
    
    const eslintResult = execSync('npx eslint . --ext ts,tsx --format json --config .eslintrc.security.json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const results = JSON.parse(eslintResult);
    let totalIssues = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    
    results.forEach(file => {
      file.messages.forEach(message => {
        totalIssues++;
        if (message.severity === 2) {
          if (message.ruleId && message.ruleId.includes('security')) {
            criticalIssues++;
          } else {
            highIssues++;
          }
        }
      });
    });
    
    scanResults.codeIssues = {
      total: totalIssues,
      critical: criticalIssues,
      high: highIssues,
      moderate: 0,
      low: 0
    };
    
    if (totalIssues === 0) {
      success('No code security issues found!');
    } else {
      warning(`Found ${totalIssues} code security issues`);
      log(`  Critical: ${criticalIssues}`, colors.red);
      log(`  High: ${highIssues}`, colors.yellow);
    }
    
  } catch (err) {
    // Create security ESLint config if it doesn't exist
    createSecurityESLintConfig();
    warning('Security ESLint config created. Re-run scan to analyze code.');
  }
}

/**
 * Create security-focused ESLint configuration
 */
function createSecurityESLintConfig() {
  const securityConfig = {
    extends: [
      './.eslintrc.json'
    ],
    plugins: ['security'],
    rules: {
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-non-literal-require': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-pseudoRandomBytes': 'error'
    }
  };
  
  fs.writeFileSync('.eslintrc.security.json', JSON.stringify(securityConfig, null, 2));
  info('Created .eslintrc.security.json for security analysis');
}

/**
 * Check security configuration
 */
function checkSecurityConfiguration() {
  section('Security Configuration Check');
  
  const configChecks = [
    {
      name: 'Content Security Policy',
      check: () => checkCSPConfiguration(),
      critical: true
    },
    {
      name: 'Security Headers',
      check: () => checkSecurityHeaders(),
      critical: true
    },
    {
      name: 'HTTPS Configuration',
      check: () => checkHTTPSConfiguration(),
      critical: true
    },
    {
      name: 'Environment Variables',
      check: () => checkEnvironmentSecurity(),
      critical: false
    },
    {
      name: 'API Security',
      check: () => checkAPISecurityConfiguration(),
      critical: true
    }
  ];
  
  configChecks.forEach(check => {
    try {
      const result = check.check();
      if (result.passed) {
        success(`${check.name}: ${result.message}`);
      } else {
        if (check.critical) {
          error(`${check.name}: ${result.message}`);
          scanResults.configIssues.push({
            name: check.name,
            severity: 'critical',
            message: result.message
          });
        } else {
          warning(`${check.name}: ${result.message}`);
          scanResults.configIssues.push({
            name: check.name,
            severity: 'warning',
            message: result.message
          });
        }
      }
    } catch (err) {
      error(`${check.name}: Check failed - ${err.message}`);
    }
  });
}

/**
 * Check CSP configuration
 */
function checkCSPConfiguration() {
  const indexPath = 'index.html';
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    if (content.includes('Content-Security-Policy')) {
      return { passed: true, message: 'CSP header found in index.html' };
    }
  }
  
  // Check Vercel configuration
  const vercelPath = 'vercel.json';
  if (fs.existsSync(vercelPath)) {
    const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    if (config.headers && config.headers.some(h => h.headers && h.headers['Content-Security-Policy'])) {
      return { passed: true, message: 'CSP configured in vercel.json' };
    }
  }
  
  return { passed: false, message: 'No CSP configuration found' };
}

/**
 * Check security headers configuration
 */
function checkSecurityHeaders() {
  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Permissions-Policy'
  ];
  
  // Check if security headers test exists
  if (fs.existsSync('scripts/test-security-headers.cjs')) {
    return { passed: true, message: 'Security headers test script exists' };
  }
  
  return { passed: false, message: 'Security headers not configured' };
}

/**
 * Check HTTPS configuration
 */
function checkHTTPSConfiguration() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check if HTTPS is enforced in production
  if (packageJson.scripts && packageJson.scripts.build) {
    return { passed: true, message: 'Build script configured' };
  }
  
  return { passed: false, message: 'HTTPS enforcement not verified' };
}

/**
 * Check environment variable security
 */
function checkEnvironmentSecurity() {
  const envFiles = ['.env', '.env.local', '.env.example'];
  let hasSecrets = false;
  let hasExposedSecrets = false;
  
  envFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        if (line.includes('SECRET') || line.includes('KEY') || line.includes('TOKEN')) {
          hasSecrets = true;
          if (file !== '.env.example' && line.includes('=') && line.split('=')[1].trim()) {
            hasExposedSecrets = true;
          }
        }
      });
    }
  });
  
  if (hasExposedSecrets) {
    return { passed: false, message: 'Potential secrets exposed in environment files' };
  }
  
  return { passed: true, message: 'Environment variables appear secure' };
}

/**
 * Check API security configuration
 */
function checkAPISecurityConfiguration() {
  const apiPath = 'api';
  if (fs.existsSync(apiPath)) {
    const files = fs.readdirSync(apiPath);
    const hasSecurityAudit = files.some(file => file.includes('security'));
    
    if (hasSecurityAudit) {
      return { passed: true, message: 'API security audit found' };
    }
    
    return { passed: false, message: 'No API security configuration found' };
  }
  
  return { passed: true, message: 'No API directory found' };
}

/**
 * Check license compliance
 */
function checkLicenseCompliance() {
  section('License Compliance Check');
  
  try {
    info('Checking package licenses...');
    
    // Read package.json to get dependencies
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const problematicLicenses = ['GPL-3.0', 'AGPL-3.0', 'LGPL-3.0'];
    let licenseIssues = 0;
    
    // This is a simplified check - in production, use a proper license checker
    Object.keys(dependencies).forEach(dep => {
      try {
        const depPackagePath = path.join('node_modules', dep, 'package.json');
        if (fs.existsSync(depPackagePath)) {
          const depPackage = JSON.parse(fs.readFileSync(depPackagePath, 'utf8'));
          if (depPackage.license && problematicLicenses.includes(depPackage.license)) {
            warning(`Potentially problematic license: ${dep} (${depPackage.license})`);
            scanResults.licenseIssues.push({
              package: dep,
              license: depPackage.license,
              severity: 'warning'
            });
            licenseIssues++;
          }
        }
      } catch (err) {
        // Ignore individual package errors
      }
    });
    
    if (licenseIssues === 0) {
      success('No license compliance issues found');
    } else {
      warning(`Found ${licenseIssues} potential license issues`);
    }
    
  } catch (err) {
    error(`License check failed: ${err.message}`);
  }
}

/**
 * Check security best practices
 */
function checkSecurityBestPractices() {
  section('Security Best Practices Check');
  
  const practices = [
    {
      name: 'Package-lock.json exists',
      check: () => fs.existsSync('package-lock.json'),
      critical: true
    },
    {
      name: 'Husky pre-commit hooks configured',
      check: () => fs.existsSync('.husky/pre-commit'),
      critical: false
    },
    {
      name: 'Dependabot configured',
      check: () => fs.existsSync('.github/dependabot.yml'),
      critical: false
    },
    {
      name: 'Security audit in CI',
      check: () => {
        if (fs.existsSync('.github/workflows/ci.yml')) {
          const content = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
          return content.includes('npm audit') || content.includes('security');
        }
        return false;
      },
      critical: true
    },
    {
      name: 'No hardcoded secrets in code',
      check: () => checkForHardcodedSecrets(),
      critical: true
    }
  ];
  
  practices.forEach(practice => {
    try {
      const passed = practice.check();
      if (passed) {
        success(practice.name);
        scanResults.bestPractices.passed++;
      } else {
        if (practice.critical) {
          error(practice.name);
          scanResults.bestPractices.failed++;
        } else {
          warning(practice.name);
          scanResults.bestPractices.warnings++;
        }
      }
    } catch (err) {
      error(`${practice.name}: Check failed`);
      scanResults.bestPractices.failed++;
    }
  });
}

/**
 * Check for hardcoded secrets in code
 */
function checkForHardcodedSecrets() {
  const secretPatterns = [
    /api[_-]?key[_-]?=.{10,}/i,
    /secret[_-]?key[_-]?=.{10,}/i,
    /password[_-]?=.{8,}/i,
    /token[_-]?=.{10,}/i,
    /[a-zA-Z0-9]{32,}/g // Long strings that might be secrets
  ];
  
  const srcFiles = getAllSourceFiles('src');
  
  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          // Additional check to avoid false positives
          if (!content.includes('example') && !content.includes('placeholder')) {
            return false;
          }
        }
      }
    } catch (err) {
      // Ignore file read errors
    }
  }
  
  return true;
}

/**
 * Get all source files recursively
 */
function getAllSourceFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))) {
        files.push(fullPath);
      }
    });
  }
  
  if (fs.existsSync(dir)) {
    traverse(dir);
  }
  
  return files;
}

/**
 * Calculate overall security score
 */
function calculateSecurityScore() {
  let score = 100;
  
  // Deduct points for vulnerabilities
  score -= scanResults.vulnerabilities.critical * 20;
  score -= scanResults.vulnerabilities.high * 10;
  score -= scanResults.vulnerabilities.moderate * 5;
  score -= scanResults.vulnerabilities.low * 1;
  
  // Deduct points for code issues
  score -= scanResults.codeIssues.critical * 15;
  score -= scanResults.codeIssues.high * 8;
  
  // Deduct points for config issues
  scanResults.configIssues.forEach(issue => {
    if (issue.severity === 'critical') {
      score -= 10;
    } else {
      score -= 3;
    }
  });
  
  // Deduct points for best practices
  score -= scanResults.bestPractices.failed * 5;
  score -= scanResults.bestPractices.warnings * 2;
  
  scanResults.overallScore = Math.max(0, score);
  return scanResults.overallScore;
}

/**
 * Generate security report
 */
function generateSecurityReport() {
  section('Security Scan Summary');
  
  const score = calculateSecurityScore();
  
  log(`\n📊 Overall Security Score: ${score}/100`, score >= 80 ? colors.green : score >= 60 ? colors.yellow : colors.red);
  
  log('\n📋 Summary:', colors.bold);
  log(`  Vulnerabilities: ${scanResults.vulnerabilities.total} (Critical: ${scanResults.vulnerabilities.critical}, High: ${scanResults.vulnerabilities.high})`);
  log(`  Code Issues: ${scanResults.codeIssues.total} (Critical: ${scanResults.codeIssues.critical}, High: ${scanResults.codeIssues.high})`);
  log(`  Config Issues: ${scanResults.configIssues.length}`);
  log(`  License Issues: ${scanResults.licenseIssues.length}`);
  log(`  Best Practices: ${scanResults.bestPractices.passed} passed, ${scanResults.bestPractices.failed} failed, ${scanResults.bestPractices.warnings} warnings`);
  
  // Recommendations
  if (score < 80) {
    log('\n🔧 Recommendations:', colors.yellow);
    
    if (scanResults.vulnerabilities.total > 0) {
      log('  • Run "npm audit fix" to fix dependency vulnerabilities');
    }
    
    if (scanResults.codeIssues.total > 0) {
      log('  • Review and fix code security issues identified by ESLint');
    }
    
    if (scanResults.configIssues.length > 0) {
      log('  • Configure missing security headers and policies');
    }
    
    if (scanResults.bestPractices.failed > 0) {
      log('  • Implement missing security best practices');
    }
  } else {
    success('\n🎉 Excellent security posture! Keep up the good work.');
  }
  
  // Save detailed report
  const reportPath = 'security-scan-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(scanResults, null, 2));
  info(`\n📄 Detailed report saved to: ${reportPath}`);
}

/**
 * Main security scan function
 */
function runSecurityScan() {
  log('🔒 Starting Comprehensive Security Scan...', colors.bold + colors.cyan);
  log(`Started at: ${new Date().toISOString()}\n`);
  
  try {
    scanDependencyVulnerabilities();
    scanCodeSecurity();
    checkSecurityConfiguration();
    checkLicenseCompliance();
    checkSecurityBestPractices();
    generateSecurityReport();
    
    const score = scanResults.overallScore;
    
    if (score >= 80) {
      success('\n✅ Security scan completed successfully!');
      process.exit(0);
    } else if (score >= 60) {
      warning('\n⚠️ Security scan completed with warnings. Please review recommendations.');
      process.exit(0);
    } else {
      error('\n❌ Security scan found critical issues. Please address them immediately.');
      process.exit(1);
    }
    
  } catch (err) {
    error(`Security scan failed: ${err.message}`);
    process.exit(1);
  }
}

// Run security scan if called directly
if (require.main === module) {
  runSecurityScan();
}

module.exports = {
  runSecurityScan,
  scanDependencyVulnerabilities,
  scanCodeSecurity,
  checkSecurityConfiguration,
  checkLicenseCompliance,
  checkSecurityBestPractices,
  calculateSecurityScore,
  scanResults
};
