/**
 * Batch Performance Monitor
 * Advanced performance monitoring and optimization for batch processing operations
 */

export interface PerformanceMetrics {
  timestamp: number;
  batchId: string;
  batchSize: number;
  processingTime: number;
  throughput: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  concurrency: {
    active: number;
    peak: number;
    average: number;
  };
  cachePerformance: {
    hitRate: number;
    size: number;
    evictions: number;
  };
  errorRate: number;
  retryRate: number;
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'memory' | 'cpu' | 'throughput' | 'error_rate' | 'latency';
  message: string;
  metrics: Partial<PerformanceMetrics>;
  threshold: number;
  actualValue: number;
  recommendations: string[];
}

export interface PerformanceThresholds {
  maxMemoryUsageMB: number;
  maxCpuUsagePercent: number;
  minThroughputPerSecond: number;
  maxErrorRatePercent: number;
  maxLatencyMs: number;
  minCacheHitRatePercent: number;
}

export interface OptimizationRecommendation {
  type: 'concurrency' | 'caching' | 'chunking' | 'memory' | 'algorithm';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedImprovement: string;
  implementation: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}

/**
 * Batch Performance Monitor
 */
export class BatchPerformanceMonitor {
  private static instance: BatchPerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxMemoryUsageMB: 512,
      maxCpuUsagePercent: 80,
      minThroughputPerSecond: 10,
      maxErrorRatePercent: 5,
      maxLatencyMs: 5000,
      minCacheHitRatePercent: 70,
      ...thresholds
    };
  }

  static getInstance(thresholds?: Partial<PerformanceThresholds>): BatchPerformanceMonitor {
    if (!BatchPerformanceMonitor.instance) {
      BatchPerformanceMonitor.instance = new BatchPerformanceMonitor(thresholds);
    }
    return BatchPerformanceMonitor.instance;
  }

  /**
   * Start monitoring batch performance
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);

    console.log('🔍 Batch performance monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Record batch processing metrics
   */
  recordBatchMetrics(
    batchId: string,
    batchSize: number,
    processingTime: number,
    successCount: number,
    errorCount: number,
    cacheStats: {
      hitRate: number;
      size: number;
      evictions: number;
    },
    concurrencyStats: {
      active: number;
      peak: number;
      average: number;
    }
  ): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      batchId,
      batchSize,
      processingTime,
      throughput: batchSize / (processingTime / 1000),
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      cpuUsage: {
        user: cpuUsage.user / 1000000, // Convert to milliseconds
        system: cpuUsage.system / 1000000
      },
      concurrency: concurrencyStats,
      cachePerformance: cacheStats,
      errorRate: (errorCount / batchSize) * 100,
      retryRate: 0 // Would be calculated based on retry statistics
    };

    this.metrics.push(metrics);
    this.checkThresholds(metrics);
    this.cleanupOldMetrics();
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Check memory threshold
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > this.thresholds.maxMemoryUsageMB) {
      this.triggerAlert({
        type: 'memory',
        severity: heapUsedMB > this.thresholds.maxMemoryUsageMB * 1.5 ? 'critical' : 'high',
        message: `High memory usage detected: ${heapUsedMB.toFixed(2)}MB`,
        threshold: this.thresholds.maxMemoryUsageMB,
        actualValue: heapUsedMB,
        metrics: { memoryUsage },
        recommendations: [
          'Consider reducing batch size',
          'Enable garbage collection optimization',
          'Implement memory-efficient data structures',
          'Add memory cleanup between batches'
        ]
      });
    }
  }

  /**
   * Check performance thresholds and trigger alerts
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    // Memory usage check
    const heapUsedMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > this.thresholds.maxMemoryUsageMB) {
      this.triggerAlert({
        type: 'memory',
        severity: heapUsedMB > this.thresholds.maxMemoryUsageMB * 1.5 ? 'critical' : 'high',
        message: `Batch ${metrics.batchId}: High memory usage ${heapUsedMB.toFixed(2)}MB`,
        threshold: this.thresholds.maxMemoryUsageMB,
        actualValue: heapUsedMB,
        metrics,
        recommendations: [
          'Reduce batch size',
          'Implement streaming processing',
          'Optimize data structures'
        ]
      });
    }

    // Throughput check
    if (metrics.throughput < this.thresholds.minThroughputPerSecond) {
      this.triggerAlert({
        type: 'throughput',
        severity: metrics.throughput < this.thresholds.minThroughputPerSecond * 0.5 ? 'high' : 'medium',
        message: `Batch ${metrics.batchId}: Low throughput ${metrics.throughput.toFixed(2)} items/sec`,
        threshold: this.thresholds.minThroughputPerSecond,
        actualValue: metrics.throughput,
        metrics,
        recommendations: [
          'Increase concurrency',
          'Optimize processing algorithm',
          'Enable caching',
          'Use parallel processing'
        ]
      });
    }

    // Error rate check
    if (metrics.errorRate > this.thresholds.maxErrorRatePercent) {
      this.triggerAlert({
        type: 'error_rate',
        severity: metrics.errorRate > this.thresholds.maxErrorRatePercent * 2 ? 'critical' : 'high',
        message: `Batch ${metrics.batchId}: High error rate ${metrics.errorRate.toFixed(2)}%`,
        threshold: this.thresholds.maxErrorRatePercent,
        actualValue: metrics.errorRate,
        metrics,
        recommendations: [
          'Improve input validation',
          'Add retry mechanisms',
          'Investigate error patterns',
          'Implement circuit breakers'
        ]
      });
    }

    // Latency check
    if (metrics.processingTime > this.thresholds.maxLatencyMs) {
      this.triggerAlert({
        type: 'latency',
        severity: metrics.processingTime > this.thresholds.maxLatencyMs * 2 ? 'high' : 'medium',
        message: `Batch ${metrics.batchId}: High latency ${metrics.processingTime}ms`,
        threshold: this.thresholds.maxLatencyMs,
        actualValue: metrics.processingTime,
        metrics,
        recommendations: [
          'Optimize processing logic',
          'Reduce batch size',
          'Implement parallel processing',
          'Use more efficient algorithms'
        ]
      });
    }

    // Cache hit rate check
    if (metrics.cachePerformance.hitRate < this.thresholds.minCacheHitRatePercent) {
      this.triggerAlert({
        type: 'throughput',
        severity: 'medium',
        message: `Batch ${metrics.batchId}: Low cache hit rate ${metrics.cachePerformance.hitRate.toFixed(2)}%`,
        threshold: this.thresholds.minCacheHitRatePercent,
        actualValue: metrics.cachePerformance.hitRate,
        metrics,
        recommendations: [
          'Optimize cache key generation',
          'Increase cache size',
          'Improve cache eviction policy',
          'Pre-warm cache with common data'
        ]
      });
    }
  }

  /**
   * Trigger performance alert
   */
  private triggerAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...alertData
    };

    this.alerts.push(alert);
    
    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert callback error:', error);
      }
    });

    // Log alert
    console.warn(`🚨 Performance Alert [${alert.severity.toUpperCase()}]:`, alert.message);
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const recentMetrics = this.getRecentMetrics(10);

    if (recentMetrics.length === 0) {
      return recommendations;
    }

    // Analyze memory usage patterns
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / recentMetrics.length;
    const memoryUsageMB = avgMemoryUsage / 1024 / 1024;

    if (memoryUsageMB > this.thresholds.maxMemoryUsageMB * 0.8) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        description: 'High memory usage detected across recent batches',
        expectedImprovement: '30-50% reduction in memory usage',
        implementation: 'Implement streaming processing and reduce batch sizes',
        estimatedEffort: 'medium'
      });
    }

    // Analyze throughput patterns
    const avgThroughput = recentMetrics.reduce((sum, m) => sum + m.throughput, 0) / recentMetrics.length;
    
    if (avgThroughput < this.thresholds.minThroughputPerSecond * 1.5) {
      recommendations.push({
        type: 'concurrency',
        priority: 'medium',
        description: 'Throughput could be improved with better concurrency',
        expectedImprovement: '20-40% increase in throughput',
        implementation: 'Increase concurrency limits and optimize chunk sizes',
        estimatedEffort: 'low'
      });
    }

    // Analyze cache performance
    const avgCacheHitRate = recentMetrics.reduce((sum, m) => sum + m.cachePerformance.hitRate, 0) / recentMetrics.length;
    
    if (avgCacheHitRate < this.thresholds.minCacheHitRatePercent) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        description: 'Cache hit rate is below optimal levels',
        expectedImprovement: '15-25% improvement in processing speed',
        implementation: 'Optimize cache key generation and increase cache size',
        estimatedEffort: 'low'
      });
    }

    // Analyze error patterns
    const avgErrorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length;
    
    if (avgErrorRate > this.thresholds.maxErrorRatePercent * 0.5) {
      recommendations.push({
        type: 'algorithm',
        priority: 'high',
        description: 'Error rate indicates potential data quality or processing issues',
        expectedImprovement: '50-80% reduction in error rate',
        implementation: 'Improve input validation and add robust error handling',
        estimatedEffort: 'medium'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(timeRangeMs?: number): {
    summary: {
      totalBatches: number;
      avgThroughput: number;
      avgMemoryUsage: number;
      avgErrorRate: number;
      avgCacheHitRate: number;
    };
    trends: {
      throughputTrend: 'improving' | 'declining' | 'stable';
      memoryTrend: 'improving' | 'declining' | 'stable';
      errorTrend: 'improving' | 'declining' | 'stable';
    };
    alerts: PerformanceAlert[];
    recommendations: OptimizationRecommendation[];
  } {
    const cutoffTime = timeRangeMs ? Date.now() - timeRangeMs : 0;
    const relevantMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    const relevantAlerts = this.alerts.filter(a => a.timestamp > cutoffTime);

    if (relevantMetrics.length === 0) {
      return {
        summary: {
          totalBatches: 0,
          avgThroughput: 0,
          avgMemoryUsage: 0,
          avgErrorRate: 0,
          avgCacheHitRate: 0
        },
        trends: {
          throughputTrend: 'stable',
          memoryTrend: 'stable',
          errorTrend: 'stable'
        },
        alerts: relevantAlerts,
        recommendations: []
      };
    }

    // Calculate summary statistics
    const summary = {
      totalBatches: relevantMetrics.length,
      avgThroughput: relevantMetrics.reduce((sum, m) => sum + m.throughput, 0) / relevantMetrics.length,
      avgMemoryUsage: relevantMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / relevantMetrics.length / 1024 / 1024,
      avgErrorRate: relevantMetrics.reduce((sum, m) => sum + m.errorRate, 0) / relevantMetrics.length,
      avgCacheHitRate: relevantMetrics.reduce((sum, m) => sum + m.cachePerformance.hitRate, 0) / relevantMetrics.length
    };

    // Calculate trends
    const trends = this.calculateTrends(relevantMetrics);

    return {
      summary,
      trends,
      alerts: relevantAlerts,
      recommendations: this.generateOptimizationRecommendations()
    };
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(metrics: PerformanceMetrics[]): {
    throughputTrend: 'improving' | 'declining' | 'stable';
    memoryTrend: 'improving' | 'declining' | 'stable';
    errorTrend: 'improving' | 'declining' | 'stable';
  } {
    if (metrics.length < 2) {
      return {
        throughputTrend: 'stable',
        memoryTrend: 'stable',
        errorTrend: 'stable'
      };
    }

    const half = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, half);
    const secondHalf = metrics.slice(half);

    const firstHalfAvgs = {
      throughput: firstHalf.reduce((sum, m) => sum + m.throughput, 0) / firstHalf.length,
      memory: firstHalf.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / firstHalf.length,
      errors: firstHalf.reduce((sum, m) => sum + m.errorRate, 0) / firstHalf.length
    };

    const secondHalfAvgs = {
      throughput: secondHalf.reduce((sum, m) => sum + m.throughput, 0) / secondHalf.length,
      memory: secondHalf.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / secondHalf.length,
      errors: secondHalf.reduce((sum, m) => sum + m.errorRate, 0) / secondHalf.length
    };

    const threshold = 0.1; // 10% change threshold

    return {
      throughputTrend: this.getTrend(firstHalfAvgs.throughput, secondHalfAvgs.throughput, threshold),
      memoryTrend: this.getTrend(secondHalfAvgs.memory, firstHalfAvgs.memory, threshold), // Lower memory is better
      errorTrend: this.getTrend(secondHalfAvgs.errors, firstHalfAvgs.errors, threshold) // Lower errors is better
    };
  }

  /**
   * Determine trend direction
   */
  private getTrend(oldValue: number, newValue: number, threshold: number): 'improving' | 'declining' | 'stable' {
    const change = (newValue - oldValue) / oldValue;
    
    if (change > threshold) {
      return 'improving';
    } else if (change < -threshold) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * Get recent metrics
   */
  private getRecentMetrics(count: number): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = Date.now() - maxAge;
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }

  /**
   * Add alert callback
   */
  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Remove alert callback
   */
  removeAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  /**
   * Reset all metrics and alerts
   */
  reset(): void {
    this.metrics = [];
    this.alerts = [];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    metrics: PerformanceMetrics[];
    alerts: PerformanceAlert[];
    thresholds: PerformanceThresholds;
    exportTimestamp: number;
  } {
    return {
      metrics: [...this.metrics],
      alerts: [...this.alerts],
      thresholds: { ...this.thresholds },
      exportTimestamp: Date.now()
    };
  }
}

export default BatchPerformanceMonitor;
