#!/usr/bin/env node

/**
 * Code Formatting Tool
 * 
 * This script provides comprehensive code formatting capabilities:
 * - Prettier formatting for all supported file types
 * - ESLint auto-fixing
 * - Import sorting and organization
 * - File organization and cleanup
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

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Runs Prettier formatting on all supported files
 */
function runPrettierFormatting(fix = false) {
  logSection('Prettier Formatting');
  
  try {
    log('🎨 Running Prettier formatting...', 'blue');
    
    const command = fix 
      ? 'npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,scss,md,yml,yaml}"'
      : 'npx prettier --check "**/*.{js,jsx,ts,tsx,json,css,scss,md,yml,yaml}"';
    
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (fix) {
      log('✅ All files formatted successfully!', 'green');
    } else {
      log('✅ All files are properly formatted!', 'green');
    }
    
    return { success: true, filesChanged: 0 };
    
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    
    if (fix) {
      log('⚠️ Some files were reformatted', 'yellow');
      
      // Count changed files
      const changedFiles = output.split('\n').filter(line => line.trim().length > 0);
      log(`📝 Formatted ${changedFiles.length} files`, 'blue');
      
      return { success: true, filesChanged: changedFiles.length };
    } else {
      log('❌ Some files need formatting:', 'red');
      
      const unformattedFiles = output.split('\n').filter(line => line.trim().length > 0);
      unformattedFiles.slice(0, 10).forEach(file => {
        log(`  • ${file}`, 'yellow');
      });
      
      if (unformattedFiles.length > 10) {
        log(`  ... and ${unformattedFiles.length - 10} more files`, 'yellow');
      }
      
      log('\n💡 Run with --fix to automatically format these files', 'blue');
      
      return { success: false, filesChanged: unformattedFiles.length };
    }
  }
}

/**
 * Runs ESLint auto-fixing
 */
function runESLintAutoFix(fix = false) {
  logSection('ESLint Auto-Fix');
  
  try {
    log('🔧 Running ESLint auto-fix...', 'blue');
    
    const command = fix
      ? 'npx eslint . --ext .ts,.tsx,.js,.jsx --fix'
      : 'npx eslint . --ext .ts,.tsx,.js,.jsx';
    
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    log('✅ No ESLint issues found!', 'green');
    return { success: true, issuesFixed: 0 };
    
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    
    if (fix) {
      // Parse ESLint output to count fixed issues
      const fixedMatches = output.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
      
      if (fixedMatches) {
        const totalIssues = parseInt(fixedMatches[1]);
        log(`🔧 Auto-fixed ESLint issues`, 'green');
        log(`📊 Processed ${totalIssues} issues`, 'blue');
      } else {
        log('🔧 ESLint auto-fix completed', 'green');
      }
      
      return { success: true, issuesFixed: fixedMatches ? parseInt(fixedMatches[1]) : 0 };
    } else {
      log('⚠️ ESLint found issues that can be auto-fixed', 'yellow');
      log('💡 Run with --fix to automatically fix these issues', 'blue');
      
      return { success: false, issuesFixed: 0 };
    }
  }
}

/**
 * Organizes imports in TypeScript/JavaScript files
 */
function organizeImports(fix = false) {
  logSection('Import Organization');
  
  try {
    log('📦 Organizing imports...', 'blue');
    
    // Find all TypeScript/JavaScript files
    const files = [];
    
    function findFiles(dir) {
      const entries = fs.readdirSync(dir);
      
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
          findFiles(fullPath);
        } else if (entry.match(/\.(ts|tsx|js|jsx)$/)) {
          files.push(fullPath);
        }
      });
    }
    
    findFiles('src');
    
    let filesProcessed = 0;
    let importsOrganized = 0;
    
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        // Simple import organization (basic implementation)
        const imports = [];
        const otherLines = [];
        let inImportBlock = false;
        
        lines.forEach(line => {
          if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) {
            imports.push(line);
            inImportBlock = true;
          } else if (inImportBlock && line.trim() === '') {
            // Keep empty lines in import block
            imports.push(line);
          } else {
            if (inImportBlock && line.trim() !== '') {
              inImportBlock = false;
              otherLines.push(''); // Add separator
            }
            otherLines.push(line);
          }
        });
        
        // Sort imports (basic sorting)
        const sortedImports = imports
          .filter(line => line.trim() !== '')
          .sort((a, b) => {
            // React imports first
            if (a.includes('react') && !b.includes('react')) return -1;
            if (!a.includes('react') && b.includes('react')) return 1;
            
            // External packages before relative imports
            if (a.includes('./') || a.includes('../')) {
              if (!(b.includes('./') || b.includes('../'))) return 1;
            }
            if (!(a.includes('./') || a.includes('../'))) {
              if (b.includes('./') || b.includes('../')) return -1;
            }
            
            return a.localeCompare(b);
          });
        
        const newContent = [...sortedImports, '', ...otherLines.filter(line => line.trim() !== '' || otherLines.indexOf(line) === otherLines.length - 1)].join('\n');
        
        if (newContent !== content && fix) {
          fs.writeFileSync(file, newContent);
          importsOrganized++;
        } else if (newContent !== content) {
          filesProcessed++;
        }
        
      } catch (error) {
        log(`⚠️ Could not process ${file}: ${error.message}`, 'yellow');
      }
    });
    
    if (fix) {
      log(`✅ Organized imports in ${importsOrganized} files`, 'green');
    } else if (filesProcessed > 0) {
      log(`📦 ${filesProcessed} files need import organization`, 'yellow');
      log('💡 Run with --fix to automatically organize imports', 'blue');
    } else {
      log('✅ All imports are properly organized!', 'green');
    }
    
    return { success: true, filesProcessed: fix ? importsOrganized : filesProcessed };
    
  } catch (error) {
    log(`❌ Import organization failed: ${error.message}`, 'red');
    return { success: false, filesProcessed: 0 };
  }
}

