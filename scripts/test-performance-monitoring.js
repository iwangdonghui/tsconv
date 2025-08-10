#!/usr/bin/env node

/**
 * Performance Monitoring Integration Test
 * 
 * This script tests the performance monitoring system by:
 * 1. Checking if the monitoring system is properly initialized
 * 2. Verifying Web Vitals collection
 * 3. Testing custom metrics tracking
 * 4. Validating dashboard functionality
 */

const puppeteer = require('puppeteer');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  url: 'http://localhost:5173',
  timeout: 30000,
  waitForMetrics: 5000,
  expectedMetrics: ['LCP', 'FID', 'FCP', 'CLS', 'TTFB'],
};

/**
 * Test performance monitoring initialization
 */
async function testPerformanceMonitoringInit(page) {
  console.log('🧪 Testing performance monitoring initialization...');
  
  // Check if performance monitoring is initialized
  const isInitialized = await page.evaluate(() => {
    return typeof window.performanceMonitor !== 'undefined';
  });
  
  if (!isInitialized) {
    throw new Error('❌ Performance monitoring not initialized');
  }
  
  console.log('✅ Performance monitoring initialized successfully');
  return true;
}

/**
 * Test Web Vitals collection
 */
async function testWebVitalsCollection(page) {
  console.log('🧪 Testing Web Vitals collection...');
  
  // Wait for some metrics to be collected
  await page.waitForTimeout(TEST_CONFIG.waitForMetrics);
  
  // Check if Web Vitals are being collected
  const webVitals = await page.evaluate(() => {
    const monitor = window.performanceMonitor;
    if (!monitor) return null;
    
    const summary = monitor.getPerformanceSummary();
    return summary.webVitals;
  });
  
  if (!webVitals) {
    throw new Error('❌ Web Vitals not available');
  }
  
  console.log('📊 Web Vitals collected:', Object.keys(webVitals));
  
  // Check for expected metrics
  const collectedMetrics = Object.keys(webVitals);
  const missingMetrics = TEST_CONFIG.expectedMetrics.filter(
    metric => !collectedMetrics.includes(metric)
  );
  
  if (missingMetrics.length > 0) {
    console.warn('⚠️ Missing Web Vitals metrics:', missingMetrics);
  } else {
    console.log('✅ All expected Web Vitals metrics collected');
  }
  
  return webVitals;
}

/**
 * Test custom metrics tracking
 */
async function testCustomMetrics(page) {
  console.log('🧪 Testing custom metrics tracking...');
  
  // Trigger some custom metrics
  await page.evaluate(() => {
    // Simulate API call timing
    if (window.trackApiResponseTime) {
      window.trackApiResponseTime('/api/test', 250);
      window.trackApiResponseTime('/api/convert', 150);
    }
    
    // Simulate timing marks
    if (window.markTiming && window.measureTiming) {
      window.markTiming('test-start');
      setTimeout(() => {
        window.markTiming('test-end');
        window.measureTiming('test-operation', 'test-start', 'test-end');
      }, 100);
    }
  });
  
  await page.waitForTimeout(1000);
  
  // Check custom metrics
  const customMetrics = await page.evaluate(() => {
    const monitor = window.performanceMonitor;
    if (!monitor) return null;
    
    const summary = monitor.getPerformanceSummary();
    return summary.customMetrics;
  });
  
  if (!customMetrics) {
    throw new Error('❌ Custom metrics not available');
  }
  
  console.log('📈 Custom metrics:', {
    pageLoadTime: customMetrics.pageLoadTime,
    apiResponseTimes: Object.keys(customMetrics.apiResponseTimes),
    memoryUsage: customMetrics.memoryUsage,
  });
  
  console.log('✅ Custom metrics tracking working');
  return customMetrics;
}

/**
 * Test performance dashboard
 */
