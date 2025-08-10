#!/usr/bin/env node

/**
 * Fix Formatting Issues Script
 * 
 * This script fixes common formatting issues that may occur after
 * running Prettier on TypeScript/React files.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bold}=== ${title} ===${colors.reset}`, 'cyan');
}

/**
 * Fixes common formatting issues in TypeScript/React files
 */
function fixFormattingIssues() {
  logSection('Fixing Formatting Issues');
  
  let filesFixed = 0;
  let totalIssues = 0;
  
  function processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let fixedContent = content;
      let issuesInFile = 0;
      
      // Fix 1: Imports mixed with class/interface declarations
      fixedContent = fixedContent.replace(
        /(export\s+(?:class|interface|function|const|let|var)\s+\w+[^{]*{)\s*(import\s+[^;]+;)/g,
        '$2\n\n$1'
      );
      
      // Fix 2: Interface/type definitions mixed with class declarations
      fixedContent = fixedContent.replace(
        /(export\s+class\s+\w+[^{]*{)\s*(interface\s+\w+[^}]*})/g,
        '$2\n\n$1'
      );
      
      // Fix 3: Multiple interface/type definitions on same line
      fixedContent = fixedContent.replace(
        /(}\s*)(interface\s+\w+)/g,
        '$1\n$2'
      );
      
      // Fix 4: Class declaration mixed with other declarations
      fixedContent = fixedContent.replace(
        /((?:interface|type)\s+\w+[^}]*})\s*(export\s+class\s+\w+)/g,
        '$1\n\n$2'
      );
      
      // Fix 5: Import statements in wrong positions
      const lines = fixedContent.split('\n');
      const imports = [];
      const otherLines = [];
      let inImportBlock = true;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim().startsWith('import ') || line.trim().startsWith('export ') && line.includes('from ')) {
          imports.push(line);
        } else if (line.trim() === '' && inImportBlock) {
          // Keep empty lines in import block
          if (imports.length > 0) {
            imports.push(line);
          }
        } else {
          if (inImportBlock && line.trim() !== '') {
            inImportBlock = false;
            if (imports.length > 0 && otherLines.length === 0) {
              otherLines.push(''); // Add separator after imports
            }
          }
          otherLines.push(line);
        }
      }
      
      // Reconstruct file with proper import organization
      if (imports.length > 0) {
        // Remove trailing empty lines from imports
        while (imports.length > 0 && imports[imports.length - 1].trim() === '') {
          imports.pop();
        }
        
        // Remove leading empty lines from other content
        while (otherLines.length > 0 && otherLines[0].trim() === '') {
          otherLines.shift();
        }
        
        fixedContent = [...imports, '', ...otherLines].join('\n');
      }
      
      // Count issues fixed
      if (fixedContent !== content) {
        issuesInFile++;
        fs.writeFileSync(filePath, fixedContent);
        log(`🔧 Fixed ${path.relative(process.cwd(), filePath)}`, 'green');
      }
      
      return issuesInFile;
      
    } catch (error) {
      log(`❌ Error processing ${filePath}: ${error.message}`, 'red');
      return 0;
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
        } else if (entry.match(/\.(ts|tsx|js|jsx)$/)) {
          const issues = processFile(fullPath);
          if (issues > 0) {
            filesFixed++;
            totalIssues += issues;
          }
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
  
  // Process API files
  if (fs.existsSync('api')) {
    processDirectory('api');
  }
  
  log(`\n📊 Summary:`, 'cyan');
  log(`  Files fixed: ${filesFixed}`, 'blue');
  log(`  Total issues resolved: ${totalIssues}`, 'blue');
  
  if (filesFixed > 0) {
    log(`✅ Formatting issues fixed successfully!`, 'green');
  } else {
    log(`✅ No formatting issues found!`, 'green');
  }
  
  return { filesFixed, totalIssues };
}

/**
 * Main function
 */
function main() {
  log(`${colors.bold}🔧 Formatting Issues Fix Tool${colors.reset}`, 'magenta');
  log('Fixing common formatting issues in TypeScript/React files...\n');
  
  const startTime = Date.now();
  
  try {
    const results = fixFormattingIssues();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n⏱️ Completed in ${duration}s`, 'blue');
    
    // Exit with success
    process.exit(0);
    
  } catch (error) {
    log(`❌ Fix failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  fixFormattingIssues
};
