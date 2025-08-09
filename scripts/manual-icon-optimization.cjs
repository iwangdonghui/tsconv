#!/usr/bin/env node

/**
 * Manual Icon Import Optimization Script
 * 
 * This script manually optimizes icon imports by converting from:
 * import { Icon } from "lucide-react"
 * to:
 * import Icon from "lucide-react/dist/esm/icons/icon-name"
 * 
 * This is the most reliable tree-shaking approach for lucide-react.
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
// Manual Icon Optimization
// ============================================================================

/**
 * Manual file-by-file optimization based on analysis results
 */
const FILE_OPTIMIZATIONS = [
  {
    file: 'src/components/ApiDocs.tsx',
    from: 'import { Copy, Check } from "lucide-react";',
    to: 'import Copy from "lucide-react/dist/esm/icons/copy";\nimport Check from "lucide-react/dist/esm/icons/check";'
  },
  {
    file: 'src/components/DateDiffCalculator.tsx',
    from: 'import { Calendar, Clock, TrendingUp, AlertCircle, CheckCircle } from \'lucide-react\';',
    to: 'import Calendar from "lucide-react/dist/esm/icons/calendar";\nimport Clock from "lucide-react/dist/esm/icons/clock";\nimport TrendingUp from "lucide-react/dist/esm/icons/trending-up";\nimport AlertCircle from "lucide-react/dist/esm/icons/alert-circle";\nimport CheckCircle from "lucide-react/dist/esm/icons/check-circle";'
  },
  {
    file: 'src/components/ErrorBoundary.tsx',
    from: 'import { AlertTriangle, RefreshCw, Home } from "lucide-react";',
    to: 'import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";\nimport RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";\nimport Home from "lucide-react/dist/esm/icons/home";'
  },
  {
    file: 'src/components/FormatTool.tsx',
    from: 'import { Type, Clock, Copy, CheckCircle, AlertCircle, Palette } from \'lucide-react\';',
    to: 'import Type from "lucide-react/dist/esm/icons/type";\nimport Clock from "lucide-react/dist/esm/icons/clock";\nimport Copy from "lucide-react/dist/esm/icons/copy";\nimport CheckCircle from "lucide-react/dist/esm/icons/check-circle";\nimport AlertCircle from "lucide-react/dist/esm/icons/alert-circle";\nimport Palette from "lucide-react/dist/esm/icons/palette";'
  },
  {
    file: 'src/components/Guide.tsx',
    from: 'import { Clock, Code, Globe, Database, Server } from \'lucide-react\';',
    to: 'import Clock from "lucide-react/dist/esm/icons/clock";\nimport Code from "lucide-react/dist/esm/icons/code";\nimport Globe from "lucide-react/dist/esm/icons/globe";\nimport Database from "lucide-react/dist/esm/icons/database";\nimport Server from "lucide-react/dist/esm/icons/server";'
  },
  {
    file: 'src/components/Header.tsx',
    from: 'import { Moon, Sun, Menu, X, Globe } from \'lucide-react\';',
    to: 'import Moon from "lucide-react/dist/esm/icons/moon";\nimport Sun from "lucide-react/dist/esm/icons/sun";\nimport Menu from "lucide-react/dist/esm/icons/menu";\nimport X from "lucide-react/dist/esm/icons/x";\nimport Globe from "lucide-react/dist/esm/icons/globe";'
  },
  {
    file: 'src/components/HealthPage.tsx',
    from: 'import { RefreshCw, CheckCircle, AlertTriangle, XCircle } from \'lucide-react\';',
    to: 'import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";\nimport CheckCircle from "lucide-react/dist/esm/icons/check-circle";\nimport AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";\nimport XCircle from "lucide-react/dist/esm/icons/x-circle";'
  },
  {
    file: 'src/components/HistoryPanel.tsx',
    from: 'import { Clock, X, RotateCcw } from \'lucide-react\';',
    to: 'import Clock from "lucide-react/dist/esm/icons/clock";\nimport X from "lucide-react/dist/esm/icons/x";\nimport RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";'
  },
  {
    file: 'src/components/HowTo.tsx',
    from: 'import { Clock, Code, Calculator, Globe, Database, Zap } from \'lucide-react\';',
    to: 'import Clock from "lucide-react/dist/esm/icons/clock";\nimport Code from "lucide-react/dist/esm/icons/code";\nimport Calculator from "lucide-react/dist/esm/icons/calculator";\nimport Globe from "lucide-react/dist/esm/icons/globe";\nimport Database from "lucide-react/dist/esm/icons/database";\nimport Zap from "lucide-react/dist/esm/icons/zap";'
  },
  {
    file: 'src/components/TimestampConverter.tsx',
    from: 'import { Copy, Check, X, Clock } from \'lucide-react\';',
    to: 'import Copy from "lucide-react/dist/esm/icons/copy";\nimport Check from "lucide-react/dist/esm/icons/check";\nimport X from "lucide-react/dist/esm/icons/x";\nimport Clock from "lucide-react/dist/esm/icons/clock";'
  },
  {
    file: 'src/components/TimezoneExplorer.tsx',
    from: 'import { Globe, Search, Filter, Clock, MapPin, AlertCircle } from \'lucide-react\';',
    to: 'import Globe from "lucide-react/dist/esm/icons/globe";\nimport Search from "lucide-react/dist/esm/icons/search";\nimport Filter from "lucide-react/dist/esm/icons/filter";\nimport Clock from "lucide-react/dist/esm/icons/clock";\nimport MapPin from "lucide-react/dist/esm/icons/map-pin";\nimport AlertCircle from "lucide-react/dist/esm/icons/alert-circle";'
  },
  {
    file: 'src/components/WorkdaysCalculator.tsx',
    from: 'import { Calendar, Clock, Calculator, AlertCircle, CheckCircle } from \'lucide-react\';',
    to: 'import Calendar from "lucide-react/dist/esm/icons/calendar";\nimport Clock from "lucide-react/dist/esm/icons/clock";\nimport Calculator from "lucide-react/dist/esm/icons/calculator";\nimport AlertCircle from "lucide-react/dist/esm/icons/alert-circle";\nimport CheckCircle from "lucide-react/dist/esm/icons/check-circle";'
  },
  {
    file: 'src/components/ui/error-alert.tsx',
    from: 'import { AlertTriangle, X } from "lucide-react";',
    to: 'import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";\nimport X from "lucide-react/dist/esm/icons/x";'
  },
  {
    file: 'src/components/ui/error-message.tsx',
    from: 'import { AlertTriangle } from "lucide-react";',
    to: 'import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";'
  },
  {
    file: 'src/components/ui/recovery-suggestions.tsx',
    from: 'import { Lightbulb, Copy, Check, ArrowRight } from "lucide-react";',
    to: 'import Lightbulb from "lucide-react/dist/esm/icons/lightbulb";\nimport Copy from "lucide-react/dist/esm/icons/copy";\nimport Check from "lucide-react/dist/esm/icons/check";\nimport ArrowRight from "lucide-react/dist/esm/icons/arrow-right";'
  },
  {
    file: 'src/components/ui/select.tsx',
    from: 'import { Check, ChevronDown, ChevronUp } from "lucide-react";',
    to: 'import Check from "lucide-react/dist/esm/icons/check";\nimport ChevronDown from "lucide-react/dist/esm/icons/chevron-down";\nimport ChevronUp from "lucide-react/dist/esm/icons/chevron-up";'
  },
  {
    file: 'src/components/ui/validation-indicator.tsx',
    from: 'import { Check, AlertTriangle, X, Loader2, Circle } from "lucide-react";',
    to: 'import Check from "lucide-react/dist/esm/icons/check";\nimport AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";\nimport X from "lucide-react/dist/esm/icons/x";\nimport Loader2 from "lucide-react/dist/esm/icons/loader-2";\nimport Circle from "lucide-react/dist/esm/icons/circle";'
  }
];

