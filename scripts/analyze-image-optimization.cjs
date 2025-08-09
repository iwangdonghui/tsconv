#!/usr/bin/env node

/**
 * Image Optimization Analysis Tool
 * 
 * This script analyzes current image usage and provides optimization recommendations.
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
// Image Analysis Functions
// ============================================================================

/**
 * Finds all image files in the project
 */
function findImageFiles() {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico'];
  const images = [];
  
  function scanDirectory(dir, relativePath = '') {
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativeFilePath = path.join(relativePath, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
          scanDirectory(fullPath, relativeFilePath);
        } else if (stat.isFile()) {
          const ext = path.extname(entry).toLowerCase();
          if (imageExtensions.includes(ext)) {
            images.push({
              name: entry,
              path: fullPath,
              relativePath: relativeFilePath,
              size: stat.size,
              sizeKB: (stat.size / 1024).toFixed(2),
              extension: ext,
              directory: relativePath || '.'
            });
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  scanDirectory('.');
  return images.sort((a, b) => b.size - a.size);
}

/**
 * Analyzes image usage in code
 */
function analyzeImageUsage() {
  const images = findImageFiles();
  const usage = {};
  
  // Initialize usage tracking
  images.forEach(img => {
    usage[img.name] = {
      image: img,
      usedIn: [],
      isUsed: false
    };
  });
  
  // Scan source files for image references
  function scanForImageReferences(dir) {
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
          scanForImageReferences(fullPath);
        } else if (stat.isFile() && (entry.endsWith('.tsx') || entry.endsWith('.ts') || entry.endsWith('.jsx') || entry.endsWith('.js') || entry.endsWith('.html') || entry.endsWith('.css'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // Check for image references
          images.forEach(img => {
            if (content.includes(img.name) || content.includes(img.relativePath)) {
              usage[img.name].usedIn.push(fullPath);
              usage[img.name].isUsed = true;
            }
          });
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  scanForImageReferences('src');
  scanForImageReferences('public');
  scanForImageReferences('index.html');
  
  return usage;
}

/**
 * Categorizes images by type and purpose
 */
function categorizeImages(images) {
  const categories = {
    favicons: [],
    logos: [],
    icons: [],
    illustrations: [],
    photos: [],
    other: []
  };
  
  images.forEach(img => {
    const name = img.name.toLowerCase();
    const path = img.relativePath.toLowerCase();
    
    if (name.includes('favicon') || name.includes('apple-touch-icon') || name.includes('android-chrome')) {
      categories.favicons.push(img);
    } else if (name.includes('logo') || path.includes('logo')) {
      categories.logos.push(img);
    } else if (img.extension === '.svg' || name.includes('icon')) {
      categories.icons.push(img);
    } else if (name.includes('illustration') || name.includes('graphic')) {
      categories.illustrations.push(img);
    } else if (img.extension === '.jpg' || img.extension === '.jpeg') {
      categories.photos.push(img);
    } else {
      categories.other.push(img);
    }
  });
  
  return categories;
}

/**
 * Generates optimization recommendations
 */
function generateOptimizationRecommendations(images, usage, categories) {
  const recommendations = [];
  
  // Large file recommendations
  const largeImages = images.filter(img => img.size > 100000); // > 100KB
  if (largeImages.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'File Size',
      issue: `${largeImages.length} images are larger than 100KB`,
      solution: 'Compress large images and consider modern formats (WebP, AVIF)',
      files: largeImages.map(img => `${img.relativePath} (${img.sizeKB} KB)`)
    });
  }
  
  // Unused image recommendations
  const unusedImages = Object.values(usage).filter(u => !u.isUsed);
  if (unusedImages.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Unused Files',
      issue: `${unusedImages.length} images appear to be unused`,
      solution: 'Remove unused images to reduce bundle size',
      files: unusedImages.map(u => u.image.relativePath)
    });
  }
  
  // Format optimization recommendations
  const pngImages = images.filter(img => img.extension === '.png' && img.size > 10000);
  if (pngImages.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Format Optimization',
      issue: `${pngImages.length} PNG images could benefit from modern formats`,
      solution: 'Convert to WebP or AVIF for better compression',
      files: pngImages.slice(0, 5).map(img => `${img.relativePath} (${img.sizeKB} KB)`)
    });
  }
  
  // Favicon optimization
  if (categories.favicons.length > 5) {
    recommendations.push({
      priority: 'LOW',
      category: 'Favicon Optimization',
      issue: 'Multiple favicon files detected',
      solution: 'Consider using a single SVG favicon for modern browsers',
      files: categories.favicons.map(img => img.relativePath)
    });
  }
  
  return recommendations;
}

/**
 * Main analysis function
 */
