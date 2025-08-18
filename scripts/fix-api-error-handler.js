#!/usr/bin/env node

/**
 * Quick Fix Script for APIErrorHandler Calls
 * 
 * This script replaces APIErrorHandler calls with unified error handler calls
 */

import fs from 'fs';

const files = [
  'api/enhanced-format-convert.ts',
  'api/enhanced-health.ts', 
  'api/optimized-batch-convert.ts'
];

function fixFile(filePath) {
  console.log(`🔧 Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Replace APIErrorHandler.handleMethodNotAllowed
  const methodNotAllowedRegex = /APIErrorHandler\.handleMethodNotAllowed\(([^,]+),\s*([^)]+)\)/g;
  content = content.replace(methodNotAllowedRegex, (match, res, message) => {
    changes++;
    return `handleError(createError({ type: ErrorType.BAD_REQUEST_ERROR, message: ${message}, statusCode: 405 }), req, ${res})`;
  });

  // Replace APIErrorHandler.handleBadRequest
  const badRequestRegex = /APIErrorHandler\.handleBadRequest\(([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\)/g;
  content = content.replace(badRequestRegex, (match, res, message) => {
    changes++;
    return `handleError(createError({ type: ErrorType.VALIDATION_ERROR, message: ${message} }), req, ${res})`;
  });

  // Replace APIErrorHandler.handleServerError
  const serverErrorRegex = /APIErrorHandler\.handleServerError\(([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\)/g;
  content = content.replace(serverErrorRegex, (match, res, error) => {
    changes++;
    return `handleError(${error}, req, ${res})`;
  });

  // Replace APIErrorHandler.handleUnauthorized
  const unauthorizedRegex = /APIErrorHandler\.handleUnauthorized\(([^,]+),\s*([^)]+)\)/g;
  content = content.replace(unauthorizedRegex, (match, res, message) => {
    changes++;
    return `handleError(createError({ type: ErrorType.UNAUTHORIZED_ERROR, message: ${message} }), req, ${res})`;
  });

  // Replace APIErrorHandler.sendError and createError patterns
  const sendErrorRegex = /APIErrorHandler\.sendError\(\s*([^,]+),\s*APIErrorHandler\.createError\([^)]+\)\s*\)/g;
  content = content.replace(sendErrorRegex, (match, res) => {
    changes++;
    return `handleError(createError({ type: ErrorType.INTERNAL_ERROR, message: 'Processing failed' }), req, ${res})`;
  });

  // Remove old error middleware configurations
  const middlewareRegex = /const\s+errorMiddleware\s*=\s*createUnifiedErrorMiddleware\([^}]+\}\);?\s*/g;
  content = content.replace(middlewareRegex, () => {
    changes++;
    return '// Error handling is now handled by the unified error handler\n';
  });

  // Remove references to errorMiddleware calls
  const middlewareCallRegex = /await\s+errorMiddleware\([^)]+\);?/g;
  content = content.replace(middlewareCallRegex, (match) => {
    changes++;
    return 'return handleError(error as Error, req, res);';
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   ✅ Applied ${changes} changes`);
  } else {
    console.log(`   ℹ️  No changes needed`);
  }

  return changes;
}

function main() {
  console.log('🔄 APIErrorHandler Fix Tool');
  console.log('============================');
  
  let totalChanges = 0;
  
  for (const file of files) {
    try {
      const changes = fixFile(file);
      totalChanges += changes;
    } catch (error) {
      console.error(`❌ Failed to fix ${file}:`, error.message);
    }
  }
  
  console.log('\n📊 Summary');
  console.log('===========');
  console.log(`Total changes applied: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log('🎉 APIErrorHandler migration completed!');
  }
}

main();
