import { getCacheService, getCacheServiceHealth } from './cache-factory';
import { getRateLimiter, getRateLimiterHealth } from './rate-limiter-factory';
import { getPerformanceMetrics } from '../middleware/performance-monitoring';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  environment: string;
  services: {
    cache: {
      status: string;
      type: string;
      details: any;
    };
    rateLimiter: {
      status: string;
      type: string;
      details: any;
    };
    database?: {
      status: string;
      details: any;
    };
  };
  performance: {
    responseTime: number;
    errorRate: number;
    cacheHitRate: number;
    rateLimitRate: number;
    recentMetrics: any[];
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    nodeVersion: string;
    platform: string;
  };
}

class HealthService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = Date.now();
    const uptime = timestamp - this.startTime;

    try {
      // Check all services in parallel
      const [cacheHealth, rateLimiterHealth, performanceMetrics, systemInfo] = await Promise.all([
        this.checkCacheHealth(),
        this.checkRateLimiterHealth(),
        this.getPerformanceHealth(),
        this.getSystemInfo()
      ]);

      // Determine overall status
      const serviceStatuses = [cacheHealth.status, rateLimiterHealth.status];
      const overallStatus = this.determineOverallStatus(serviceStatuses, performanceMetrics);

      return {
        status: overallStatus,
        timestamp,
        uptime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          cache: cacheHealth,
          rateLimiter: rateLimiterHealth
        },
        performance: performanceMetrics,
        system: systemInfo
      };

    } catch (error) {
      console.error('Health check failed:', error);
      
      return {
        status: 'unhealthy',
        timestamp,
        uptime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          cache: { status: 'unknown', type: 'unknown', details: {} },
          rateLimiter: { status: 'unknown', type: 'unknown', details: {} }
        },
        performance: {
          responseTime: 0,
          errorRate: 1,
          cacheHitRate: 0,
          rateLimitRate: 0,
          recentMetrics: []
        },
        system: await this.getSystemInfo()
      };
    }
  }

  /**
   * Check cache service health
   */
  private async checkCacheHealth(): Promise<{
    status: string;
    type: string;
    details: any;
  }> {
    try {
      const cacheHealth = await getCacheServiceHealth();
      return {
        status: cacheHealth.status,
        type: 'cache',
        details: {
          provider: cacheHealth.provider,
          latency: cacheHealth.latency,
          error: cacheHealth.error,
          stats: cacheHealth.stats
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        type: 'unknown',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Check rate limiter health
   */
  private async checkRateLimiterHealth(): Promise<{
    status: string;
    type: string;
    details: any;
  }> {
    try {
      const rateLimiterHealth = await getRateLimiterHealth();
      return {
        status: rateLimiterHealth.status,
        type: 'rate-limiter',
        details: {
          provider: rateLimiterHealth.provider,
          responseTime: rateLimiterHealth.responseTime,
          error: rateLimiterHealth.error,
          details: rateLimiterHealth.details
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        type: 'unknown',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get performance health metrics
   */
  private async getPerformanceHealth(): Promise<{
    responseTime: number;
    errorRate: number;
    cacheHitRate: number;
    rateLimitRate: number;
    recentMetrics: any[];
  }> {
    try {
      const metrics = await getPerformanceMetrics({ timeRange: 'hour' });
      
      return {
        responseTime: metrics.averageResponseTime || 0,
        errorRate: metrics.errorRate || 0,
        cacheHitRate: 0, // Not available in current metrics
        rateLimitRate: 0, // Not available in current metrics
        recentMetrics: [] // Not available in current metrics
      };
    } catch (error) {
      console.warn('Failed to get performance metrics for health check:', error);
      return {
        responseTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        rateLimitRate: 0,
        recentMetrics: []
      };
    }
  }

  /**
   * Get system information
   */
  private async getSystemInfo(): Promise<{
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    nodeVersion: string;
    platform: string;
  }> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    
    return {
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100
      },
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  /**
   * Determine overall system status based on service statuses and performance
   */
  private determineOverallStatus(
    serviceStatuses: string[], 
    performance: any
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Check for unhealthy services
    if (serviceStatuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    // Check for degraded services
    if (serviceStatuses.includes('degraded')) {
      return 'degraded';
    }

    // Check performance thresholds
    if (performance.errorRate > 0.1) { // More than 10% error rate
      return 'degraded';
    }

    if (performance.responseTime > 5000) { // More than 5 seconds average response time
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get detailed service status
   */
  async getServiceStatus(serviceName: 'cache' | 'rateLimiter'): Promise<any> {
    switch (serviceName) {
      case 'cache':
        return this.checkCacheHealth();
      case 'rateLimiter':
        return this.checkRateLimiterHealth();
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }

  /**
   * Test connectivity to external services
   */
  async testConnectivity(): Promise<{
    upstashRedis: boolean;
    externalAPIs: boolean;
  }> {
    const results = {
      upstashRedis: false,
      externalAPIs: true // Assume true since we don't have external APIs yet
    };

    try {
      // Test Upstash Redis connectivity
      const cacheService = getCacheService();
      const testKey = `health_check_${Date.now()}`;
      const testValue = { test: true, timestamp: Date.now() };
      
      await cacheService.set(testKey, testValue, 5000); // 5 second TTL
      const retrieved = await cacheService.get(testKey);
      
      results.upstashRedis = retrieved !== null;
      
      // Clean up test key
      await cacheService.del(testKey);
      
    } catch (error) {
      console.warn('Upstash Redis connectivity test failed:', error);
      results.upstashRedis = false;
    }

    return results;
  }

  /**
   * Get uptime in human readable format
   */
  getUptimeString(): string {
    const uptime = Date.now() - this.startTime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get memory usage alerts
   */
  getMemoryAlerts(): Array<{
    level: 'warning' | 'critical';
    message: string;
  }> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const usagePercentage = (heapUsedMB / heapTotalMB) * 100;

    const alerts = [];

    if (usagePercentage > 90) {
      alerts.push({
        level: 'critical' as const,
        message: `Memory usage is critically high: ${usagePercentage.toFixed(1)}%`
      });
    } else if (usagePercentage > 75) {
      alerts.push({
        level: 'warning' as const,
        message: `Memory usage is high: ${usagePercentage.toFixed(1)}%`
      });
    }

    return alerts;
  }
}

// Singleton instance
let healthServiceInstance: HealthService | null = null;

export function getHealthService(): HealthService {
  if (!healthServiceInstance) {
    healthServiceInstance = new HealthService();
  }
  return healthServiceInstance;
}

export default getHealthService();