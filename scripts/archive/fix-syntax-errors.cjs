#!/usr/bin/env node

/**
 * Fix Syntax Errors Script
 * 
 * This script fixes common syntax errors that may occur after formatting
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

function fixSyntaxErrors() {
  log(`${colors.bold}🔧 Fixing Syntax Errors${colors.reset}`, 'blue');
  
  let filesFixed = 0;
  
  function processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let fixedContent = content;
      let hasChanges = false;
      
      // Fix 1: Restore proper function declarations
      if (fixedContent.includes('export function') && fixedContent.includes('export interface')) {
        const lines = fixedContent.split('\n');
        const fixedLines = [];
        let inFunction = false;
        let braceCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check if this is a function declaration that got mixed up
          if (line.trim().startsWith('export function') || line.trim().startsWith('export interface')) {
            if (inFunction && braceCount > 0) {
              // Close previous function
              fixedLines.push('}');
              fixedLines.push('');
            }
            inFunction = line.includes('function');
            braceCount = 0;
          }
          
          // Count braces
          braceCount += (line.match(/{/g) || []).length;
          braceCount -= (line.match(/}/g) || []).length;
          
          fixedLines.push(line);
          
          if (inFunction && braceCount === 0 && line.includes('}')) {
            inFunction = false;
          }
        }
        
        fixedContent = fixedLines.join('\n');
        hasChanges = true;
      }
      
      // Fix 2: Fix interface declarations
      fixedContent = fixedContent.replace(
        /interface\s+(\w+)\s*{\s*interface\s+(\w+)/g,
        'interface $1 {\n  // TODO: Add properties\n}\n\ninterface $2'
      );
      
      // Fix 3: Fix function parameter syntax
      fixedContent = fixedContent.replace(
        /export function (\w+)\s*{\s*([^}]+)\s*}\s*\(/g,
        'export function $1($2'
      );
      
      // Fix 4: Fix parsing errors with imports
      fixedContent = fixedContent.replace(
        /import\s+([^;]+);\s*export\s+(function|interface|class)/g,
        'import $1;\n\nexport $2'
      );
      
      if (fixedContent !== content) {
        fs.writeFileSync(filePath, fixedContent);
        log(`🔧 Fixed ${path.relative(process.cwd(), filePath)}`, 'green');
        filesFixed++;
        hasChanges = true;
      }
      
      return hasChanges;
      
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

if (require.main === module) {
  const startTime = Date.now();
  const filesFixed = fixSyntaxErrors();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (filesFixed > 0) {
    log(`✅ Fixed ${filesFixed} files in ${duration}s`, 'green');
  } else {
    log(`✅ No syntax errors found (${duration}s)`, 'green');
  }
}

module.exports = { fixSyntaxErrors };
