#!/usr/bin/env node

/**
 * Code Splitting Analysis Tool
 * 
 * This script analyzes the current code splitting strategy and provides
 * recommendations for optimization.
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
// Bundle Analysis
// ============================================================================

/**
 * Analyzes the current bundle structure
 */
function analyzeBundleStructure() {
  const distPath = 'dist/assets';
  
  if (!fs.existsSync(distPath)) {
    log('❌ No dist/assets directory found. Run npm run build first.', 'red');
    return null;
  }
  
  const files = fs.readdirSync(distPath)
    .filter(file => file.endsWith('.js') && !file.endsWith('.map'))
    .map(file => {
      const filePath = path.join(distPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2)
      };
    })
    .sort((a, b) => b.size - a.size);
  
  return files;
}

/**
 * Analyzes route components for lazy loading opportunities
 */
function analyzeRouteComponents() {
  const routeComponents = [
    'src/components/TimestampConverter.tsx',
    'src/components/DateDiffCalculator.tsx',
    'src/components/WorkdaysCalculator.tsx',
    'src/components/TimezoneExplorer.tsx',
    'src/components/FormatTool.tsx',
    'src/components/Guide.tsx',
    'src/components/HowTo.tsx',
    'src/components/ApiDocs.tsx',
    'src/components/EnhancedApiDocs.tsx',
    'src/components/HealthPage.tsx'
  ];
  
  const analysis = [];
  
  for (const component of routeComponents) {
    if (fs.existsSync(component)) {
      const content = fs.readFileSync(component, 'utf8');
      const stats = fs.statSync(component);
      
      // Analyze imports
      const imports = content.match(/^import.*from.*$/gm) || [];
      const heavyImports = imports.filter(imp => 
        imp.includes('react-router') ||
        imp.includes('date-fns') ||
        imp.includes('moment') ||
        imp.includes('chart') ||
        imp.includes('d3')
      );
      
      analysis.push({
        component: path.basename(component, '.tsx'),
        path: component,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2),
        imports: imports.length,
        heavyImports: heavyImports.length,
        content: content
      });
    }
  }
  
  return analysis.sort((a, b) => b.size - a.size);
}

/**
 * Analyzes third-party dependencies
 */
function analyzeThirdPartyDependencies() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const heavyDependencies = [
    'react-router-dom',
    'lucide-react',
    'date-fns',
    'moment',
    'chart.js',
    'd3',
    'lodash',
    'axios',
    'react-query',
    '@tanstack/react-query'
  ];
  
  const foundHeavyDeps = heavyDependencies.filter(dep => dependencies[dep]);
  
  return {
    total: Object.keys(dependencies).length,
    heavy: foundHeavyDeps,
    all: dependencies
  };
}

/**
 * Checks current lazy loading implementation
 */
