/**
 * Enhanced Health Check API
 * Comprehensive health monitoring with layered checks, dependency tracking, and performance optimization
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { DependencyMonitor } from './services/health/dependency-monitor';
import {
  CheckLevel,
  EnhancedHealthMonitor,
  HealthCheckConfig,
} from './services/health/enhanced-health-monitor';
import { createSecurityMiddleware } from './services/security/unified-security-middleware';
import { createError, ErrorType, handleError } from './services/unified-error-handler';
import { withCors } from './utils/response';

interface HealthCheckRequest {
  level?: CheckLevel;
  timeout?: number;
  includeMetrics?: boolean;
  includeDependencies?: boolean;
  includePerformance?: boolean;
  includeHistory?: boolean;
  enableCaching?: boolean;
  services?: string[];
}

interface HealthCheckResponse {
  success: boolean;
  data: {
    system: any; // SystemHealth from EnhancedHealthMonitor
    dependencies?: any; // DependencyReport from DependencyMonitor
    recommendations?: string[];
    trends?: {
      performance: Array<{ timestamp: number; metrics: any }>;
      availability: number;
      responseTime: {
        current: number;
        average: number;
        trend: 'improving' | 'stable' | 'degrading';
      };
    };
  };
  metadata: {
    checkLevel: CheckLevel;
    processingTime: number;
    cacheHit: boolean;
    timestamp: number;
    version: string;
    requestId: string;
  };
}

// Initialize health monitoring components
const healthMonitor = EnhancedHealthMonitor.getInstance();
const dependencyMonitor = DependencyMonitor.getInstance();

// Start dependency monitoring
dependencyMonitor.startAllMonitoring();

// Set up dependency alerts
dependencyMonitor.onAlert(alert => {
  console.warn(`🚨 Dependency Alert [${alert.level}]: ${alert.dependency} - ${alert.message}`);
});

/**
 * Main enhanced health check handler
 */
async function enhancedHealthHandler(req: VercelRequest, res: VercelResponse) {
  withCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return handleError(createError({ type: ErrorType.BAD_REQUEST_ERROR, message: 'Only GET method is allowed', statusCode: 405 }), req, res);
  }

  const startTime = Date.now();
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Parse query parameters
    const healthRequest: HealthCheckRequest = {
      level: (req.query.level as CheckLevel) || 'standard',
      timeout: parseInt(req.query.timeout as string) || 10000,
      includeMetrics: req.query.metrics !== 'false',
      includeDependencies: req.query.dependencies !== 'false',
      includePerformance: req.query.performance !== 'false',
      includeHistory: req.query.history === 'true',
      enableCaching: req.query.cache !== 'false',
      services: req.query.services ? (req.query.services as string).split(',') : undefined,
    };

    // Validate parameters
    if (!['basic', 'standard', 'comprehensive', 'deep'].includes(healthRequest.level!)) {
      return handleError(createError({ type: ErrorType.VALIDATION_ERROR, message: 'Invalid health check level' }), req, res);
    }

    if (healthRequest.timeout! < 1000 || healthRequest.timeout! > 60000) {
      return handleError(createError({ type: ErrorType.VALIDATION_ERROR, message: 'Invalid timeout value' }), req, res);
    }

    // Configure health check
    const healthConfig: Partial<HealthCheckConfig> = {
      level: healthRequest.level,
      timeout: healthRequest.timeout,
      includeMetrics: healthRequest.includeMetrics,
      includeDependencies: healthRequest.includeDependencies,
      includePerformance: healthRequest.includePerformance,
      enableCaching: healthRequest.enableCaching,
      cacheTimeout: 30000, // 30 seconds cache
    };

    // Perform optimized system health check
    const systemHealth = await healthMonitor.performOptimizedHealthCheck(healthConfig);

    // Get dependency report if requested
    let dependencyReport;
    if (healthRequest.includeDependencies) {
      dependencyReport = dependencyMonitor.getDependencyReport();
    }

    // Generate recommendations
    const recommendations = generateHealthRecommendations(systemHealth, dependencyReport);

    // Get trends if requested
    let trends;
    if (healthRequest.includeHistory) {
      trends = generateHealthTrends(systemHealth, healthMonitor);
    }

    // Build response
    const response: HealthCheckResponse = {
      success: true,
      data: {
        system: systemHealth,
        dependencies: dependencyReport,
        recommendations,
        trends,
      },
      metadata: {
        checkLevel: healthRequest.level!,
        processingTime: Date.now() - startTime,
        cacheHit: false, // Would need to track cache hits
        timestamp: Date.now(),
        version: '2.0.0',
        requestId,
      },
    };

    // Set response headers based on health status
    const statusCode = getHttpStatusCode(systemHealth.status, dependencyReport?.overallStatus);

    res.setHeader('X-Health-Status', systemHealth.status);
    res.setHeader('X-Health-Level', healthRequest.level!);
    res.setHeader('X-Processing-Time', (Date.now() - startTime).toString());
    res.setHeader('X-Dependencies-Status', dependencyReport?.overallStatus || 'unknown');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(statusCode).json(response);
  } catch (error) {
    console.error('Enhanced health check error:', error);

    return handleError(error as Error, req, res);
  }
}

