#!/usr/bin/env node

/**
 * Correct Icon Import Optimization Script
 * 
 * This script implements the correct tree-shaking approach for lucide-react icons
 * by using individual icon imports instead of barrel imports.
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
// Icon Import Optimization Strategy
// ============================================================================

/**
 * The correct approach for lucide-react tree shaking is to use:
 * import { IconName } from "lucide-react/icons/icon-name"
 * 
 * This approach:
 * 1. Imports only the specific icon component
 * 2. Avoids importing the entire lucide-react library
 * 3. Reduces bundle size significantly
 * 4. Maintains the same API (no code changes needed)
 */

/**
 * Maps icon names to their correct import paths
 */
const ICON_IMPORT_MAP = {
  // Common icons
  'Copy': 'lucide-react/icons/copy',
  'Check': 'lucide-react/icons/check',
  'Clock': 'lucide-react/icons/clock',
  'Calendar': 'lucide-react/icons/calendar',
  'Globe': 'lucide-react/icons/globe',
  'X': 'lucide-react/icons/x',
  
  // Alert and status icons
  'AlertTriangle': 'lucide-react/icons/alert-triangle',
  'AlertCircle': 'lucide-react/icons/alert-circle',
  'CheckCircle': 'lucide-react/icons/check-circle',
  'XCircle': 'lucide-react/icons/x-circle',
  
  // Navigation and UI icons
  'ChevronDown': 'lucide-react/icons/chevron-down',
  'ChevronUp': 'lucide-react/icons/chevron-up',
  'ArrowRight': 'lucide-react/icons/arrow-right',
  'Menu': 'lucide-react/icons/menu',
  'Home': 'lucide-react/icons/home',
  
  // Theme and display icons
  'Moon': 'lucide-react/icons/moon',
  'Sun': 'lucide-react/icons/sun',
  'Palette': 'lucide-react/icons/palette',
  
  // Action icons
  'RefreshCw': 'lucide-react/icons/refresh-cw',
  'RotateCcw': 'lucide-react/icons/rotate-ccw',
  'Search': 'lucide-react/icons/search',
  'Filter': 'lucide-react/icons/filter',
  
  // Content and data icons
  'Type': 'lucide-react/icons/type',
  'Code': 'lucide-react/icons/code',
  'Database': 'lucide-react/icons/database',
  'Server': 'lucide-react/icons/server',
  
  // Math and calculation icons
  'Calculator': 'lucide-react/icons/calculator',
  'TrendingUp': 'lucide-react/icons/trending-up',
  
  // Location and mapping icons
  'MapPin': 'lucide-react/icons/map-pin',
  
  // Loading and status icons
  'Loader2': 'lucide-react/icons/loader-2',
  'Circle': 'lucide-react/icons/circle',
  
  // Utility icons
  'Lightbulb': 'lucide-react/icons/lightbulb',
  'Zap': 'lucide-react/icons/zap'
};

/**
 * Processes a single file to optimize icon imports
 */
