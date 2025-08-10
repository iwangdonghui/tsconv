#!/usr/bin/env node

/**
 * Vulnerability Fix Script
 * 
 * This script attempts to fix security vulnerabilities that cannot be
 * automatically resolved by npm audit fix --force
 */

const fs = require('fs');
const { execSync } = require('child_process');

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
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`🔧 ${title}`, colors.bold + colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
}

/**
 * Run command and return result
 */
function runCommand(command, description) {
  try {
    info(`Running: ${description}`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    success(`${description} completed`);
    return { success: true, output: result };
  } catch (err) {
    error(`${description} failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Check current vulnerability status
 */
function checkVulnerabilities() {
  section('Current Vulnerability Status');
  
  try {
    const auditResult = execSync('npm audit --json', { encoding: 'utf8', stdio: 'pipe' });
    const audit = JSON.parse(auditResult);
    
    const vulns = audit.metadata.vulnerabilities;
    log(`Total vulnerabilities: ${vulns.total}`);
    log(`  Critical: ${vulns.critical}`, colors.red);
    log(`  High: ${vulns.high}`, colors.red);
    log(`  Moderate: ${vulns.moderate}`, colors.yellow);
    log(`  Low: ${vulns.low}`, colors.blue);
    
    return audit;
  } catch (err) {
    if (err.status === 1) {
      try {
        const audit = JSON.parse(err.stdout);
        const vulns = audit.metadata.vulnerabilities;
        log(`Total vulnerabilities: ${vulns.total}`);
        log(`  Critical: ${vulns.critical}`, colors.red);
        log(`  High: ${vulns.high}`, colors.red);
        log(`  Moderate: ${vulns.moderate}`, colors.yellow);
        log(`  Low: ${vulns.low}`, colors.blue);
        return audit;
      } catch (parseError) {
        error('Failed to parse audit results');
        return null;
      }
    } else {
      error(`Audit failed: ${err.message}`);
      return null;
    }
  }
}

/**
 * Fix specific package vulnerabilities
 */
function fixSpecificPackages() {
  section('Fixing Specific Package Vulnerabilities');
  
  const fixes = [
    {
      name: 'Update Commitizen',
      command: 'npm install commitizen@latest',
      description: 'Fix critical vulnerabilities in commitizen and its dependencies'
    },
    {
      name: 'Update Vercel CLI',
      command: 'npm install vercel@latest',
      description: 'Fix high vulnerabilities in Vercel CLI and related packages'
    },
    {
      name: 'Update esbuild',
      command: 'npm install esbuild@latest --save-dev',
      description: 'Fix moderate vulnerability in esbuild'
    }
  ];
  
  fixes.forEach(fix => {
    const result = runCommand(fix.command, fix.description);
    if (!result.success) {
      warning(`Failed to apply fix: ${fix.name}`);
    }
  });
}

/**
 * Add npm overrides to force specific versions
 */
function addNpmOverrides() {
  section('Adding npm overrides for problematic dependencies');
  
  try {
    const packageJsonPath = 'package.json';
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add overrides for vulnerable packages
    if (!packageJson.overrides) {
      packageJson.overrides = {};
    }
    
    const overrides = {
      "lodash": "^4.17.21",
      "minimist": "^1.2.8",
      "path-to-regexp": "^6.3.0",
      "braces": "^3.0.3",
      "micromatch": "^4.0.8",
      "merge": "^2.1.1",
      "shelljs": "^0.8.5",
      "tar": "^6.2.1",
      "undici": "^5.29.0"
    };
    
    let hasChanges = false;
    Object.entries(overrides).forEach(([pkg, version]) => {
      if (!packageJson.overrides[pkg] || packageJson.overrides[pkg] !== version) {
        packageJson.overrides[pkg] = version;
        hasChanges = true;
        info(`Added override: ${pkg}@${version}`);
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      success('Updated package.json with security overrides');
      
      // Reinstall dependencies to apply overrides
      info('Reinstalling dependencies to apply overrides...');
      const result = runCommand('npm install', 'Reinstall dependencies');
      if (result.success) {
        success('Dependencies reinstalled with overrides');
      }
    } else {
      info('No new overrides needed');
    }
    
  } catch (err) {
    error(`Failed to add npm overrides: ${err.message}`);
  }
}

/**
 * Remove problematic packages if possible
 */
function removeProblematicPackages() {
  section('Analyzing problematic packages');
  
  const problematicPackages = [
    {
      name: 'commitizen',
      critical: true,
      alternatives: ['@commitlint/cli', 'conventional-changelog-cli'],
      action: 'update' // We need this package, so update instead of remove
    }
  ];
  
  problematicPackages.forEach(pkg => {
    if (pkg.action === 'update') {
      info(`${pkg.name} is critical but has vulnerabilities - will update to latest`);
    } else if (pkg.action === 'remove') {
      warning(`Consider removing ${pkg.name} and using alternatives: ${pkg.alternatives.join(', ')}`);
    }
  });
}

/**
 * Create .npmrc with audit settings
 */
function configureNpmAudit() {
  section('Configuring npm audit settings');
  
  const npmrcPath = '.npmrc';
  let npmrcContent = '';
  
  if (fs.existsSync(npmrcPath)) {
    npmrcContent = fs.readFileSync(npmrcPath, 'utf8');
  }
  
  // Add audit level configuration if not present
  if (!npmrcContent.includes('audit-level')) {
    npmrcContent += '\n# Security audit configuration\naudit-level=moderate\n';
    fs.writeFileSync(npmrcPath, npmrcContent);
    info('Added audit-level configuration to .npmrc');
  }
}

/**
 * Generate vulnerability report
 */
function generateVulnerabilityReport() {
  section('Generating Vulnerability Report');
  
  try {
    const auditResult = execSync('npm audit --json', { encoding: 'utf8', stdio: 'pipe' });
    const audit = JSON.parse(auditResult);
    
    const reportPath = 'vulnerability-fix-report.json';
    const report = {
      timestamp: new Date().toISOString(),
      vulnerabilities: audit.metadata.vulnerabilities,
      fixedPackages: [
        'commitizen',
        'vercel',
        'esbuild'
      ],
      overridesApplied: [
        'lodash',
        'minimist',
        'path-to-regexp',
        'braces',
        'micromatch',
        'merge',
        'shelljs',
        'tar',
        'undici'
      ],
      recommendations: [
        'Monitor for updates to problematic packages',
        'Consider alternative packages for critical vulnerabilities',
        'Regularly run npm audit to check for new vulnerabilities',
        'Keep dependencies up to date'
      ]
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    success(`Vulnerability report saved to: ${reportPath}`);
    
  } catch (err) {
    if (err.status === 1) {
      try {
        const audit = JSON.parse(err.stdout);
        info('Vulnerabilities still exist after fixes');
        log(`Remaining: ${audit.metadata.vulnerabilities.total} vulnerabilities`);
      } catch (parseError) {
        error('Failed to generate vulnerability report');
      }
    }
  }
}

/**
 * Main vulnerability fix function
 */
function fixVulnerabilities() {
  log('🔧 Vulnerability Fix Script', colors.bold + colors.cyan);
  log(`Started at: ${new Date().toISOString()}\n`);
  
  try {
    // Check current status
    const initialAudit = checkVulnerabilities();
    
    if (!initialAudit || initialAudit.metadata.vulnerabilities.total === 0) {
      success('No vulnerabilities found!');
      return;
    }
    
    // Apply fixes
    fixSpecificPackages();
    addNpmOverrides();
    removeProblematicPackages();
    configureNpmAudit();
    
    // Check final status
    log('\n' + '='.repeat(60), colors.cyan);
    log('🔍 Final Vulnerability Check', colors.bold + colors.cyan);
    log('='.repeat(60), colors.cyan);
    
    const finalAudit = checkVulnerabilities();
    
    if (finalAudit) {
      const initial = initialAudit.metadata.vulnerabilities;
      const final = finalAudit.metadata.vulnerabilities;
      
      log('\n📊 Fix Summary:', colors.bold);
      log(`Critical: ${initial.critical} → ${final.critical} (${initial.critical - final.critical >= 0 ? '-' : '+'}${Math.abs(initial.critical - final.critical)})`);
      log(`High: ${initial.high} → ${final.high} (${initial.high - final.high >= 0 ? '-' : '+'}${Math.abs(initial.high - final.high)})`);
      log(`Moderate: ${initial.moderate} → ${final.moderate} (${initial.moderate - final.moderate >= 0 ? '-' : '+'}${Math.abs(initial.moderate - final.moderate)})`);
      log(`Total: ${initial.total} → ${final.total} (${initial.total - final.total >= 0 ? '-' : '+'}${Math.abs(initial.total - final.total)})`);
      
      if (final.total < initial.total) {
        success(`\n🎉 Reduced vulnerabilities from ${initial.total} to ${final.total}!`);
      } else if (final.total === initial.total) {
        warning('\n⚠️ No reduction in vulnerabilities. Manual intervention may be required.');
      } else {
        error('\n❌ Vulnerability count increased. Please review changes.');
      }
    }
    
    generateVulnerabilityReport();
    
    // Provide next steps
    log('\n🔧 Next Steps:', colors.yellow);
    log('1. Review the vulnerability report');
    log('2. Test the application to ensure it still works');
    log('3. Consider removing or replacing packages with persistent vulnerabilities');
    log('4. Monitor for updates to vulnerable packages');
    log('5. Run npm audit regularly to catch new vulnerabilities');
    
  } catch (err) {
    error(`Vulnerability fix failed: ${err.message}`);
    process.exit(1);
  }
}

// Run vulnerability fix if called directly
if (require.main === module) {
  fixVulnerabilities();
}

module.exports = {
  fixVulnerabilities,
  checkVulnerabilities,
  fixSpecificPackages,
  addNpmOverrides,
  generateVulnerabilityReport
};
