#!/usr/bin/env node

/**
 * Error Tracking System Test Script
 * 
 * This script tests the error tracking system configuration
 * and verifies that all components are properly set up.
 */

const fs = require('fs');
const path = require('path');

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

/**
 * Check if required files exist
 */
function checkRequiredFiles() {
  logSection('Required Files Check');
  
  const requiredFiles = [
    'src/lib/sentry.ts',
    'src/lib/error-tracking.ts',
    'src/components/ErrorBoundary.tsx',
    'src/components/ErrorMonitoringDashboard.tsx',
    'api/lib/sentry-server.ts',
    'api/lib/init-sentry.ts',
    'docs/ERROR_TRACKING_SYSTEM.md',
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} - Missing`, 'red');
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

/**
 * Check package.json dependencies
 */
function checkDependencies() {
  logSection('Dependencies Check');
  
  const packageJsonPath = 'package.json';
  if (!fs.existsSync(packageJsonPath)) {
    log('❌ package.json not found', 'red');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = [
    '@sentry/react',
    '@sentry/node',
    '@sentry/vite-plugin',
  ];
  
  let allDepsInstalled = true;
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      log(`✅ ${dep} - ${dependencies[dep]}`, 'green');
    } else {
      log(`❌ ${dep} - Not installed`, 'red');
      allDepsInstalled = false;
    }
  });
  
  return allDepsInstalled;
}

/**
 * Check environment configuration
 */
function checkEnvironmentConfig() {
  logSection('Environment Configuration Check');
  
  const envExamplePath = '.env.example';
  if (!fs.existsSync(envExamplePath)) {
    log('❌ .env.example not found', 'red');
    return false;
  }
  
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  
  const requiredEnvVars = [
    'VITE_SENTRY_DSN',
    'SENTRY_DSN',
    'VITE_APP_VERSION',
    'VITE_ENABLE_ERROR_TRACKING',
    'VITE_ENABLE_PERFORMANCE_MONITORING',
    'VITE_ENABLE_USER_FEEDBACK',
  ];
  
  let allVarsConfigured = true;
  
  requiredEnvVars.forEach(envVar => {
    if (envExample.includes(envVar)) {
      log(`✅ ${envVar}`, 'green');
    } else {
      log(`❌ ${envVar} - Not configured`, 'red');
      allVarsConfigured = false;
    }
  });
  
  return allVarsConfigured;
}

/**
 * Check main.tsx integration
 */
function checkMainIntegration() {
  logSection('Main.tsx Integration Check');
  
  const mainTsxPath = 'src/main.tsx';
  if (!fs.existsSync(mainTsxPath)) {
    log('❌ src/main.tsx not found', 'red');
    return false;
  }
  
  const mainTsx = fs.readFileSync(mainTsxPath, 'utf8');
  
  const requiredImports = [
    'initializeSentry',
    'ErrorTracking',
    'ErrorBoundary',
    'ErrorMonitoringDashboard',
  ];
  
  const requiredCalls = [
    'initializeSentry()',
    'ErrorTracking.initialize(',
    '<ErrorBoundary>',
    '<ErrorMonitoringDashboard',
  ];
  
  let integrationComplete = true;
  
  log('Checking imports:', 'blue');
  requiredImports.forEach(importName => {
    if (mainTsx.includes(importName)) {
      log(`  ✅ ${importName}`, 'green');
    } else {
      log(`  ❌ ${importName} - Not imported`, 'red');
      integrationComplete = false;
    }
  });
  
  log('Checking initialization calls:', 'blue');
  requiredCalls.forEach(call => {
    if (mainTsx.includes(call)) {
      log(`  ✅ ${call}`, 'green');
    } else {
      log(`  ❌ ${call} - Not called`, 'red');
      integrationComplete = false;
    }
  });
  
  return integrationComplete;
}

/**
 * Check API integration
 */
function checkApiIntegration() {
  logSection('API Integration Check');
  
  const errorHandlerPath = 'api/middleware/error-handler.ts';
  if (!fs.existsSync(errorHandlerPath)) {
    log('❌ api/middleware/error-handler.ts not found', 'red');
    return false;
  }
  
  const errorHandler = fs.readFileSync(errorHandlerPath, 'utf8');
  
  const requiredIntegrations = [
    'ServerErrorReporting',
    'reportApiError',
    'reportPerformanceIssue',
  ];
  
  let apiIntegrationComplete = true;
  
  requiredIntegrations.forEach(integration => {
    if (errorHandler.includes(integration)) {
      log(`✅ ${integration}`, 'green');
    } else {
      log(`❌ ${integration} - Not integrated`, 'red');
      apiIntegrationComplete = false;
    }
  });
  
  return apiIntegrationComplete;
}

/**
 * Check TypeScript compilation
 */
function checkTypeScriptCompilation() {
  logSection('TypeScript Compilation Check');
  
  try {
    const { execSync } = require('child_process');
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    log('✅ TypeScript compilation successful', 'green');
    return true;
  } catch (error) {
    log('❌ TypeScript compilation failed', 'red');
    log('Run "npx tsc --noEmit" for details', 'yellow');
    return false;
  }
}

/**
 * Generate test recommendations
 */
function generateTestRecommendations() {
  logSection('Testing Recommendations');
  
  log('To test the error tracking system:', 'blue');
  log('', 'reset');
  
  log('1. Frontend Error Testing:', 'yellow');
  log('   • Add a test button that throws an error', 'reset');
  log('   • Test the ErrorBoundary component', 'reset');
  log('   • Check the error monitoring dashboard', 'reset');
  log('', 'reset');
  
  log('2. Backend Error Testing:', 'yellow');
  log('   • Create an API endpoint that throws an error', 'reset');
  log('   • Test error reporting in API middleware', 'reset');
  log('   • Check Sentry dashboard for API errors', 'reset');
  log('', 'reset');
  
  log('3. Performance Testing:', 'yellow');
  log('   • Create a slow operation (>50ms)', 'reset');
  log('   • Test layout shift detection', 'reset');
  log('   • Monitor API response times', 'reset');
  log('', 'reset');
  
  log('4. User Feedback Testing:', 'yellow');
  log('   • Trigger an error and use feedback form', 'reset');
  log('   • Check feedback in Sentry dashboard', 'reset');
  log('   • Test feedback submission flow', 'reset');
}

/**
 * Main test function
 */
function testErrorTracking() {
  log(`${colors.bold}🔍 Error Tracking System Test${colors.reset}`, 'magenta');
  log('Testing error tracking system configuration...\n');
  
  const startTime = Date.now();
  let allTestsPassed = true;
  
  // Run all checks
  const checks = [
    { name: 'Required Files', fn: checkRequiredFiles },
    { name: 'Dependencies', fn: checkDependencies },
    { name: 'Environment Config', fn: checkEnvironmentConfig },
    { name: 'Main Integration', fn: checkMainIntegration },
    { name: 'API Integration', fn: checkApiIntegration },
    { name: 'TypeScript Compilation', fn: checkTypeScriptCompilation },
  ];
  
  const results = {};
  
  checks.forEach(check => {
    const result = check.fn();
    results[check.name] = result;
    if (!result) {
      allTestsPassed = false;
    }
  });
  
  // Generate summary
  logSection('Test Summary');
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  Object.entries(results).forEach(([name, passed]) => {
    log(`${passed ? '✅' : '❌'} ${name}`, passed ? 'green' : 'red');
  });
  
  log(`\n🕒 Test completed in ${duration}s`, 'blue');
  
  if (allTestsPassed) {
    log('🎉 All tests passed! Error tracking system is ready.', 'green');
  } else {
    log('⚠️ Some tests failed. Please fix the issues above.', 'yellow');
  }
  
  generateTestRecommendations();
  
  return allTestsPassed;
}

if (require.main === module) {
  testErrorTracking();
}

module.exports = { testErrorTracking };
