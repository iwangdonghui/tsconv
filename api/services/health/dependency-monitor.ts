/**
 * Dependency Monitor
 * Advanced monitoring for external dependencies and service health tracking
 */

export interface DependencyConfig {
  name: string;
  type: 'database' | 'cache' | 'api' | 'service' | 'storage' | 'queue';
  endpoint?: string;
  timeout: number;
  retries: number;
  critical: boolean;
  healthCheck: {
    method: 'ping' | 'http' | 'tcp' | 'custom';
    interval: number;
    expectedResponse?: any;
    customChecker?: () => Promise<boolean>;
  };
  fallback?: {
    enabled: boolean;
    strategy: 'cache' | 'mock' | 'degraded' | 'offline';
    data?: any;
  };
}

export interface DependencyStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: number;
  responseTime: number;
  uptime: number;
  errorCount: number;
  consecutiveFailures: number;
  details: {
    version?: string;
    region?: string;
    error?: string;
    metrics?: Record<string, unknown>;
  };
  history: Array<{
    timestamp: number;
    status: string;
    responseTime: number;
    error?: string;
  }>;
}

export interface DependencyReport {
  timestamp: number;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  dependencies: DependencyStatus[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical: number;
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'error' | 'critical';
    dependency: string;
    message: string;
    timestamp: number;
  }>;
  recommendations: string[];
}

/**
 * Dependency Monitor
 */
export class DependencyMonitor {
  private static instance: DependencyMonitor;
  private dependencies = new Map<string, DependencyConfig>();
  private statuses = new Map<string, DependencyStatus>();
  private monitoringIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private alertCallbacks: Array<(alert: any) => void> = [];

  constructor() {
    this.initializeDefaultDependencies();
  }

  static getInstance(): DependencyMonitor {
    if (!DependencyMonitor.instance) {
      DependencyMonitor.instance = new DependencyMonitor();
    }
    return DependencyMonitor.instance;
  }

  /**
   * Initialize default dependencies
   */
  private initializeDefaultDependencies(): void {
    const defaultDependencies: DependencyConfig[] = [
      {
        name: 'upstash-redis',
        type: 'cache',
        endpoint: process.env.UPSTASH_REDIS_REST_URL,
        timeout: 5000,
        retries: 3,
        critical: false,
        healthCheck: {
          method: 'custom',
          interval: 30000,
          customChecker: this.checkRedisHealth.bind(this),
        },
        fallback: {
          enabled: true,
          strategy: 'cache',
        },
      },
      {
        name: 'vercel-platform',
        type: 'service',
        timeout: 10000,
        retries: 2,
        critical: true,
        healthCheck: {
          method: 'custom',
          interval: 60000,
          customChecker: this.checkVercelHealth.bind(this),
        },
        fallback: {
          enabled: false,
          strategy: 'offline',
        },
      },
      {
        name: 'format-engine',
        type: 'service',
        timeout: 3000,
        retries: 2,
        critical: true,
        healthCheck: {
          method: 'custom',
          interval: 15000,
          customChecker: this.checkFormatEngineHealth.bind(this),
        },
        fallback: {
          enabled: true,
          strategy: 'degraded',
        },
      },
      {
        name: 'batch-processor',
        type: 'service',
        timeout: 5000,
        retries: 2,
        critical: false,
        healthCheck: {
          method: 'custom',
          interval: 30000,
          customChecker: this.checkBatchProcessorHealth.bind(this),
        },
        fallback: {
          enabled: true,
          strategy: 'degraded',
        },
      },
      {
        name: 'error-handler',
        type: 'service',
        timeout: 2000,
        retries: 1,
        critical: true,
        healthCheck: {
          method: 'custom',
          interval: 20000,
          customChecker: this.checkErrorHandlerHealth.bind(this),
        },
        fallback: {
          enabled: true,
          strategy: 'mock',
        },
      },
    ];

    defaultDependencies.forEach(dep => this.addDependency(dep));
  }

  /**
   * Add dependency to monitor
   */
  addDependency(config: DependencyConfig): void {
    this.dependencies.set(config.name, config);

    // Initialize status
    this.statuses.set(config.name, {
      name: config.name,
      status: 'unknown',
      lastCheck: 0,
      responseTime: 0,
      uptime: 0,
      errorCount: 0,
      consecutiveFailures: 0,
      details: {},
      history: [],
    });

    // Start monitoring
    this.startMonitoring(config.name);
  }

