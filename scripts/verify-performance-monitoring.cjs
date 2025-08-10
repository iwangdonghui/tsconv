#!/usr/bin/env node

/**
 * Performance Monitoring Verification Script
 * 
 * This script verifies that the performance monitoring system is properly configured
 * by checking files, dependencies, and configuration.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

/**
 * Check if required files exist
 */
function checkRequiredFiles() {
  log('\n📁 Checking required files...', colors.bold);
  
  const requiredFiles = [
    'src/lib/performance-monitoring.ts',
    'src/hooks/usePerformanceMonitoring.ts',
    'src/components/PerformanceMonitoringDashboard.tsx',
    'src/config/performance.ts',
    'docs/performance-monitoring.md',
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      success(`${file} exists`);
    } else {
      error(`${file} missing`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

/**
 * Check dependencies
 */
function checkDependencies() {
  log('\n📦 Checking dependencies...', colors.bold);
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = [
      'web-vitals',
      '@sentry/react',
      'react',
      'react-dom',
    ];
    
    let allDepsInstalled = true;
    
    requiredDeps.forEach(dep => {
      if (dependencies[dep]) {
        success(`${dep} v${dependencies[dep]} installed`);
      } else {
        error(`${dep} not installed`);
        allDepsInstalled = false;
      }
    });
    
    return allDepsInstalled;
  } catch (err) {
    error('Failed to read package.json');
    return false;
  }
}

/**
 * Check environment configuration
 */
function checkEnvironmentConfig() {
  log('\n🔧 Checking environment configuration...', colors.bold);
  
  const envFiles = ['.env.local', '.env.example'];
  let configValid = true;
  
  envFiles.forEach(envFile => {
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8');
      
      const requiredVars = [
        'VITE_SENTRY_DSN',
        'VITE_ENABLE_PERFORMANCE_MONITORING',
        'VITE_ENABLE_WEB_VITALS',
      ];
      
      const missingVars = requiredVars.filter(varName => !content.includes(varName));
      
      if (missingVars.length === 0) {
        success(`${envFile} has all required variables`);
      } else {
        warning(`${envFile} missing variables: ${missingVars.join(', ')}`);
        configValid = false;
      }
    } else {
      warning(`${envFile} not found`);
    }
  });
  
  return configValid;
}

/**
 * Check main.tsx integration
 */
function checkMainIntegration() {
  log('\n🔗 Checking main.tsx integration...', colors.bold);
  
  try {
    const mainContent = fs.readFileSync('src/main.tsx', 'utf8');
    
    const requiredImports = [
      'initializePerformanceMonitoring',
      'PerformanceMonitoringDashboard',
    ];
    
    const requiredCalls = [
      'initializePerformanceMonitoring(',
      '<PerformanceMonitoringDashboard',
    ];
    
    let integrationValid = true;
    
    requiredImports.forEach(importName => {
      if (mainContent.includes(importName)) {
        success(`${importName} imported`);
      } else {
        error(`${importName} not imported`);
        integrationValid = false;
      }
    });
    
    requiredCalls.forEach(call => {
      if (mainContent.includes(call)) {
        success(`${call} found`);
      } else {
        error(`${call} not found`);
        integrationValid = false;
      }
    });
    
    return integrationValid;
  } catch (err) {
    error('Failed to read src/main.tsx');
    return false;
  }
}

/**
 * Generate verification report
 */
function generateReport(results) {
  log('\n📊 Verification Report', colors.bold);
  log('===================');
  
  const categories = [
    { name: 'Required Files', result: results.files },
    { name: 'Dependencies', result: results.dependencies },
    { name: 'Environment Config', result: results.environment },
    { name: 'Main Integration', result: results.integration },
  ];
  
  categories.forEach(category => {
    const status = category.result ? '✅ PASS' : '❌ FAIL';
    log(`${status} ${category.name}`);
  });
  
  const passedChecks = Object.values(results).filter(Boolean).length;
  const totalChecks = Object.keys(results).length;
  
  log(`\n🎯 Overall: ${passedChecks}/${totalChecks} checks passed`);
  
  if (passedChecks === totalChecks) {
    success('\n🎉 Performance monitoring system is properly configured!');
    
    log('\n📋 Next steps:', colors.blue);
    log('1. Start the development server: npm run dev');
    log('2. Open http://localhost:5173 in your browser');
    log('3. Check the browser console for performance logs');
    log('4. Look for the performance dashboard in the bottom-left corner');
    
    return true;
  } else {
    error('\n⚠️ Some configuration issues found. Please fix them before proceeding.');
    
    log('\n🔧 Troubleshooting:', colors.blue);
    if (!results.files) {
      log('- Run the performance monitoring setup script');
    }
    if (!results.dependencies) {
      log('- Install missing dependencies: npm install');
    }
    if (!results.environment) {
      log('- Update your .env.local file with performance monitoring variables');
    }
    if (!results.integration) {
      log('- Check src/main.tsx for proper integration');
    }
    
    return false;
  }
}

/**
 * Main verification function
 */
function verifyPerformanceMonitoring() {
  log('🚀 Performance Monitoring Verification', colors.bold);
  log('=====================================\n');
  
  const results = {
    files: checkRequiredFiles(),
    dependencies: checkDependencies(),
    environment: checkEnvironmentConfig(),
    integration: checkMainIntegration(),
  };
  
  const success = generateReport(results);
  
  process.exit(success ? 0 : 1);
}

// Run verification
if (require.main === module) {
  verifyPerformanceMonitoring();
}

module.exports = {
  verifyPerformanceMonitoring,
  checkRequiredFiles,
  checkDependencies,
  checkEnvironmentConfig,
  checkMainIntegration,
};
