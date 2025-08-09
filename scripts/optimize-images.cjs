#!/usr/bin/env node

/**
 * Image Optimization Script
 * 
 * This script optimizes images by compressing them and converting to modern formats.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

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
// Image Optimization Functions
// ============================================================================

/**
 * Gets file size in KB
 */
function getFileSizeKB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(2);
}

/**
 * Optimizes a PNG image
 */
async function optimizePNG(inputPath, outputPath, quality = 80) {
  try {
    await sharp(inputPath)
      .png({ 
        quality,
        compressionLevel: 9,
        adaptiveFiltering: true,
        force: true
      })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    log(`❌ Failed to optimize PNG ${inputPath}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Converts image to WebP format
 */
async function convertToWebP(inputPath, outputPath, quality = 80) {
  try {
    await sharp(inputPath)
      .webp({ 
        quality,
        effort: 6,
        force: true
      })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    log(`❌ Failed to convert to WebP ${inputPath}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Converts image to AVIF format
 */
async function convertToAVIF(inputPath, outputPath, quality = 60) {
  try {
    await sharp(inputPath)
      .avif({ 
        quality,
        effort: 6,
        force: true
      })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    log(`❌ Failed to convert to AVIF ${inputPath}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Resizes image to specific dimensions
 */
async function resizeImage(inputPath, outputPath, width, height, quality = 80) {
  try {
    const format = path.extname(outputPath).toLowerCase();
    let pipeline = sharp(inputPath).resize(width, height, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    });

    if (format === '.png') {
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
    } else if (format === '.webp') {
      pipeline = pipeline.webp({ quality, effort: 6 });
    } else if (format === '.avif') {
      pipeline = pipeline.avif({ quality: quality * 0.8, effort: 6 });
    }

    await pipeline.toFile(outputPath);
    return true;
  } catch (error) {
    log(`❌ Failed to resize image ${inputPath}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Creates optimized favicon set
 */
async function createFaviconSet(logoPath, outputDir) {
  const faviconSizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 }
  ];

  const results = [];

  for (const favicon of faviconSizes) {
    const outputPath = path.join(outputDir, favicon.name);
    const originalSize = fs.existsSync(outputPath) ? getFileSizeKB(outputPath) : 0;
    
    const success = await resizeImage(logoPath, outputPath, favicon.size, favicon.size, 90);
    
    if (success) {
      const newSize = getFileSizeKB(outputPath);
      const savings = originalSize > 0 ? ((originalSize - newSize) / originalSize * 100).toFixed(1) : 0;
      
      results.push({
        name: favicon.name,
        size: favicon.size,
        originalSize,
        newSize,
        savings,
        success: true
      });
      
      log(`✅ Created ${favicon.name}: ${newSize} KB`, 'green');
    } else {
      results.push({
        name: favicon.name,
        success: false
      });
    }
  }

  return results;
}

/**
 * Optimizes all images in a directory
 */
async function optimizeImagesInDirectory(inputDir, outputDir = null) {
  if (!outputDir) {
    outputDir = inputDir;
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const imageExtensions = ['.png', '.jpg', '.jpeg'];
  const files = fs.readdirSync(inputDir)
    .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
    .filter(file => !file.includes('optimized'));

  const results = [];

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const originalSize = getFileSizeKB(inputPath);
    
    log(`🔄 Processing ${file}...`, 'blue');

    // Create optimized versions
    const baseName = path.parse(file).name;
    const ext = path.extname(file).toLowerCase();

    // Optimize original format
    const optimizedPath = path.join(outputDir, `${baseName}.optimized${ext}`);
    let optimizedSuccess = false;
    
    if (ext === '.png') {
      optimizedSuccess = await optimizePNG(inputPath, optimizedPath, 85);
    }

    // Create WebP version
    const webpPath = path.join(outputDir, `${baseName}.webp`);
    const webpSuccess = await convertToWebP(inputPath, webpPath, 80);

    // Create AVIF version (if supported)
    const avifPath = path.join(outputDir, `${baseName}.avif`);
    const avifSuccess = await convertToAVIF(inputPath, avifPath, 60);

    // Calculate savings
    const optimizedSize = optimizedSuccess ? getFileSizeKB(optimizedPath) : originalSize;
    const webpSize = webpSuccess ? getFileSizeKB(webpPath) : 0;
    const avifSize = avifSuccess ? getFileSizeKB(avifPath) : 0;

    const optimizedSavings = optimizedSuccess ? 
      ((originalSize - optimizedSize) / originalSize * 100).toFixed(1) : 0;
    const webpSavings = webpSuccess ? 
      ((originalSize - webpSize) / originalSize * 100).toFixed(1) : 0;
    const avifSavings = avifSuccess ? 
      ((originalSize - avifSize) / originalSize * 100).toFixed(1) : 0;

    results.push({
      file,
      originalSize: parseFloat(originalSize),
      optimizedSize: optimizedSuccess ? parseFloat(optimizedSize) : null,
      webpSize: webpSuccess ? parseFloat(webpSize) : null,
      avifSize: avifSuccess ? parseFloat(avifSize) : null,
      optimizedSavings: parseFloat(optimizedSavings),
      webpSavings: parseFloat(webpSavings),
      avifSavings: parseFloat(avifSavings),
      optimizedSuccess,
      webpSuccess,
      avifSuccess
    });

    // Log results
    if (optimizedSuccess) {
      log(`  📦 Optimized: ${optimizedSize} KB (${optimizedSavings}% savings)`, 'green');
    }
    if (webpSuccess) {
      log(`  🌐 WebP: ${webpSize} KB (${webpSavings}% savings)`, 'green');
    }
    if (avifSuccess) {
      log(`  🚀 AVIF: ${avifSize} KB (${avifSavings}% savings)`, 'green');
    }
  }

  return results;
}

/**
 * Main optimization function
 */
async function optimizeImages() {
  logSection('Image Optimization');
  
  log('🖼️ Starting image optimization process...', 'blue');

  const publicDir = 'public';
  const optimizedDir = 'public/optimized';

  // Create optimized directory
  if (!fs.existsSync(optimizedDir)) {
    fs.mkdirSync(optimizedDir, { recursive: true });
  }

  // Check if logo exists for favicon generation
  const logoPath = path.join(publicDir, 'tsconv_logo.png');
  let faviconResults = [];
  
  if (fs.existsSync(logoPath)) {
    logSection('Favicon Optimization');
    log('🎯 Generating optimized favicon set from logo...', 'blue');
    faviconResults = await createFaviconSet(logoPath, optimizedDir);
  }

  // Optimize all images
  logSection('General Image Optimization');
  const imageResults = await optimizeImagesInDirectory(publicDir, optimizedDir);

  return {
    faviconResults,
    imageResults
  };
}

/**
 * Generates optimization report
 */
function generateOptimizationReport(results) {
  logSection('Optimization Report');

  const { faviconResults, imageResults } = results;

  // Favicon report
  if (faviconResults.length > 0) {
    log('📱 Favicon Optimization Results:', 'cyan');
    faviconResults.forEach(result => {
      if (result.success) {
        log(`  ✅ ${result.name}: ${result.newSize} KB`, 'green');
      } else {
        log(`  ❌ ${result.name}: Failed`, 'red');
      }
    });
  }

  // Image optimization report
  if (imageResults.length > 0) {
    log('\n🖼️ Image Optimization Results:', 'cyan');
    
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let totalWebpSize = 0;
    let totalAvifSize = 0;

    imageResults.forEach(result => {
      log(`\n📄 ${result.file}:`, 'blue');
      log(`  Original: ${result.originalSize} KB`, 'yellow');
      
      if (result.optimizedSuccess) {
        log(`  Optimized: ${result.optimizedSize} KB (${result.optimizedSavings}% savings)`, 'green');
        totalOptimizedSize += result.optimizedSize;
      }
      
      if (result.webpSuccess) {
        log(`  WebP: ${result.webpSize} KB (${result.webpSavings}% savings)`, 'green');
        totalWebpSize += result.webpSize;
      }
      
      if (result.avifSuccess) {
        log(`  AVIF: ${result.avifSize} KB (${result.avifSavings}% savings)`, 'green');
        totalAvifSize += result.avifSize;
      }

      totalOriginalSize += result.originalSize;
    });

    // Summary
    log('\n📊 Summary:', 'cyan');
    log(`Total original size: ${totalOriginalSize.toFixed(2)} KB`, 'blue');
    
    if (totalOptimizedSize > 0) {
      const optimizedSavings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
      log(`Total optimized size: ${totalOptimizedSize.toFixed(2)} KB (${optimizedSavings}% savings)`, 'green');
    }
    
    if (totalWebpSize > 0) {
      const webpSavings = ((totalOriginalSize - totalWebpSize) / totalOriginalSize * 100).toFixed(1);
      log(`Total WebP size: ${totalWebpSize.toFixed(2)} KB (${webpSavings}% savings)`, 'green');
    }
    
    if (totalAvifSize > 0) {
      const avifSavings = ((totalOriginalSize - totalAvifSize) / totalOriginalSize * 100).toFixed(1);
      log(`Total AVIF size: ${totalAvifSize.toFixed(2)} KB (${avifSavings}% savings)`, 'green');
    }
  }

  return results;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  log(`${colors.bold}🖼️ Image Optimization Tool${colors.reset}`, 'magenta');
  log('Optimizing images for better performance...\n');

  try {
    const results = await optimizeImages();
    generateOptimizationReport(results);

    logSection('Next Steps');
    log('✅ Image optimization complete!', 'green');
    log('📁 Optimized images saved to public/optimized/', 'blue');
    log('🔄 Update your HTML/manifest files to use optimized versions', 'yellow');
    log('🌐 Consider implementing responsive images with WebP/AVIF fallbacks', 'yellow');

  } catch (error) {
    log(`❌ Optimization failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  optimizeImages,
  optimizePNG,
  convertToWebP,
  convertToAVIF,
  createFaviconSet
};
