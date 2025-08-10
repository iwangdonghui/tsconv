#!/usr/bin/env node

/**
 * Security Configuration Checker
 *
 * This script validates security configurations across the project:
 * - Content Security Policy (CSP)
 * - Security Headers
 * - HTTPS Configuration
 * - API Security Settings
 * - Environment Variable Security
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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
  log(`\n${'='.repeat(50)}`, colors.cyan);
  log(`🔒 ${title}`, colors.bold + colors.cyan);
  log(`${'='.repeat(50)}`, colors.cyan);
}

/**
 * Security configuration results
 */
const configResults = {
  csp: { configured: false, issues: [] },
  headers: { configured: false, missing: [] },
  https: { enforced: false, issues: [] },
  api: { secured: false, issues: [] },
  environment: { secure: true, issues: [] },
  score: 0,
};

/**
 * Check Content Security Policy configuration
 */
function checkCSPConfiguration() {
  section('Content Security Policy (CSP) Check');

  const cspSources = [
    { file: 'index.html', type: 'meta tag' },
    { file: 'vercel.json', type: 'vercel config' },
    { file: 'public/_headers', type: 'netlify headers' },
    { file: 'api/middleware/security.ts', type: 'api middleware' },
  ];

  let cspFound = false;
  let cspConfig = null;

  cspSources.forEach(source => {
    if (fs.existsSync(source.file)) {
      const content = fs.readFileSync(source.file, 'utf8');

      if (content.includes('Content-Security-Policy')) {
        cspFound = true;
        success(`CSP found in ${source.file} (${source.type})`);

        // Extract CSP content for analysis
        if (source.file === 'index.html') {
          const cspMatch = content.match(/content="([^"]*Content-Security-Policy[^"]*)"/);
          if (cspMatch) {
            cspConfig = cspMatch[1];
          }
        } else if (source.file === 'vercel.json') {
          try {
            const config = JSON.parse(content);
            if (config.headers) {
              config.headers.forEach(header => {
                if (header.headers && header.headers['Content-Security-Policy']) {
                  cspConfig = header.headers['Content-Security-Policy'];
                }
              });
            }
          } catch (err) {
            warning(`Failed to parse ${source.file}`);
          }
        }
      }
    }
  });

  if (!cspFound) {
    error('No CSP configuration found');
    configResults.csp.issues.push('CSP not configured');
  } else {
    configResults.csp.configured = true;

    // Analyze CSP configuration
    if (cspConfig) {
      analyzeCSpolicy(cspConfig);
    }
  }
}

/**
 * Analyze CSP policy for security issues
 */
function analyzeCSpolicy(cspPolicy) {
  info('Analyzing CSP policy...');

  const unsafeDirectives = [
    { pattern: /unsafe-inline/g, issue: 'unsafe-inline allows inline scripts/styles' },
    { pattern: /unsafe-eval/g, issue: 'unsafe-eval allows eval() and similar functions' },
    { pattern: /\*/g, issue: 'Wildcard (*) allows any source' },
    { pattern: /data:/g, issue: 'data: URIs can be used for XSS attacks' },
  ];

  const requiredDirectives = [
    { name: 'default-src', required: true },
    { name: 'script-src', required: true },
    { name: 'style-src', required: true },
    { name: 'img-src', required: false },
    { name: 'connect-src', required: false },
    { name: 'font-src', required: false },
    { name: 'object-src', required: false },
    { name: 'media-src', required: false },
    { name: 'frame-src', required: false },
  ];

  // Check for unsafe directives
  unsafeDirectives.forEach(directive => {
    if (directive.pattern.test(cspPolicy)) {
      warning(`CSP Issue: ${directive.issue}`);
      configResults.csp.issues.push(directive.issue);
    }
  });

  // Check for required directives
  requiredDirectives.forEach(directive => {
    if (directive.required && !cspPolicy.includes(directive.name)) {
      warning(`Missing required CSP directive: ${directive.name}`);
      configResults.csp.issues.push(`Missing ${directive.name} directive`);
    }
  });

  if (configResults.csp.issues.length === 0) {
    success('CSP policy looks secure');
  }
}

