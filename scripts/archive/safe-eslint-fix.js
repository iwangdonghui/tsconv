#!/usr/bin/env node

/**
 * Safe ESLint Fix Script
 *
 * This script provides a safe, incremental approach to fixing ESLint errors
 * without breaking TypeScript compilation.
 */

import { execSync } from 'child_process';

// Configuration
const CONFIG = {
  maxFilesPerBatch: 10,
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  targetRules: [
    '@typescript-eslint/no-unused-vars',
    'no-console',
    '@typescript-eslint/no-explicit-any',
    'complexity',
  ],
};

/**
 * Get ESLint errors for specific rules with file paths
 */
function getESLintErrors(rule) {
  try {
    const output = execSync(`npm run lint -- --format=compact 2>&1 | grep "${rule}"`, {
      encoding: 'utf8',
    });
    return output.split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

/**
 * Get total ESLint error count
 */
function getTotalErrorCount() {
  try {
    const output = execSync('npm run lint 2>&1 | grep -E "(error|warning)" | wc -l', {
      encoding: 'utf8',
    });
    return parseInt(output.trim());
  } catch (error) {
    return 0;
  }
}

/**
 * Check if TypeScript compilation passes
 */
function checkTypeScript() {
  try {
    execSync('npm run type-check', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Apply ESLint auto-fix to specific files
 */
function applyAutoFix(files) {
  if (CONFIG.dryRun) {
    console.log(`[DRY RUN] Would fix files: ${files.join(', ')}`);
    return true;
  }

  try {
    const fileList = files.join(' ');
    execSync(`npx eslint ${fileList} --fix`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`Failed to fix files: ${error.message}`);
    return false;
  }
}

/**
 * Extract file paths from ESLint error lines (compact format)
 */
function extractFilePaths(errorLines) {
  const files = new Set();
  errorLines.forEach(line => {
    // Compact format: /path/to/file: line X, col Y, Error - message (rule-name)
    const match = line.match(/^([^:]+):\s*line\s+\d+/);
    if (match) {
      files.add(match[1]);
    }
  });
  return Array.from(files);
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔧 Safe ESLint Fix Tool');
  console.log('========================');

  const initialErrorCount = getTotalErrorCount();
  console.log(`📊 Initial ESLint errors: ${initialErrorCount}`);

  if (!checkTypeScript()) {
    console.error('❌ TypeScript compilation failed. Please fix TypeScript errors first.');
    process.exit(1);
  }

  console.log('✅ TypeScript compilation passes');

  // Process each rule type
  for (const rule of CONFIG.targetRules) {
    console.log(`\n🎯 Processing rule: ${rule}`);

    const errors = getESLintErrors(rule);
    if (errors.length === 0) {
      console.log(`✅ No errors found for ${rule}`);
      continue;
    }

    console.log(`📋 Found ${errors.length} errors for ${rule}`);

    const files = extractFilePaths(errors);
    console.log(`📁 Affected files: ${files.length}`);

    // Process files in batches
    for (let i = 0; i < files.length; i += CONFIG.maxFilesPerBatch) {
      const batch = files.slice(i, i + CONFIG.maxFilesPerBatch);
      console.log(
        `\n🔄 Processing batch ${Math.floor(i / CONFIG.maxFilesPerBatch) + 1}/${Math.ceil(files.length / CONFIG.maxFilesPerBatch)}`
      );

      if (CONFIG.verbose) {
        console.log(`   Files: ${batch.join(', ')}`);
      }

      // Apply fixes
      const success = applyAutoFix(batch);
      if (!success) {
        console.error(`❌ Failed to fix batch, skipping...`);
        continue;
      }

      // Verify TypeScript still compiles
      if (!checkTypeScript()) {
        console.error(`❌ TypeScript compilation broken after fixing batch, reverting...`);
        execSync('git checkout -- ' + batch.join(' '));
        continue;
      }

      console.log(`✅ Batch processed successfully`);
    }
  }

  const finalErrorCount = getTotalErrorCount();
  const reduction = initialErrorCount - finalErrorCount;
  const percentage = initialErrorCount > 0 ? ((reduction / initialErrorCount) * 100).toFixed(1) : 0;

  console.log('\n📊 Summary');
  console.log('===========');
  console.log(`Initial errors: ${initialErrorCount}`);
  console.log(`Final errors: ${finalErrorCount}`);
  console.log(`Errors fixed: ${reduction} (${percentage}%)`);

  if (reduction > 0) {
    console.log('🎉 ESLint errors successfully reduced!');
  } else {
    console.log('ℹ️ No errors were automatically fixable');
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