function checkLazyLoading() {
  const appFile = 'src/App.tsx';
  const routerFiles = ['src/router.tsx', 'src/routes.tsx', 'src/App.tsx'];
  
  const lazyLoadingInfo = {
    hasLazyLoading: false,
    lazyComponents: [],
    routerFile: null,
    recommendations: []
  };
  
  for (const file of routerFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('React.lazy') || content.includes('lazy(')) {
        lazyLoadingInfo.hasLazyLoading = true;
        lazyLoadingInfo.routerFile = file;
        
        // Extract lazy components
        const lazyMatches = content.match(/lazy\(\s*\(\)\s*=>\s*import\(['"`]([^'"`]+)['"`]\)/g) || [];
        lazyLoadingInfo.lazyComponents = lazyMatches.map(match => {
          const pathMatch = match.match(/import\(['"`]([^'"`]+)['"`]\)/);
          return pathMatch ? pathMatch[1] : match;
        });
      }
    }
  }
  
  return lazyLoadingInfo;
}

/**
 * Main analysis function
 */
function analyzeCodeSplitting() {
  logSection('Code Splitting Analysis');
  
  // Bundle structure analysis
  log('📦 Analyzing current bundle structure...', 'blue');
  const bundles = analyzeBundleStructure();
  
  if (!bundles) {
    return;
  }
  
  log(`\n📊 Current Bundle Files (${bundles.length} files):`, 'cyan');
  bundles.forEach((bundle, index) => {
    const sizeColor = bundle.size > 100000 ? 'red' : bundle.size > 50000 ? 'yellow' : 'green';
    log(`${index + 1}. ${bundle.name}: ${bundle.sizeKB} KB`, sizeColor);
  });
  
  // Calculate total size
  const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);
  log(`\n📏 Total Bundle Size: ${(totalSize / 1024).toFixed(2)} KB`, 'blue');
  
  // Route components analysis
  logSection('Route Components Analysis');
  const components = analyzeRouteComponents();
  
  log(`📄 Route Components (${components.length} components):`, 'cyan');
  components.forEach((comp, index) => {
    const sizeColor = comp.size > 10000 ? 'red' : comp.size > 5000 ? 'yellow' : 'green';
    log(`${index + 1}. ${comp.component}: ${comp.sizeKB} KB (${comp.imports} imports, ${comp.heavyImports} heavy)`, sizeColor);
  });
  
  // Third-party dependencies analysis
  logSection('Third-Party Dependencies Analysis');
  const deps = analyzeThirdPartyDependencies();
  
  log(`📚 Dependencies: ${deps.total} total`, 'blue');
  if (deps.heavy.length > 0) {
    log(`⚠️ Heavy dependencies found:`, 'yellow');
    deps.heavy.forEach(dep => {
      log(`  - ${dep}: ${deps.all[dep]}`, 'yellow');
    });
  } else {
    log(`✅ No heavy dependencies detected`, 'green');
  }
  
  // Lazy loading analysis
  logSection('Lazy Loading Analysis');
  const lazyInfo = checkLazyLoading();
  
  if (lazyInfo.hasLazyLoading) {
    log(`✅ Lazy loading is implemented in ${lazyInfo.routerFile}`, 'green');
    log(`📦 Lazy components (${lazyInfo.lazyComponents.length}):`, 'blue');
    lazyInfo.lazyComponents.forEach(comp => {
      log(`  - ${comp}`, 'green');
    });
  } else {
    log(`❌ No lazy loading detected`, 'red');
    log(`📝 Recommendation: Implement lazy loading for route components`, 'yellow');
  }
  
  return {
    bundles,
    components,
    dependencies: deps,
    lazyLoading: lazyInfo,
    totalSize
  };
}

/**
 * Generates optimization recommendations
 */
function generateOptimizationRecommendations(analysis) {
  logSection('Code Splitting Optimization Recommendations');
  
  const recommendations = [];
  
  // Large bundle recommendations
  const largeBundles = analysis.bundles.filter(bundle => bundle.size > 100000);
  if (largeBundles.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Bundle Size',
      issue: `${largeBundles.length} bundles are larger than 100KB`,
      solution: 'Split large bundles into smaller chunks',
      files: largeBundles.map(b => b.name)
    });
  }
  
  // Lazy loading recommendations
  if (!analysis.lazyLoading.hasLazyLoading) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Lazy Loading',
      issue: 'No lazy loading implemented for route components',
      solution: 'Implement React.lazy() for all route components',
      files: analysis.components.map(c => c.component)
    });
  }
  
  // Heavy component recommendations
  const heavyComponents = analysis.components.filter(comp => comp.size > 10000);
  if (heavyComponents.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Component Size',
      issue: `${heavyComponents.length} components are larger than 10KB`,
      solution: 'Consider splitting large components into smaller modules',
      files: heavyComponents.map(c => c.component)
    });
  }
  
  // Vendor chunk recommendations
  if (analysis.dependencies.heavy.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Vendor Chunks',
      issue: 'Heavy dependencies should be in separate vendor chunks',
      solution: 'Configure manual chunks for heavy dependencies',
      files: analysis.dependencies.heavy
    });
  }
  
  // Display recommendations
  recommendations.forEach((rec, index) => {
    const priorityColor = rec.priority === 'HIGH' ? 'red' : rec.priority === 'MEDIUM' ? 'yellow' : 'blue';
    log(`\n${index + 1}. [${rec.priority}] ${rec.category}`, priorityColor);
    log(`   Issue: ${rec.issue}`, 'yellow');
    log(`   Solution: ${rec.solution}`, 'green');
    if (rec.files && rec.files.length > 0) {
      log(`   Files: ${rec.files.slice(0, 3).join(', ')}${rec.files.length > 3 ? '...' : ''}`, 'blue');
    }
  });
  
  return recommendations;
}