/**
 * Applies manual optimizations to files
 */
function applyManualOptimizations() {
  log(`${colors.bold}🔧 Manual Icon Import Optimization${colors.reset}`, 'cyan');
  log('Applying manual optimizations based on analysis results...\n');
  
  let successCount = 0;
  let totalIcons = 0;
  
  for (const optimization of FILE_OPTIMIZATIONS) {
    const { file, from, to } = optimization;
    
    log(`🔄 Processing: ${file}`, 'blue');
    
    if (!fs.existsSync(file)) {
      log(`  ⚠️ File not found: ${file}`, 'yellow');
      continue;
    }
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes(from)) {
        const newContent = content.replace(from, to);
        fs.writeFileSync(file, newContent);
        
        const iconCount = (to.match(/import/g) || []).length;
        totalIcons += iconCount;
        successCount++;
        
        log(`  ✅ Optimized ${iconCount} icons`, 'green');
      } else {
        log(`  ⏭️ Import pattern not found or already optimized`, 'yellow');
      }
      
    } catch (error) {
      log(`  ❌ Error processing file: ${error.message}`, 'red');
    }
  }
  
  // Summary
  log(`\n${colors.bold}📊 Manual Optimization Summary${colors.reset}`, 'cyan');
  log(`✅ Files processed: ${successCount}/${FILE_OPTIMIZATIONS.length}`, 'green');
  log(`🎨 Total icons optimized: ${totalIcons}`, 'green');
  
  // Bundle size estimation
  const averageIconSize = 2.5; // KB per icon with full library
  const optimizedIconSize = 1.2; // KB per icon with tree shaking
  const baseLibrarySize = 15; // KB for the base library
  
  const beforeSize = baseLibrarySize + (totalIcons * averageIconSize);
  const afterSize = totalIcons * optimizedIconSize;
  const savings = beforeSize - afterSize;
  
  log(`\n💾 Bundle Size Impact:`, 'cyan');
  log(`  Before: ${beforeSize.toFixed(1)} KB`, 'yellow');
  log(`  After: ${afterSize.toFixed(1)} KB`, 'green');
  log(`  Savings: ${savings.toFixed(1)} KB (${((savings/beforeSize)*100).toFixed(1)}%)`, 'green');
  
  return {
    processedFiles: successCount,
    totalFiles: FILE_OPTIMIZATIONS.length,
    totalIconsOptimized: totalIcons,
    savings
  };
}

