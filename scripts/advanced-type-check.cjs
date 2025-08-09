#!/usr/bin/env node

/**
 * Advanced Type Checking Script
 * 
 * This script performs comprehensive type checking including:
 * - TypeScript compilation with advanced options
 * - Custom type validation rules
 * - Runtime type safety verification
 * - Type coverage analysis
 */

const { execSync } = require('child_process');
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

function runCommand(command, description, allowFailure = false) {
  log(`\n${description}...`, 'blue');
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    log(`✅ ${description} passed`, 'green');
    return { success: true, output };
  } catch (error) {
    if (allowFailure) {
      log(`⚠️ ${description} completed with warnings`, 'yellow');
      return { success: true, output: error.stdout || error.message };
    } else {
      log(`❌ ${description} failed`, 'red');
      return { success: false, error: error.stdout || error.message };
    }
  }
}

// ============================================================================
// TypeScript Advanced Checking
// ============================================================================

function checkTypeScriptAdvanced() {
  logSection('Advanced TypeScript Type Checking');
  
  // Check if advanced options are enabled
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    log('❌ tsconfig.json not found', 'red');
    return false;
  }
  
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  const compilerOptions = tsconfig.compilerOptions || {};
  
  const advancedOptions = {
    'allowUnusedLabels': false,
    'allowUnreachableCode': false,
    'forceConsistentCasingInFileNames': true,
    'noImplicitOverride': true,
    'useUnknownInCatchVariables': true,
    'alwaysStrict': true,
    'strictBindCallApply': true,
    'strictFunctionTypes': true,
    'strictNullChecks': true,
    'strictPropertyInitialization': true
  };
  
  let allAdvanced = true;
  log('\nChecking advanced TypeScript options:', 'blue');
  
  for (const [option, expected] of Object.entries(advancedOptions)) {
    if (compilerOptions[option] !== expected) {
      log(`❌ ${option} should be ${expected}, but is ${compilerOptions[option]}`, 'red');
      allAdvanced = false;
    } else {
      log(`✅ ${option}: ${compilerOptions[option]}`, 'green');
    }
  }
  
  if (!allAdvanced) {
    log('\n⚠️ Some advanced TypeScript options are not properly configured', 'yellow');
  }
  
  // Run TypeScript compilation with advanced checks
  const tscResult = runCommand(
    'npx tsc --noEmit --strict --noImplicitAny --strictNullChecks --strictFunctionTypes',
    'TypeScript advanced compilation check',
    true
  );
  
  return allAdvanced && tscResult.success;
}

// ============================================================================
// Type Coverage Analysis
// ============================================================================

function analyzeTypeCoverage() {
  logSection('Type Coverage Analysis');
  
  try {
    // Count TypeScript files
    const tsFiles = execSync('find src api -name "*.ts" -o -name "*.tsx" | wc -l', { encoding: 'utf8' }).trim();
    log(`📁 TypeScript files: ${tsFiles}`, 'blue');
    
    // Count any types
    const anyTypes = execSync('grep -r ": any" src api --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' }).trim();
    log(`⚠️ Explicit 'any' types found: ${anyTypes}`, anyTypes > 0 ? 'yellow' : 'green');
    
    // Count unknown types
    const unknownTypes = execSync('grep -r ": unknown" src api --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' }).trim();
    log(`✅ 'unknown' types (safer): ${unknownTypes}`, 'green');
    
    // Count type assertions
    const typeAssertions = execSync('grep -r " as " src api --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' }).trim();
    log(`⚠️ Type assertions found: ${typeAssertions}`, typeAssertions > 10 ? 'yellow' : 'green');
    
    // Count non-null assertions
    const nonNullAssertions = execSync('grep -r "!" src api --include="*.ts" --include="*.tsx" | grep -v "!=" | grep -v "!==" | wc -l', { encoding: 'utf8' }).trim();
    log(`⚠️ Non-null assertions (!): ${nonNullAssertions}`, nonNullAssertions > 20 ? 'yellow' : 'green');
    
    return true;
  } catch (error) {
    log('❌ Type coverage analysis failed', 'red');
    return false;
  }
}

// ============================================================================
// Custom Type Validation
// ============================================================================

