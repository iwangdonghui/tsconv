#!/usr/bin/env node

/**
 * Fix Icon Imports Script
 * 
 * This script fixes the incorrect icon import paths and reverts them
 * to the standard lucide-react imports.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// Icon Import Fixes
// ============================================================================

/**
 * Fixes icon imports in a single file
 */
function fixIconImports(filePath) {
  if (!fs.existsSync(filePath) || !filePath.match(/\.(tsx?|jsx?)$/)) {
    return { success: false, reason: 'Invalid file' };
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;
    
    // Fix individual icon imports from dist/esm/icons
    const distImportRegex = /import\s+(\w+)\s+from\s+["']lucide-react\/dist\/esm\/icons\/[^"']+["'];?/g;
    const distImports = [];
    let match;
    
    while ((match = distImportRegex.exec(content)) !== null) {
      distImports.push(match[1]);
      newContent = newContent.replace(match[0], '');
      hasChanges = true;
    }
    
    // Fix imports from lucide-react/icons
    const iconsImportRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*["']lucide-react\/icons["'];?/g;
    while ((match = iconsImportRegex.exec(content)) !== null) {
      const iconNames = match[1]
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      distImports.push(...iconNames);
      newContent = newContent.replace(match[0], '');
      hasChanges = true;
    }
    
    // Add correct import at the top if we found any icons
    if (distImports.length > 0) {
      const uniqueIcons = [...new Set(distImports)];
      const correctImport = `import { ${uniqueIcons.join(', ')} } from "lucide-react";`;
      
      // Find the first import statement and add before it
      const firstImportMatch = newContent.match(/^import\s/m);
      if (firstImportMatch) {
        const insertIndex = newContent.indexOf(firstImportMatch[0]);
        newContent = newContent.slice(0, insertIndex) + correctImport + '\n' + newContent.slice(insertIndex);
      } else {
        // No imports found, add at the beginning
        newContent = correctImport + '\n' + newContent;
      }
      
      hasChanges = true;
    }
    
    // Clean up extra newlines
    newContent = newContent.replace(/\n\n\n+/g, '\n\n');
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent);
      return { success: true, iconCount: distImports.length };
    }
    
    return { success: false, reason: 'No icon imports found' };
    
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

/**
 * Finds all source files to process
 */
function findSourceFiles() {
  const files = [];
  
  function scanDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (entry.endsWith('.tsx') || entry.endsWith('.ts'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  scanDirectory('src');
  return files;
}

/**
 * Main fix function
 */
function fixAllIconImports() {
  log(`${colors.bold}🔧 Fixing Icon Imports${colors.reset}`, 'cyan');
  log('Reverting incorrect icon imports to standard lucide-react imports...\n');
  
  const sourceFiles = findSourceFiles();
  log(`📁 Found ${sourceFiles.length} source files to process`, 'blue');
  
  let processedFiles = 0;
  let totalIconsFixed = 0;
  
  for (const file of sourceFiles) {
    const relativePath = path.relative(process.cwd(), file);
    
    const result = fixIconImports(file);
    
    if (result.success) {
      processedFiles++;
      totalIconsFixed += result.iconCount || 0;
      log(`✅ Fixed ${relativePath}: ${result.iconCount} icons`, 'green');
    } else if (result.reason !== 'No icon imports found') {
      log(`❌ Failed ${relativePath}: ${result.reason}`, 'red');
    }
  }
  
  // Summary
  log(`\n${colors.bold}📊 Fix Summary${colors.reset}`, 'cyan');
  log(`✅ Files processed: ${processedFiles}`, 'green');
  log(`🎨 Total icons fixed: ${totalIconsFixed}`, 'green');
  
  if (processedFiles > 0) {
    log(`\n🎉 Icon imports fixed successfully!`, 'green');
    log(`All icons now use standard lucide-react imports`, 'green');
  } else {
    log(`\n📝 No icon import issues found`, 'blue');
  }
  
  return {
    processedFiles,
    totalIconsFixed
  };
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  try {
    const result = fixAllIconImports();
    
    log(`\n📝 Next steps:`, 'cyan');
    log(`1. Run 'npm run build' to verify TypeScript compilation`, 'blue');
    log(`2. Test the application to ensure icons display correctly`, 'blue');
    log(`3. Commit the fixes if everything works`, 'blue');
    
  } catch (error) {
    log(`❌ Fix failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixAllIconImports, fixIconImports };
