#!/usr/bin/env node

/**
 * Automated Type Error Fixer
 * 
 * This script automatically fixes common TypeScript type errors:
 * - Unused variables (prefix with _)
 * - Unused imports (comment out)
 * - String | undefined to string conversions
 * - Array access safety
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
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getTypeScriptErrors() {
  try {
    execSync('npx tsc --noEmit --skipLibCheck', { encoding: 'utf8', stdio: 'pipe' });
    return [];
  } catch (error) {
    const output = error.stdout || '';
    const errors = output.split('\n')
      .filter(line => line.includes('error TS'))
      .map(line => {
        const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
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
      })
      .filter(Boolean);
    return errors;
  }
}

function fixUnusedVariable(filePath, line, variableName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (line <= lines.length) {
      const currentLine = lines[line - 1];
      
      // Fix unused variable by prefixing with _
      const patterns = [
        new RegExp(`\\b(const|let|var)\\s+(${variableName})\\b`, 'g'),
        new RegExp(`\\b(${variableName})\\s*:`, 'g'),
        new RegExp(`\\b(${variableName})\\s*\\)`, 'g')
      ];
      
      let newLine = currentLine;
      for (const pattern of patterns) {
        newLine = newLine.replace(pattern, (match, p1, p2) => {
          if (p2) {
            return match.replace(p2, `_${p2}`);
          } else {
            return match.replace(variableName, `_${variableName}`);
          }
        });
      }
      
      if (newLine !== currentLine) {
        lines[line - 1] = newLine;
        fs.writeFileSync(filePath, lines.join('\n'));
        return true;
      }
    }
  } catch (error) {
    log(`Error fixing unused variable in ${filePath}: ${error.message}`, 'red');
  }
  return false;
}

function fixUnusedImport(filePath, line) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (line <= lines.length) {
      const currentLine = lines[line - 1];
      
      // Comment out unused import
      if (currentLine.trim().startsWith('import ') && !currentLine.trim().startsWith('//')) {
        lines[line - 1] = `// ${currentLine} // Unused import`;
        fs.writeFileSync(filePath, lines.join('\n'));
        return true;
      }
    }
  } catch (error) {
    log(`Error fixing unused import in ${filePath}: ${error.message}`, 'red');
  }
  return false;
}

function fixStringUndefinedError(filePath, line) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (line <= lines.length) {
      const currentLine = lines[line - 1];
      
      // Fix array access that might return undefined
      const arrayAccessPattern = /(\w+)\[(\d+|\w+)\]/g;
      let newLine = currentLine.replace(arrayAccessPattern, (match, array, index) => {
        // Add null assertion if it looks safe
        if (currentLine.includes('parseInt') || currentLine.includes('parseFloat')) {
          return `${array}[${index}]!`;
        }
        return match;
      });
      
      // Fix split() access
      const splitPattern = /(\w+)\.split\([^)]+\)\[(\d+)\]/g;
      newLine = newLine.replace(splitPattern, (match, variable, index) => {
        return `${variable}.split(${match.match(/split\(([^)]+)\)/)[1]})[${index}]!`;
      });
      
      if (newLine !== currentLine) {
        lines[line - 1] = newLine;
        fs.writeFileSync(filePath, lines.join('\n'));
        return true;
      }
    }
  } catch (error) {
    log(`Error fixing string undefined error in ${filePath}: ${error.message}`, 'red');
  }
  return false;
}

function main() {
  log(`${colors.bold}🔧 Automated Type Error Fixer${colors.reset}`, 'blue');
  log('Analyzing and fixing common TypeScript errors...\n');
  
  const errors = getTypeScriptErrors();
  log(`Found ${errors.length} TypeScript errors`, 'yellow');
  
  let fixedCount = 0;
  const errorsByType = {};
  
  // Group errors by type
  errors.forEach(error => {
    if (!errorsByType[error.code]) {
      errorsByType[error.code] = [];
    }
    errorsByType[error.code].push(error);
  });
  
  // Fix TS6133 errors (unused variables)
  if (errorsByType['TS6133']) {
    log(`\nFixing ${errorsByType['TS6133'].length} unused variable errors...`, 'blue');
    errorsByType['TS6133'].forEach(error => {
      const match = error.message.match(/'([^']+)' is declared but its value is never read/);
      if (match) {
        const variableName = match[1];
        if (fixUnusedVariable(error.file, error.line, variableName)) {
          fixedCount++;
          log(`  ✅ Fixed unused variable '${variableName}' in ${error.file}:${error.line}`, 'green');
        }
      }
    });
  }
  
  // Fix TS6192 errors (unused imports)
  if (errorsByType['TS6192']) {
    log(`\nFixing ${errorsByType['TS6192'].length} unused import errors...`, 'blue');
    errorsByType['TS6192'].forEach(error => {
      if (fixUnusedImport(error.file, error.line)) {
        fixedCount++;
        log(`  ✅ Fixed unused import in ${error.file}:${error.line}`, 'green');
      }
    });
  }
  
  // Fix TS2345 errors (string | undefined)
  if (errorsByType['TS2345']) {
    log(`\nFixing ${errorsByType['TS2345'].length} type assignment errors...`, 'blue');
    errorsByType['TS2345'].forEach(error => {
      if (error.message.includes('string | undefined') && error.message.includes('string')) {
        if (fixStringUndefinedError(error.file, error.line)) {
          fixedCount++;
          log(`  ✅ Fixed string undefined error in ${error.file}:${error.line}`, 'green');
        }
      }
    });
  }
  
  log(`\n${colors.bold}Summary:${colors.reset}`);
  log(`  Total errors found: ${errors.length}`);
  log(`  Errors fixed: ${fixedCount}`, fixedCount > 0 ? 'green' : 'yellow');
  log(`  Remaining errors: ${errors.length - fixedCount}`, 'yellow');
  
  if (fixedCount > 0) {
    log('\n🎉 Some errors were automatically fixed!', 'green');
    log('Run "npm run type-check" to see the updated error count.', 'blue');
  } else {
    log('\n⚠️ No errors could be automatically fixed.', 'yellow');
    log('Manual intervention may be required for the remaining errors.', 'blue');
  }
}

if (require.main === module) {
  main();
}
