/**
 * Performance Benchmark Tool
 * Comprehensive benchmarking for health check performance optimization
 */

import { EnhancedHealthMonitor } from './enhanced-health-monitor';
import { HealthCheckPerformanceOptimizer } from './performance-optimizer';

export interface BenchmarkConfig {
  iterations: number;
  warmupRuns: number;
  levels: Array<'basic' | 'standard' | 'comprehensive' | 'deep'>;
  enableOptimization: boolean;
  enableCaching: boolean;
  enableParallel: boolean;
  concurrencyLevels: number[];
}

export interface BenchmarkResult {
  config: BenchmarkConfig;
  timestamp: number;
  results: {
    unoptimized: BenchmarkMetrics;
    optimized: BenchmarkMetrics;
    comparison: {
      speedImprovement: number;
      cacheEffectiveness: number;
      parallelizationGain: number;
      overallImprovement: number;
    };
  };
  recommendations: string[];
}

export interface BenchmarkMetrics {
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  standardDeviation: number;
  throughput: number;
  cacheHitRate: number;
  errorRate: number;
  memoryUsage: {
    average: number;
    peak: number;
  };
  cpuUsage: {
    average: number;
    peak: number;
  };
}

/**
 * Performance Benchmark Tool
 */
export class PerformanceBenchmark {
  private healthMonitor: EnhancedHealthMonitor;
  private optimizer: HealthCheckPerformanceOptimizer;

  constructor() {
    this.healthMonitor = EnhancedHealthMonitor.getInstance();
    this.optimizer = HealthCheckPerformanceOptimizer.getInstance();
  }

  /**
   * Run comprehensive performance benchmark
   */
  async runBenchmark(config: Partial<BenchmarkConfig> = {}): Promise<BenchmarkResult> {
    const fullConfig: BenchmarkConfig = {
      iterations: 100,
      warmupRuns: 10,
      levels: ['basic', 'standard', 'comprehensive'],
      enableOptimization: true,
      enableCaching: true,
      enableParallel: true,
      concurrencyLevels: [1, 2, 4, 8],
      ...config
    };

    console.log('🚀 Starting health check performance benchmark...');
    console.log(`Configuration: ${JSON.stringify(fullConfig, null, 2)}`);

    const startTime = Date.now();

    // Warmup runs
    await this.performWarmup(fullConfig);

    // Run unoptimized benchmarks
    console.log('📊 Running unoptimized benchmarks...');
    const unoptimizedResults = await this.runUnoptimizedBenchmarks(fullConfig);

    // Run optimized benchmarks
    console.log('⚡ Running optimized benchmarks...');
    const optimizedResults = await this.runOptimizedBenchmarks(fullConfig);

    // Calculate comparison metrics
    const comparison = this.calculateComparison(unoptimizedResults, optimizedResults);

    // Generate recommendations
    const recommendations = this.generateRecommendations(unoptimizedResults, optimizedResults, comparison);

    const result: BenchmarkResult = {
      config: fullConfig,
      timestamp: Date.now(),
      results: {
        unoptimized: unoptimizedResults,
        optimized: optimizedResults,
        comparison
      },
      recommendations
    };

    const totalTime = Date.now() - startTime;
    console.log(`✅ Benchmark completed in ${totalTime}ms`);
    console.log(`📈 Overall improvement: ${comparison.overallImprovement.toFixed(2)}%`);

    return result;
  }

  /**
   * Perform warmup runs
   */
  private async performWarmup(config: BenchmarkConfig): Promise<void> {
    console.log(`🔥 Performing ${config.warmupRuns} warmup runs...`);
    
    for (let i = 0; i < config.warmupRuns; i++) {
      try {
        await this.healthMonitor.performHealthCheck({ level: 'basic' });
        if (config.enableOptimization) {
          await this.healthMonitor.performOptimizedHealthCheck({ level: 'basic' });
        }
      } catch (error) {
        // Ignore warmup errors
      }
    }
  }

  /**
   * Run unoptimized benchmarks
   */
  private async runUnoptimizedBenchmarks(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const measurements: number[] = [];
    const memoryMeasurements: number[] = [];
    const cpuMeasurements: number[] = [];
    let errors = 0;

    for (const level of config.levels) {
      for (let i = 0; i < config.iterations; i++) {
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        const startCpu = process.cpuUsage();

        try {
          await this.healthMonitor.performHealthCheck({
            level,
            enableCaching: false, // Disable caching for fair comparison
            timeout: 10000
          });

          const responseTime = Date.now() - startTime;
          const memoryUsed = process.memoryUsage().heapUsed - startMemory;
          const cpuUsed = process.cpuUsage(startCpu);

          measurements.push(responseTime);
          memoryMeasurements.push(memoryUsed);
          cpuMeasurements.push((cpuUsed.user + cpuUsed.system) / 1000000); // Convert to ms

        } catch (error) {
          errors++;
          measurements.push(10000); // Penalty for errors
        }
      }
    }

    return this.calculateMetrics(measurements, memoryMeasurements, cpuMeasurements, errors, config.iterations * config.levels.length);
  }

