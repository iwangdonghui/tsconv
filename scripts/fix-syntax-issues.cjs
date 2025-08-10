#!/usr/bin/env node

/**
 * Fix Syntax Issues Script
 * 
 * This script fixes common syntax issues caused by aggressive formatting
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

function fixSyntaxIssues() {
  log(`${colors.bold}🔧 Fixing Syntax Issues${colors.reset}`, 'blue');
  
  let filesFixed = 0;
  
  function processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let fixedContent = content;
      let hasChanges = false;
      
      // Fix 1: Move misplaced import statements to the top
      const lines = fixedContent.split('\n');
      const imports = [];
      const nonImports = [];
      let inClass = false;
      let inFunction = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Track if we're inside a class or function
        if (trimmed.startsWith('export class ') || trimmed.startsWith('class ')) {
          inClass = true;
        }
        if (trimmed.startsWith('export function ') || trimmed.startsWith('function ')) {
          inFunction = true;
        }
        if (trimmed === '}' && (inClass || inFunction)) {
          inClass = false;
          inFunction = false;
        }
        
        // If this is an import statement in the wrong place
        if (trimmed.startsWith('import ') && (inClass || inFunction || i > 10)) {
          imports.push(line);
          hasChanges = true;
        } else {
          nonImports.push(line);
        }
      }
      
      if (hasChanges) {
        // Reorganize: imports first, then other content
        const existingImports = [];
        const otherLines = [];
        
        for (const line of nonImports) {
          if (line.trim().startsWith('import ')) {
            existingImports.push(line);
          } else {
            otherLines.push(line);
          }
        }
        
        // Combine all imports at the top
        const allImports = [...existingImports, ...imports];
        const uniqueImports = [...new Set(allImports)]; // Remove duplicates
        
        fixedContent = [...uniqueImports, '', ...otherLines].join('\n');
      }
      
      // Fix 2: Fix broken class/interface declarations
      fixedContent = fixedContent.replace(
        /export\s+(class|interface)\s+(\w+)[^{]*\s+import\s+/g,
        'import '
      );
      
      // Fix 3: Fix broken function declarations
      fixedContent = fixedContent.replace(
        /export\s+function\s+(\w+)[^{]*\s+import\s+/g,
        'import '
      );
      
      // Fix 4: Fix broken component declarations
      fixedContent = fixedContent.replace(
        /export\s+const\s+(\w+):\s*React\.FC[^=]*=\s*\(\{\s*import\s+/g,
        'import '
      );
      
      // Fix 5: Remove duplicate empty lines
      fixedContent = fixedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      // Fix 6: Ensure proper spacing after imports
      fixedContent = fixedContent.replace(
        /(import\s+[^;]+;)\s*\n\s*(interface|class|export|const)/g,
        '$1\n\n$2'
      );
      
      if (fixedContent !== content) {
        fs.writeFileSync(filePath, fixedContent);
        log(`🔧 Fixed ${path.relative(process.cwd(), filePath)}`, 'green');
        filesFixed++;
        return true;
      }
      
      return false;
      
    } catch (error) {
      log(`❌ Error processing ${filePath}: ${error.message}`, 'red');
      return false;
    }
  }
  
  function processDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir);
      
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
          processDirectory(fullPath);
        } else if (entry.match(/\.(ts|tsx)$/)) {
          processFile(fullPath);
        }
      });
    } catch (error) {
      log(`❌ Error processing directory ${dir}: ${error.message}`, 'red');
    }
  }
  
  // Process source files
  if (fs.existsSync('src')) {
    processDirectory('src');
  }
  
  log(`\n📊 Summary: ${filesFixed} files fixed`, 'blue');
  
  return filesFixed;
}

/**
 * Check TypeScript compilation
 */
function checkTypeScript() {
  const { execSync } = require('child_process');
  
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    log('✅ TypeScript compilation successful', 'green');
    return true;
  } catch (error) {
    log('❌ TypeScript compilation failed', 'red');
    
    // Show first few errors
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    const lines = output.split('\n').slice(0, 10);
    lines.forEach(line => {
      if (line.trim()) {
        log(`  ${line}`, 'yellow');
      }
    });
    
    return false;
  }
}

/**
 * Main function
 */
function main() {
  const startTime = Date.now();
  
  log('🔍 Checking initial TypeScript state...', 'blue');
  const initialCheck = checkTypeScript();
  
  if (initialCheck) {
    log('✅ No syntax issues found!', 'green');
    return;
  }
  
  log('\n🔧 Attempting to fix syntax issues...', 'blue');
  const filesFixed = fixSyntaxIssues();
  
  log('\n🔍 Checking TypeScript after fixes...', 'blue');
  const finalCheck = checkTypeScript();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (finalCheck) {
    log(`\n🎉 All syntax issues fixed! (${filesFixed} files, ${duration}s)`, 'green');
    log('💡 You can now run: npm run quality:safe-fix', 'blue');
  } else {
    log(`\n⚠️ Some issues remain after fixing ${filesFixed} files (${duration}s)`, 'yellow');
    log('💡 Manual review may be needed for remaining issues', 'blue');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixSyntaxIssues, checkTypeScript };
