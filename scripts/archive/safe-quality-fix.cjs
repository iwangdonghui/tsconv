#!/usr/bin/env node

/**
 * Safe Quality Fix Script
 * 
 * This script provides a safer approach to fixing code quality issues
 * by running fixes in stages and validating each step.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
 * Run command safely with error handling
 */
function runCommand(command, description) {
  try {
    log(`🔧 ${description}...`, 'blue');
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    log(`✅ ${description} completed`, 'green');
    return { success: true, output: result };
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

/**
 * Check if TypeScript compilation is successful
 */
function checkTypeScript() {
  logSection('TypeScript Check');
  const result = runCommand('npx tsc --noEmit', 'TypeScript compilation check');
  return result.success;
}

/**
 * Run ESLint with auto-fix (safer approach)
 */
function runESLintFix() {
  logSection('ESLint Auto-Fix');
  
  // First, run ESLint without fix to see what we're dealing with
  log('📊 Analyzing ESLint issues...', 'blue');
  const analyzeResult = runCommand(
    'npx eslint . --ext ts,tsx --format json',
    'ESLint analysis'
  );
  
  if (analyzeResult.success) {
    try {
      const results = JSON.parse(analyzeResult.output);
      const totalErrors = results.reduce((sum, file) => 
        sum + file.messages.filter(msg => msg.severity === 2).length, 0
      );
      const totalWarnings = results.reduce((sum, file) => 
        sum + file.messages.filter(msg => msg.severity === 1).length, 0
      );
      
      log(`📊 Found ${totalErrors} errors and ${totalWarnings} warnings`, 'yellow');
      
      if (totalErrors > 50) {
        log('⚠️ Too many errors for safe auto-fix. Manual review recommended.', 'yellow');
        return false;
      }
    } catch (parseError) {
      log('⚠️ Could not parse ESLint output', 'yellow');
    }
  }
  
  // Run auto-fix on specific rules that are safe
  const safeRules = [
    'no-unused-vars',
    '@typescript-eslint/no-unused-vars',
    'prefer-const',
    'no-var',
    'object-shorthand',
    'quote-props'
  ];
  
  let fixedAny = false;
  for (const rule of safeRules) {
    const result = runCommand(
      `npx eslint . --ext ts,tsx --fix --rule "${rule}: error"`,
      `Fixing ${rule}`
    );
    if (result.success) {
      fixedAny = true;
    }
  }
  
  return fixedAny;
}

/**
 * Run Prettier formatting (with backup)
 */
function runPrettierFormat() {
  logSection('Prettier Formatting');
  
  // Create backup first
  log('💾 Creating backup...', 'blue');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `backup-${timestamp}`;
  
  try {
    execSync(`mkdir -p ${backupDir}`);
    execSync(`cp -r src ${backupDir}/`);
    log('✅ Backup created', 'green');
  } catch (error) {
    log('❌ Failed to create backup', 'red');
    return false;
  }
  
  // Run Prettier on specific file types
  const result = runCommand(
    'npx prettier --write "src/**/*.{ts,tsx}" --ignore-unknown',
    'Prettier formatting'
  );
  
  if (!result.success) {
    log('🔄 Restoring from backup...', 'yellow');
    try {
      execSync(`rm -rf src && mv ${backupDir}/src .`);
      log('✅ Restored from backup', 'green');
    } catch (restoreError) {
      log('❌ Failed to restore backup', 'red');
    }
    return false;
  }
  
  // Verify TypeScript still compiles after formatting
  if (!checkTypeScript()) {
    log('🔄 Prettier broke TypeScript, restoring backup...', 'yellow');
    try {
      execSync(`rm -rf src && mv ${backupDir}/src .`);
      log('✅ Restored from backup', 'green');
    } catch (restoreError) {
      log('❌ Failed to restore backup', 'red');
    }
    return false;
  }
  
  // Clean up backup if successful
  try {
    execSync(`rm -rf ${backupDir}`);
  } catch (error) {
    // Ignore cleanup errors
  }
  
  return true;
}

/**
 * Fix unused variables by adding underscore prefix
 */
function fixUnusedVariables() {
  logSection('Fixing Unused Variables');
  
  const result = runCommand(
    'npx eslint . --ext ts,tsx --fix --rule "@typescript-eslint/no-unused-vars: [error, { argsIgnorePattern: ^_ }]"',
    'Adding underscore prefix to unused variables'
  );
  
  return result.success;
}

/**
 * Main safe quality fix function
 */
function safeQualityFix() {
  log(`${colors.bold}🛡️ Safe Code Quality Fix${colors.reset}`, 'magenta');
  log('Running quality fixes in safe mode...\n');
  
  const startTime = Date.now();
  let totalFixed = 0;
  
  // Step 1: Check initial state
  logSection('Initial State Check');
  const initialTSCheck = checkTypeScript();
  if (!initialTSCheck) {
    log('❌ TypeScript compilation failed. Please fix syntax errors first.', 'red');
    return;
  }
  
  // Step 2: Fix unused variables (safest)
  if (fixUnusedVariables()) {
    totalFixed++;
    log('✅ Fixed unused variables', 'green');
  }
  
  // Step 3: Run safe ESLint fixes
  if (runESLintFix()) {
    totalFixed++;
    log('✅ Applied ESLint auto-fixes', 'green');
  }
  
  // Step 4: Verify TypeScript still works
  if (!checkTypeScript()) {
    log('❌ TypeScript compilation failed after fixes', 'red');
    log('💡 Consider running: git checkout -- src/', 'blue');
    return;
  }
  
  // Step 5: Try Prettier (most risky, so last)
  if (runPrettierFormat()) {
    totalFixed++;
    log('✅ Applied Prettier formatting', 'green');
  }
  
  // Final verification
  logSection('Final Verification');
  const finalTSCheck = checkTypeScript();
  if (finalTSCheck) {
    log('✅ All fixes applied successfully!', 'green');
  } else {
    log('❌ Final TypeScript check failed', 'red');
  }
  
  // Generate summary
  logSection('Summary');
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  log(`🎯 Applied ${totalFixed} types of fixes in ${duration}s`, 'blue');
  log(`📊 TypeScript compilation: ${finalTSCheck ? '✅ PASS' : '❌ FAIL'}`, finalTSCheck ? 'green' : 'red');
  
  // Suggest next steps
  if (finalTSCheck) {
    log('\n💡 Next steps:', 'blue');
    log('  • Run: npm run quality:quick', 'blue');
    log('  • Review remaining issues manually', 'blue');
    log('  • Commit your changes', 'blue');
  } else {
    log('\n🚨 Recovery steps:', 'red');
    log('  • Run: git checkout -- src/', 'red');
    log('  • Fix syntax errors manually', 'red');
    log('  • Try safe fix again', 'red');
  }
}

if (require.main === module) {
  safeQualityFix();
}

module.exports = { safeQualityFix };