/**
 * Check security headers configuration
 */
function checkSecurityHeaders() {
  section('Security Headers Check');

  const requiredHeaders = [
    {
      name: 'X-Frame-Options',
      description: 'Prevents clickjacking attacks',
      values: ['DENY', 'SAMEORIGIN'],
      critical: true,
    },
    {
      name: 'X-Content-Type-Options',
      description: 'Prevents MIME type sniffing',
      values: ['nosniff'],
      critical: true,
    },
    {
      name: 'X-XSS-Protection',
      description: 'Enables XSS filtering',
      values: ['1; mode=block'],
      critical: true,
    },
    {
      name: 'Referrer-Policy',
      description: 'Controls referrer information',
      values: ['strict-origin-when-cross-origin', 'no-referrer'],
      critical: false,
    },
    {
      name: 'Permissions-Policy',
      description: 'Controls browser features',
      values: ['geolocation=(), microphone=(), camera=()'],
      critical: false,
    },
    {
      name: 'Strict-Transport-Security',
      description: 'Enforces HTTPS',
      values: ['max-age=31536000; includeSubDomains'],
      critical: true,
    },
  ];

  const headerSources = [
    'vercel.json',
    'public/_headers',
    'api/middleware/security.ts',
    'scripts/test-security-headers.cjs',
  ];

  let headersConfigured = false;
  const configuredHeaders = new Set();

  headerSources.forEach(source => {
    if (fs.existsSync(source)) {
      const content = fs.readFileSync(source, 'utf8');

      requiredHeaders.forEach(header => {
        if (content.includes(header.name)) {
          configuredHeaders.add(header.name);
          headersConfigured = true;
        }
      });
    }
  });

  if (headersConfigured) {
    success(`Security headers configuration found`);
    configResults.headers.configured = true;

    // Check which headers are missing
    requiredHeaders.forEach(header => {
      if (!configuredHeaders.has(header.name)) {
        const severity = header.critical ? 'error' : 'warning';
        const message = `Missing ${header.name}: ${header.description}`;

        if (header.critical) {
          error(message);
        } else {
          warning(message);
        }

        configResults.headers.missing.push({
          name: header.name,
          description: header.description,
          critical: header.critical,
        });
      } else {
        success(`${header.name} configured`);
      }
    });
  } else {
    error('No security headers configuration found');
    configResults.headers.missing = requiredHeaders;
  }
}

/**
 * Check HTTPS configuration
 */
function checkHTTPSConfiguration() {
  section('HTTPS Configuration Check');

  const httpsChecks = [
    {
      name: 'Vercel HTTPS redirect',
      check: () => {
        if (fs.existsSync('vercel.json')) {
          const content = fs.readFileSync('vercel.json', 'utf8');
          try {
            const config = JSON.parse(content);
            return (
              config.redirects &&
              config.redirects.some(
                r => r.source === 'http://*' || r.destination?.includes('https://')
              )
            );
          } catch (err) {
            return false;
          }
        }
        return false;
      },
    },
    {
      name: 'HSTS header configured',
      check: () => {
        const sources = ['vercel.json', 'public/_headers', 'api/middleware/security.ts'];
        return sources.some(source => {
          if (fs.existsSync(source)) {
            const content = fs.readFileSync(source, 'utf8');
            return content.includes('Strict-Transport-Security');
          }
          return false;
        });
      },
    },
    {
      name: 'No mixed content',
      check: () => {
        const srcFiles = getAllSourceFiles('src');
        return !srcFiles.some(file => {
          const content = fs.readFileSync(file, 'utf8');
          return content.includes('http://') && !content.includes('localhost');
        });
      },
    },
  ];

  let httpsScore = 0;

  httpsChecks.forEach(check => {
    if (check.check()) {
      success(check.name);
      httpsScore++;
    } else {
      warning(`${check.name} not configured`);
      configResults.https.issues.push(check.name);
    }
  });

  configResults.https.enforced = httpsScore === httpsChecks.length;

  if (configResults.https.enforced) {
    success('HTTPS properly configured');
  } else {
    warning('HTTPS configuration incomplete');
  }
}