  /**
   * Remove dependency from monitoring
   */
  removeDependency(name: string): void {
    this.stopMonitoring(name);
    this.dependencies.delete(name);
    this.statuses.delete(name);
  }

  /**
   * Start monitoring a dependency
   */
  private startMonitoring(name: string): void {
    const config = this.dependencies.get(name);
    if (!config) return;

    // Stop existing monitoring
    this.stopMonitoring(name);

    // Start new monitoring interval
    const interval = setInterval(async () => {
      await this.checkDependency(name);
    }, config.healthCheck.interval);

    this.monitoringIntervals.set(name, interval);

    // Perform initial check
    this.checkDependency(name);
  }

  /**
   * Stop monitoring a dependency
   */
  private stopMonitoring(name: string): void {
    const interval = this.monitoringIntervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(name);
    }
  }

  /**
   * Check individual dependency health
   */
  private async checkDependency(name: string): Promise<void> {
    const config = this.dependencies.get(name);
    const status = this.statuses.get(name);

    if (!config || !status) return;

    const startTime = Date.now();
    let checkResult = false;
    let error: string | undefined;

    try {
      // Perform health check with retries
      for (let attempt = 0; attempt <= config.retries; attempt++) {
        try {
          checkResult = await this.performHealthCheck(config);
          if (checkResult) break;
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          if (attempt === config.retries) {
            throw e;
          }
          // Wait before retry
          await this.sleep(1000 * (attempt + 1));
        }
      }
    } catch (e) {
      checkResult = false;
      error = e instanceof Error ? e.message : String(e);
    }

    const responseTime = Date.now() - startTime;
    const newStatus = this.determineStatus(checkResult, responseTime, config);

    // Update status
    this.updateDependencyStatus(name, {
      status: newStatus,
      responseTime,
      error,
      checkResult,
    });

    // Check for alerts
    this.checkForAlerts(name, status, newStatus);
  }

  /**
   * Perform health check based on method
   */
  private async performHealthCheck(config: DependencyConfig): Promise<boolean> {
    switch (config.healthCheck.method) {
      case 'custom':
        if (config.healthCheck.customChecker) {
          return await config.healthCheck.customChecker();
        }
        return false;

      case 'http':
        if (config.endpoint) {
          return await this.performHttpCheck(config.endpoint, config.timeout);
        }
        return false;

      case 'tcp':
        if (config.endpoint) {
          return await this.performTcpCheck(config.endpoint, config.timeout);
        }
        return false;

      case 'ping':
        return await this.performPingCheck(config.endpoint || 'localhost');

      default:
        return false;
    }
  }

  /**
   * Custom health checkers
   */
  private async checkRedisHealth(): Promise<boolean> {
    try {
      const { getStrategicCacheService } = await import('../cache/cache-config-init');
      const cacheService = await getStrategicCacheService();

      const testKey = `dependency-check-${Date.now()}`;
      const testValue = { test: true };

      await cacheService.set(testKey, testValue, { ttl: 5000 });
      const result = await cacheService.get(testKey);
      await cacheService.delete(testKey);

      return result !== null;
    } catch (error) {
      return false;
    }
  }

  private async checkVercelHealth(): Promise<boolean> {
    try {
      // Check if we're running on Vercel
      return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    } catch (error) {
      return false;
    }
  }

  private async checkFormatEngineHealth(): Promise<boolean> {
    try {
      const { EnhancedFormatEngine } = await import('../format-engine/enhanced-format-engine');
      const engine = EnhancedFormatEngine.getInstance();

      // Test basic format operation
      const testInput = '1705315845';
      const result = engine.parseInput(testInput);

      return result.success && result.confidence > 0.5;
    } catch (error) {
      return false;
    }
  }

  private async checkBatchProcessorHealth(): Promise<boolean> {
    try {
      const { OptimizedBatchProcessor } = await import(
        '../batch-processing/optimized-batch-processor'
      );
      const processor = new OptimizedBatchProcessor();

      // Test with small batch
      const testItems = [{ timestamp: Date.now() }];
      const result = await processor.processBatch(testItems, { maxConcurrency: 1 });

      return result.stats.successfulItems > 0;
    } catch (error) {
      return false;
    }
  }

  private async checkErrorHandlerHealth(): Promise<boolean> {
    try {
      const { EnhancedErrorManager } = await import('../error-handling/enhanced-error-manager');
      const manager = EnhancedErrorManager.getInstance();

      // Test error handling
      const testError = new Error('Health check test');
      const result = await manager.handleError(testError, {} as any, {} as any);

      return result.id !== undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * HTTP health check
   */
  private async performHttpCheck(url: string, timeout: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * TCP health check (simplified)
   */
  private async performTcpCheck(endpoint: string, timeout: number): Promise<boolean> {
    // Simplified TCP check - in real implementation would use net module
    try {
      const url = new URL(endpoint);
      return await this.performHttpCheck(`http://${url.host}`, timeout);
    } catch (error) {
      return false;
    }
  }

  /**
   * Ping check (simplified)
   */
  private async performPingCheck(host: string): Promise<boolean> {
    // Simplified ping - in real implementation would use ping command
    try {
      const response = await fetch(`https://${host}`, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Determine status based on check result
   */
  private determineStatus(
    checkResult: boolean,
    responseTime: number,
    config: DependencyConfig
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (!checkResult) {
      return 'unhealthy';
    }

    // Check response time thresholds
    const slowThreshold = config.timeout * 0.8;
    const degradedThreshold = config.timeout * 0.6;

    if (responseTime > slowThreshold) {
      return 'degraded';
    }

    if (responseTime > degradedThreshold) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Update dependency status
   */
  private updateDependencyStatus(
    name: string,
    update: {
      status: string;
      responseTime: number;
      error?: string;
      checkResult: boolean;
    }
  ): void {
    const status = this.statuses.get(name);
    if (!status) return;

    const now = Date.now();

    // Update consecutive failures
    if (update.checkResult) {
      status.consecutiveFailures = 0;
    } else {
      status.consecutiveFailures++;
      status.errorCount++;
    }

    // Update status
    status.status = update.status as any;
    status.lastCheck = now;
    status.responseTime = update.responseTime;

    if (update.error) {
      status.details.error = update.error;
    } else {
      delete status.details.error;
    }

    // Add to history
    status.history.push({
      timestamp: now,
      status: update.status,
      responseTime: update.responseTime,
      error: update.error,
    });

    // Keep only last 100 entries
    if (status.history.length > 100) {
      status.history = status.history.slice(-50);
    }

    // Calculate uptime
    const recentHistory = status.history.slice(-20);
    const successfulChecks = recentHistory.filter(h => h.status === 'healthy').length;
    status.uptime = (successfulChecks / recentHistory.length) * 100;
  }

  /**
   * Check for alerts
   */
  private checkForAlerts(name: string, oldStatus: DependencyStatus, newStatus: string): void {
    const config = this.dependencies.get(name);
    if (!config) return;

    // Status change alerts
    if (oldStatus.status !== newStatus) {
      const level = this.getAlertLevel(newStatus, config.critical);
      const alert = {
        level,
        dependency: name,
        message: `Dependency ${name} status changed from ${oldStatus.status} to ${newStatus}`,
        timestamp: Date.now(),
      };

      this.triggerAlert(alert);
    }

    // Consecutive failure alerts
    if (oldStatus.consecutiveFailures >= 3 && config.critical) {
      const alert = {
        level: 'critical' as const,
        dependency: name,
        message: `Critical dependency ${name} has ${oldStatus.consecutiveFailures} consecutive failures`,
        timestamp: Date.now(),
      };

      this.triggerAlert(alert);
    }
  }

  /**
   * Get alert level based on status and criticality
   */
  private getAlertLevel(
    status: string,
    critical: boolean
  ): 'info' | 'warning' | 'error' | 'critical' {
    if (status === 'unhealthy') {
      return critical ? 'critical' : 'error';
    }

    if (status === 'degraded') {
      return critical ? 'error' : 'warning';
    }

    return 'info';
  }

  /**
   * Trigger alert
   */
  private triggerAlert(alert: any): void {
    console.warn(`🚨 Dependency Alert [${alert.level.toUpperCase()}]: ${alert.message}`);

    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert callback error:', error);
      }
    });
  }

  /**
   * Get dependency report
   */
  getDependencyReport(): DependencyReport {
    const dependencies = Array.from(this.statuses.values());

    const summary = {
      total: dependencies.length,
      healthy: dependencies.filter(d => d.status === 'healthy').length,
      degraded: dependencies.filter(d => d.status === 'degraded').length,
      unhealthy: dependencies.filter(d => d.status === 'unhealthy').length,
      critical: dependencies.filter(d => {
        const config = this.dependencies.get(d.name);
        return config?.critical && d.status === 'unhealthy';
      }).length,
    };

    const overallStatus = this.calculateOverallStatus(dependencies);
    const alerts = this.generateCurrentAlerts(dependencies);
    const recommendations = this.generateRecommendations(dependencies);

    return {
      timestamp: Date.now(),
      overallStatus,
      dependencies,
      summary,
      alerts,
      recommendations,
    };
  }

  /**
   * Calculate overall status
   */
  private calculateOverallStatus(
    dependencies: DependencyStatus[]
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const criticalDeps = dependencies.filter(d => {
      const config = this.dependencies.get(d.name);
      return config?.critical;
    });

    // If any critical dependency is unhealthy, overall is unhealthy
    if (criticalDeps.some(d => d.status === 'unhealthy')) {
      return 'unhealthy';
    }

    // If any dependency is unhealthy or critical is degraded, overall is degraded
    if (
      dependencies.some(d => d.status === 'unhealthy') ||
      criticalDeps.some(d => d.status === 'degraded')
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Generate current alerts
   */
  private generateCurrentAlerts(dependencies: DependencyStatus[]): DependencyReport['alerts'] {
    const alerts: DependencyReport['alerts'] = [];

    dependencies.forEach(dep => {
      const config = this.dependencies.get(dep.name);
      if (!config) return;

      if (dep.status === 'unhealthy') {
        alerts.push({
          level: config.critical ? 'critical' : 'error',
          dependency: dep.name,
          message: `Dependency ${dep.name} is unhealthy`,
          timestamp: Date.now(),
        });
      } else if (dep.status === 'degraded') {
        alerts.push({
          level: config.critical ? 'error' : 'warning',
          dependency: dep.name,
          message: `Dependency ${dep.name} is degraded`,
          timestamp: Date.now(),
        });
      }

      if (dep.consecutiveFailures >= 5) {
        alerts.push({
          level: 'warning',
          dependency: dep.name,
          message: `Dependency ${dep.name} has ${dep.consecutiveFailures} consecutive failures`,
          timestamp: Date.now(),
        });
      }
    });

    return alerts;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(dependencies: DependencyStatus[]): string[] {
    const recommendations: string[] = [];

    const unhealthyDeps = dependencies.filter(d => d.status === 'unhealthy');
    const degradedDeps = dependencies.filter(d => d.status === 'degraded');

    if (unhealthyDeps.length > 0) {
      recommendations.push(
        `Investigate ${unhealthyDeps.length} unhealthy dependencies: ${unhealthyDeps.map(d => d.name).join(', ')}`
      );
    }

    if (degradedDeps.length > 0) {
      recommendations.push(
        `Monitor ${degradedDeps.length} degraded dependencies: ${degradedDeps.map(d => d.name).join(', ')}`
      );
    }

    const slowDeps = dependencies.filter(d => d.responseTime > 5000);
    if (slowDeps.length > 0) {
      recommendations.push(`Optimize response times for: ${slowDeps.map(d => d.name).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Add alert callback
   */
  onAlert(callback: (alert: any) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Remove alert callback
   */
  removeAlertCallback(callback: (alert: any) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Get dependency status
   */
  getDependencyStatus(name: string): DependencyStatus | null {
    return this.statuses.get(name) || null;
  }

  /**
   * Start all monitoring
   */
  startAllMonitoring(): void {
    this.dependencies.forEach((_, name) => {
      this.startMonitoring(name);
    });
  }

  /**
   * Stop all monitoring
   */
  stopAllMonitoring(): void {
    this.monitoringIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.monitoringIntervals.clear();
  }

  /**
   * Utility method for sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default DependencyMonitor;
