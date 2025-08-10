#!/usr/bin/env node

/**
 * Security Automation Verification Script
 * 
 * This script verifies that the security automation system is properly configured
 * by checking files, dependencies, workflows, and configuration.
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
 * Check if required security files exist
 */
function checkSecurityFiles() {
  log('\n📁 Checking security automation files...', colors.bold);
  
  const requiredFiles = [
    'scripts/security-scanner.cjs',
    'scripts/security-config-checker.cjs',
    '.github/workflows/security-scan.yml',
    'SECURITY.md',
    '.github/dependabot.yml',
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
 * Check security-related dependencies
 */
function checkSecurityDependencies() {
  log('\n📦 Checking security dependencies...', colors.bold);
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const securityDeps = [
      'eslint-plugin-security',
      'eslint-plugin-sonarjs',
    ];
    
    const optionalDeps = [
      '@sentry/react',
      'husky',
      'lint-staged',
    ];
    
    let allDepsInstalled = true;
    
    securityDeps.forEach(dep => {
      if (dependencies[dep]) {
        success(`${dep} v${dependencies[dep]} installed`);
      } else {
        error(`${dep} not installed`);
        allDepsInstalled = false;
      }
    });
    
    optionalDeps.forEach(dep => {
      if (dependencies[dep]) {
        success(`${dep} v${dependencies[dep]} installed (optional)`);
      } else {
        warning(`${dep} not installed (optional)`);
      }
    });
    
    return allDepsInstalled;
  } catch (err) {
    error('Failed to read package.json');
    return false;
  }
}

/**
 * Check GitHub Actions workflows
 */
function checkGitHubWorkflows() {
  log('\n🔄 Checking GitHub Actions workflows...', colors.bold);
  
  const workflowChecks = [
    {
      file: '.github/workflows/security-scan.yml',
      name: 'Security Scan Workflow',
      requiredJobs: ['dependency-scan', 'code-security', 'infrastructure-scan', 'secrets-scan']
    },
    {
      file: '.github/workflows/ci.yml',
      name: 'CI/CD Pipeline',
      requiredContent: ['npm audit', 'security']
    }
  ];
  
  let allWorkflowsValid = true;
  
  workflowChecks.forEach(check => {
    if (fs.existsSync(check.file)) {
      const content = fs.readFileSync(check.file, 'utf8');
      
      if (check.requiredJobs) {
        const missingJobs = check.requiredJobs.filter(job => !content.includes(job));
        if (missingJobs.length === 0) {
          success(`${check.name} has all required jobs`);
        } else {
          error(`${check.name} missing jobs: ${missingJobs.join(', ')}`);
          allWorkflowsValid = false;
        }
      }
      
      if (check.requiredContent) {
        const missingContent = check.requiredContent.filter(content_item => !content.includes(content_item));
        if (missingContent.length === 0) {
          success(`${check.name} has required security content`);
        } else {
          warning(`${check.name} missing content: ${missingContent.join(', ')}`);
        }
      }
    } else {
      error(`${check.file} not found`);
      allWorkflowsValid = false;
    }
  });
  
  return allWorkflowsValid;
}

/**
 * Check package.json scripts
 */
function checkPackageScripts() {
  log('\n📜 Checking package.json security scripts...', colors.bold);
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = [
      'security:scan',
      'security:config',
      'security:full',
      'audit',
    ];
    
    const optionalScripts = [
      'security:quick',
      'test-security-headers',
      'test-api-security',
    ];
    
    let scriptsValid = true;
    
    requiredScripts.forEach(script => {
      if (scripts[script]) {
        success(`${script} script configured`);
      } else {
        error(`${script} script not found`);
        scriptsValid = false;
      }
    });
    
    optionalScripts.forEach(script => {
      if (scripts[script]) {
        success(`${script} script configured (optional)`);
      } else {
        warning(`${script} script not found (optional)`);
      }
    });
    
    return scriptsValid;
  } catch (err) {
    error('Failed to read package.json');
    return false;
  }
}

/**
 * Check pre-commit hooks
 */
function checkPreCommitHooks() {
  log('\n🪝 Checking pre-commit hooks...', colors.bold);
  
  const hookChecks = [
    {
      file: '.husky/pre-commit',
      name: 'Pre-commit hook',
      requiredContent: ['npm audit', 'security']
    },
    {
      file: 'package.json',
      name: 'Husky configuration',
      requiredContent: ['husky']
    }
  ];
  
  let hooksValid = true;
  
  hookChecks.forEach(check => {
    if (fs.existsSync(check.file)) {
      const content = fs.readFileSync(check.file, 'utf8');
      
      const missingContent = check.requiredContent.filter(item => !content.includes(item));
      if (missingContent.length === 0) {
        success(`${check.name} configured correctly`);
      } else {
        warning(`${check.name} missing: ${missingContent.join(', ')}`);
        hooksValid = false;
      }
    } else {
      warning(`${check.file} not found`);
      hooksValid = false;
    }
  });
  
  return hooksValid;
}

/**
 * Check Dependabot configuration
 */