/**
 * Check API security configuration
 */
function checkAPISecurityConfiguration() {
  section('API Security Configuration Check');

  const apiPath = 'api';
  if (!fs.existsSync(apiPath)) {
    info('No API directory found, skipping API security check');
    configResults.api.secured = true;
    return;
  }

  const securityChecks = [
    {
      name: 'Rate limiting configured',
      check: () => checkForPattern(apiPath, /rate.?limit|throttle/i),
    },
    {
      name: 'Input validation present',
      check: () => checkForPattern(apiPath, /validate|sanitize|escape/i),
    },
    {
      name: 'Authentication middleware',
      check: () => checkForPattern(apiPath, /auth|jwt|token/i),
    },
    {
      name: 'CORS configuration',
      check: () => checkForPattern(apiPath, /cors|origin/i),
    },
    {
      name: 'Security headers in API',
      check: () => checkForPattern(apiPath, /X-Frame-Options|X-Content-Type-Options/i),
    },
    {
      name: 'Error handling (no info leakage)',
      check: () => {
        const files = getAllSourceFiles(apiPath);
        return files.some(file => {
          const content = fs.readFileSync(file, 'utf8');
          return (
            content.includes('try') &&
            content.includes('catch') &&
            !content.includes('console.log(error)')
          );
        });
      },
    },
  ];

  let apiScore = 0;

  securityChecks.forEach(check => {
    if (check.check()) {
      success(check.name);
      apiScore++;
    } else {
      warning(`${check.name} not found`);
      configResults.api.issues.push(check.name);
    }
  });

  configResults.api.secured = apiScore >= securityChecks.length * 0.7; // 70% threshold

  if (configResults.api.secured) {
    success('API security configuration looks good');
  } else {
    warning('API security configuration needs improvement');
  }
}

/**
 * Check for pattern in directory
 */
function checkForPattern(dir, pattern) {
  const files = getAllSourceFiles(dir);
  return files.some(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      return pattern.test(content);
    } catch (err) {
      return false;
    }
  });
}

/**
 * Check environment variable security
 */
function checkEnvironmentSecurity() {
  section('Environment Variable Security Check');

  const envFiles = ['.env', '.env.local', '.env.example', '.env.production'];
  const issues = [];

  envFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Check for potential secrets in non-example files
        if (file !== '.env.example') {
          if (line.includes('=') && !line.startsWith('#')) {
            const [key, value] = line.split('=');

            // Check for exposed secrets
            if (
              value &&
              value.trim() &&
              (key.includes('SECRET') || key.includes('KEY') || key.includes('TOKEN')) &&
              !value.includes('your-') &&
              !value.includes('placeholder')
            ) {
              issues.push(`Potential secret exposed in ${file}:${lineNum}`);
            }

            // Check for hardcoded URLs with credentials
            if (value.includes('://') && value.includes('@')) {
              issues.push(`Potential credentials in URL in ${file}:${lineNum}`);
            }
          }
        }

        // Check for common security issues
        if (line.includes('NODE_TLS_REJECT_UNAUTHORIZED=0')) {
          issues.push(`Insecure TLS configuration in ${file}:${lineNum}`);
        }

        if (line.includes('DEBUG=true') && file.includes('production')) {
          issues.push(`Debug mode enabled in production in ${file}:${lineNum}`);
        }
      });
    }
  });

  configResults.environment.issues = issues;
  configResults.environment.secure = issues.length === 0;

  if (configResults.environment.secure) {
    success('Environment variables appear secure');
  } else {
    issues.forEach(issue => warning(issue));
  }
}

/**
 * Get all source files recursively
 */
function getAllSourceFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    if (!fs.existsSync(currentDir)) return;

    const items = fs.readdirSync(currentDir);

    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        files.push(fullPath);
      }
    });
  }

  traverse(dir);
  return files;
}

/**
 * Calculate security configuration score
 */
