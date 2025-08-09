#!/usr/bin/env node

/**
 * Cache Strategy Analysis Tool
 * 
 * This script analyzes current caching strategies and provides optimization recommendations.
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
// Cache Analysis Functions
// ============================================================================

/**
 * Analyzes static assets for caching opportunities
 */
function analyzeStaticAssets() {
  const distPath = 'dist';
  const assets = [];
  
  if (!fs.existsSync(distPath)) {
    log('❌ No dist directory found. Run npm run build first.', 'red');
    return [];
  }
  
  function scanAssets(dir, relativePath = '') {
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativeFilePath = path.join(relativePath, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanAssets(fullPath, relativeFilePath);
        } else if (stat.isFile()) {
          const ext = path.extname(entry).toLowerCase();
          const size = stat.size;
          const sizeKB = (size / 1024).toFixed(2);
          
          // Categorize assets
          let category = 'other';
          let cacheability = 'medium';
          let recommendedTTL = '1 day';
          
          if (['.js', '.mjs'].includes(ext)) {
            category = 'javascript';
            cacheability = entry.includes('-') ? 'high' : 'medium'; // Hashed files
            recommendedTTL = entry.includes('-') ? '1 year' : '1 hour';
          } else if (['.css'].includes(ext)) {
            category = 'stylesheet';
            cacheability = entry.includes('-') ? 'high' : 'medium';
            recommendedTTL = entry.includes('-') ? '1 year' : '1 hour';
          } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico'].includes(ext)) {
            category = 'image';
            cacheability = 'high';
            recommendedTTL = '1 year';
          } else if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
            category = 'font';
            cacheability = 'high';
            recommendedTTL = '1 year';
          } else if (['.html'].includes(ext)) {
            category = 'html';
            cacheability = 'low';
            recommendedTTL = '1 hour';
          } else if (['.json', '.xml', '.txt'].includes(ext)) {
            category = 'data';
            cacheability = 'medium';
            recommendedTTL = '1 day';
          }
          
          assets.push({
            file: entry,
            path: relativeFilePath,
            fullPath,
            size,
            sizeKB,
            extension: ext,
            category,
            cacheability,
            recommendedTTL,
            hasHash: entry.includes('-') && entry.match(/-[a-f0-9]{8,}\./),
            isOptimized: entry.includes('optimized') || ['.webp', '.avif'].includes(ext)
          });
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  scanAssets(distPath);
  return assets.sort((a, b) => b.size - a.size);
}

/**
 * Analyzes current HTTP headers and caching configuration
 */
function analyzeCurrentCacheHeaders() {
  const configs = [];
  
  // Check Vite config
  const viteConfigPath = 'vite.config.ts';
  if (fs.existsSync(viteConfigPath)) {
    const content = fs.readFileSync(viteConfigPath, 'utf8');
    
    configs.push({
      file: 'vite.config.ts',
      type: 'build-tool',
      hasAssetHashing: content.includes('[hash]'),
      hasChunking: content.includes('manualChunks'),
      hasAssetNaming: content.includes('assetFileNames'),
      content: content
    });
  }
  
  // Check for service worker
  const swPath = 'public/sw.js';
  const swExists = fs.existsSync(swPath);
  
  // Check for manifest
  const manifestPath = 'public/site.webmanifest';
  const manifestExists = fs.existsSync(manifestPath);
  
  // Check for .htaccess or nginx config
  const htaccessPath = 'public/.htaccess';
  const htaccessExists = fs.existsSync(htaccessPath);
  
  return {
    viteConfig: configs.find(c => c.file === 'vite.config.ts'),
    serviceWorker: swExists,
    manifest: manifestExists,
    htaccess: htaccessExists,
    configs
  };
}

/**
 * Analyzes local storage and session storage usage
 */
