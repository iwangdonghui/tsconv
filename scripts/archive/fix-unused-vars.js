#!/usr/bin/env node

/**
 * Quick Fix Script for Unused Variables
 * 
 * This script fixes simple unused variable errors by adding underscore prefix
 */

import fs from 'fs';
import { execSync } from 'child_process';

function getUnusedVarErrors() {
  try {
    const output = execSync('npm run lint -- --format=compact 2>&1 | grep "@typescript-eslint/no-unused-vars"', { encoding: 'utf8' });
    return output.split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

function parseErrorLine(line) {
  // Format: /path/file.ts: line X, col Y, Error - 'varName' is defined but never used...
  const match = line.match(/^([^:]+):\s*line\s+(\d+),\s*col\s+\d+,\s*Error\s*-\s*'([^']+)'\s*is\s+(?:defined|assigned)/);
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2]),
      variable: match[3]
    };
  }
  return null;
}

function fixUnusedVar(filePath, lineNumber, varName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lineNumber > lines.length) return false;
    
    const line = lines[lineNumber - 1];
    
    // Skip if already prefixed with underscore
    if (varName.startsWith('_')) return false;
    
    // Replace the variable name with underscore prefix
    const newVarName = `_${varName}`;
    const updatedLine = line.replace(new RegExp(`\\b${varName}\\b`, 'g'), newVarName);
    
    if (updatedLine !== line) {
      lines[lineNumber - 1] = updatedLine;
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Failed to fix ${filePath}:`, error.message);
    return false;
  }
}

function checkTypeScript() {
  try {
    execSync('npm run type-check', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

function main() {
  console.log('🔧 Unused Variables Fix Tool');
  console.log('=============================');
  
  const errors = getUnusedVarErrors();
  console.log(`📊 Found ${errors.length} unused variable errors`);
  
  if (errors.length === 0) {
    console.log('✅ No unused variable errors found');
    return;
  }
  
  let fixedCount = 0;
  let failedCount = 0;
  
  // Group errors by file to process efficiently
  const errorsByFile = {};
  
  for (const errorLine of errors) {
    const parsed = parseErrorLine(errorLine);
    if (parsed) {
      if (!errorsByFile[parsed.file]) {
        errorsByFile[parsed.file] = [];
      }
      errorsByFile[parsed.file].push(parsed);
    }
  }
  
  console.log(`📁 Processing ${Object.keys(errorsByFile).length} files`);
  
  for (const [filePath, fileErrors] of Object.entries(errorsByFile)) {
    console.log(`\n🔄 Processing: ${filePath.replace('/Users/donghui/dev/tsconv/', '')}`);
    
    // Sort by line number descending to avoid line number shifts
    fileErrors.sort((a, b) => b.line - a.line);
    
    let fileFixedCount = 0;
    
    for (const error of fileErrors) {
      if (fixUnusedVar(error.file, error.line, error.variable)) {
        console.log(`   ✅ Fixed: ${error.variable} → _${error.variable}`);
        fileFixedCount++;
        fixedCount++;
      } else {
        console.log(`   ⚠️  Skipped: ${error.variable}`);
        failedCount++;
      }
    }
    
    if (fileFixedCount > 0) {
      console.log(`   📊 Fixed ${fileFixedCount} variables in this file`);
    }
  }
  
  console.log('\n📊 Summary');
  console.log('===========');
  console.log(`✅ Fixed: ${fixedCount} variables`);
  console.log(`⚠️  Skipped: ${failedCount} variables`);
  
  if (fixedCount > 0) {
    console.log('\n🔍 Checking TypeScript compilation...');
    if (checkTypeScript()) {
      console.log('✅ TypeScript compilation passed');
    } else {
      console.log('❌ TypeScript compilation failed - please review changes');
    }
    
    console.log('\n🎉 Unused variables fix completed!');
  }
}

main();
