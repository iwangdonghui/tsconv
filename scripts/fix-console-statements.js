#!/usr/bin/env node

/**
 * Console Statements Fix Script
 * 
 * This script replaces console statements with proper logging or removes debug statements
 */

import fs from 'fs';
import { execSync } from 'child_process';

function getConsoleErrors() {
  try {
    const output = execSync('npm run lint -- --format=compact 2>&1 | grep "no-console"', { encoding: 'utf8' });
    return output.split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

function parseConsoleError(line) {
  // Format: /path/file.ts: line X, col Y, Warning - Unexpected console statement. (no-console)
  const match = line.match(/^([^:]+):\s*line\s+(\d+),\s*col\s+\d+,\s*Warning\s*-\s*Unexpected console statement/);
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2])
    };
  }
  return null;
}

function fixConsoleLine(filePath, lineNumber) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lineNumber > lines.length) return { fixed: false, action: 'line_not_found' };
    
    const line = lines[lineNumber - 1];
    const trimmedLine = line.trim();
    
    // Skip if line doesn't contain console
    if (!trimmedLine.includes('console.')) {
      return { fixed: false, action: 'no_console_found' };
    }
    
    // Determine the action based on console type and context
    let newLine = line;
    let action = 'unknown';
    
    if (trimmedLine.includes('console.error')) {
      // Keep error logging but make it conditional
      if (!trimmedLine.includes('process.env.NODE_ENV')) {
        const indent = line.match(/^(\s*)/)[1];
        newLine = `${indent}if (process.env.NODE_ENV === 'development') ${trimmedLine}`;
        action = 'wrapped_error';
      } else {
        return { fixed: false, action: 'already_conditional' };
      }
    } else if (trimmedLine.includes('console.warn')) {
      // Keep warnings but make them conditional
      if (!trimmedLine.includes('process.env.NODE_ENV')) {
        const indent = line.match(/^(\s*)/)[1];
        newLine = `${indent}if (process.env.NODE_ENV === 'development') ${trimmedLine}`;
        action = 'wrapped_warn';
      } else {
        return { fixed: false, action: 'already_conditional' };
      }
    } else if (trimmedLine.includes('console.log') || trimmedLine.includes('console.info')) {
      // Remove debug console.log statements
      if (trimmedLine.includes('debug') || trimmedLine.includes('Debug') || 
          trimmedLine.includes('test') || trimmedLine.includes('Test')) {
        newLine = '';
        action = 'removed_debug';
      } else {
        // Make other console.log conditional
        const indent = line.match(/^(\s*)/)[1];
        newLine = `${indent}if (process.env.NODE_ENV === 'development') ${trimmedLine}`;
        action = 'wrapped_log';
      }
    } else {
      // Other console methods - make conditional
      const indent = line.match(/^(\s*)/)[1];
      newLine = `${indent}if (process.env.NODE_ENV === 'development') ${trimmedLine}`;
      action = 'wrapped_other';
    }
    
    if (newLine !== line) {
      lines[lineNumber - 1] = newLine;
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      return { fixed: true, action, oldLine: trimmedLine, newLine: newLine.trim() };
    }
    
    return { fixed: false, action: 'no_change_needed' };
  } catch (error) {
    console.error(`Failed to fix ${filePath}:`, error.message);
    return { fixed: false, action: 'error', error: error.message };
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
  console.log('🔧 Console Statements Fix Tool');
  console.log('===============================');
  
  const errors = getConsoleErrors();
  console.log(`📊 Found ${errors.length} console statement warnings`);
  
  if (errors.length === 0) {
    console.log('✅ No console statement warnings found');
    return;
  }
  
  let fixedCount = 0;
  let skippedCount = 0;
  const actionCounts = {};
  
  // Group errors by file
  const errorsByFile = {};
  
  for (const errorLine of errors) {
    const parsed = parseConsoleError(errorLine);
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
      const result = fixConsoleLine(error.file, error.line);
      
      if (result.fixed) {
        console.log(`   ✅ ${result.action}: ${result.oldLine}`);
        if (result.newLine) {
          console.log(`      → ${result.newLine}`);
        }
        fileFixedCount++;
        fixedCount++;
        actionCounts[result.action] = (actionCounts[result.action] || 0) + 1;
      } else {
        console.log(`   ⚠️  ${result.action}: line ${error.line}`);
        skippedCount++;
      }
    }
    
    if (fileFixedCount > 0) {
      console.log(`   📊 Fixed ${fileFixedCount} console statements in this file`);
    }
  }
  
  console.log('\n📊 Summary');
  console.log('===========');
  console.log(`✅ Fixed: ${fixedCount} console statements`);
  console.log(`⚠️  Skipped: ${skippedCount} statements`);
  
  if (Object.keys(actionCounts).length > 0) {
    console.log('\n📋 Actions taken:');
    for (const [action, count] of Object.entries(actionCounts)) {
      console.log(`   ${action}: ${count}`);
    }
  }
  
  if (fixedCount > 0) {
    console.log('\n🔍 Checking TypeScript compilation...');
    if (checkTypeScript()) {
      console.log('✅ TypeScript compilation passed');
    } else {
      console.log('❌ TypeScript compilation failed - please review changes');
    }
    
    console.log('\n🎉 Console statements fix completed!');
  }
}

main();