function analyzeLocalStorageUsage() {
  const storageUsage = [];
  
  function scanForStorageUsage(dir) {
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
          scanForStorageUsage(fullPath);
        } else if (stat.isFile() && (entry.endsWith('.tsx') || entry.endsWith('.ts') || entry.endsWith('.jsx') || entry.endsWith('.js'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          const localStorageUsage = (content.match(/localStorage\./g) || []).length;
          const sessionStorageUsage = (content.match(/sessionStorage\./g) || []).length;
          const indexedDBUsage = (content.match(/indexedDB|IDBDatabase/g) || []).length;
          const cacheAPIUsage = (content.match(/caches\.|Cache\./g) || []).length;
          
          if (localStorageUsage > 0 || sessionStorageUsage > 0 || indexedDBUsage > 0 || cacheAPIUsage > 0) {
            storageUsage.push({
              file: fullPath,
              localStorage: localStorageUsage,
              sessionStorage: sessionStorageUsage,
              indexedDB: indexedDBUsage,
              cacheAPI: cacheAPIUsage
            });
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  scanForStorageUsage('src');
  return storageUsage;
}

/**
 * Generates cache optimization recommendations
 */
function generateCacheRecommendations(assets, headers, storage) {
  const recommendations = [];
  
  // Asset caching recommendations
  const unhashedAssets = assets.filter(asset => !asset.hasHash && asset.category !== 'html');
  if (unhashedAssets.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Asset Hashing',
      issue: `${unhashedAssets.length} assets lack content hashing`,
      solution: 'Enable content hashing for all static assets',
      impact: 'Improved cache invalidation and long-term caching',
      files: unhashedAssets.slice(0, 5).map(a => a.file)
    });
  }
  
  // Service Worker recommendation
  if (!headers.serviceWorker) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Service Worker',
      issue: 'No service worker detected',
      solution: 'Implement service worker for advanced caching strategies',
      impact: 'Offline support and improved cache control',
      files: []
    });
  }
  
  // HTTP headers recommendation
  if (!headers.htaccess) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'HTTP Headers',
      issue: 'No .htaccess or server configuration for cache headers',
      solution: 'Add cache headers configuration for different asset types',
      impact: 'Better browser caching and reduced server load',
      files: []
    });
  }
  
  // Large assets recommendation
  const largeAssets = assets.filter(asset => asset.size > 100000); // > 100KB
  if (largeAssets.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Large Assets',
      issue: `${largeAssets.length} assets are larger than 100KB`,
      solution: 'Implement compression and consider splitting large assets',
      impact: 'Faster loading and better cache efficiency',
      files: largeAssets.slice(0, 3).map(a => `${a.file} (${a.sizeKB} KB)`)
    });
  }
  
  // Local storage optimization
  if (storage.length === 0) {
    recommendations.push({
      priority: 'LOW',
      category: 'Client Storage',
      issue: 'No client-side storage usage detected',
      solution: 'Consider using localStorage for user preferences and cache',
      impact: 'Improved user experience and reduced API calls',
      files: []
    });
  }
  
  return recommendations;
}

/**
 * Main analysis function
 */
