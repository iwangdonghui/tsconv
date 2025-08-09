#!/usr/bin/env node

/**
 * Simple Icon Usage Analysis Script
 * 
 * Analyzes lucide-react icon usage and provides optimization recommendations.
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
// Icon Analysis Functions
// ============================================================================

/**
 * Finds all icon imports in the project
 */
function findIconImports() {
  const iconImports = new Map();
  const fileUsage = new Map();
  
  function scanFile(filePath) {
    if (!fs.existsSync(filePath) || !filePath.match(/\.(tsx?|jsx?)$/)) {
      return;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Find lucide-react imports
      const importRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]lucide-react['"];?/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const iconNames = match[1]
          .split(',')
          .map(name => name.trim())
          .filter(name => name.length > 0);
        
        fileUsage.set(filePath, iconNames);
        
        // Count usage of each icon in this file
        iconNames.forEach(iconName => {
          const usageRegex = new RegExp(`<${iconName}[\\s/>]`, 'g');
          const usageCount = (content.match(usageRegex) || []).length;
          
          if (!iconImports.has(iconName)) {
            iconImports.set(iconName, { files: [], totalUsage: 0 });
          }
          
          const iconData = iconImports.get(iconName);
          iconData.files.push({ file: filePath, usage: usageCount });
          iconData.totalUsage += usageCount;
        });
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  // Scan src directory
  function scanDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile()) {
          scanFile(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  scanDirectory('src');
  
  return { iconImports, fileUsage };
}

/**
 * Analyzes icon usage and generates report
 */
function analyzeIcons() {
  log(`${colors.bold}🎨 Icon Usage Analysis${colors.reset}`, 'cyan');
  log('Analyzing lucide-react icon usage...\n');
  
  const { iconImports, fileUsage } = findIconImports();
  
  // Basic statistics
  const totalIcons = iconImports.size;
  const totalFiles = fileUsage.size;
  
  log(`📊 Found ${totalIcons} unique icons in ${totalFiles} files`, 'blue');
  
  // Most used icons
  log('\n📈 Most Used Icons:', 'cyan');
  const sortedIcons = Array.from(iconImports.entries())
    .sort((a, b) => b[1].totalUsage - a[1].totalUsage)
    .slice(0, 10);
  
  sortedIcons.forEach(([iconName, data], index) => {
    log(`${index + 1}. ${iconName}: ${data.totalUsage} uses in ${data.files.length} files`, 'green');
  });
  
  // Unused icons
  const unusedIcons = Array.from(iconImports.entries())
    .filter(([, data]) => data.totalUsage === 0);
  
  if (unusedIcons.length > 0) {
    log('\n⚠️ Potentially Unused Icons:', 'yellow');
    unusedIcons.forEach(([iconName]) => {
      log(`  - ${iconName}`, 'yellow');
    });
  }
  
  // Bundle size estimation
  const averageIconSize = 2.5; // KB per icon
  const baseLibrarySize = 15; // KB for the base library
  const currentSize = baseLibrarySize + (totalIcons * averageIconSize);
  const optimizedSize = totalIcons * 1.2; // Tree-shaken individual imports
  const savings = currentSize - optimizedSize;
  
  log('\n💾 Bundle Size Analysis:', 'cyan');
  log(`Current estimated size: ${currentSize.toFixed(1)} KB`, 'yellow');
  log(`Optimized size: ${optimizedSize.toFixed(1)} KB`, 'green');
  log(`Potential savings: ${savings.toFixed(1)} KB (${((savings/currentSize)*100).toFixed(1)}%)`, 'green');
  
  // File-by-file breakdown
  log('\n📁 File-by-File Usage:', 'cyan');
  for (const [file, icons] of fileUsage.entries()) {
    const relativePath = path.relative(process.cwd(), file);
    log(`  ${relativePath}:`, 'blue');
    
    icons.forEach(iconName => {
      const iconData = iconImports.get(iconName);
      const fileData = iconData.files.find(f => f.file === file);
      const usage = fileData ? fileData.usage : 0;
      const status = usage > 0 ? '✅' : '⚠️';
      log(`    ${status} ${iconName}: ${usage} uses`, usage > 0 ? 'green' : 'yellow');
    });
  }
  
  return {
    totalIcons,
    totalFiles,
    unusedIcons: unusedIcons.length,
    savings,
    iconImports,
    fileUsage
  };
}

/**
 * Generates optimization recommendations
 */
function generateRecommendations(analysis) {
  log('\n🚀 Optimization Recommendations:', 'cyan');
  
  log('\n1. Enable Tree Shaking:', 'blue');
  log('   Replace: import { Icon } from "lucide-react"', 'yellow');
  log('   With: import Icon from "lucide-react/dist/esm/icons/icon"', 'green');
  log(`   Estimated savings: ${analysis.savings.toFixed(1)} KB`, 'green');
  
  if (analysis.unusedIcons > 0) {
    log('\n2. Remove Unused Icons:', 'blue');
    log(`   Found ${analysis.unusedIcons} potentially unused icons`, 'yellow');
    log('   Review and remove unused imports', 'green');
  }
  
  log('\n3. Consider Icon Consolidation:', 'blue');
  log('   Use similar icons consistently across the app', 'green');
  log('   Replace multiple similar icons with one', 'green');
  
  if (analysis.totalIcons < 20) {
    log('\n4. Custom Icon Set Option:', 'blue');
    log(`   With only ${analysis.totalIcons} icons, consider a custom SVG set`, 'green');
    log('   Could be smaller than importing from lucide-react', 'green');
  }
}

/**
 * Creates a simple migration script
 */
function createMigrationScript(analysis) {
  const migrationCommands = [];
  
  migrationCommands.push('#!/bin/bash');
  migrationCommands.push('# Icon Import Optimization Script');
  migrationCommands.push('# This script converts lucide-react imports to tree-shakable imports');
  migrationCommands.push('');
  
  // Generate conversion commands for each file
  for (const [file, icons] of analysis.fileUsage.entries()) {
    const usedIcons = icons.filter(iconName => {
      const iconData = analysis.iconImports.get(iconName);
      const fileData = iconData.files.find(f => f.file === file);
      return fileData && fileData.usage > 0;
    });
    
    if (usedIcons.length > 0) {
      migrationCommands.push(`# Convert ${path.relative(process.cwd(), file)}`);
      
      // Create individual import statements
      const individualImports = usedIcons.map(iconName => {
        const kebabCase = iconName.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);
        return `import ${iconName} from "lucide-react/dist/esm/icons/${kebabCase}";`;
      }).join('\\n');
      
      // Create sed command to replace the import
      const originalImport = `import { ${usedIcons.join(', ')} } from "lucide-react";`;
      migrationCommands.push(`sed -i 's|${originalImport}|${individualImports}|g' "${file}"`);
      migrationCommands.push('');
    }
  }
  
  // Write migration script
  const scriptPath = 'scripts/migrate-icon-imports.sh';
  fs.writeFileSync(scriptPath, migrationCommands.join('\n'));
  
  try {
    fs.chmodSync(scriptPath, '755');
  } catch (error) {
    // chmod might not work on all systems
  }
  
  log(`\n📝 Migration script created: ${scriptPath}`, 'green');
  log('   Review the script before running it', 'yellow');
  log('   Run with: ./scripts/migrate-icon-imports.sh', 'blue');
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  try {
    const analysis = analyzeIcons();
    generateRecommendations(analysis);
    createMigrationScript(analysis);
    
    log('\n✅ Analysis complete!', 'green');
    
  } catch (error) {
    log(`❌ Analysis failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeIcons, generateRecommendations };