  /**
   * Run optimized benchmarks
   */
  private async runOptimizedBenchmarks(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const measurements: number[] = [];
    const memoryMeasurements: number[] = [];
    const cpuMeasurements: number[] = [];
    let errors = 0;
    let totalCacheHits = 0;

    for (const level of config.levels) {
      for (let i = 0; i < config.iterations; i++) {
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        const startCpu = process.cpuUsage();

        try {
          const result = await this.healthMonitor.performOptimizedHealthCheck({
            level,
            enableCaching: config.enableCaching,
            timeout: 10000
          });

          const responseTime = Date.now() - startTime;
          const memoryUsed = process.memoryUsage().heapUsed - startMemory;
          const cpuUsed = process.cpuUsage(startCpu);

          measurements.push(responseTime);
          memoryMeasurements.push(memoryUsed);
          cpuMeasurements.push((cpuUsed.user + cpuUsed.system) / 1000000);

          // Track cache hits
          if (result.optimization && result.optimization.cacheHitRate > 0) {
            totalCacheHits++;
          }

        } catch (error) {
          errors++;
          measurements.push(10000); // Penalty for errors
        }
      }
    }

    const metrics = this.calculateMetrics(measurements, memoryMeasurements, cpuMeasurements, errors, config.iterations * config.levels.length);
    metrics.cacheHitRate = (totalCacheHits / (config.iterations * config.levels.length)) * 100;

    return metrics;
  }

  /**
   * Calculate metrics from measurements
   */
  private calculateMetrics(
    responseTimes: number[],
    memoryUsages: number[],
    cpuUsages: number[],
    errors: number,
    totalRequests: number
  ): BenchmarkMetrics {
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const sum = responseTimes.reduce((a, b) => a + b, 0);
    const mean = sum / responseTimes.length;
    
    // Calculate standard deviation
    const variance = responseTimes.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / responseTimes.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate percentiles
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    const medianIndex = Math.floor(sortedTimes.length * 0.5);

    return {
      averageResponseTime: mean,
      medianResponseTime: sortedTimes[medianIndex],
      p95ResponseTime: sortedTimes[p95Index],
      p99ResponseTime: sortedTimes[p99Index],
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      standardDeviation,
      throughput: (1000 / mean) * 60, // Requests per minute
      cacheHitRate: 0, // Will be set separately for optimized runs
      errorRate: (errors / totalRequests) * 100,
      memoryUsage: {
        average: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        peak: Math.max(...memoryUsages)
      },
      cpuUsage: {
        average: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length,
        peak: Math.max(...cpuUsages)
      }
    };
  }