/**
 * Validates the optimization by checking TypeScript compilation
 */
async function validateOptimization() {
  log(`\n🔍 Validating optimization...`, 'cyan');
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    const tsc = spawn('npx', ['tsc', '--noEmit', '--skipLibCheck'], { stdio: 'pipe' });
    
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
        // Check if errors are related to icon imports
        const iconErrors = output.includes('lucide-react') || output.includes('Cannot find module');
        if (iconErrors) {
          log(`❌ Icon import validation failed`, 'red');
          log(`Some icon imports may need manual adjustment`, 'yellow');
        } else {
          log(`⚠️ TypeScript validation has unrelated errors`, 'yellow');
        }
        resolve(!iconErrors);
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
    log(`${colors.bold}🎨 Manual Icon Import Optimization Tool${colors.reset}`, 'magenta');
    log('Optimizing lucide-react imports for better tree shaking...\n');
    
    // Apply manual optimizations
    const result = applyManualOptimizations();
    
    // Validate optimization
    const isValid = await validateOptimization();
    
    if (isValid) {
      log(`\n🎉 Icon import optimization completed successfully!`, 'green');
      log(`💡 Your bundle size should be reduced by approximately ${result.savings.toFixed(1)} KB`, 'green');
    } else {
      log(`\n⚠️ Optimization completed but some imports may need manual adjustment`, 'yellow');
    }
    
    log(`\n📝 Next steps:`, 'cyan');
    log(`1. Test your application to ensure everything works`, 'blue');
    log(`2. Run 'npm run build' to see the actual bundle size reduction`, 'blue');
    log(`3. Fix any remaining import issues if needed`, 'blue');
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

module.exports = { applyManualOptimizations, FILE_OPTIMIZATIONS };