function calculateSecurityScore() {
  let score = 0;
  let maxScore = 0;

  // CSP (20 points)
  maxScore += 20;
  if (configResults.csp.configured) {
    score += 20 - configResults.csp.issues.length * 3;
  }

  // Security Headers (25 points)
  maxScore += 25;
  if (configResults.headers.configured) {
    const criticalMissing = configResults.headers.missing.filter(h => h.critical).length;
    const nonCriticalMissing = configResults.headers.missing.filter(h => !h.critical).length;
    score += 25 - criticalMissing * 5 - nonCriticalMissing * 2;
  }

  // HTTPS (20 points)
  maxScore += 20;
  if (configResults.https.enforced) {
    score += 20;
  } else {
    score += Math.max(0, 20 - configResults.https.issues.length * 7);
  }

  // API Security (20 points)
  maxScore += 20;
  if (configResults.api.secured) {
    score += 20;
  } else {
    score += Math.max(0, 20 - configResults.api.issues.length * 3);
  }

  // Environment Security (15 points)
  maxScore += 15;
  if (configResults.environment.secure) {
    score += 15;
  } else {
    score += Math.max(0, 15 - configResults.environment.issues.length * 3);
  }

  configResults.score = Math.round((score / maxScore) * 100);
  return configResults.score;
}

/**
 * Generate security configuration report
 */
function generateReport() {
  section('Security Configuration Summary');

  const score = calculateSecurityScore();

  log(
    `\n📊 Security Configuration Score: ${score}/100`,
    score >= 80 ? colors.green : score >= 60 ? colors.yellow : colors.red
  );

  log('\n📋 Configuration Status:', colors.bold);
  log(
    `  CSP: ${configResults.csp.configured ? '✅' : '❌'} (${configResults.csp.issues.length} issues)`
  );
  log(
    `  Security Headers: ${configResults.headers.configured ? '✅' : '❌'} (${configResults.headers.missing.length} missing)`
  );
  log(
    `  HTTPS: ${configResults.https.enforced ? '✅' : '❌'} (${configResults.https.issues.length} issues)`
  );
  log(
    `  API Security: ${configResults.api.secured ? '✅' : '❌'} (${configResults.api.issues.length} issues)`
  );
  log(
    `  Environment: ${configResults.environment.secure ? '✅' : '❌'} (${configResults.environment.issues.length} issues)`
  );

  // Recommendations
  if (score < 80) {
    log('\n🔧 Recommendations:', colors.yellow);

    if (!configResults.csp.configured) {
      log('  • Configure Content Security Policy (CSP)');
    }

    if (!configResults.headers.configured) {
      log('  • Add security headers configuration');
    }

    if (!configResults.https.enforced) {
      log('  • Enforce HTTPS and configure HSTS');
    }

    if (!configResults.api.secured) {
      log('  • Improve API security configuration');
    }

    if (!configResults.environment.secure) {
      log('  • Review environment variable security');
    }
  } else {
    success('\n🎉 Security configuration looks excellent!');
  }

  // Save report
  const reportPath = 'security-config-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(configResults, null, 2));
  info(`\n📄 Detailed report saved to: ${reportPath}`);
}

/**
 * Main function
 */
function runSecurityConfigCheck() {
  log('🔒 Security Configuration Checker', colors.bold + colors.cyan);
  log(`Started at: ${new Date().toISOString()}\n`);

  try {
    checkCSPConfiguration();
    checkSecurityHeaders();
    checkHTTPSConfiguration();
    checkAPISecurityConfiguration();
    checkEnvironmentSecurity();
    generateReport();

    const score = configResults.score;

    if (score >= 80) {
      success('\n✅ Security configuration check completed successfully!');
      process.exit(0);
    } else if (score >= 60) {
      warning('\n⚠️ Security configuration needs improvement.');
      process.exit(0);
    } else {
      error('\n❌ Critical security configuration issues found.');
      process.exit(1);
    }
  } catch (err) {
    error(`Security configuration check failed: ${err.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSecurityConfigCheck();
}

module.exports = {
  runSecurityConfigCheck,
  checkCSPConfiguration,
  checkSecurityHeaders,
  checkHTTPSConfiguration,
  checkAPISecurityConfiguration,
  checkEnvironmentSecurity,
  calculateSecurityScore,
  configResults,
};
