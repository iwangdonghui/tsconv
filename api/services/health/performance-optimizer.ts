/**
 * Health Check Performance Optimizer
 * Advanced optimization for health check response times with intelligent caching and parallel execution
 */

export interface PerformanceConfig {
  enableParallelExecution: boolean;
  enableIntelligentCaching: boolean;
  enablePreemptiveChecks: boolean;
  enableCircuitBreaker: boolean;
  enableResponseCompression: boolean;
  maxConcurrency: number;
  cacheStrategy: 'aggressive' | 'conservative' | 'adaptive';
  timeoutStrategy: 'fixed' | 'adaptive' | 'progressive';
}

export interface PerformanceMetrics {
  totalResponseTime: number;
  cacheHitRate: number;
  parallelExecutionGain: number;
  circuitBreakerActivations: number;
  compressionRatio: number;
  averageCheckTime: number;
  slowestCheck: { name: string; time: number };
  fastestCheck: { name: string; time: number };
  optimizationSavings: number;
}

export interface CheckExecutionPlan {
  checks: Array<{
    name: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    estimatedTime: number;
    dependencies: string[];
    canRunInParallel: boolean;
    cacheKey?: string;
    cacheTTL?: number;
  }>;
  executionGroups: Array<{
    groupId: string;
    checks: string[];
    maxConcurrency: number;
    timeout: number;
  }>;
  totalEstimatedTime: number;
  optimizedTime: number;
}

/**
 * Health Check Performance Optimizer
 */
