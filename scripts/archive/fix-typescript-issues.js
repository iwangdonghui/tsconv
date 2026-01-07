#!/usr/bin/env node

/**
 * TypeScript Issues Fix Script
 * Automatically fixes common TypeScript issues
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔧 Fixing TypeScript Issues\n');

// Get TypeScript errors
function getTypeScriptErrors() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return [];
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    const errors = output
      .split('\n')
      .filter(line => line.includes('error TS'))
      .map(line => {
        const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
        if (match) {
          return {
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            code: match[4],
            message: match[5],
            raw: line,
          };
        }
        return null;
      })
      .filter(Boolean);
    return errors;
  }
}

// Fix unused parameters by prefixing with underscore
function fixUnusedParameters(filePath, errors) {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const unusedParamErrors = errors.filter(
    e =>
      e.file === filePath &&
      e.code === 'TS6133' &&
      e.message.includes('is declared but its value is never read')
  );

  for (const error of unusedParamErrors) {
    const lines = content.split('\n');
    const line = lines[error.line - 1];

    // Extract parameter name from error message
    const paramMatch = error.message.match(/'([^']+)' is declared but its value is never read/);
    if (!paramMatch) continue;

    const paramName = paramMatch[1];

    // Skip if already prefixed with underscore
    if (paramName.startsWith('_')) continue;

    // Replace parameter name with underscore prefix
    const newParamName = `_${paramName}`;
    const regex = new RegExp(`\\b${paramName}\\b`, 'g');

    // Only replace in function parameters, not in function body
    if (line.includes('(') && line.includes(paramName)) {
      lines[error.line - 1] = line.replace(regex, newParamName);
      modified = true;
      console.log(
        `  ✅ Fixed unused parameter '${paramName}' -> '${newParamName}' in ${filePath}:${error.line}`
      );
    } else if (line.includes('const ') && line.includes(paramName)) {
      lines[error.line - 1] = line.replace(regex, newParamName);
      modified = true;
      console.log(
        `  ✅ Fixed unused variable '${paramName}' -> '${newParamName}' in ${filePath}:${error.line}`
      );
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
  }

  return modified;
}

// Fix unused variables by prefixing with underscore
function fixUnusedVariables(filePath, errors) {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const unusedVarErrors = errors.filter(
    e =>
      e.file === filePath &&
      e.code === 'TS6133' &&
      e.message.includes('is declared but its value is never read')
  );

  for (const error of unusedVarErrors) {
    const lines = content.split('\n');
    const line = lines[error.line - 1];

    // Extract variable name from error message
    const varMatch = error.message.match(/'([^']+)' is declared but its value is never read/);
    if (!varMatch) continue;

    const varName = varMatch[1];

    // Skip if already prefixed with underscore
    if (varName.startsWith('_')) continue;

    // Replace variable name with underscore prefix
    const newVarName = `_${varName}`;

    // Only replace the declaration, not usage
    if (line.includes('const ') || line.includes('let ') || line.includes('var ')) {
      lines[error.line - 1] = line.replace(new RegExp(`\\b${varName}\\b`), newVarName);
      modified = true;
      console.log(
        `  ✅ Fixed unused variable '${varName}' -> '${newVarName}' in ${filePath}:${error.line}`
      );
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
  }

  return modified;
}

// Add explicit any types for implicit any errors
function fixImplicitAny(filePath, errors) {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const implicitAnyErrors = errors.filter(
    e => e.file === filePath && (e.code === 'TS7006' || e.code === 'TS7010')
  );

  for (const error of implicitAnyErrors) {
    const lines = content.split('\n');
    const line = lines[error.line - 1];

    if (error.code === 'TS7006') {
      // Parameter implicitly has 'any' type
      const paramMatch = error.message.match(/Parameter '([^']+)' implicitly has an 'any' type/);
      if (paramMatch) {
        const paramName = paramMatch[1];
        // Add : any type annotation
        const regex = new RegExp(`\\b${paramName}\\b(?!:)`);
        if (regex.test(line)) {
          lines[error.line - 1] = line.replace(regex, `${paramName}: any`);
          modified = true;
          console.log(
            `  ✅ Added explicit 'any' type to parameter '${paramName}' in ${filePath}:${error.line}`
          );
        }
      }
    } else if (error.code === 'TS7010') {
      // Function lacks return type annotation
      const funcMatch = error.message.match(/'([^']+)', which lacks return-type annotation/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        // Add : any return type
        if (line.includes(`${funcName}(`)) {
          const regex = new RegExp(`(${funcName}\\([^)]*\\))(?!:)`);
          if (regex.test(line)) {
            lines[error.line - 1] = line.replace(regex, '$1: any');
            modified = true;
            console.log(
              `  ✅ Added explicit 'any' return type to function '${funcName}' in ${filePath}:${error.line}`
            );
          }
        }
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
  }

  return modified;
}

// Remove unused imports
function fixUnusedImports(filePath, errors) {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const unusedImportErrors = errors.filter(
    e =>
      e.file === filePath && e.code === 'TS6196' && e.message.includes('is declared but never used')
  );

  for (const error of unusedImportErrors) {
    const lines = content.split('\n');
    const line = lines[error.line - 1];

    // Extract import name from error message
    const importMatch = error.message.match(/'([^']+)' is declared but never used/);
    if (!importMatch) continue;

    const importName = importMatch[1];

    // Remove the unused import
    if (line.includes(`import`) && line.includes(importName)) {
      // If it's the only import, remove the entire line
      if (line.match(new RegExp(`import\\s*{\\s*${importName}\\s*}`))) {
        lines.splice(error.line - 1, 1);
        modified = true;
        console.log(`  ✅ Removed unused import '${importName}' from ${filePath}:${error.line}`);
      } else {
        // Remove just this import from the list
        const newLine = line
          .replace(new RegExp(`,?\\s*${importName}\\s*,?`), '')
          .replace(/,\s*}/, ' }');
        lines[error.line - 1] = newLine;
        modified = true;
        console.log(
          `  ✅ Removed unused import '${importName}' from import list in ${filePath}:${error.line}`
        );
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
  }

  return modified;
}

async function main() {
  console.log('📊 Analyzing TypeScript errors...');

  const errors = getTypeScriptErrors();
  console.log(`Found ${errors.length} TypeScript errors`);

  if (errors.length === 0) {
    console.log('✅ No TypeScript errors found!');
    return;
  }

  // Group errors by file
  const errorsByFile = {};
  errors.forEach(error => {
    if (!errorsByFile[error.file]) {
      errorsByFile[error.file] = [];
    }
    errorsByFile[error.file].push(error);
  });

  console.log(`\n🔧 Fixing errors in ${Object.keys(errorsByFile).length} files...\n`);

  let totalFixed = 0;

  // Fix errors file by file
  for (const [filePath, fileErrors] of Object.entries(errorsByFile)) {
    console.log(`📁 Processing ${filePath} (${fileErrors.length} errors):`);

    let fileFixed = 0;

    // Fix unused imports first
    if (fixUnusedImports(filePath, fileErrors)) fileFixed++;

    // Fix unused parameters
    if (fixUnusedParameters(filePath, fileErrors)) fileFixed++;

    // Fix unused variables
    if (fixUnusedVariables(filePath, fileErrors)) fileFixed++;

    // Fix implicit any types
    if (fixImplicitAny(filePath, fileErrors)) fileFixed++;

    if (fileFixed === 0) {
      console.log(`  ⚠️  No automatic fixes available for this file`);
    }

    totalFixed += fileFixed;
  }

  console.log(`\n📊 Fixed issues in ${totalFixed} locations`);

  // Test compilation again
  console.log('\n🧪 Testing compilation after fixes...');
  const remainingErrors = getTypeScriptErrors();

  if (remainingErrors.length === 0) {
    console.log('✅ All TypeScript errors fixed!');
  } else {
    console.log(
      `⚠️  ${remainingErrors.length} errors remaining (${errors.length - remainingErrors.length} fixed)`
    );

    // Show remaining error types
    const errorTypes = {};
    remainingErrors.forEach(error => {
      errorTypes[error.code] = (errorTypes[error.code] || 0) + 1;
    });

    console.log('\n📋 Remaining error types:');
    Object.entries(errorTypes).forEach(([code, count]) => {
      console.log(`  ${code}: ${count} errors`);
    });
  }

  console.log('\n🎯 Next Steps:');
  if (remainingErrors.length > 0) {
    console.log('1. Review remaining errors manually');
    console.log('2. Add proper type annotations where needed');
    console.log('3. Run: npm run typescript:optimize again');
  } else {
    console.log('1. Run: npm run typescript:optimize to enable strict mode');
    console.log('2. Test application functionality');
    console.log('3. Continue with next improvement tasks');
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('🔧 TypeScript Issues Fix Complete!');
}

// Run the fix
main().catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});
