#!/usr/bin/env node

/**
 * Production Monitoring Script
 * Monitors the health and performance of the production deployment
 */

import https from 'https';
import fs from 'fs';

const PRODUCTION_URL = 'https://tsconv.com';
const MONITORING_ENDPOINTS = [
  { path: '/', type: 'frontend', name: 'Homepage' },
  { path: '/api/health', type: 'api', name: 'Health Check' },
  { path: '/api/now', type: 'api', name: 'Current Time API' },
  { path: '/api/convert?timestamp=1640995200', type: 'api', name: 'Convert API' }
];

const ALERT_THRESHOLDS = {
  responseTime: 5000, // 5 seconds
  errorRate: 0.1, // 10%
  consecutiveFailures: 3
};

function makeRequest(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          responseTime,
          contentLength: data.length,
          timestamp: new Date().toISOString()
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        status: 0,
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        success: false,
        status: 0,
        responseTime: Date.now() - startTime,
        error: 'Timeout',
        timestamp: new Date().toISOString()
      });
    });
  });
}

async function checkEndpoint(endpoint) {
  const url = `${PRODUCTION_URL}${endpoint.path}`;
  const result = await makeRequest(url);
  
  return {
    ...endpoint,
    url,
    ...result
  };
}

function loadMonitoringHistory() {
  try {
    const data = fs.readFileSync('monitoring-history.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { checks: [], summary: { totalChecks: 0, successRate: 100 } };
  }
}

function saveMonitoringHistory(history) {
  fs.writeFileSync('monitoring-history.json', JSON.stringify(history, null, 2));
}

function calculateMetrics(results, history) {
  const totalChecks = results.length;
  const successfulChecks = results.filter(r => r.success).length;
  const currentSuccessRate = (successfulChecks / totalChecks) * 100;
  
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalChecks;
  
  // Calculate 24h success rate
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentChecks = history.checks.filter(check => 
    new Date(check.timestamp) > oneDayAgo
  );
  const recentSuccessRate = recentChecks.length > 0 
    ? (recentChecks.filter(c => c.success).length / recentChecks.length) * 100
    : 100;

  return {
    currentSuccessRate,
    avgResponseTime,
    recentSuccessRate,
    totalChecks,
    successfulChecks
  };
}

function generateAlert(results, metrics) {
  const alerts = [];
  
  // Check response time
  const slowEndpoints = results.filter(r => r.responseTime > ALERT_THRESHOLDS.responseTime);
  if (slowEndpoints.length > 0) {
    alerts.push({
      type: 'SLOW_RESPONSE',
      message: `Slow response detected: ${slowEndpoints.map(e => `${e.name} (${e.responseTime}ms)`).join(', ')}`,
      severity: 'WARNING'
    });
  }
  
  // Check error rate
  if (metrics.currentSuccessRate < (100 - ALERT_THRESHOLDS.errorRate * 100)) {
    alerts.push({
      type: 'HIGH_ERROR_RATE',
      message: `High error rate: ${(100 - metrics.currentSuccessRate).toFixed(1)}%`,
      severity: 'CRITICAL'
    });
  }
  
  // Check for failures
  const failedEndpoints = results.filter(r => !r.success);
  if (failedEndpoints.length > 0) {
    alerts.push({
      type: 'ENDPOINT_FAILURE',
      message: `Failed endpoints: ${failedEndpoints.map(e => `${e.name} (${e.error || e.status})`).join(', ')}`,
      severity: 'CRITICAL'
    });
  }
  
  return alerts;
}

async function runMonitoring() {
  console.log('🔍 Production Monitoring Check');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Target: ${PRODUCTION_URL}\n`);
  
  // Check all endpoints
  const results = [];
  for (const endpoint of MONITORING_ENDPOINTS) {
    process.stdout.write(`Checking ${endpoint.name}... `);
    const result = await checkEndpoint(endpoint);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.status} (${result.responseTime}ms)`);
    } else {
      console.log(`❌ ${result.error || result.status} (${result.responseTime}ms)`);
    }
  }
  
  // Load history and calculate metrics
  const history = loadMonitoringHistory();
  const metrics = calculateMetrics(results, history);
  
  // Generate alerts
  const alerts = generateAlert(results, metrics);
  
  // Update history
  const timestamp = new Date().toISOString();
  history.checks.push(...results.map(r => ({
    timestamp: r.timestamp,
    endpoint: r.name,
    success: r.success,
    responseTime: r.responseTime,
    status: r.status
  })));
  
  // Keep only last 1000 checks
  if (history.checks.length > 1000) {
    history.checks = history.checks.slice(-1000);
  }
  
  history.summary = {
    lastCheck: timestamp,
    totalChecks: metrics.totalChecks,
    successRate: metrics.currentSuccessRate,
    avgResponseTime: Math.round(metrics.avgResponseTime),
    recentSuccessRate: metrics.recentSuccessRate
  };
  
  saveMonitoringHistory(history);
  
  // Display results
  console.log('\n📊 Monitoring Results:');
  console.log(`  Success Rate: ${metrics.currentSuccessRate.toFixed(1)}%`);
  console.log(`  Average Response Time: ${Math.round(metrics.avgResponseTime)}ms`);
  console.log(`  24h Success Rate: ${metrics.recentSuccessRate.toFixed(1)}%`);
  
  // Display alerts
  if (alerts.length > 0) {
    console.log('\n🚨 Alerts:');
    alerts.forEach(alert => {
      const icon = alert.severity === 'CRITICAL' ? '🔴' : '🟡';
      console.log(`  ${icon} ${alert.type}: ${alert.message}`);
    });
  } else {
    console.log('\n✅ All systems operational');
  }
  
  // Status summary
  const overallStatus = alerts.some(a => a.severity === 'CRITICAL') ? 'CRITICAL' :
                       alerts.some(a => a.severity === 'WARNING') ? 'WARNING' : 'HEALTHY';
  
  console.log(`\n🎯 Overall Status: ${overallStatus}`);
  
  return {
    status: overallStatus,
    metrics,
    alerts,
    results,
    timestamp
  };
}

// Run monitoring if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMonitoring().catch(console.error);
}

export { runMonitoring };