/**
 * Generate health recommendations
 */
function generateHealthRecommendations(systemHealth: any, dependencyReport?: any): string[] {
  const recommendations: string[] = [];

  // System health recommendations
  if (systemHealth.status === 'unhealthy' || systemHealth.status === 'critical') {
    recommendations.push('System is in critical state - immediate attention required');
  } else if (systemHealth.status === 'degraded') {
    recommendations.push('System performance is degraded - investigate and optimize');
  }

  // Memory recommendations
  if (systemHealth.performance?.memory?.heap?.percentage > 90) {
    recommendations.push('Critical memory usage detected - consider scaling or optimization');
  } else if (systemHealth.performance?.memory?.heap?.percentage > 80) {
    recommendations.push('High memory usage - monitor and consider optimization');
  }

  // Service recommendations
  const unhealthyServices = [
    ...systemHealth.services.core,
    ...systemHealth.services.dependencies,
    ...systemHealth.services.external,
  ].filter((service: any) => service.status === 'unhealthy' || service.status === 'critical');

  if (unhealthyServices.length > 0) {
    recommendations.push(
      `${unhealthyServices.length} services need attention: ${unhealthyServices.map((s: any) => s.name).join(', ')}`
    );
  }

  // Dependency recommendations
  if (dependencyReport) {
    if (dependencyReport.summary.unhealthy > 0) {
      recommendations.push(`${dependencyReport.summary.unhealthy} dependencies are unhealthy`);
    }

    if (dependencyReport.summary.critical > 0) {
      recommendations.push(
        `${dependencyReport.summary.critical} critical dependencies need immediate attention`
      );
    }

    // Add dependency-specific recommendations
    recommendations.push(...dependencyReport.recommendations);
  }

  // Performance recommendations
  if (systemHealth.responseTime > 5000) {
    recommendations.push('Health check response time is slow - investigate system performance');
  }

  // Alert recommendations
  const criticalAlerts =
    systemHealth.alerts?.filter((alert: any) => alert.level === 'critical') || [];
  if (criticalAlerts.length > 0) {
    recommendations.push(`${criticalAlerts.length} critical alerts require immediate action`);
  }

  return recommendations;
}

/**
 * Generate health trends
 */
function generateHealthTrends(systemHealth: any, healthMonitor: EnhancedHealthMonitor): any {
  const performanceHistory = healthMonitor.getPerformanceHistory();

  if (performanceHistory.length < 2) {
    return {
      performance: performanceHistory,
      availability: 100,
      responseTime: {
        current: systemHealth.responseTime,
        average: systemHealth.responseTime,
        trend: 'stable' as const,
      },
    };
  }

  // Calculate availability (simplified)
  const availability = 95; // Would calculate based on historical data

  // Calculate response time trend
  const recentTimes = performanceHistory.slice(-10).map(h => h.metrics?.responseTime || 0);
  const averageResponseTime = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;

  let trend: 'improving' | 'stable' | 'degrading' = 'stable';
  if (recentTimes.length >= 3) {
    const firstHalf = recentTimes.slice(0, Math.floor(recentTimes.length / 2));
    const secondHalf = recentTimes.slice(Math.floor(recentTimes.length / 2));

    const firstAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;

    if (secondAvg < firstAvg * 0.9) {
      trend = 'improving';
    } else if (secondAvg > firstAvg * 1.1) {
      trend = 'degrading';
    }
  }

  return {
    performance: performanceHistory.slice(-20), // Last 20 entries
    availability,
    responseTime: {
      current: systemHealth.responseTime,
      average: averageResponseTime,
      trend,
    },
  };
}

/**
 * Get HTTP status code based on health status
 */
function getHttpStatusCode(systemStatus: string, dependencyStatus?: string): number {
  // Critical or unhealthy system = 503 Service Unavailable
  if (systemStatus === 'critical' || systemStatus === 'unhealthy') {
    return 503;
  }

  // Critical dependencies = 503
  if (dependencyStatus === 'unhealthy') {
    return 503;
  }

  // Degraded system or dependencies = 200 (but with warning indicators)
  if (systemStatus === 'degraded' || dependencyStatus === 'degraded') {
    return 200;
  }

  // Healthy = 200
  return 200;
}

// Enhanced health check API with comprehensive middleware stack
const securityMiddleware = createSecurityMiddleware({
  policyLevel: 'standard', // Health checks should be accessible
  enableThreatDetection: false,
  enableRealTimeBlocking: false,
  loggerConfig: {
    logLevel: 'warn',
  },
});


const enhancedHealthEndpoint = async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Apply minimal security middleware
    await new Promise<void>((resolve, reject) => {
      securityMiddleware(req, res, () => {
        // No rate limiting for health checks
        // No caching for health checks (always fresh data)
        enhancedHealthHandler(req, res)
          .then(() => resolve())
          .catch(reject);
      });
    });
  } catch (error) {
    // Handle errors with unified error middleware
    return handleError(error as Error, req, res);
  }
};

export default enhancedHealthEndpoint;
