#!/usr/bin/env node

/**
 * TypeScript Error Fix Script
 * 
 * This script fixes common TypeScript errors in the codebase.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// TypeScript Error Fixes
// ============================================================================

const FIXES = [
  // Remove unused imports and variables
  {
    file: 'api/admin/api-keys.ts',
    fixes: [
      {
        search: /interface UpdateAPIKeyRequest \{[\s\S]*?\}/,
        replace: '// UpdateAPIKeyRequest interface removed (unused)'
      },
      {
        search: /const updateAPIKeySchema = \{[\s\S]*?\};/,
        replace: '// updateAPIKeySchema removed (unused)'
      }
    ]
  },
  
  // Fix security monitoring duplicate exports
  {
    file: 'api/admin/security-monitoring.ts',
    fixes: [
      {
        search: /export \{ SecurityAnalytics \};/,
        replace: '// SecurityAnalytics already exported above'
      }
    ]
  },
  
  // Fix unused variables with underscore prefix
  {
    file: 'api/handlers/metrics.ts',
    fixes: [
      {
        search: /const ___dbSize/g,
        replace: 'const _dbSize'
      },
      {
        search: /function _extractInfoValue/,
        replace: 'function __extractInfoValue'
      }
    ]
  },
  
  // Fix unused React imports
  {
    file: 'src/components/ui/error-message.tsx',
    fixes: [
      {
        search: /import \* as React from "react";/,
        replace: '// React import removed (unused in this file)'
      }
    ]
  }
];

/**
 * Applies fixes to a specific file
 */
function applyFixes(filePath, fixes) {
  if (!fs.existsSync(filePath)) {
    return { success: false, reason: 'File not found' };
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changeCount = 0;
    
    for (const fix of fixes) {
      const originalContent = content;
      content = content.replace(fix.search, fix.replace);
      if (content !== originalContent) {
        changeCount++;
      }
    }
    
    if (changeCount > 0) {
      fs.writeFileSync(filePath, content);
      return { success: true, changes: changeCount };
    }
    
    return { success: false, reason: 'No changes needed' };
    
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

/**
 * Adds null checks to prevent undefined errors
 */
function addNullChecks(filePath) {
  if (!fs.existsSync(filePath)) {
    return { success: false, reason: 'File not found' };
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Fix common undefined access patterns
    const patterns = [
      // Fix: ipCounts[log.ip].requests++
      {
        search: /(\w+)\[([^\]]+)\]\.(\w+)\+\+/g,
        replace: (match, obj, key, prop) => {
          return `if (${obj}[${key}]) ${obj}[${key}].${prop}++`;
        }
      },
      
      // Fix: match[1] in parseInt
      {
        search: /parseInt\(([^)]+)\[(\d+)\]\)/g,
        replace: (match, arr, index) => {
          return `parseInt(${arr}[${index}] || '0')`;
        }
      }
    ];
    
    for (const pattern of patterns) {
      const originalContent = content;
      content = content.replace(pattern.search, pattern.replace);
      if (content !== originalContent) {
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      return { success: true };
    }
    
    return { success: false, reason: 'No changes needed' };
    
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

/**
 * Main fix function
 */
function fixTypeScriptErrors() {
  log(`${colors.bold}🔧 Fixing TypeScript Errors${colors.reset}`, 'cyan');
  log('Applying common TypeScript error fixes...\n');
  
  let totalFixed = 0;
  
  // Apply specific fixes
  for (const fixGroup of FIXES) {
    const relativePath = fixGroup.file;
    log(`🔄 Processing: ${relativePath}`, 'blue');
    
    const result = applyFixes(fixGroup.file, fixGroup.fixes);
    
    if (result.success) {
      totalFixed++;
      log(`  ✅ Applied ${result.changes} fixes`, 'green');
    } else {
      log(`  ⏭️ ${result.reason}`, 'yellow');
    }
  }
  
  // Apply null checks to security monitoring
  log(`\n🔄 Adding null checks to security monitoring...`, 'blue');
  const nullCheckResult = addNullChecks('api/admin/security-monitoring.ts');
  if (nullCheckResult.success) {
    totalFixed++;
    log(`  ✅ Added null checks`, 'green');
  } else {
    log(`  ⏭️ ${nullCheckResult.reason}`, 'yellow');
  }
  
  // Summary
  log(`\n${colors.bold}📊 Fix Summary${colors.reset}`, 'cyan');
  log(`✅ Files processed: ${totalFixed}`, 'green');
  
  if (totalFixed > 0) {
    log(`\n🎉 TypeScript errors fixed!`, 'green');
    log(`Run 'npm run build' to verify the fixes`, 'blue');
  } else {
    log(`\n📝 No fixes were needed`, 'blue');
  }
  
  return { totalFixed };
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  try {
    const result = fixTypeScriptErrors();
    
    log(`\n📝 Next steps:`, 'cyan');
    log(`1. Run 'npm run build' to check remaining errors`, 'blue');
    log(`2. Fix any remaining errors manually if needed`, 'blue');
    log(`3. Test the application functionality`, 'blue');
    
  } catch (error) {
    log(`❌ Fix failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixTypeScriptErrors, applyFixes, addNullChecks };