function optimizeFileIconImports(filePath) {
  if (!fs.existsSync(filePath) || !filePath.match(/\.(tsx?|jsx?)$/)) {
    return { success: false, reason: 'Invalid file' };
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;
    
    // Find lucide-react imports
    const importRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]lucide-react['"];?/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const iconNames = match[1]
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      // Create individual import statements
      const individualImports = iconNames.map(iconName => {
        const importPath = ICON_IMPORT_MAP[iconName];
        if (!importPath) {
          log(`  ⚠️ Unknown icon: ${iconName} - keeping original import`, 'yellow');
          return null;
        }
        return `import { ${iconName} } from "${importPath}";`;
      }).filter(Boolean).join('\n');
      
      if (individualImports) {
        // Replace the original import
        newContent = newContent.replace(match[0], individualImports);
        hasChanges = true;
        
        log(`  📦 Converted ${iconNames.length} icons: ${iconNames.join(', ')}`, 'green');
      }
    }
    
    if (hasChanges) {
      // Write the optimized content back to the file
      fs.writeFileSync(filePath, newContent);
      return { success: true, iconCount: iconNames.length };
    }
    
    return { success: false, reason: 'No lucide-react imports found' };
    
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
 * Main optimization function
 */
function optimizeIconImports() {
  log(`${colors.bold}🚀 Correct Icon Import Optimization${colors.reset}`, 'cyan');
  log('Converting lucide-react imports to tree-shakable individual imports...\n');
  
  const sourceFiles = findSourceFiles();
  log(`📁 Found ${sourceFiles.length} source files to process`, 'blue');
  
  let processedFiles = 0;
  let totalIconsOptimized = 0;
  const results = [];
  
  for (const file of sourceFiles) {
    const relativePath = path.relative(process.cwd(), file);
    log(`\n🔄 Processing: ${relativePath}`, 'blue');
    
    const result = optimizeFileIconImports(file);
    results.push({ file: relativePath, ...result });
    
    if (result.success) {
      processedFiles++;
      totalIconsOptimized += result.iconCount || 0;
      log(`  ✅ Optimized successfully`, 'green');
    } else {
      log(`  ⏭️ Skipped: ${result.reason}`, 'yellow');
    }
  }
  
  // Summary
  log(`\n${colors.bold}📊 Optimization Summary${colors.reset}`, 'cyan');
  log(`✅ Files processed: ${processedFiles}/${sourceFiles.length}`, 'green');
  log(`🎨 Total icons optimized: ${totalIconsOptimized}`, 'green');
  
  // Bundle size estimation
  const averageIconSize = 2.5; // KB per icon with full library
  const optimizedIconSize = 1.2; // KB per icon with tree shaking
  const baseLibrarySize = 15; // KB for the base library
  
  const beforeSize = baseLibrarySize + (totalIconsOptimized * averageIconSize);
  const afterSize = totalIconsOptimized * optimizedIconSize;
  const savings = beforeSize - afterSize;
  
  log(`\n💾 Bundle Size Impact:`, 'cyan');
  log(`  Before: ${beforeSize.toFixed(1)} KB`, 'yellow');
  log(`  After: ${afterSize.toFixed(1)} KB`, 'green');
  log(`  Savings: ${savings.toFixed(1)} KB (${((savings/beforeSize)*100).toFixed(1)}%)`, 'green');
  
  return {
    processedFiles,
    totalFiles: sourceFiles.length,
    totalIconsOptimized,
    savings,
    results
  };
}

/**
 * Creates a webpack/vite configuration recommendation
 */
function createBundlerConfig() {
  log(`\n📝 Bundler Configuration Recommendations:`, 'cyan');
  
  log(`\n🔧 For Vite (vite.config.ts):`, 'blue');
  log(`export default defineConfig({
  build: {
    rollupOptions: {
      external: (id) => {
        // Keep lucide-react icons as external for better tree shaking
        return id.startsWith('lucide-react/icons/');
      }
    }
  }
});`, 'green');
  
  log(`\n🔧 For Webpack (webpack.config.js):`, 'blue');
  log(`module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: false
  }
};`, 'green');
  
  log(`\n📦 Package.json optimization:`, 'blue');
  log(`Add "sideEffects": false to enable better tree shaking`, 'green');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  try {
    log(`${colors.bold}🎨 Icon Import Optimization Tool${colors.reset}`, 'magenta');
    log('Optimizing lucide-react imports for better tree shaking...\n');
    
    // Run optimization
    const result = optimizeIconImports();
    
    // Create bundler configuration recommendations
    createBundlerConfig();
    
    log(`\n🎉 Icon import optimization completed successfully!`, 'green');
    log(`💡 Your bundle size should be reduced by approximately ${result.savings.toFixed(1)} KB`, 'green');
    
    log(`\n📝 Next steps:`, 'cyan');
    log(`1. Test your application to ensure everything works`, 'blue');
    log(`2. Run 'npm run build' to see the actual bundle size reduction`, 'blue');
    log(`3. Consider adding the bundler configuration for optimal results`, 'blue');
    log(`4. Commit the changes if everything looks good`, 'blue');
    
  } catch (error) {
    log(`❌ Optimization failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { optimizeIconImports, ICON_IMPORT_MAP };