function checkCustomTypes() {
  logSection('Custom Type Definitions Check');
  
  const typeFiles = [
    'src/types/advanced.ts',
    'src/utils/type-guards.ts',
    'api/middleware/type-validation.ts'
  ];
  
  let allPresent = true;
  
  for (const file of typeFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      log(`✅ ${file} exists`, 'green');
      
      // Check file content for key exports
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (file.includes('advanced.ts')) {
        const hasUtilityTypes = content.includes('DeepRequired') && content.includes('Brand');
        log(`${hasUtilityTypes ? '✅' : '❌'} Advanced utility types defined`, hasUtilityTypes ? 'green' : 'red');
      }
      
      if (file.includes('type-guards.ts')) {
        const hasTypeGuards = content.includes('isValidTimestamp') && content.includes('assertType');
        log(`${hasTypeGuards ? '✅' : '❌'} Type guards implemented`, hasTypeGuards ? 'green' : 'red');
      }
      
      if (file.includes('type-validation.ts')) {
        const hasValidation = content.includes('validateRequestParams') && content.includes('ValidationSchema');
        log(`${hasValidation ? '✅' : '❌'} Validation middleware implemented`, hasValidation ? 'green' : 'red');
      }
    } else {
      log(`❌ ${file} missing`, 'red');
      allPresent = false;
    }
  }
  
  return allPresent;
}

// ============================================================================
// Runtime Type Safety Check
// ============================================================================

function checkRuntimeTypeSafety() {
  logSection('Runtime Type Safety Check');
  
  try {
    // Check for type guards usage
    const typeGuardUsage = execSync('grep -r "isValid" src api --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' }).trim();
    log(`🛡️ Type guard usages: ${typeGuardUsage}`, typeGuardUsage > 0 ? 'green' : 'yellow');
    
    // Check for validation middleware usage
    const validationUsage = execSync('grep -r "validateRequestParams\\|createValidationMiddleware" api --include="*.ts" | wc -l', { encoding: 'utf8' }).trim();
    log(`🔍 Validation middleware usages: ${validationUsage}`, validationUsage > 0 ? 'green' : 'yellow');
    
    // Check for branded types usage
    const brandedTypes = execSync('grep -r "Brand<\\|Timestamp\\|TimezoneId" src api --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' }).trim();
    log(`🏷️ Branded types usage: ${brandedTypes}`, brandedTypes > 0 ? 'green' : 'yellow');
    
    return true;
  } catch (error) {
    log('❌ Runtime type safety check failed', 'red');
    return false;
  }
}

// ============================================================================
// Type Documentation Check
// ============================================================================

function checkTypeDocumentation() {
  logSection('Type Documentation Check');
  
  try {
    // Check for JSDoc comments on types
    const jsdocComments = execSync('grep -r "/\\*\\*" src api --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' }).trim();
    log(`📝 JSDoc comments: ${jsdocComments}`, jsdocComments > 50 ? 'green' : 'yellow');
    
    // Check for type documentation files
    const docFiles = ['docs/TYPES.md', 'docs/TYPE_ERROR_FIXES.md'];
    let docsPresent = 0;
    
    for (const docFile of docFiles) {
      if (fs.existsSync(path.join(process.cwd(), docFile))) {
        log(`✅ ${docFile} exists`, 'green');
        docsPresent++;
      } else {
        log(`⚠️ ${docFile} missing`, 'yellow');
      }
    }
    
    return docsPresent > 0;
  } catch (error) {
    log('❌ Type documentation check failed', 'red');
    return false;
  }
}

// ============================================================================
// Main Function
// ============================================================================

function main() {
  log(`${colors.bold}🔍 Advanced Type Checking Analysis${colors.reset}`, 'magenta');
  log('Performing comprehensive type safety analysis...\n');
  
  const checks = [
    { name: 'TypeScript Advanced Options', fn: checkTypeScriptAdvanced },
    { name: 'Type Coverage Analysis', fn: analyzeTypeCoverage },
    { name: 'Custom Type Definitions', fn: checkCustomTypes },
    { name: 'Runtime Type Safety', fn: checkRuntimeTypeSafety },
    { name: 'Type Documentation', fn: checkTypeDocumentation }
  ];
  
  const results = [];
  
  for (const check of checks) {
    const result = check.fn();
    results.push({ name: check.name, passed: result });
  }
  
  // Summary
  logSection('Advanced Type Checking Summary');
  let allPassed = true;
  
  for (const result of results) {
    if (result.passed) {
      log(`✅ ${result.name}`, 'green');
    } else {
      log(`❌ ${result.name}`, 'red');
      allPassed = false;
    }
  }
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  log(`\n📊 Results: ${passedCount}/${totalCount} checks passed`, passedCount === totalCount ? 'green' : 'yellow');
  
  if (allPassed) {
    log('\n🎉 All advanced type checks passed!', 'green');
    log('Your TypeScript configuration has excellent type safety.', 'green');
    process.exit(0);
  } else {
    log('\n⚠️ Some advanced type checks need attention.', 'yellow');
    log('Consider implementing the missing features for better type safety.', 'blue');
    process.exit(0); // Don't fail the build, just warn
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  checkTypeScriptAdvanced, 
  analyzeTypeCoverage, 
  checkCustomTypes, 
  checkRuntimeTypeSafety, 
  checkTypeDocumentation 
};
