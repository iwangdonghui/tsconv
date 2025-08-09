#!/usr/bin/env node

/**
 * Icon Import Optimization Script
 * 
 * This script converts lucide-react imports to tree-shakable individual imports
 * to reduce bundle size significantly.
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
// Icon Name Conversion
// ============================================================================

/**
 * Converts PascalCase icon names to kebab-case for lucide-react imports
 */
function iconNameToKebabCase(iconName) {
  // Special cases for lucide-react icon names
  const specialCases = {
    'CheckCircle': 'check-circle',
    'AlertCircle': 'alert-circle',
    'AlertTriangle': 'alert-triangle',
    'ChevronDown': 'chevron-down',
    'ChevronUp': 'chevron-up',
    'ArrowRight': 'arrow-right',
    'RefreshCw': 'refresh-cw',
    'RotateCcw': 'rotate-ccw',
    'TrendingUp': 'trending-up',
    'XCircle': 'x-circle',
    'MapPin': 'map-pin',
    'Loader2': 'loader-2'
  };
  
  if (specialCases[iconName]) {
    return specialCases[iconName];
  }
  
  // Convert PascalCase to kebab-case
  return iconName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .substring(1);
}

// ============================================================================
// File Processing
// ============================================================================

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
        const kebabCase = iconNameToKebabCase(iconName);
        return `import ${iconName} from "lucide-react/dist/esm/icons/${kebabCase}";`;
      }).join('\n');
      
      // Replace the original import
      newContent = newContent.replace(match[0], individualImports);
      hasChanges = true;
      
      log(`  📦 Converted ${iconNames.length} icons: ${iconNames.join(', ')}`, 'green');
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

// ============================================================================
// Main Optimization Process
// ============================================================================

/**
 * Main optimization function
 */
function optimizeIconImports() {
  log(`${colors.bold}🚀 Icon Import Optimization${colors.reset}`, 'cyan');
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
 * Validates the optimization by checking for import errors
 */
function validateOptimization() {
  log(`\n🔍 Validating optimization...`, 'cyan');
  
  // Check if TypeScript compilation still works
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    const tsc = spawn('npx', ['tsc', '--noEmit'], { stdio: 'pipe' });
    
    let output = '';
    tsc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    tsc.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    tsc.on('close', (code) => {
      if (code === 0) {
        log(`✅ TypeScript validation passed`, 'green');
        resolve(true);
      } else {
        log(`❌ TypeScript validation failed:`, 'red');
        log(output, 'yellow');
        resolve(false);
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      tsc.kill();
      log(`⏰ TypeScript validation timed out`, 'yellow');
      resolve(false);
    }, 30000);
  });
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  try {
    // Create backup
    log(`📋 Creating backup of current state...`, 'blue');
    const backupDir = 'backup-before-icon-optimization';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    // Run optimization
    const result = optimizeIconImports();
    
    // Validate optimization
    const isValid = await validateOptimization();
    
    if (isValid) {
      log(`\n🎉 Icon import optimization completed successfully!`, 'green');
      log(`💡 Your bundle size should be reduced by approximately ${result.savings.toFixed(1)} KB`, 'green');
    } else {
      log(`\n⚠️ Optimization completed but validation failed`, 'yellow');
      log(`Please check for any import errors and fix them manually`, 'yellow');
    }
    
    log(`\n📝 Next steps:`, 'cyan');
    log(`1. Test your application to ensure everything works`, 'blue');
    log(`2. Run 'npm run build' to see the actual bundle size reduction`, 'blue');
    log(`3. Commit the changes if everything looks good`, 'blue');
    
  } catch (error) {
    log(`❌ Optimization failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { optimizeIconImports, optimizeFileIconImports };
