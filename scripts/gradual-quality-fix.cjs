#!/usr/bin/env node

/**
 * Gradual Quality Fix Script
 * 
 * This script applies quality fixes in stages, from safest to riskiest
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
function runCommand(command, description, allowFailure = false) {
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
    if (allowFailure) {
      log(`⚠️ ${description} had issues (continuing)`, 'yellow');
      return { success: false, error: error.message, output: error.stdout || '' };
    } else {
      log(`❌ ${description} failed: ${error.message}`, 'red');
      return { success: false, error: error.message, output: error.stdout || '' };
    }
  }
}

/**
 * Stage 1: Fix unused variables by adding underscore prefix
 */
function stage1_FixUnusedVariables() {
  logSection('Stage 1: Fix Unused Variables');
  
  const filesToFix = [
    'src/__tests__/TimestampConverter.integration.test.tsx',
    'src/components/DateDiffCalculator.tsx',
    'src/components/EnhancedApiDocs.tsx',
    'src/components/FormatTool.tsx',
    'src/components/Guide.tsx',
    'src/components/HealthPage.tsx',
    'src/components/TimestampConverter.tsx',
    'src/components/TimezoneExplorer.tsx',
    'src/components/WorkdaysCalculator.tsx',
    'src/components/__tests__/TimestampConverter.test.tsx',
    'src/components/ui/__tests__/validation-components.test.tsx',
    'src/components/ui/optimized-image.tsx',
    'src/components/ui/recovery-suggestions.tsx',
    'src/hooks/__tests__/useInputValidation.test.ts',
    'src/hooks/__tests__/useInputValidation.test.tsx',
    'src/utils/__tests__/validation.test.ts',
    'src/utils/services.ts'
  ];
  
  let fixedFiles = 0;
  
  filesToFix.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        // Fix unused variables by adding underscore prefix
        const unusedPatterns = [
          // Variables that start with __ are already prefixed
          { pattern: /const\s+([a-zA-Z][a-zA-Z0-9]*)\s*=.*?\/\/.*?never used/g, replacement: 'const _$1 =' },
          // Common unused variable patterns
          { pattern: /const\s+(__\w+)\s*=/g, replacement: 'const $1 =' }, // Keep double underscore
          { pattern: /const\s+(selectedEndpoint|setSelectedEndpoint)\s*=/g, replacement: 'const _$1 =' },
          { pattern: /const\s+(t)\s*=\s*useLanguage\(\)/g, replacement: 'const _$1 = useLanguage()' },
          { pattern: /const\s+(container)\s*=.*?renderWithProviders/g, replacement: 'const _$1 =' },
          { pattern: /\(\s*([a-zA-Z]\w*)\s*:\s*string,\s*index:\s*number\s*\)/g, replacement: '($1: string, _index: number)' }
        ];
        
        unusedPatterns.forEach(({ pattern, replacement }) => {
          const newContent = content.replace(pattern, replacement);
          if (newContent !== content) {
            content = newContent;
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          fs.writeFileSync(filePath, content);
          log(`🔧 Fixed unused variables in ${filePath}`, 'green');
          fixedFiles++;
        }
        
      } catch (error) {
        log(`❌ Error processing ${filePath}: ${error.message}`, 'red');
      }
    }
  });
  
  log(`📊 Stage 1 Summary: ${fixedFiles} files modified`, 'blue');
  return fixedFiles;
}

/**
 * Stage 2: Fix simple import issues
 */
function stage2_FixImports() {
  logSection('Stage 2: Fix Import Issues');
  
  // Remove duplicate imports
  const result = runCommand(
    'npx eslint "src/**/*.{ts,tsx}" --fix --rule "no-duplicate-imports: error"',
    'Fixing duplicate imports',
    true
  );
  
  return result.success;
}

/**
 * Stage 3: Fix missing React imports
 */
function stage3_FixReactImports() {
  logSection('Stage 3: Fix React Imports');
  
  const filesToFix = [
    'src/components/__tests__/TimestampConverter.test.tsx',
    'src/test/testUtils.tsx'
  ];
  
  let fixedFiles = 0;
  
  filesToFix.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add React import if missing and JSX is used
        if (content.includes('<') && content.includes('>') && !content.includes('import React')) {
          content = `import React from 'react';\n${content}`;
          fs.writeFileSync(filePath, content);
          log(`🔧 Added React import to ${filePath}`, 'green');
          fixedFiles++;
        }
        
      } catch (error) {
        log(`❌ Error processing ${filePath}: ${error.message}`, 'red');
      }
    }
  });
  
  log(`📊 Stage 3 Summary: ${fixedFiles} files modified`, 'blue');
  return fixedFiles;
}

/**
 * Stage 4: Fix TypeScript override modifiers
 */
function stage4_FixOverrideModifiers() {
  logSection('Stage 4: Fix Override Modifiers');
  
  const filePath = 'src/components/ErrorBoundary.tsx';
  
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Add override modifiers
      content = content.replace(
        /(\s+)componentDidCatch\(/g,
        '$1override componentDidCatch('
      );
      content = content.replace(
        /(\s+)render\(\s*\)\s*{/g,
        '$1override render() {'
      );
      
      fs.writeFileSync(filePath, content);
      log(`🔧 Added override modifiers to ${filePath}`, 'green');
      return 1;
      
    } catch (error) {
      log(`❌ Error processing ${filePath}: ${error.message}`, 'red');
    }
  }
  
  return 0;
}

/**
 * Check TypeScript compilation
 */
function checkTypeScript() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    log('✅ TypeScript compilation successful', 'green');
    return true;
  } catch (error) {
    log('❌ TypeScript compilation failed', 'red');
    return false;
  }
}

/**
 * Main function
 */
function gradualQualityFix() {
  log(`${colors.bold}🔄 Gradual Code Quality Fix${colors.reset}`, 'magenta');
  log('Applying fixes in safe stages...\n');
  
  const startTime = Date.now();
  let totalChanges = 0;
  
  // Stage 1: Fix unused variables (safest)
  totalChanges += stage1_FixUnusedVariables();
  
  // Stage 2: Fix imports
  if (stage2_FixImports()) {
    totalChanges++;
  }
  
  // Stage 3: Fix React imports
  totalChanges += stage3_FixReactImports();
  
  // Stage 4: Fix override modifiers
  totalChanges += stage4_FixOverrideModifiers();
  
  // Check TypeScript after each stage
  logSection('Final Verification');
  const tsSuccess = checkTypeScript();
  
  // Generate summary
  logSection('Summary');
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  log(`🎯 Applied ${totalChanges} types of fixes in ${duration}s`, 'blue');
  log(`📊 TypeScript compilation: ${tsSuccess ? '✅ PASS' : '❌ FAIL'}`, tsSuccess ? 'green' : 'red');
  
  if (tsSuccess) {
    log('\n💡 Next steps:', 'blue');
    log('  • Run: npm run quality:quick', 'blue');
    log('  • Review remaining ESLint warnings', 'blue');
    log('  • Consider running Prettier on individual files', 'blue');
  } else {
    log('\n🔍 TypeScript errors remain. Check specific files manually.', 'yellow');
  }
  
  return { totalChanges, tsSuccess };
}

if (require.main === module) {
  gradualQualityFix();
}

module.exports = { gradualQualityFix };
