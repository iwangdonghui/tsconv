#!/usr/bin/env node

/**
 * Icon Usage Analysis Script
 * 
 * This script analyzes the current icon usage in the project and provides
 * optimization recommendations for reducing bundle size.
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

// ============================================================================
// Icon Usage Analysis
// ============================================================================

/**
 * Finds all TypeScript/TSX files in the src directory
 */
function findSourceFiles() {
  const files = [];
  
  function scanDirectory(dir) {
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
  }
  
  scanDirectory('src');
  return files;
}

/**
 * Analyzes icon imports in a file
 */
function analyzeIconImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  
  // Match lucide-react imports
  const importRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]lucide-react['"];?/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const iconNames = match[1]
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    imports.push({
      file: filePath,
      icons: iconNames,
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return imports;
}

/**
 * Analyzes icon usage in a file
 */
function analyzeIconUsage(filePath, iconNames) {
  const content = fs.readFileSync(filePath, 'utf8');
  const usage = {};
  
  for (const iconName of iconNames) {
    // Count occurrences of icon usage (as JSX component)
    const usageRegex = new RegExp(`<${iconName}[\\s/>]`, 'g');
    const matches = content.match(usageRegex) || [];
    usage[iconName] = matches.length;
  }
  
  return usage;
}

/**
 * Estimates bundle size impact of icons
 */
function estimateIconBundleSize(iconCount) {
  // Rough estimates based on lucide-react icon sizes
  const averageIconSize = 2.5; // KB per icon
  const baseLibrarySize = 15; // KB for the base library
  
  return {
    currentSize: baseLibrarySize + (iconCount * averageIconSize),
    optimizedSize: iconCount * 1.2, // Tree-shaken individual imports
    savings: baseLibrarySize + (iconCount * (averageIconSize - 1.2))
  };
}

/**
 * Main analysis function
 */
function analyzeIconUsage() {
  logSection('Icon Usage Analysis');
  
  const sourceFiles = findSourceFiles();
  log(`📁 Found ${sourceFiles.length} source files`, 'blue');
  
  const allImports = [];
  const iconUsageMap = new Map();
  const fileIconMap = new Map();
  
  // Analyze each file
  for (const file of sourceFiles) {
    const imports = analyzeIconImports(file);
    
    for (const importInfo of imports) {
      allImports.push(importInfo);
      
      // Track icon usage
      const usage = analyzeIconUsage(file, importInfo.icons);
      fileIconMap.set(file, { imports: importInfo.icons, usage });
      
      for (const icon of importInfo.icons) {
        if (!iconUsageMap.has(icon)) {
          iconUsageMap.set(icon, { files: [], totalUsage: 0 });
        }
        
        const iconData = iconUsageMap.get(icon);
        iconData.files.push(file);
        iconData.totalUsage += usage[icon] || 0;
      }
    }
  }
  
  // Report findings
  const uniqueIcons = Array.from(iconUsageMap.keys());
  log(`🎨 Total unique icons used: ${uniqueIcons.length}`, 'green');
  log(`📦 Total import statements: ${allImports.length}`, 'blue');
  
  // Show most used icons
  logSection('Most Used Icons');
  const sortedIcons = uniqueIcons
    .map(icon => ({
      name: icon,
      usage: iconUsageMap.get(icon).totalUsage,
      files: iconUsageMap.get(icon).files.length
    }))
    .sort((a, b) => b.usage - a.usage);
  
  sortedIcons.slice(0, 10).forEach((icon, index) => {
    log(`${index + 1}. ${icon.name}: ${icon.usage} uses in ${icon.files} files`, 'green');
  });
  
  // Show unused icons
  const unusedIcons = sortedIcons.filter(icon => icon.usage === 0);
  if (unusedIcons.length > 0) {
    logSection('Potentially Unused Icons');
    unusedIcons.forEach(icon => {
      log(`⚠️ ${icon.name}: imported but not used`, 'yellow');
    });
  }
  
  // Bundle size analysis
  logSection('Bundle Size Analysis');
  const sizeEstimate = estimateIconBundleSize(uniqueIcons.length);
  log(`📊 Current estimated size: ${sizeEstimate.currentSize.toFixed(1)} KB`, 'yellow');
  log(`📊 Optimized size: ${sizeEstimate.optimizedSize.toFixed(1)} KB`, 'green');
  log(`💾 Potential savings: ${sizeEstimate.savings.toFixed(1)} KB`, 'green');
  
  // File-by-file analysis
  logSection('File-by-File Icon Usage');
  for (const [file, data] of fileIconMap.entries()) {
    const relativePath = path.relative(process.cwd(), file);
    log(`📄 ${relativePath}:`, 'blue');
    
    data.imports.forEach(icon => {
      const usage = data.usage[icon] || 0;
      const status = usage > 0 ? '✅' : '⚠️';
      log(`  ${status} ${icon}: ${usage} uses`, usage > 0 ? 'green' : 'yellow');
    });
  }
  
  return {
    totalIcons: uniqueIcons.length,
    totalFiles: sourceFiles.length,
    unusedIcons: unusedIcons.length,
    sizeEstimate,
    iconUsageMap,
    fileIconMap
  };
}

/**
 * Generates optimization recommendations
 */
function generateOptimizationRecommendations(analysisResult) {
  logSection('Optimization Recommendations');
  
  const { totalIcons, unusedIcons, sizeEstimate } = analysisResult;
  
  log('🚀 Recommended optimizations:', 'cyan');
  
  // 1. Tree shaking
  log('1. Enable tree shaking for lucide-react:', 'blue');
  log('   - Change from: import { Icon } from "lucide-react"', 'yellow');
  log('   - Change to: import Icon from "lucide-react/dist/esm/icons/icon"', 'green');
  log(`   - Potential savings: ${sizeEstimate.savings.toFixed(1)} KB`, 'green');
  
  // 2. Remove unused icons
  if (unusedIcons > 0) {
    log('\n2. Remove unused icon imports:', 'blue');
    log(`   - Found ${unusedIcons} potentially unused icons`, 'yellow');
    log('   - Review and remove unused imports', 'green');
  }
  
  // 3. Icon consolidation
  log('\n3. Consider icon consolidation:', 'blue');
  log('   - Use similar icons consistently', 'green');
  log('   - Replace multiple similar icons with one', 'green');
  
  // 4. Lazy loading
  log('\n4. Implement icon lazy loading:', 'blue');
  log('   - Load icons only when components are rendered', 'green');
  log('   - Use dynamic imports for rarely used icons', 'green');
  
  // 5. Custom icon set
  if (totalIcons < 20) {
    log('\n5. Consider custom icon set:', 'blue');
    log(`   - With only ${totalIcons} icons, a custom SVG set might be smaller`, 'green');
    log('   - Create optimized SVG sprites', 'green');
  }
}

/**
 * Generates migration script
 */
function generateMigrationScript(analysisResult) {
  logSection('Migration Script Generation');
  
  const { iconUsageMap, fileIconMap } = analysisResult;
  const migrationScript = [];
  
  migrationScript.push('#!/bin/bash');
  migrationScript.push('# Icon Import Optimization Migration Script');
  migrationScript.push('');
  
  // Generate sed commands for each file
  for (const [file, data] of fileIconMap.entries()) {
    const relativePath = path.relative(process.cwd(), file);
    migrationScript.push(`# Optimize ${relativePath}`);
    
    // Create individual import statements
    const individualImports = data.imports
      .filter(icon => data.usage[icon] > 0) // Only used icons
      .map(icon => `import ${icon} from "lucide-react/dist/esm/icons/${icon.toLowerCase().replace(/([A-Z])/g, '-$1').substring(1)}";`)
      .join('\n');
    
    if (individualImports) {
      migrationScript.push(`# Replace import statement in ${relativePath}`);
      migrationScript.push(`sed -i 's/import { .* } from "lucide-react";/${individualImports.replace(/\n/g, '\\n')}/g' "${file}"`);
      migrationScript.push('');
    }
  }
  
  // Write migration script
  const scriptPath = 'scripts/migrate-icon-imports.sh';
  fs.writeFileSync(scriptPath, migrationScript.join('\n'));
  fs.chmodSync(scriptPath, '755');
  
  log(`📝 Migration script generated: ${scriptPath}`, 'green');
  log('   Run with: ./scripts/migrate-icon-imports.sh', 'blue');
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  log(`${colors.bold}🎨 Icon Usage Analysis Tool${colors.reset}`, 'magenta');
  log('Analyzing lucide-react icon usage for bundle optimization...\n');
  
  try {
    const analysisResult = analyzeIconUsage();
    generateOptimizationRecommendations(analysisResult);
    generateMigrationScript(analysisResult);
    
    logSection('Summary');
    log(`✅ Analysis complete!`, 'green');
    log(`📊 Found ${analysisResult.totalIcons} unique icons in ${analysisResult.totalFiles} files`, 'blue');
    log(`💾 Potential bundle size reduction: ${analysisResult.sizeEstimate.savings.toFixed(1)} KB`, 'green');
    
    if (analysisResult.unusedIcons > 0) {
      log(`⚠️ ${analysisResult.unusedIcons} potentially unused icons found`, 'yellow');
    }
    
  } catch (error) {
    log(`❌ Analysis failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeIconUsage,
  generateOptimizationRecommendations,
  generateMigrationScript
};