/**
 * Removes trailing whitespace and ensures consistent line endings
 */
function cleanupFiles(fix = false) {
  logSection('File Cleanup');
  
  try {
    log('🧹 Cleaning up files...', 'blue');
    
    const files = [];
    
    function findFiles(dir) {
      const entries = fs.readdirSync(dir);
      
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
          findFiles(fullPath);
        } else if (entry.match(/\.(ts|tsx|js|jsx|json|md|css|scss|yml|yaml)$/)) {
          files.push(fullPath);
        }
      });
    }
    
    findFiles('src');
    findFiles('docs');
    
    let filesCleaned = 0;
    let filesNeedingCleanup = 0;
    
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Remove trailing whitespace and ensure LF line endings
        const cleanedContent = content
          .split('\n')
          .map(line => line.trimEnd())
          .join('\n')
          .replace(/\r\n/g, '\n')
          .replace(/\n+$/, '\n'); // Ensure single trailing newline
        
        if (cleanedContent !== content) {
          if (fix) {
            fs.writeFileSync(file, cleanedContent);
            filesCleaned++;
          } else {
            filesNeedingCleanup++;
          }
        }
        
      } catch (error) {
        log(`⚠️ Could not process ${file}: ${error.message}`, 'yellow');
      }
    });
    
    if (fix) {
      log(`✅ Cleaned up ${filesCleaned} files`, 'green');
    } else if (filesNeedingCleanup > 0) {
      log(`🧹 ${filesNeedingCleanup} files need cleanup`, 'yellow');
      log('💡 Run with --fix to automatically clean up files', 'blue');
    } else {
      log('✅ All files are clean!', 'green');
    }
    
    return { success: true, filesProcessed: fix ? filesCleaned : filesNeedingCleanup };
    
  } catch (error) {
    log(`❌ File cleanup failed: ${error.message}`, 'red');
    return { success: false, filesProcessed: 0 };
  }
}

/**
 * Main formatting function
 */
function formatCode(options = {}) {
  const { fix = false, prettier = true, eslint = true, imports = true, cleanup = true } = options;
  
  log(`${colors.bold}🎨 Code Formatting Tool${colors.reset}`, 'magenta');
  log(`Mode: ${fix ? 'FIX' : 'CHECK'}`, fix ? 'green' : 'blue');
  
  const startTime = Date.now();
  const results = {};
  
  try {
    // Run Prettier formatting
    if (prettier) {
      results.prettier = runPrettierFormatting(fix);
    }
    
    // Run ESLint auto-fix
    if (eslint) {
      results.eslint = runESLintAutoFix(fix);
    }
    
    // Organize imports
    if (imports) {
      results.imports = organizeImports(fix);
    }
    
    // Clean up files
    if (cleanup) {
      results.cleanup = cleanupFiles(fix);
    }
    
    // Summary
    logSection('Summary');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (fix) {
      log(`✅ Code formatting completed in ${duration}s`, 'green');
      
      const totalChanges = 
        (results.prettier?.filesChanged || 0) +
        (results.eslint?.issuesFixed || 0) +
        (results.imports?.filesProcessed || 0) +
        (results.cleanup?.filesProcessed || 0);
      
      log(`📊 Total changes: ${totalChanges}`, 'blue');
    } else {
      const hasIssues = Object.values(results).some(result => !result.success);
      
      if (hasIssues) {
        log(`⚠️ Code formatting issues found in ${duration}s`, 'yellow');
        log('💡 Run with --fix to automatically resolve these issues', 'blue');
      } else {
        log(`✅ All code is properly formatted! (${duration}s)`, 'green');
      }
    }
    
    return results;
    
  } catch (error) {
    log(`❌ Formatting failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const prettier = !args.includes('--no-prettier');
  const eslint = !args.includes('--no-eslint');
  const imports = !args.includes('--no-imports');
  const cleanup = !args.includes('--no-cleanup');
  
  const results = formatCode({ fix, prettier, eslint, imports, cleanup });
  
  // Exit with error code if issues found and not fixing
  if (!fix && Object.values(results).some(result => !result.success)) {
    process.exit(1);
  }
}

module.exports = {
  formatCode,
  runPrettierFormatting,
  runESLintAutoFix,
  organizeImports,
  cleanupFiles
};
