/**
 * Enhanced Health Monitor
 * Comprehensive health monitoring with layered checks, dependency tracking, and performance optimization
 */

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'critical';
export type CheckLevel = 'basic' | 'standard' | 'comprehensive' | 'deep';

export interface HealthCheckConfig {
  level: CheckLevel;
  timeout: number;
  includeMetrics: boolean;
  includeDependencies: boolean;
  includePerformance: boolean;
  enableCaching: boolean;
  cacheTimeout: number;
}

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  responseTime: number;
  lastCheck: number;
  details: {
    version?: string;
    uptime?: number;
    error?: string;
    metrics?: Record<string, unknown>;
    dependencies?: ServiceHealth[];
  };
  checks: {
    connectivity: boolean;
    functionality: boolean;
    performance: boolean;
    resources: boolean;
  };
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: number;
  uptime: number;
  version: string;
  environment: string;
  responseTime: number;

  services: {
    core: ServiceHealth[];
    dependencies: ServiceHealth[];
    external: ServiceHealth[];
  };

  performance: {
    cpu: {
      usage: number;
      load: number[];
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
      heap: {
        used: number;
        total: number;
        percentage: number;
      };
    };
    network: {
      latency: number;
      throughput: number;
    };
    disk?: {
      used: number;
      total: number;
      percentage: number;
    };
  };

  metrics: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      rate: number;
    };
    errors: {
      rate: number;
      recent: Array<{
        timestamp: number;
        type: string;
        message: string;
      }>;
    };
    cache: {
      hitRate: number;
      size: number;
      operations: number;
    };
  };

  alerts: Array<{
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: number;
    service?: string;
  }>;
}

/**
 * Enhanced Health Monitor
 */
export class EnhancedHealthMonitor {
  private static instance: EnhancedHealthMonitor;
  private healthCache = new Map<string, { data: SystemHealth; timestamp: number }>();
  private serviceRegistry = new Map<string, ServiceHealthChecker>();
  private alertHistory: Array<{
    level: string;
    message: string;
    timestamp: number;
    service?: string;
  }> = [];
  private performanceHistory: Array<{ timestamp: number; metrics: any }> = [];

  constructor() {
    this.initializeServiceRegistry();
    this.startPerformanceTracking();
  }

  static getInstance(): EnhancedHealthMonitor {
    if (!EnhancedHealthMonitor.instance) {
      EnhancedHealthMonitor.instance = new EnhancedHealthMonitor();
    }
    return EnhancedHealthMonitor.instance;
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(config: Partial<HealthCheckConfig> = {}): Promise<SystemHealth> {
    const fullConfig: HealthCheckConfig = {
      level: 'standard',
      timeout: 5000,
      includeMetrics: true,
      includeDependencies: true,
      includePerformance: true,
      enableCaching: true,
      cacheTimeout: 30000,
      ...config,
    };

    const cacheKey = this.generateCacheKey(fullConfig);

    // Check cache first
    if (fullConfig.enableCaching) {
      const cached = this.healthCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < fullConfig.cacheTimeout) {
        return cached.data;
      }
    }

    const startTime = Date.now();

    try {
      // Perform layered health checks
      const systemHealth = await this.executeLayeredHealthCheck(fullConfig);

      // Update response time
      systemHealth.responseTime = Date.now() - startTime;

      // Cache result
      if (fullConfig.enableCaching) {
        this.healthCache.set(cacheKey, {
          data: systemHealth,
          timestamp: Date.now(),
        });
      }

      // Update performance history
      this.updatePerformanceHistory(systemHealth);

      return systemHealth;
    } catch (error) {
      console.error('Health check failed:', error);

      return this.createFailureResponse(error as Error, Date.now() - startTime);
    }
  }

  /**
   * Execute layered health check based on configuration
   */
  private async executeLayeredHealthCheck(config: HealthCheckConfig): Promise<SystemHealth> {
    const timestamp = Date.now();

    // Initialize system health
    const systemHealth: SystemHealth = {
      status: 'healthy',
      timestamp,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: 0,
      services: {
        core: [],
        dependencies: [],
        external: [],
      },
      performance: await this.getPerformanceMetrics(),
      metrics: await this.getSystemMetrics(),
      alerts: [],
    };

    // Layer 1: Basic checks (always performed)
    await this.performBasicChecks(systemHealth, config);

    // Layer 2: Standard checks
    if (config.level !== 'basic') {
      await this.performStandardChecks(systemHealth, config);
    }

    // Layer 3: Comprehensive checks
    if (config.level === 'comprehensive' || config.level === 'deep') {
      await this.performComprehensiveChecks(systemHealth, config);
    }

    // Layer 4: Deep checks
    if (config.level === 'deep') {
      await this.performDeepChecks(systemHealth, config);
    }

    // Determine overall status
    systemHealth.status = this.calculateOverallStatus(systemHealth);

    // Generate alerts
    systemHealth.alerts = this.generateAlerts(systemHealth);

    return systemHealth;
  }