  /**
   * Calculate comparison metrics
   */
  private calculateComparison(
    unoptimized: BenchmarkMetrics,
    optimized: BenchmarkMetrics
  ): {
    speedImprovement: number;
    cacheEffectiveness: number;
    parallelizationGain: number;
    overallImprovement: number;
  } {
    const speedImprovement = ((unoptimized.averageResponseTime - optimized.averageResponseTime) / unoptimized.averageResponseTime) * 100;
    const cacheEffectiveness = optimized.cacheHitRate;
    
    // Estimate parallelization gain based on throughput improvement
    const throughputImprovement = ((optimized.throughput - unoptimized.throughput) / unoptimized.throughput) * 100;
    const parallelizationGain = Math.max(0, throughputImprovement - cacheEffectiveness);
    
    // Overall improvement considers multiple factors
    const memoryImprovement = ((unoptimized.memoryUsage.average - optimized.memoryUsage.average) / unoptimized.memoryUsage.average) * 100;
    const cpuImprovement = ((unoptimized.cpuUsage.average - optimized.cpuUsage.average) / unoptimized.cpuUsage.average) * 100;
    
    const overallImprovement = (speedImprovement * 0.4 + throughputImprovement * 0.3 + memoryImprovement * 0.2 + cpuImprovement * 0.1);

    return {
      speedImprovement: Math.max(0, speedImprovement),
      cacheEffectiveness,
      parallelizationGain: Math.max(0, parallelizationGain),
      overallImprovement: Math.max(0, overallImprovement)
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    unoptimized: BenchmarkMetrics,
    optimized: BenchmarkMetrics,
    comparison: any
  ): string[] {
    const recommendations: string[] = [];

    if (comparison.speedImprovement > 50) {
      recommendations.push('🚀 Excellent speed improvement! Consider enabling optimization by default.');
    } else if (comparison.speedImprovement > 20) {
      recommendations.push('⚡ Good speed improvement. Optimization is beneficial for this workload.');
    } else if (comparison.speedImprovement < 10) {
      recommendations.push('⚠️ Limited speed improvement. Consider tuning optimization parameters.');
    }

    if (optimized.cacheHitRate > 70) {
      recommendations.push('💾 High cache hit rate indicates effective caching strategy.');
    } else if (optimized.cacheHitRate < 30) {
      recommendations.push('🔄 Low cache hit rate. Consider adjusting cache TTL or strategy.');
    }

    if (comparison.parallelizationGain > 30) {
      recommendations.push('🔀 Significant parallelization gains. Consider increasing concurrency limits.');
    }

    if (optimized.errorRate > unoptimized.errorRate) {
      recommendations.push('❌ Optimization increased error rate. Review timeout and retry settings.');
    }

    if (optimized.memoryUsage.peak > unoptimized.memoryUsage.peak * 1.5) {
      recommendations.push('🧠 Optimization increased memory usage. Consider memory-efficient strategies.');
    }

    if (optimized.p99ResponseTime > unoptimized.p99ResponseTime) {
      recommendations.push('📊 P99 latency increased. Optimization may cause occasional slowdowns.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Performance optimization is working well with current configuration.');
    }

    return recommendations;
  }

  /**
   * Run quick performance test
   */
  async runQuickTest(): Promise<{
    unoptimized: number;
    optimized: number;
    improvement: number;
  }> {
    console.log('🏃 Running quick performance test...');

    // Test unoptimized
    const unoptimizedStart = Date.now();
    await this.healthMonitor.performHealthCheck({ level: 'standard', enableCaching: false });
    const unoptimizedTime = Date.now() - unoptimizedStart;

    // Test optimized
    const optimizedStart = Date.now();
    await this.healthMonitor.performOptimizedHealthCheck({ level: 'standard' });
    const optimizedTime = Date.now() - optimizedStart;

    const improvement = ((unoptimizedTime - optimizedTime) / unoptimizedTime) * 100;

    console.log(`📊 Quick test results:`);
    console.log(`  Unoptimized: ${unoptimizedTime}ms`);
    console.log(`  Optimized: ${optimizedTime}ms`);
    console.log(`  Improvement: ${improvement.toFixed(2)}%`);

    return {
      unoptimized: unoptimizedTime,
      optimized: optimizedTime,
      improvement
    };
  }

  /**
   * Generate performance report
   */
  generateReport(result: BenchmarkResult): string {
    const { unoptimized, optimized, comparison } = result.results;

    return `
# Health Check Performance Benchmark Report

## Configuration
- Iterations: ${result.config.iterations}
- Levels: ${result.config.levels.join(', ')}
- Optimization: ${result.config.enableOptimization ? 'Enabled' : 'Disabled'}
- Caching: ${result.config.enableCaching ? 'Enabled' : 'Disabled'}

## Results Summary

### Response Times
| Metric | Unoptimized | Optimized | Improvement |
|--------|-------------|-----------|-------------|
| Average | ${unoptimized.averageResponseTime.toFixed(2)}ms | ${optimized.averageResponseTime.toFixed(2)}ms | ${comparison.speedImprovement.toFixed(2)}% |
| Median | ${unoptimized.medianResponseTime.toFixed(2)}ms | ${optimized.medianResponseTime.toFixed(2)}ms | ${(((unoptimized.medianResponseTime - optimized.medianResponseTime) / unoptimized.medianResponseTime) * 100).toFixed(2)}% |
| P95 | ${unoptimized.p95ResponseTime.toFixed(2)}ms | ${optimized.p95ResponseTime.toFixed(2)}ms | ${(((unoptimized.p95ResponseTime - optimized.p95ResponseTime) / unoptimized.p95ResponseTime) * 100).toFixed(2)}% |
| P99 | ${unoptimized.p99ResponseTime.toFixed(2)}ms | ${optimized.p99ResponseTime.toFixed(2)}ms | ${(((unoptimized.p99ResponseTime - optimized.p99ResponseTime) / unoptimized.p99ResponseTime) * 100).toFixed(2)}% |

### Throughput
- Unoptimized: ${unoptimized.throughput.toFixed(2)} req/min
- Optimized: ${optimized.throughput.toFixed(2)} req/min
- Improvement: ${(((optimized.throughput - unoptimized.throughput) / unoptimized.throughput) * 100).toFixed(2)}%

### Cache Performance
- Cache Hit Rate: ${optimized.cacheHitRate.toFixed(2)}%
- Cache Effectiveness: ${comparison.cacheEffectiveness.toFixed(2)}%

### Resource Usage
- Memory Improvement: ${(((unoptimized.memoryUsage.average - optimized.memoryUsage.average) / unoptimized.memoryUsage.average) * 100).toFixed(2)}%
- CPU Improvement: ${(((unoptimized.cpuUsage.average - optimized.cpuUsage.average) / unoptimized.cpuUsage.average) * 100).toFixed(2)}%

## Overall Performance
- **Overall Improvement: ${comparison.overallImprovement.toFixed(2)}%**
- Speed Improvement: ${comparison.speedImprovement.toFixed(2)}%
- Parallelization Gain: ${comparison.parallelizationGain.toFixed(2)}%

## Recommendations
${result.recommendations.map(rec => `- ${rec}`).join('\n')}

---
Generated on: ${new Date(result.timestamp).toISOString()}
    `.trim();
  }
}

export default PerformanceBenchmark;