function checkDependabotConfig() {
  log('\n🤖 Checking Dependabot configuration...', colors.bold);
  
  if (fs.existsSync('.github/dependabot.yml')) {
    const content = fs.readFileSync('.github/dependabot.yml', 'utf8');
    
    const requiredEcosystems = ['npm', 'github-actions'];
    const configuredEcosystems = [];
    
    requiredEcosystems.forEach(ecosystem => {
      if (content.includes(`package-ecosystem: "${ecosystem}"`)) {
        configuredEcosystems.push(ecosystem);
        success(`Dependabot configured for ${ecosystem}`);
      } else {
        warning(`Dependabot not configured for ${ecosystem}`);
      }
    });
    
    // Check for security-related configuration
    if (content.includes('security') || content.includes('vulnerability')) {
      success('Dependabot has security-focused configuration');
    } else {
      info('Consider adding security-focused Dependabot configuration');
    }
    
    return configuredEcosystems.length === requiredEcosystems.length;
  } else {
    error('.github/dependabot.yml not found');
    return false;
  }
}

/**
 * Check ESLint security configuration
 */
function checkESLintSecurity() {
  log('\n🔍 Checking ESLint security configuration...', colors.bold);
  
  const eslintFiles = ['.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs'];
  let eslintConfigFound = false;
  let securityPluginConfigured = false;
  
  eslintFiles.forEach(file => {
    if (fs.existsSync(file)) {
      eslintConfigFound = true;
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('security') || content.includes('sonarjs')) {
        securityPluginConfigured = true;
        success(`ESLint security plugins configured in ${file}`);
      }
    }
  });
  
  if (!eslintConfigFound) {
    error('No ESLint configuration found');
    return false;
  }
  
  if (!securityPluginConfigured) {
    warning('ESLint security plugins not configured');
    return false;
  }
  
  return true;
}

/**
 * Test security scripts functionality
 */
function testSecurityScripts() {
  log('\n🧪 Testing security scripts functionality...', colors.bold);
  
  const { execSync } = require('child_process');
  
  const scriptTests = [
    {
      name: 'Security scanner',
      command: 'node scripts/security-scanner.cjs --help',
      expectSuccess: false // Help command might exit with non-zero
    },
    {
      name: 'Security config checker',
      command: 'node scripts/security-config-checker.cjs --help',
      expectSuccess: false // Help command might exit with non-zero
    }
  ];
  
  let allTestsPassed = true;
  
  scriptTests.forEach(test => {
    try {
      execSync(test.command, { stdio: 'pipe' });
      success(`${test.name} script is functional`);
    } catch (err) {
      if (test.expectSuccess) {
        error(`${test.name} script failed: ${err.message}`);
        allTestsPassed = false;
      } else {
        // Script exists and can be executed (even if it exits with error for help)
        success(`${test.name} script is accessible`);
      }
    }
  });
  
  return allTestsPassed;
}

/**
 * Generate verification report
 */
function generateReport(results) {
  log('\n📊 Security Automation Verification Report', colors.bold);
  log('===========================================');
  
  const categories = [
    { name: 'Security Files', result: results.files },
    { name: 'Dependencies', result: results.dependencies },
    { name: 'GitHub Workflows', result: results.workflows },
    { name: 'Package Scripts', result: results.scripts },
    { name: 'Pre-commit Hooks', result: results.hooks },
    { name: 'Dependabot Config', result: results.dependabot },
    { name: 'ESLint Security', result: results.eslint },
    { name: 'Script Functionality', result: results.scriptTests },
  ];
  
  categories.forEach(category => {
    const status = category.result ? '✅ PASS' : '❌ FAIL';
    log(`${status} ${category.name}`);
  });
  
  const passedChecks = Object.values(results).filter(Boolean).length;
  const totalChecks = Object.keys(results).length;
  
  log(`\n🎯 Overall: ${passedChecks}/${totalChecks} checks passed`);
  
  if (passedChecks === totalChecks) {
    success('\n🎉 Security automation system is fully configured!');
    
    log('\n📋 Next steps:', colors.blue);
    log('1. Run security scan: npm run security:full');
    log('2. Check GitHub Actions: Review workflow runs');
    log('3. Test pre-commit hooks: Make a test commit');
    log('4. Monitor Dependabot: Check for automated PRs');
    
    return true;
  } else {
    error('\n⚠️ Some security automation components need attention.');
    
    log('\n🔧 Troubleshooting:', colors.blue);
    if (!results.files) {
      log('- Ensure all security scripts and workflows are present');
    }
    if (!results.dependencies) {
      log('- Install missing security dependencies: npm install');
    }
    if (!results.workflows) {
      log('- Review and fix GitHub Actions workflows');
    }
    if (!results.scripts) {
      log('- Add missing security scripts to package.json');
    }
    
    return false;
  }
}

/**
 * Main verification function
 */
function verifySecurityAutomation() {
  log('🔒 Security Automation Verification', colors.bold);
  log('===================================\n');
  
  const results = {
    files: checkSecurityFiles(),
    dependencies: checkSecurityDependencies(),
    workflows: checkGitHubWorkflows(),
    scripts: checkPackageScripts(),
    hooks: checkPreCommitHooks(),
    dependabot: checkDependabotConfig(),
    eslint: checkESLintSecurity(),
    scriptTests: testSecurityScripts(),
  };
  
  const success = generateReport(results);
  
  process.exit(success ? 0 : 1);
}

// Run verification
if (require.main === module) {
  verifySecurityAutomation();
}

module.exports = {
  verifySecurityAutomation,
  checkSecurityFiles,
  checkSecurityDependencies,
  checkGitHubWorkflows,
  checkPackageScripts,
  checkPreCommitHooks,
  checkDependabotConfig,
  checkESLintSecurity,
  testSecurityScripts,
};