async function testPerformanceDashboard(page) {
  console.log('🧪 Testing performance dashboard...');
  
  // Check if dashboard is visible
  const dashboardExists = await page.$('.fixed.bottom-4.left-4');
  
  if (!dashboardExists) {
    console.warn('⚠️ Performance dashboard not found (may be hidden)');
    
    // Try to find the dashboard button
    const dashboardButton = await page.$('button:has-text("Performance")');
    if (dashboardButton) {
      console.log('📊 Found performance dashboard button');
      await dashboardButton.click();
      await page.waitForTimeout(500);
    }
  } else {
    console.log('✅ Performance dashboard visible');
  }
  
  // Check dashboard content
  const dashboardContent = await page.evaluate(() => {
    const dashboard = document.querySelector('[data-testid="performance-dashboard"]') ||
                     document.querySelector('.fixed.bottom-4.left-4');
    
    if (!dashboard) return null;
    
    return {
      hasWebVitals: dashboard.textContent.includes('Web Vitals'),
      hasMetrics: dashboard.textContent.includes('Performance'),
      isVisible: dashboard.offsetParent !== null,
    };
  });
  
  if (dashboardContent) {
    console.log('📊 Dashboard content:', dashboardContent);
    console.log('✅ Performance dashboard functional');
  } else {
    console.warn('⚠️ Dashboard content not accessible');
  }
  
  return dashboardContent;
}

/**
 * Test performance monitoring integration
 */
async function testPerformanceIntegration(page) {
  console.log('🧪 Testing performance monitoring integration...');
  
  // Check Sentry integration
  const sentryIntegration = await page.evaluate(() => {
    return typeof window.Sentry !== 'undefined';
  });
  
  if (sentryIntegration) {
    console.log('✅ Sentry integration available');
  } else {
    console.warn('⚠️ Sentry integration not found');
  }
  
  // Check console logging
  const consoleMessages = [];
  page.on('console', msg => {
    if (msg.text().includes('Performance') || msg.text().includes('📊')) {
      consoleMessages.push(msg.text());
    }
  });
  
  // Trigger some performance events
  await page.reload();
  await page.waitForTimeout(2000);
  
  console.log('📝 Performance console messages:', consoleMessages.length);
  
  return {
    sentryIntegration,
    consoleMessages: consoleMessages.length,
  };
}

/**
 * Main test function
 */
async function runPerformanceMonitoringTests() {
  console.log('🚀 Starting Performance Monitoring Tests...\n');
  
  let browser;
  let results = {
    initialization: false,
    webVitals: false,
    customMetrics: false,
    dashboard: false,
    integration: false,
  };
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🔴 Browser Error:', msg.text());
      }
    });
    
    // Navigate to the application
    console.log(`🌐 Navigating to ${TEST_CONFIG.url}...`);
    await page.goto(TEST_CONFIG.url, { 
      waitUntil: 'networkidle0',
      timeout: TEST_CONFIG.timeout 
    });
    
    // Wait for application to load
    await page.waitForTimeout(2000);
    
    // Run tests
    try {
      await testPerformanceMonitoringInit(page);
      results.initialization = true;
    } catch (error) {
      console.error(error.message);
    }
    
    try {
      await testWebVitalsCollection(page);
      results.webVitals = true;
    } catch (error) {
      console.error(error.message);
    }
    
    try {
      await testCustomMetrics(page);
      results.customMetrics = true;
    } catch (error) {
      console.error(error.message);
    }
    
    try {
      await testPerformanceDashboard(page);
      results.dashboard = true;
    } catch (error) {
      console.error(error.message);
    }
    
    try {
      await testPerformanceIntegration(page);
      results.integration = true;
    } catch (error) {
      console.error(error.message);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Print results
  console.log('\n📊 Test Results:');
  console.log('================');
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All performance monitoring tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Check if puppeteer is available
try {
  require.resolve('puppeteer');
} catch (error) {
  console.log('⚠️ Puppeteer not found. Installing...');
  console.log('Run: npm install --save-dev puppeteer');
  console.log('Then run this script again.');
  process.exit(1);
}

// Run tests
if (require.main === module) {
  runPerformanceMonitoringTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runPerformanceMonitoringTests,
  testPerformanceMonitoringInit,
  testWebVitalsCollection,
  testCustomMetrics,
  testPerformanceDashboard,
  testPerformanceIntegration,
};