function analyzeImageOptimization() {
  logSection('Image Optimization Analysis');
  
  log('🖼️ Scanning for image files...', 'blue');
  const images = findImageFiles();
  
  if (images.length === 0) {
    log('📝 No image files found in the project.', 'yellow');
    return;
  }
  
  log(`📊 Found ${images.length} image files`, 'cyan');
  
  // Display image inventory
  logSection('Image Inventory');
  images.forEach((img, index) => {
    const sizeColor = img.size > 100000 ? 'red' : img.size > 50000 ? 'yellow' : 'green';
    log(`${index + 1}. ${img.relativePath}: ${img.sizeKB} KB (${img.extension})`, sizeColor);
  });
  
  // Calculate total size
  const totalSize = images.reduce((sum, img) => sum + img.size, 0);
  log(`\n📏 Total Image Size: ${(totalSize / 1024).toFixed(2)} KB`, 'blue');
  
  // Analyze usage
  logSection('Image Usage Analysis');
  log('🔍 Analyzing image usage in code...', 'blue');
  const usage = analyzeImageUsage();
  
  const usedImages = Object.values(usage).filter(u => u.isUsed);
  const unusedImages = Object.values(usage).filter(u => !u.isUsed);
  
  log(`✅ Used images: ${usedImages.length}`, 'green');
  log(`❌ Unused images: ${unusedImages.length}`, unusedImages.length > 0 ? 'red' : 'green');
  
  if (unusedImages.length > 0) {
    log('\n🗑️ Unused images:', 'yellow');
    unusedImages.forEach(u => {
      log(`  - ${u.image.relativePath} (${u.image.sizeKB} KB)`, 'yellow');
    });
  }
  
  // Categorize images
  logSection('Image Categories');
  const categories = categorizeImages(images);
  
  Object.entries(categories).forEach(([category, imgs]) => {
    if (imgs.length > 0) {
      log(`📁 ${category}: ${imgs.length} files (${(imgs.reduce((sum, img) => sum + img.size, 0) / 1024).toFixed(2)} KB)`, 'blue');
      imgs.forEach(img => {
        log(`  - ${img.relativePath} (${img.sizeKB} KB)`, 'cyan');
      });
    }
  });
  
  return {
    images,
    usage,
    categories,
    totalSize,
    usedCount: usedImages.length,
    unusedCount: unusedImages.length
  };
}

/**
 * Generates optimization recommendations
 */
function generateRecommendations(analysis) {
  if (!analysis) return [];
  
  logSection('Optimization Recommendations');
  
  const recommendations = generateOptimizationRecommendations(
    analysis.images,
    analysis.usage,
    analysis.categories
  );
  
  if (recommendations.length === 0) {
    log('✅ No optimization recommendations - images are well optimized!', 'green');
    return recommendations;
  }
  
  recommendations.forEach((rec, index) => {
    const priorityColor = rec.priority === 'HIGH' ? 'red' : rec.priority === 'MEDIUM' ? 'yellow' : 'blue';
    log(`\n${index + 1}. [${rec.priority}] ${rec.category}`, priorityColor);
    log(`   Issue: ${rec.issue}`, 'yellow');
    log(`   Solution: ${rec.solution}`, 'green');
    if (rec.files && rec.files.length > 0) {
      log(`   Files:`, 'blue');
      rec.files.slice(0, 3).forEach(file => {
        log(`     - ${file}`, 'cyan');
      });
      if (rec.files.length > 3) {
        log(`     ... and ${rec.files.length - 3} more`, 'cyan');
      }
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
      phase: 'Phase 1: Image Compression',
      priority: 'HIGH',
      tasks: [
        'Install image optimization tools (imagemin, sharp)',
        'Set up automated image compression pipeline',
        'Compress existing large images',
        'Configure build-time image optimization'
      ],
      estimatedImpact: '30-70% reduction in image file sizes'
    },
    {
      phase: 'Phase 2: Modern Format Adoption',
      priority: 'MEDIUM',
      tasks: [
        'Convert PNG/JPEG to WebP format',
        'Implement AVIF support for modern browsers',
        'Add fallback support for older browsers',
        'Update image loading strategy'
      ],
      estimatedImpact: '20-50% additional size reduction'
    },
    {
      phase: 'Phase 3: Lazy Loading & Optimization',
      priority: 'LOW',
      tasks: [
        'Implement lazy loading for images',
        'Add responsive image support',
        'Optimize favicon strategy',
        'Remove unused images'
      ],
      estimatedImpact: '10-30% improvement in loading performance'
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
  log(`${colors.bold}🖼️ Image Optimization Analysis Tool${colors.reset}`, 'magenta');
  log('Analyzing current image usage and optimization opportunities...\n');
  
  try {
    const analysis = analyzeImageOptimization();
    
    if (analysis) {
      const recommendations = generateRecommendations(analysis);
      const plan = generateImplementationPlan(recommendations);
      
      logSection('Summary');
      log(`✅ Analysis complete!`, 'green');
      log(`🖼️ Total images: ${analysis.images.length}`, 'blue');
      log(`📏 Total size: ${(analysis.totalSize / 1024).toFixed(2)} KB`, 'blue');
      log(`✅ Used images: ${analysis.usedCount}`, 'green');
      log(`❌ Unused images: ${analysis.unusedCount}`, analysis.unusedCount > 0 ? 'red' : 'green');
      log(`🔧 Optimization opportunities: ${recommendations.length}`, recommendations.length > 0 ? 'yellow' : 'green');
      
      if (recommendations.length > 0) {
        log(`\n🚀 Next steps:`, 'cyan');
        log(`1. Implement Phase 1 recommendations (highest impact)`, 'blue');
        log(`2. Set up automated image optimization pipeline`, 'blue');
        log(`3. Monitor and measure performance improvements`, 'blue');
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
  analyzeImageOptimization,
  generateRecommendations,
  generateImplementationPlan
};
