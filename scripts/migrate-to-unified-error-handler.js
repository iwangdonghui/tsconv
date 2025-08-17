#!/usr/bin/env node

/**
 * Automated Migration Script for Unified Error Handler
 * 
 * This script automatically migrates files from the old error handling system
 * to the new unified error handler.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  targetDir: 'api',
  excludeDirs: ['__tests__', 'node_modules', '.git'],
  fileExtensions: ['.ts', '.js'],
};

/**
 * Find all files that need migration
 */
function findFilesToMigrate() {
  try {
    const output = execSync(
      `grep -r "APIErrorHandler\\|createUnifiedErrorMiddleware\\|EnhancedErrorManager" ${CONFIG.targetDir}/ --include="*.ts" --exclude-dir=__tests__ -l`,
      { encoding: 'utf8' }
    );
    return output.split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

/**
 * Read file content
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Failed to read file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Write file content
 */
function writeFile(filePath, content) {
  if (CONFIG.dryRun) {
    console.log(`[DRY RUN] Would write to ${filePath}`);
    return true;
  }

  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Failed to write file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Migrate imports in file content
 */
function migrateImports(content) {
  let newContent = content;

  // Add unified error handler import if not present
  if (!newContent.includes('unified-error-handler')) {
    // Find the first import line
    const importMatch = newContent.match(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/m);
    if (importMatch) {
      const importLine = "import { createError, ErrorType, handleError } from '../services/unified-error-handler';";
      newContent = newContent.replace(
        importMatch[0],
        importMatch[0] + '\n' + importLine
      );
    }
  }

  // Remove old error handler imports
  newContent = newContent.replace(
    /import\s+\{[^}]*APIErrorHandler[^}]*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
    ''
  );

  newContent = newContent.replace(
    /import\s+\{[^}]*createUnifiedErrorMiddleware[^}]*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
    ''
  );

  newContent = newContent.replace(
    /import\s+\{[^}]*EnhancedErrorManager[^}]*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
    ''
  );

  return newContent;
}

/**
 * Migrate error handling calls
 */
function migrateErrorCalls(content) {
  let newContent = content;

  // Replace APIErrorHandler.handleNotFound
  newContent = newContent.replace(
    /APIErrorHandler\.handleNotFound\(([^,]+),\s*([^)]+)\)/g,
    (match, res, message) => {
      return `handleError(createError({ type: ErrorType.NOT_FOUND_ERROR, message: ${message} }), req, ${res})`;
    }
  );

  // Replace APIErrorHandler.handleBadRequest
  newContent = newContent.replace(
    /APIErrorHandler\.handleBadRequest\(([^,]+),\s*([^)]+)\)/g,
    (match, res, message) => {
      return `handleError(createError({ type: ErrorType.VALIDATION_ERROR, message: ${message} }), req, ${res})`;
    }
  );

  // Replace APIErrorHandler.handleUnauthorized
  newContent = newContent.replace(
    /APIErrorHandler\.handleUnauthorized\(([^,]+),\s*([^)]+)\)/g,
    (match, res, message) => {
      return `handleError(createError({ type: ErrorType.UNAUTHORIZED_ERROR, message: ${message} }), req, ${res})`;
    }
  );

  // Replace APIErrorHandler.handleMethodNotAllowed
  newContent = newContent.replace(
    /APIErrorHandler\.handleMethodNotAllowed\(([^,]+),\s*([^)]+)\)/g,
    (match, res, message) => {
      return `handleError(createError({ type: ErrorType.BAD_REQUEST_ERROR, message: ${message}, statusCode: 405 }), req, ${res})`;
    }
  );

  // Replace APIErrorHandler.handleServerError
  newContent = newContent.replace(
    /APIErrorHandler\.handleServerError\(([^,]+),\s*([^)]+)(?:,\s*[^)]+)?\)/g,
    (match, res, error) => {
      return `handleError(${error}, req, ${res})`;
    }
  );

  // Replace simple catch blocks
  newContent = newContent.replace(
    /catch\s*\([^)]*\)\s*\{\s*console\.error\([^)]+\);\s*return\s+APIErrorHandler\.handleServerError\([^)]+\);\s*\}/g,
    'catch (error) {\n    return handleError(error as Error, req, res);\n  }'
  );

  return newContent;
}

/**
 * Remove old error middleware configurations
 */
function removeOldMiddleware(content) {
  let newContent = content;

  // Remove createUnifiedErrorMiddleware configurations
  newContent = newContent.replace(
    /const\s+errorMiddleware\s*=\s*createUnifiedErrorMiddleware\([^}]+\}\);?\s*/g,
    '// Error handling is now handled by the unified error handler\n'
  );

  return newContent;
}

/**
 * Migrate a single file
 */
function migrateFile(filePath) {
  console.log(`📝 Migrating: ${filePath}`);

  const content = readFile(filePath);
  if (!content) {
    return false;
  }

  let newContent = content;
  newContent = migrateImports(newContent);
  newContent = migrateErrorCalls(newContent);
  newContent = removeOldMiddleware(newContent);

  // Check if any changes were made
  if (newContent === content) {
    console.log(`   ℹ️  No changes needed`);
    return true;
  }

  if (CONFIG.verbose) {
    console.log(`   ✅ Changes applied`);
  }

  return writeFile(filePath, newContent);
}

/**
 * Check TypeScript compilation
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
 * Main execution function
 */
async function main() {
  console.log('🔄 Unified Error Handler Migration Tool');
  console.log('=======================================');
  
  if (CONFIG.dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified');
  }

  const filesToMigrate = findFilesToMigrate();
  console.log(`📊 Found ${filesToMigrate.length} files to migrate`);

  if (filesToMigrate.length === 0) {
    console.log('✅ No files need migration');
    return;
  }

  let successCount = 0;
  let failureCount = 0;

  for (const filePath of filesToMigrate) {
    if (migrateFile(filePath)) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log('\n📊 Migration Summary');
  console.log('====================');
  console.log(`✅ Successfully migrated: ${successCount} files`);
  console.log(`❌ Failed to migrate: ${failureCount} files`);

  if (!CONFIG.dryRun && successCount > 0) {
    console.log('\n🔍 Checking TypeScript compilation...');
    if (checkTypeScript()) {
      console.log('✅ TypeScript compilation passed');
    } else {
      console.log('❌ TypeScript compilation failed - please review changes');
    }
  }

  if (successCount > 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('📋 Next steps:');
    console.log('1. Review the migrated files');
    console.log('2. Run tests to ensure functionality');
    console.log('3. Remove old error handling files');
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