export class HealthCheckPerformanceOptimizer {
  private static instance: HealthCheckPerformanceOptimizer;
  private config: PerformanceConfig;
  private performanceCache = new Map<string, { data: any; timestamp: number; hitCount: number }>();
  private circuitBreakers = new Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }>();
  private executionHistory: Array<{ timestamp: number; metrics: PerformanceMetrics }> = [];
  private preemptiveCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableParallelExecution: true,
      enableIntelligentCaching: true,
      enablePreemptiveChecks: true,
      enableCircuitBreaker: true,
      enableResponseCompression: true,
      maxConcurrency: 10,
      cacheStrategy: 'adaptive',
      timeoutStrategy: 'adaptive',
      ...config
    };

    this.initializeOptimizer();
  }

  static getInstance(config?: Partial<PerformanceConfig>): HealthCheckPerformanceOptimizer {
    if (!HealthCheckPerformanceOptimizer.instance) {
      HealthCheckPerformanceOptimizer.instance = new HealthCheckPerformanceOptimizer(config);
    }
    return HealthCheckPerformanceOptimizer.instance;
  }

  /**
   * Initialize optimizer
   */
  private initializeOptimizer(): void {
    // Start preemptive checks if enabled
    if (this.config.enablePreemptiveChecks) {
      this.startPreemptiveChecks();
    }

    // Start cache cleanup
    setInterval(() => this.cleanupCache(), 300000); // 5 minutes

    // Start performance tracking
    setInterval(() => this.trackPerformance(), 60000); // 1 minute
  }

  /**
   * Optimize health check execution
   */
  async optimizeHealthCheck<T>(
    checks: Array<{ name: string; executor: () => Promise<T>; priority?: string; dependencies?: string[] }>,
    options: {
      timeout?: number;
      enableCaching?: boolean;
      enableParallel?: boolean;
      level?: string;
    } = {}
  ): Promise<{
    results: Array<{ name: string; result: T | null; error?: Error; executionTime: number }>;
    metrics: PerformanceMetrics;
    executionPlan: CheckExecutionPlan;
  }> {
    const startTime = Date.now();
    
    // Create execution plan
    const executionPlan = this.createExecutionPlan(checks, options);
    
    // Execute optimized checks
    const results = await this.executeOptimizedChecks(checks, executionPlan, options);
    
    // Calculate metrics
    const metrics = this.calculatePerformanceMetrics(results, startTime, executionPlan);
    
    // Update performance history
    this.updatePerformanceHistory(metrics);
    
    return { results, metrics, executionPlan };
  }

  /**
   * Create optimized execution plan
   */
  private createExecutionPlan(
    checks: Array<{ name: string; executor: () => Promise<any>; priority?: string; dependencies?: string[] }>,
    options: any
  ): CheckExecutionPlan {
    const checkPlans = checks.map(check => ({
      name: check.name,
      priority: (check.priority as any) || 'medium',
      estimatedTime: this.estimateCheckTime(check.name),
      dependencies: check.dependencies || [],
      canRunInParallel: this.canRunInParallel(check.name, check.dependencies),
      cacheKey: this.generateCacheKey(check.name, options),
      cacheTTL: this.getCacheTTL(check.name, options.level)
    }));

    // Group checks for parallel execution
    const executionGroups = this.createExecutionGroups(checkPlans);
    
    // Calculate timing estimates
    const totalEstimatedTime = checkPlans.reduce((sum, check) => sum + check.estimatedTime, 0);
    const optimizedTime = this.calculateOptimizedTime(executionGroups);

    return {
      checks: checkPlans,
      executionGroups,
      totalEstimatedTime,
      optimizedTime
    };
  }

  /**
   * Execute optimized health checks
   */
  private async executeOptimizedChecks(
    checks: Array<{ name: string; executor: () => Promise<any>; priority?: string; dependencies?: string[] }>,
    plan: CheckExecutionPlan,
    options: any
  ): Promise<Array<{ name: string; result: any; error?: Error; executionTime: number }>> {
    const results: Array<{ name: string; result: any; error?: Error; executionTime: number }> = [];
    const checkMap = new Map(checks.map(check => [check.name, check]));

    // Execute groups in sequence, checks within groups in parallel
    for (const group of plan.executionGroups) {
      const groupPromises = group.checks.map(async (checkName) => {
        const check = checkMap.get(checkName);
        const checkPlan = plan.checks.find(c => c.name === checkName);
        
        if (!check || !checkPlan) {
          return { name: checkName, result: null, error: new Error('Check not found'), executionTime: 0 };
        }

        return await this.executeOptimizedCheck(check, checkPlan, options);
      });

      // Execute group with concurrency limit
      const groupResults = await this.executeConcurrentlyWithLimit(
        groupPromises,
        group.maxConcurrency,
        group.timeout
      );

      results.push(...groupResults);
    }

    return results;
  }

  /**
   * Execute individual optimized check
   */
  private async executeOptimizedCheck(
    check: { name: string; executor: () => Promise<any> },
    plan: { name: string; cacheKey?: string; cacheTTL?: number },
    options: any
  ): Promise<{ name: string; result: any; error?: Error; executionTime: number }> {
    const startTime = Date.now();

    try {
      // Check circuit breaker
      if (this.config.enableCircuitBreaker && this.isCircuitBreakerOpen(check.name)) {
        throw new Error(`Circuit breaker open for ${check.name}`);
      }

      // Check cache first
      if (this.config.enableIntelligentCaching && plan.cacheKey) {
        const cached = this.getCachedResult(plan.cacheKey);
        if (cached) {
          return {
            name: check.name,
            result: cached,
            executionTime: Date.now() - startTime
          };
        }
      }

      // Execute check with timeout
      const timeout = this.getAdaptiveTimeout(check.name, options.timeout);
      const result = await this.withTimeout(check.executor(), timeout);

      // Cache result if successful
      if (this.config.enableIntelligentCaching && plan.cacheKey && plan.cacheTTL) {
        this.cacheResult(plan.cacheKey, result, plan.cacheTTL);
      }

      // Reset circuit breaker on success
      if (this.config.enableCircuitBreaker) {
        this.resetCircuitBreaker(check.name);
      }

      return {
        name: check.name,
        result,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      // Update circuit breaker on failure
      if (this.config.enableCircuitBreaker) {
        this.updateCircuitBreaker(check.name);
      }

      return {
        name: check.name,
        result: null,
        error: error as Error,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute promises concurrently with limit
   */
  private async executeConcurrentlyWithLimit<T>(
    promises: Promise<T>[],
    limit: number,
    timeout: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      const executePromise = promise.then(result => {
        results.push(result);
      });

      executing.push(executePromise);

      if (executing.length >= limit) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === executePromise), 1);
      }
    }

    // Wait for remaining promises
    await Promise.all(executing);
    return results;
  }

  /**
   * Create execution groups for parallel execution
   */
  private createExecutionGroups(checks: Array<{
    name: string;
    priority: string;
    dependencies: string[];
    canRunInParallel: boolean;
    estimatedTime: number;
  }>): Array<{ groupId: string; checks: string[]; maxConcurrency: number; timeout: number }> {
    const groups: Array<{ groupId: string; checks: string[]; maxConcurrency: number; timeout: number }> = [];
    const processed = new Set<string>();

    // Sort by priority and dependencies
    const sortedChecks = [...checks].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder as any)[a.priority] - (priorityOrder as any)[b.priority];
    });

    let groupIndex = 0;
    while (processed.size < checks.length) {
      const currentGroup: string[] = [];
      
      for (const check of sortedChecks) {
        if (processed.has(check.name)) continue;
        
        // Check if dependencies are satisfied
        const dependenciesSatisfied = check.dependencies.every(dep => processed.has(dep));
        
        if (dependenciesSatisfied && (currentGroup.length === 0 || check.canRunInParallel)) {
          currentGroup.push(check.name);
          processed.add(check.name);
        }
      }

      if (currentGroup.length > 0) {
        const groupChecks = currentGroup.map(name => checks.find(c => c.name === name)!);
        const maxTime = Math.max(...groupChecks.map(c => c.estimatedTime));
        
        groups.push({
          groupId: `group-${groupIndex++}`,
          checks: currentGroup,
          maxConcurrency: Math.min(currentGroup.length, this.config.maxConcurrency),
          timeout: maxTime * 2 // 2x estimated time as timeout
        });
      } else {
        // Break infinite loop if no progress
        break;
      }
    }

    return groups;
  }

  /**
   * Intelligent caching methods
   */
  private generateCacheKey(checkName: string, options: any): string {
    const keyComponents = [checkName, options.level || 'standard'];
    return `health:${keyComponents.join(':')}`;
  }

  private getCacheTTL(checkName: string, level?: string): number {
    // Adaptive TTL based on check type and level
    const baseTTL = {
      basic: 60000,      // 1 minute
      standard: 30000,   // 30 seconds
      comprehensive: 15000, // 15 seconds
      deep: 5000         // 5 seconds
    };

    const checkMultipliers = {
      memory: 0.5,       // Memory changes quickly
      connectivity: 2,   // Connectivity is stable
      cache: 1,          // Standard caching
      'format-engine': 3 // Format engine is very stable
    };

    const levelTTL = (baseTTL as any)[level || 'standard'] || 30000;
    const multiplier = (checkMultipliers as any)[checkName] || 1;
    
    return Math.floor(levelTTL * multiplier);
  }

  private getCachedResult(cacheKey: string): any | null {
    const cached = this.performanceCache.get(cacheKey);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.getCacheTTLForKey(cacheKey)) {
      this.performanceCache.delete(cacheKey);
      return null;
    }

    // Update hit count
    cached.hitCount++;
    return cached.data;
  }

  private cacheResult(cacheKey: string, result: any, ttl: number): void {
    this.performanceCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      hitCount: 0
    });
  }

  private getCacheTTLForKey(cacheKey: string): number {
    // Extract TTL from cache key or use default
    return 30000; // 30 seconds default
  }

  /**
   * Circuit breaker methods
   */
  private isCircuitBreakerOpen(checkName: string): boolean {
    const breaker = this.circuitBreakers.get(checkName);
    if (!breaker) return false;

    if (breaker.state === 'open') {
      // Check if we should try half-open
      if (Date.now() - breaker.lastFailure > 60000) { // 1 minute
        breaker.state = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }

  private updateCircuitBreaker(checkName: string): void {
    const breaker = this.circuitBreakers.get(checkName) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const
    };

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= 5) { // Threshold: 5 failures
      breaker.state = 'open';
    }

    this.circuitBreakers.set(checkName, breaker);
  }

  private resetCircuitBreaker(checkName: string): void {
    const breaker = this.circuitBreakers.get(checkName);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
    }
  }

  /**
   * Adaptive timeout calculation
   */
  private getAdaptiveTimeout(checkName: string, baseTimeout?: number): number {
    const base = baseTimeout || 5000;
    
    if (this.config.timeoutStrategy === 'fixed') {
      return base;
    }

    // Get historical performance for this check
    const history = this.getCheckHistory(checkName);
    if (history.length === 0) {
      return base;
    }

    const avgTime = history.reduce((sum, time) => sum + time, 0) / history.length;
    const maxTime = Math.max(...history);

    if (this.config.timeoutStrategy === 'adaptive') {
      // Use 3x average time or 2x max time, whichever is smaller
      return Math.min(avgTime * 3, maxTime * 2, base * 2);
    }

    // Progressive: start with average, increase if needed
    return Math.max(avgTime * 1.5, base * 0.5);
  }

  /**
   * Performance estimation and tracking
   */
  private estimateCheckTime(checkName: string): number {
    const history = this.getCheckHistory(checkName);
    if (history.length === 0) {
      // Default estimates based on check type
      const defaults = {
        memory: 10,
        connectivity: 100,
        cache: 50,
        'format-engine': 200,
        'batch-processing': 500,
        database: 1000
      };
      return (defaults as any)[checkName] || 100;
    }

    return history.reduce((sum, time) => sum + time, 0) / history.length;
  }

  private canRunInParallel(checkName: string, dependencies: string[] = []): boolean {
    // Checks with dependencies cannot run in parallel with their dependencies
    if (dependencies.length > 0) return false;
    
    // Some checks are inherently sequential
    const sequentialChecks = ['database', 'external-services'];
    return !sequentialChecks.includes(checkName);
  }

  private getCheckHistory(checkName: string): number[] {
    // Get recent execution times for this check
    return this.executionHistory
      .slice(-20) // Last 20 executions
      .map(entry => entry.metrics.averageCheckTime)
      .filter(time => time > 0);
  }

  /**
   * Performance metrics calculation
   */
  private calculatePerformanceMetrics(
    results: Array<{ name: string; result: any; error?: Error; executionTime: number }>,
    startTime: number,
    plan: CheckExecutionPlan
  ): PerformanceMetrics {
    const totalResponseTime = Date.now() - startTime;
    const executionTimes = results.map(r => r.executionTime);
    const averageCheckTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    
    const slowest = results.reduce((prev, curr) => 
      curr.executionTime > prev.executionTime ? curr : prev
    );
    
    const fastest = results.reduce((prev, curr) => 
      curr.executionTime < prev.executionTime ? curr : prev
    );

    // Calculate cache hit rate
    const cacheHits = Array.from(this.performanceCache.values())
      .reduce((sum, cache) => sum + cache.hitCount, 0);
    const totalCacheRequests = cacheHits + results.length;
    const cacheHitRate = totalCacheRequests > 0 ? (cacheHits / totalCacheRequests) * 100 : 0;

    // Calculate optimization savings
    const optimizationSavings = Math.max(0, plan.totalEstimatedTime - totalResponseTime);
    const parallelExecutionGain = plan.totalEstimatedTime > 0 ? 
      (optimizationSavings / plan.totalEstimatedTime) * 100 : 0;

    return {
      totalResponseTime,
      cacheHitRate,
      parallelExecutionGain,
      circuitBreakerActivations: Array.from(this.circuitBreakers.values())
        .filter(cb => cb.state === 'open').length,
      compressionRatio: 0, // Would implement response compression
      averageCheckTime,
      slowestCheck: { name: slowest.name, time: slowest.executionTime },
      fastestCheck: { name: fastest.name, time: fastest.executionTime },
      optimizationSavings
    };
  }

  private calculateOptimizedTime(groups: Array<{ checks: string[]; timeout: number }>): number {
    // Sum of group timeouts (groups run sequentially)
    return groups.reduce((sum, group) => sum + group.timeout, 0);
  }

  /**
   * Preemptive checks
   */
  private startPreemptiveChecks(): void {
    // Run basic health checks every 30 seconds to warm cache
    this.preemptiveCheckInterval = setInterval(async () => {
      try {
        // Run lightweight checks to populate cache
        await this.runPreemptiveChecks();
      } catch (error) {
        console.warn('Preemptive health check failed:', error);
      }
    }, 30000);
  }

  private async runPreemptiveChecks(): Promise<void> {
    // Run basic checks that are commonly requested
    const basicChecks = ['memory', 'connectivity', 'cache'];
    
    for (const checkName of basicChecks) {
      const cacheKey = this.generateCacheKey(checkName, { level: 'basic' });
      
      // Only run if not in cache
      if (!this.getCachedResult(cacheKey)) {
        try {
          // Run a lightweight version of the check
          await this.runLightweightCheck(checkName);
        } catch (error) {
          // Ignore preemptive check failures
        }
      }
    }
  }

  private async runLightweightCheck(checkName: string): Promise<void> {
    // Simplified versions of checks for preemptive execution
    switch (checkName) {
      case 'memory':
        const memUsage = process.memoryUsage();
        this.cacheResult(
          this.generateCacheKey('memory', { level: 'basic' }),
          { heapUsed: memUsage.heapUsed, heapTotal: memUsage.heapTotal },
          30000
        );
        break;
      
      case 'connectivity':
        this.cacheResult(
          this.generateCacheKey('connectivity', { level: 'basic' }),
          { connected: true },
          60000
        );
        break;
    }
  }

  /**
   * Utility methods
   */
  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeout);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, cached] of this.performanceCache.entries()) {
      const ttl = this.getCacheTTLForKey(key);
      if (now - cached.timestamp > ttl) {
        this.performanceCache.delete(key);
      }
    }
  }

  private trackPerformance(): void {
    // Track overall performance metrics
    const metrics = {
      cacheSize: this.performanceCache.size,
      circuitBreakers: this.circuitBreakers.size,
      timestamp: Date.now()
    };
    
    // Store performance data
    console.log('Health check performance:', metrics);
  }

  private updatePerformanceHistory(metrics: PerformanceMetrics): void {
    this.executionHistory.push({
      timestamp: Date.now(),
      metrics
    });

    // Keep only last 100 entries
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(-50);
    }
  }

  /**
   * Public methods for configuration and monitoring
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getPerformanceStats(): {
    cacheStats: { size: number; hitRate: number };
    circuitBreakerStats: { total: number; open: number };
    executionHistory: Array<{ timestamp: number; metrics: PerformanceMetrics }>;
  } {
    const cacheHits = Array.from(this.performanceCache.values())
      .reduce((sum, cache) => sum + cache.hitCount, 0);
    
    const openCircuitBreakers = Array.from(this.circuitBreakers.values())
      .filter(cb => cb.state === 'open').length;

    return {
      cacheStats: {
        size: this.performanceCache.size,
        hitRate: cacheHits > 0 ? (cacheHits / (cacheHits + 100)) * 100 : 0 // Approximate
      },
      circuitBreakerStats: {
        total: this.circuitBreakers.size,
        open: openCircuitBreakers
      },
      executionHistory: [...this.executionHistory]
    };
  }

  clearCache(): void {
    this.performanceCache.clear();
  }

  resetCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }

  destroy(): void {
    if (this.preemptiveCheckInterval) {
      clearInterval(this.preemptiveCheckInterval);
    }
    this.clearCache();
    this.resetCircuitBreakers();
  }
}

export default HealthCheckPerformanceOptimizer;