function analyzeCacheStrategy() {
  logSection('Cache Strategy Analysis');
  
  log('🔍 Analyzing static assets...', 'blue');
  const assets = analyzeStaticAssets();
  
  log('📋 Analyzing cache headers and configuration...', 'blue');
  const headers = analyzeCurrentCacheHeaders();
  
  log('💾 Analyzing client storage usage...', 'blue');
  const storage = analyzeLocalStorageUsage();
  
  // Display results
  logSection('Static Assets Analysis');
  if (assets.length > 0) {
    log(`📦 Found ${assets.length} static assets`, 'cyan');
    
    // Group by category
    const categories = {};
    assets.forEach(asset => {
      if (!categories[asset.category]) {
        categories[asset.category] = [];
      }
      categories[asset.category].push(asset);
    });
    
    Object.entries(categories).forEach(([category, categoryAssets]) => {
      const totalSize = categoryAssets.reduce((sum, asset) => sum + asset.size, 0);
      const hashedCount = categoryAssets.filter(asset => asset.hasHash).length;
      
      log(`\n📁 ${category}: ${categoryAssets.length} files (${(totalSize / 1024).toFixed(2)} KB)`, 'blue');
      log(`  ✅ Hashed: ${hashedCount}/${categoryAssets.length}`, hashedCount === categoryAssets.length ? 'green' : 'yellow');
      
      // Show largest files
      const largest = categoryAssets.slice(0, 3);
      largest.forEach(asset => {
        const hashStatus = asset.hasHash ? '✅' : '❌';
        log(`    ${hashStatus} ${asset.file}: ${asset.sizeKB} KB (${asset.recommendedTTL})`, 'cyan');
      });
    });
  }
  
  logSection('Cache Configuration Analysis');
  if (headers.viteConfig) {
    log('✅ Vite configuration found', 'green');
    log(`  Asset hashing: ${headers.viteConfig.hasAssetHashing ? '✅' : '❌'}`, headers.viteConfig.hasAssetHashing ? 'green' : 'red');
    log(`  Manual chunking: ${headers.viteConfig.hasChunking ? '✅' : '❌'}`, headers.viteConfig.hasChunking ? 'green' : 'yellow');
    log(`  Asset naming: ${headers.viteConfig.hasAssetNaming ? '✅' : '❌'}`, headers.viteConfig.hasAssetNaming ? 'green' : 'yellow');
  }
  
  log(`Service Worker: ${headers.serviceWorker ? '✅' : '❌'}`, headers.serviceWorker ? 'green' : 'red');
  log(`Web Manifest: ${headers.manifest ? '✅' : '❌'}`, headers.manifest ? 'green' : 'yellow');
  log(`Cache Headers Config: ${headers.htaccess ? '✅' : '❌'}`, headers.htaccess ? 'green' : 'red');
  
  logSection('Client Storage Analysis');
  if (storage.length > 0) {
    log(`💾 Storage usage found in ${storage.length} files:`, 'cyan');
    storage.forEach(file => {
      const relativePath = file.file.replace(process.cwd() + '/', '');
      log(`  📄 ${relativePath}:`, 'blue');
      if (file.localStorage > 0) log(`    localStorage: ${file.localStorage} uses`, 'green');
      if (file.sessionStorage > 0) log(`    sessionStorage: ${file.sessionStorage} uses`, 'green');
      if (file.indexedDB > 0) log(`    IndexedDB: ${file.indexedDB} uses`, 'green');
      if (file.cacheAPI > 0) log(`    Cache API: ${file.cacheAPI} uses`, 'green');
    });
  } else {
    log('❌ No client storage usage detected', 'yellow');
  }
  
  return {
    assets,
    headers,
    storage
  };
}

/**
 * Displays optimization recommendations
 */
function displayRecommendations(analysis) {
  logSection('Cache Optimization Recommendations');
  
  const recommendations = generateCacheRecommendations(
    analysis.assets,
    analysis.headers,
    analysis.storage
  );
  
  if (recommendations.length === 0) {
    log('✅ No cache optimization recommendations - caching strategy is well optimized!', 'green');
    return recommendations;
  }
  
  recommendations.forEach((rec, index) => {
    const priorityColor = rec.priority === 'HIGH' ? 'red' : rec.priority === 'MEDIUM' ? 'yellow' : 'blue';
    log(`\n${index + 1}. [${rec.priority}] ${rec.category}`, priorityColor);
    log(`   Issue: ${rec.issue}`, 'yellow');
    log(`   Solution: ${rec.solution}`, 'green');
    log(`   Impact: ${rec.impact}`, 'cyan');
    if (rec.files && rec.files.length > 0) {
      log(`   Files: ${rec.files.slice(0, 3).join(', ')}${rec.files.length > 3 ? '...' : ''}`, 'blue');
    }
  });
  
  return recommendations;
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  log(`${colors.bold}🚀 Cache Strategy Analysis Tool${colors.reset}`, 'magenta');
  log('Analyzing current caching strategies and optimization opportunities...\n');
  
  try {
    const analysis = analyzeCacheStrategy();
    const recommendations = displayRecommendations(analysis);
    
    logSection('Summary');
    log(`✅ Analysis complete!`, 'green');
    log(`📦 Static assets: ${analysis.assets.length}`, 'blue');
    log(`🔧 Optimization opportunities: ${recommendations.length}`, recommendations.length > 0 ? 'yellow' : 'green');
    
    if (recommendations.length > 0) {
      log(`\n🚀 Next steps:`, 'cyan');
      log(`1. Implement high-priority recommendations first`, 'blue');
      log(`2. Set up service worker for advanced caching`, 'blue');
      log(`3. Configure HTTP cache headers`, 'blue');
      log(`4. Monitor cache performance and hit rates`, 'blue');
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
  analyzeCacheStrategy,
  generateCacheRecommendations,
  analyzeStaticAssets
};