/**
 * Generates implementation plan
 */
function generateImplementationPlan(recommendations) {
  logSection('Implementation Plan');
  
  const plan = [
    {
      phase: 'Phase 1: Route-based Code Splitting',
      priority: 'HIGH',
      tasks: [
        'Implement React.lazy() for all route components',
        'Add Suspense boundaries with loading components',
        'Configure route-based chunks in Vite'
      ],
      estimatedImpact: '30-50% reduction in initial bundle size'
    },
    {
      phase: 'Phase 2: Vendor Chunk Optimization',
      priority: 'MEDIUM',
      tasks: [
        'Separate heavy dependencies into vendor chunks',
        'Configure manual chunks for common libraries',
        'Optimize chunk loading strategy'
      ],
      estimatedImpact: '20-30% improvement in caching efficiency'
    },
    {
      phase: 'Phase 3: Component-level Optimization',
      priority: 'LOW',
      tasks: [
        'Split large components into smaller modules',
        'Implement dynamic imports for heavy features',
        'Optimize component dependencies'
      ],
      estimatedImpact: '10-20% reduction in component bundle sizes'
    }
  ];
  
  plan.forEach((phase, index) => {
    const priorityColor = phase.priority === 'HIGH' ? 'red' : phase.priority === 'MEDIUM' ? 'yellow' : 'blue';
    log(`\n${index + 1}. ${phase.phase}`, priorityColor);
    log(`   Priority: ${phase.priority}`, priorityColor);
    log(`   Impact: ${phase.estimatedImpact}`, 'green');
    log(`   Tasks:`, 'blue');
    phase.tasks.forEach(task => {
      log(`     - ${task}`, 'cyan');
    });
  });
  
  return plan;
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  log(`${colors.bold}📦 Code Splitting Analysis Tool${colors.reset}`, 'magenta');
  log('Analyzing current code splitting strategy and optimization opportunities...\n');
  
  try {
    const analysis = analyzeCodeSplitting();
    
    if (analysis) {
      const recommendations = generateOptimizationRecommendations(analysis);
      const plan = generateImplementationPlan(recommendations);
      
      logSection('Summary');
      log(`✅ Analysis complete!`, 'green');
      log(`📊 Current bundle size: ${(analysis.totalSize / 1024).toFixed(2)} KB`, 'blue');
      log(`📦 Bundle files: ${analysis.bundles.length}`, 'blue');
      log(`📄 Route components: ${analysis.components.length}`, 'blue');
      log(`🔧 Optimization opportunities: ${recommendations.length}`, 'yellow');
      
      if (recommendations.length > 0) {
        log(`\n🚀 Next steps:`, 'cyan');
        log(`1. Implement Phase 1 recommendations (highest impact)`, 'blue');
        log(`2. Test and measure performance improvements`, 'blue');
        log(`3. Proceed with Phase 2 and 3 optimizations`, 'blue');
      }
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
  analyzeCodeSplitting,
  generateOptimizationRecommendations,
  generateImplementationPlan
};
