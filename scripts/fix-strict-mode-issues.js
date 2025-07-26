#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔧 Fixing TypeScript strict mode issues...\n');

// Get all TypeScript errors
function getTypeScriptErrors() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return [];
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    const lines = output.split('\n').filter(line => line.includes('error TS'));
    return lines.map(line => {
      const match = line.match(/^(.+?):(\d+):(\d+) - error (TS\d+): (.+)$/);
      if (match) {
        return {
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: match[4],
          message: match[5]
        };
      }
      return null;
    }).filter(Boolean);
  }
}

// Fix unused React imports
function fixUnusedReactImports(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove unused React import when JSX is used with new transform
  if (content.includes("import React") && !content.includes("React.")) {
    content = content.replace(/import React,?\s*\{?\s*([^}]*)\s*\}?\s*from\s*['"]react['"];?\n?/g, (match, imports) => {
      if (imports.trim()) {
        return `import { ${imports.trim()} } from 'react';\n`;
      }
      return ''; // Remove the entire import if only React was imported
    });
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Fix unused variables by prefixing with underscore
function fixUnusedVariables(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Common patterns for unused variables
  const patterns = [
    // Function parameters
    { pattern: /(\w+): (\w+)(?=\s*[,)])/g, replacement: '_$1: $2' },
    // Destructured variables
    { pattern: /const\s+\{\s*(\w+)\s*\}/g, replacement: 'const { _$1 }' },
    // Regular const declarations
    { pattern: /const\s+(\w+)\s*=/g, replacement: 'const _$1 =' },
  ];

  // Apply patterns carefully to avoid breaking working code
  // This is a simplified approach - in practice, you'd want more sophisticated parsing

  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Add explicit any types
function addExplicitAnyTypes(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Add : any to function parameters that need it
  // This is a basic implementation - more sophisticated parsing would be better
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Main execution
const errors = getTypeScriptErrors();
console.log(`Found ${errors.length} TypeScript errors to fix\n`);

// Group errors by file
const errorsByFile = {};
errors.forEach(error => {
  if (!errorsByFile[error.file]) {
    errorsByFile[error.file] = [];
  }
  errorsByFile[error.file].push(error);
});

let fixedFiles = 0;

// Fix React imports first (common issue)
console.log('🔧 Fixing unused React imports...');
for (const filePath of Object.keys(errorsByFile)) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    if (fixUnusedReactImports(filePath)) {
      console.log(`  ✅ Fixed React imports in ${filePath}`);
      fixedFiles++;
    }
  }
}

console.log(`\n📊 Fixed ${fixedFiles} files`);

// Run TypeScript check again to see progress
console.log('\n🧪 Running TypeScript compilation check...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ All TypeScript errors fixed!');
} catch (error) {
  const output = error.stdout?.toString() || error.stderr?.toString() || '';
  const remainingErrors = (output.match(/error TS/g) || []).length;
  console.log(`⚠️  ${remainingErrors} TypeScript errors remaining`);
  
  // Show breakdown of remaining error types
  const errorTypes = {};
  output.split('\n').forEach(line => {
    const match = line.match(/error (TS\d+):/);
    if (match) {
      const code = match[1];
      errorTypes[code] = (errorTypes[code] || 0) + 1;
    }
  });
  
  console.log('\nRemaining error types:');
  Object.entries(errorTypes).forEach(([code, count]) => {
    console.log(`  ${code}: ${count} errors`);
  });
}
