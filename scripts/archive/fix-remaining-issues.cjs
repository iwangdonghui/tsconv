#!/usr/bin/env node

/**
 * Fix Remaining Issues Script
 * 
 * This script fixes the remaining specific TypeScript issues in src/
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function fixRemainingIssues() {
  log(`${colors.bold}🔧 Fixing Remaining TypeScript Issues${colors.reset}`, 'blue');
  
  let totalFixed = 0;
  
  // Fix 1: Remove unused React imports in test files
  const testFiles = [
    'src/__tests__/TimestampConverter.integration.test.tsx',
    'src/components/examples/ValidationHookExample.tsx'
  ];
  
  testFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Remove unused React import if it's not used in JSX
        if (content.includes('import React from \'react\';') && 
            !content.includes('<') && !content.includes('React.')) {
          content = content.replace(/import React from 'react';\n?/, '');
          fs.writeFileSync(filePath, content);
          log(`🔧 Removed unused React import from ${filePath}`, 'green');
          totalFixed++;
        }
        
      } catch (error) {
        log(`❌ Error processing ${filePath}: ${error.message}`, 'red');
      }
    }
  });
  
  // Fix 2: Add underscore prefix to remaining unused variables
  const filesToFix = [
    {
      path: 'src/__tests__/TimestampConverter.integration.test.tsx',
      fixes: [
        { pattern: /const (__monthInput) = await/g, replacement: 'const $1 = await' },
        { pattern: /const (__dayInput) = await/g, replacement: 'const $1 = await' },
        { pattern: /const (__yearInput) = await/g, replacement: 'const $1 = await' },
        { pattern: /const (findByText) = /g, replacement: 'const _$1 = ' }
      ]
    },
    {
      path: 'src/components/__tests__/TimestampConverter.test.tsx',
      fixes: [
        { pattern: /const (container) = /g, replacement: 'const _$1 = ' }
      ]
    },
    {
      path: 'src/components/EnhancedApiDocs.tsx',
      fixes: [
        { pattern: /const \[(selectedEndpoint), (setSelectedEndpoint)\]/g, replacement: 'const [_$1, _$2]' }
      ]
    }
  ];
  
  filesToFix.forEach(({ path: filePath, fixes }) => {
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        fixes.forEach(({ pattern, replacement }) => {
          const newContent = content.replace(pattern, replacement);
          if (newContent !== content) {
            content = newContent;
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          fs.writeFileSync(filePath, content);
          log(`🔧 Fixed unused variables in ${filePath}`, 'green');
          totalFixed++;
        }
        
      } catch (error) {
        log(`❌ Error processing ${filePath}: ${error.message}`, 'red');
      }
    }
  });
  
  // Fix 3: Fix undefined parameter issues
  const parameterFixes = [
    {
      path: 'src/components/examples/ValidationHookExample.tsx',
      fixes: [
        { 
          pattern: /setInput\(match\[1\]\);/g, 
          replacement: 'setInput(match[1] || "");' 
        }
      ]
    },
    {
      path: 'src/components/FormatTool.tsx',
      fixes: [
        { 
          pattern: /setDate\(new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\);/g, 
          replacement: 'setDate(new Date().toISOString().split(\'T\')[0] || "");' 
        }
      ]
    },
    {
      path: 'src/components/WorkdaysCalculator.tsx',
      fixes: [
        { 
          pattern: /setStartDate\(getTodayDate\(\)\)/g, 
          replacement: 'setStartDate(getTodayDate() || "")' 
        }
      ]
    }
  ];
  
  parameterFixes.forEach(({ path: filePath, fixes }) => {
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        fixes.forEach(({ pattern, replacement }) => {
          const newContent = content.replace(pattern, replacement);
          if (newContent !== content) {
            content = newContent;
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          fs.writeFileSync(filePath, content);
          log(`🔧 Fixed parameter issues in ${filePath}`, 'green');
          totalFixed++;
        }
        
      } catch (error) {
        log(`❌ Error processing ${filePath}: ${error.message}`, 'red');
      }
    }
  });
  
  // Fix 4: Fix array access issues
  const arrayFixes = [
    {
      path: 'src/components/ui/optimized-image.tsx',
      fixes: [
        { 
          pattern: /src=\{imageSources\[imageSources\.length - 1\]\.src\}/g, 
          replacement: 'src={imageSources[imageSources.length - 1]?.src || ""}' 
        }
      ]
    },
    {
      path: 'src/components/ui/recovery-suggestions.tsx',
      fixes: [
        { 
          pattern: /await navigator\.clipboard\.writeText\(textToCopy\);/g, 
          replacement: 'await navigator.clipboard.writeText(textToCopy || "");' 
        }
      ]
    }
  ];
  
  arrayFixes.forEach(({ path: filePath, fixes }) => {
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        fixes.forEach(({ pattern, replacement }) => {
          const newContent = content.replace(pattern, replacement);
          if (newContent !== content) {
            content = newContent;
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          fs.writeFileSync(filePath, content);
          log(`🔧 Fixed array access issues in ${filePath}`, 'green');
          totalFixed++;
        }
        
      } catch (error) {
        log(`❌ Error processing ${filePath}: ${error.message}`, 'red');
      }
    }
  });
  
  log(`\n📊 Summary: ${totalFixed} files fixed`, 'blue');
  
  return totalFixed;
}

if (require.main === module) {
  const startTime = Date.now();
  const filesFixed = fixRemainingIssues();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (filesFixed > 0) {
    log(`✅ Fixed ${filesFixed} files in ${duration}s`, 'green');
    log('💡 Run "npx tsc --noEmit" to check remaining issues', 'blue');
  } else {
    log(`✅ No issues found to fix (${duration}s)`, 'green');
  }
}

module.exports = { fixRemainingIssues };