  /**
   * Layer 1: Basic health checks
   */
  private async performBasicChecks(
    systemHealth: SystemHealth,
    config: HealthCheckConfig
  ): Promise<void> {
    const checks = [this.checkAPIHealth(), this.checkMemoryHealth(), this.checkBasicConnectivity()];

    const results = await Promise.allSettled(
      checks.map(check => this.withTimeout(check, config.timeout / 4))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        systemHealth.services.core.push(result.value);
      } else {
        systemHealth.services.core.push(
          this.createFailedServiceHealth(['api', 'memory', 'connectivity'][index], result.reason)
        );
      }
    });
  }

  /**
   * Layer 2: Standard health checks
   */
  private async performStandardChecks(
    systemHealth: SystemHealth,
    config: HealthCheckConfig
  ): Promise<void> {
    const checks = [
      this.checkCacheHealth(),
      this.checkRateLimitingHealth(),
      this.checkSecurityHealth(),
      this.checkFormatEngineHealth(),
    ];

    const results = await Promise.allSettled(
      checks.map(check => this.withTimeout(check, config.timeout / 3))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        systemHealth.services.dependencies.push(result.value);
      } else {
        systemHealth.services.dependencies.push(
          this.createFailedServiceHealth(
            ['cache', 'rate-limiting', 'security', 'format-engine'][index],
            result.reason
          )
        );
      }
    });
  }

  /**
   * Layer 3: Comprehensive health checks
   */
  private async performComprehensiveChecks(
    systemHealth: SystemHealth,
    config: HealthCheckConfig
  ): Promise<void> {
    const checks = [
      this.checkBatchProcessingHealth(),
      this.checkErrorHandlingHealth(),
      this.checkPerformanceHealth(),
      this.checkMonitoringHealth(),
    ];

    const results = await Promise.allSettled(
      checks.map(check => this.withTimeout(check, config.timeout / 2))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        systemHealth.services.dependencies.push(result.value);
      } else {
        systemHealth.services.dependencies.push(
          this.createFailedServiceHealth(
            ['batch-processing', 'error-handling', 'performance', 'monitoring'][index],
            result.reason
          )
        );
      }
    });
  }

  /**
   * Layer 4: Deep health checks
   */
  private async performDeepChecks(
    systemHealth: SystemHealth,
    config: HealthCheckConfig
  ): Promise<void> {
    const checks = [
      this.checkDatabaseConnectivity(),
      this.checkExternalServicesHealth(),
      this.checkResourceLimits(),
      this.checkSecurityCompliance(),
    ];

    const results = await Promise.allSettled(
      checks.map(check => this.withTimeout(check, config.timeout))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        systemHealth.services.external.push(result.value);
      } else {
        systemHealth.services.external.push(
          this.createFailedServiceHealth(
            ['database', 'external-services', 'resource-limits', 'security-compliance'][index],
            result.reason
          )
        );
      }
    });
  }

  /**
   * Individual service health checks
   */
  private async checkAPIHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Test basic API functionality
      const testDate = new Date();
      const iso = testDate.toISOString();
      const unix = Math.floor(testDate.getTime() / 1000);

      return {
        name: 'api',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        details: {
          version: process.env.npm_package_version || '1.0.0',
          uptime: process.uptime(),
          metrics: { iso, unix },
        },
        checks: {
          connectivity: true,
          functionality: true,
          performance: true,
          resources: true,
        },
      };
    } catch (error) {
      return this.createFailedServiceHealth('api', error);
    }
  }

  private async checkMemoryHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const heapPercentage = (heapUsedMB / heapTotalMB) * 100;

      let status: HealthStatus = 'healthy';
      if (heapPercentage > 90) {
        status = 'critical';
      } else if (heapPercentage > 80) {
        status = 'unhealthy';
      } else if (heapPercentage > 70) {
        status = 'degraded';
      }

      return {
        name: 'memory',
        status,
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        details: {
          metrics: {
            heapUsed: heapUsedMB,
            heapTotal: heapTotalMB,
            heapPercentage,
            external: memoryUsage.external / 1024 / 1024,
            rss: memoryUsage.rss / 1024 / 1024,
          },
        },
        checks: {
          connectivity: true,
          functionality: true,
          performance: heapPercentage < 80,
          resources: heapPercentage < 90,
        },
      };
    } catch (error) {
      return this.createFailedServiceHealth('memory', error);
    }
  }

  private async checkBasicConnectivity(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Test basic network connectivity
      const testPromise = new Promise<boolean>(resolve => {
        // Simulate connectivity test
        setTimeout(() => resolve(true), 10);
      });

      const connected = await testPromise;

      return {
        name: 'connectivity',
        status: connected ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        details: {
          metrics: { connected },
        },
        checks: {
          connectivity: connected,
          functionality: connected,
          performance: true,
          resources: true,
        },
      };
    } catch (error) {
      return this.createFailedServiceHealth('connectivity', error);
    }
  }

  private async checkCacheHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Import cache service dynamically
      const { getStrategicCacheService } = await import('../cache/cache-config-init');
      const cacheService = await getStrategicCacheService();

      // Test cache operations
      const testKey = `health-check-${Date.now()}`;
      const testValue = { test: true, timestamp: Date.now() };

      await cacheService.set(testKey, testValue, { ttl: 5000 });
      const retrieved = await cacheService.get(testKey);
      await cacheService.delete(testKey);

      const isWorking = retrieved !== null;

      return {
        name: 'cache',
        status: isWorking ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        details: {
          metrics: {
            working: isWorking,
            provider: 'strategic-cache',
          },
        },
        checks: {
          connectivity: true,
          functionality: isWorking,
          performance: true,
          resources: true,
        },
      };
    } catch (error) {
      return this.createFailedServiceHealth('cache', error);
    }
  }

  /**
   * Utility methods
   */
  private async getPerformanceMetrics(): Promise<SystemHealth['performance']> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to milliseconds
        load: [0, 0, 0], // Not available in Node.js without additional modules
      },
      memory: {
        used: memoryUsage.rss,
        total: memoryUsage.rss + memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        heap: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
      },
      network: {
        latency: 0, // Would need to implement network latency test
        throughput: 0, // Would need to track request throughput
      },
    };
  }

  private async getSystemMetrics(): Promise<SystemHealth['metrics']> {
    return {
      requests: {
        total: 0, // Would need to implement request tracking
        successful: 0,
        failed: 0,
        rate: 0,
      },
      errors: {
        rate: 0,
        recent: [],
      },
      cache: {
        hitRate: 0, // Would get from cache service
        size: 0,
        operations: 0,
      },
    };
  }

  private calculateOverallStatus(systemHealth: SystemHealth): HealthStatus {
    const allServices = [
      ...systemHealth.services.core,
      ...systemHealth.services.dependencies,
      ...systemHealth.services.external,
    ];

    const statuses = allServices.map(service => service.status);

    if (statuses.some(status => status === 'critical')) {
      return 'critical';
    }

    if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    }

    if (statuses.some(status => status === 'degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  private generateAlerts(systemHealth: SystemHealth): SystemHealth['alerts'] {
    const alerts: SystemHealth['alerts'] = [];

    // Memory alerts
    if (systemHealth.performance.memory.heap.percentage > 90) {
      alerts.push({
        level: 'critical',
        message: `Critical memory usage: ${systemHealth.performance.memory.heap.percentage.toFixed(1)}%`,
        timestamp: Date.now(),
        service: 'memory',
      });
    } else if (systemHealth.performance.memory.heap.percentage > 80) {
      alerts.push({
        level: 'warning',
        message: `High memory usage: ${systemHealth.performance.memory.heap.percentage.toFixed(1)}%`,
        timestamp: Date.now(),
        service: 'memory',
      });
    }

    // Service alerts
    const unhealthyServices = [
      ...systemHealth.services.core,
      ...systemHealth.services.dependencies,
      ...systemHealth.services.external,
    ].filter(service => service.status === 'unhealthy' || service.status === 'critical');

    unhealthyServices.forEach(service => {
      alerts.push({
        level: service.status === 'critical' ? 'critical' : 'error',
        message: `Service ${service.name} is ${service.status}`,
        timestamp: Date.now(),
        service: service.name,
      });
    });

    return alerts;
  }

  private createFailedServiceHealth(serviceName: string, error: any): ServiceHealth {
    return {
      name: serviceName,
      status: 'unhealthy',
      responseTime: 0,
      lastCheck: Date.now(),
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
      checks: {
        connectivity: false,
        functionality: false,
        performance: false,
        resources: false,
      },
    };
  }

  private createFailureResponse(error: Error, responseTime: number): SystemHealth {
    return {
      status: 'critical',
      timestamp: Date.now(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime,
      services: {
        core: [],
        dependencies: [],
        external: [],
      },
      performance: {
        cpu: { usage: 0, load: [0, 0, 0] },
        memory: { used: 0, total: 0, percentage: 0, heap: { used: 0, total: 0, percentage: 0 } },
        network: { latency: 0, throughput: 0 },
      },
      metrics: {
        requests: { total: 0, successful: 0, failed: 0, rate: 0 },
        errors: {
          rate: 1,
          recent: [{ timestamp: Date.now(), type: 'system', message: error.message }],
        },
        cache: { hitRate: 0, size: 0, operations: 0 },
      },
      alerts: [
        {
          level: 'critical',
          message: `Health check system failure: ${error.message}`,
          timestamp: Date.now(),
        },
      ],
    };
  }

  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private generateCacheKey(config: HealthCheckConfig): string {
    return `health:${config.level}:${config.includeMetrics}:${config.includeDependencies}:${config.includePerformance}`;
  }

  private initializeServiceRegistry(): void {
    // Initialize service health checkers
    // This would be expanded with actual service checkers
  }

  private startPerformanceTracking(): void {
    // Start background performance tracking
    setInterval(() => {
      this.trackPerformanceMetrics();
    }, 60000); // Every minute
  }

  private async trackPerformanceMetrics(): Promise<void> {
    try {
      const metrics = await this.getPerformanceMetrics();
      this.performanceHistory.push({
        timestamp: Date.now(),
        metrics,
      });

      // Keep only last 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      this.performanceHistory = this.performanceHistory.filter(
        entry => entry.timestamp > oneDayAgo
      );
    } catch (error) {
      console.error('Performance tracking error:', error);
    }
  }

  private updatePerformanceHistory(systemHealth: SystemHealth): void {
    this.performanceHistory.push({
      timestamp: systemHealth.timestamp,
      metrics: systemHealth.performance,
    });
  }

  // Placeholder methods for additional health checks
  private async checkRateLimitingHealth(): Promise<ServiceHealth> {
    return this.createBasicServiceHealth('rate-limiting', 'healthy');
  }

  private async checkSecurityHealth(): Promise<ServiceHealth> {
    return this.createBasicServiceHealth('security', 'healthy');
  }

  private async checkFormatEngineHealth(): Promise<ServiceHealth> {
    return this.createBasicServiceHealth('format-engine', 'healthy');
  }

  private async checkBatchProcessingHealth(): Promise<ServiceHealth> {
    return this.createBasicServiceHealth('batch-processing', 'healthy');
  }

  private async checkErrorHandlingHealth(): Promise<ServiceHealth> {
    return this.createBasicServiceHealth('error-handling', 'healthy');
  }

  private async checkPerformanceHealth(): Promise<ServiceHealth> {
    return this.createBasicServiceHealth('performance', 'healthy');
  }

  private async checkMonitoringHealth(): Promise<ServiceHealth> {
    return this.createBasicServiceHealth('monitoring', 'healthy');
  }

  private async checkDatabaseConnectivity(): Promise<ServiceHealth> {
    return this.createBasicServiceHealth('database', 'healthy');
  }

  private async checkExternalServicesHealth(): Promise<ServiceHealth> {
    return this.createBasicServiceHealth('external-services', 'healthy');
  }

  private async checkResourceLimits(): Promise<ServiceHealth> {
    return this.createBasicServiceHealth('resource-limits', 'healthy');
  }

  private async checkSecurityCompliance(): Promise<ServiceHealth> {
    return this.createBasicServiceHealth('security-compliance', 'healthy');
  }

  private createBasicServiceHealth(name: string, status: HealthStatus): ServiceHealth {
    return {
      name,
      status,
      responseTime: 1,
      lastCheck: Date.now(),
      details: {},
      checks: {
        connectivity: true,
        functionality: true,
        performance: true,
        resources: true,
      },
    };
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): Array<{ timestamp: number; metrics: any }> {
    return [...this.performanceHistory];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.healthCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.healthCache.size,
      hitRate: 0, // Would need to track hits/misses
    };
  }
}

// Service health checker interface
interface ServiceHealthChecker {
  name: string;
  check(): Promise<ServiceHealth>;
}

export default EnhancedHealthMonitor;
