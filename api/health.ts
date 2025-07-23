import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, ResponseBuilder, withCors } from './utils/response';
import { createCacheMiddleware } from './middleware/cache';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { createPerformanceMonitoringMiddleware } from './middleware/performance-monitoring';
import { getHealthService } from './services/health-service';
import { getCacheService } from './services/cache-factory';
import { getRateLimiter } from './services/rate-limiter-factory';

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    cache: ServiceStatus;
    rateLimit: ServiceStatus;
    timezone: ServiceStatus;
    format: ServiceStatus;
  };
  metrics: SystemMetrics;
  errors: ErrorSummary;
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  details?: any;
}

interface SystemMetrics {
  totalRequests: number;
  errors: number;
  cacheHitRate: number;
  rateLimitUsage: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface ErrorSummary {
  lastHour: number;
  lastDay: number;
  topErrorCodes: Array<{ code: string; count: number }>;
  recoverySuggestions: Record<string, string>;
}

class MonitoringService {
  private static instance: MonitoringService;
  private startTime: number;
  private requestCount: number = 0;
  private errorCount: number = 0;

  private constructor() {
    this.startTime = Date.now();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  incrementRequests() {
    this.requestCount++;
  }

  incrementErrors() {
    this.errorCount++;
  }

  async getSystemStatus(): Promise<SystemStatus> {
    const services = await this.checkServices();
    const metrics = await this.getMetrics();
    const errors = await this.getErrorSummary();

    const overallStatus = this.calculateOverallStatus(services);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      services,
      metrics,
      errors
    };
  }

  private async checkServices(): Promise<SystemStatus['services']> {
    const checks = await Promise.allSettled([
      this.checkCacheService(),
      this.checkRateLimitService(),
      this.checkTimezoneService(),
      this.checkFormatService()
    ]);

    return {
      cache: checks[0].status === 'fulfilled' ? checks[0].value : 
        { status: 'unhealthy', responseTime: 0, lastCheck: new Date().toISOString() },
      rateLimit: checks[1].status === 'fulfilled' ? checks[1].value : 
        { status: 'unhealthy', responseTime: 0, lastCheck: new Date().toISOString() },
      timezone: checks[2].status === 'fulfilled' ? checks[2].value : 
        { status: 'unhealthy', responseTime: 0, lastCheck: new Date().toISOString() },
      format: checks[3].status === 'fulfilled' ? checks[3].value : 
        { status: 'unhealthy', responseTime: 0, lastCheck: new Date().toISOString() }
    };
  }

  private async checkCacheService(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      const stats = await cacheService.stats();
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { stats }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkRateLimitService(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      const testRule = { identifier: 'health-check', limit: 100, window: 60000, type: 'ip' as const };
      await rateLimiter.checkLimit('health-check', testRule);
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { type: 'rate-limiter' }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkTimezoneService(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      const timezone = require('./services/timezone-service').default;
      const info = timezone.getTimezoneInfo('UTC');
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { timezone: info.identifier }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkFormatService(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      const format = require('./services/format-service').default;
      const formats = format.listFormats();
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { formatCount: formats.length }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async getMetrics(): Promise<SystemMetrics> {
    const errorHandler = ErrorHandler.getInstance();
    const errorSummary = errorHandler.getErrorSummary();

    // Calculate cache hit rate (simplified)
    const cacheHitRate = 0.85; // Placeholder - would use actual cache stats
    const rateLimitUsage = 0.45; // Placeholder - would use actual rate limit stats

    // Memory usage (Node.js specific)
    const memUsage = process.memoryUsage();
    const totalMemory = 1024 * 1024 * 1024; // 1GB assumption
    const memoryPercentage = (memUsage.heapUsed / totalMemory) * 100;

    return {
      totalRequests: this.requestCount,
      errors: this.errorCount,
      cacheHitRate,
      rateLimitUsage,
      memoryUsage: {
        used: memUsage.heapUsed,
        total: totalMemory,
        percentage: Math.round(memoryPercentage * 100) / 100
      }
    };
  }

  private async getErrorSummary(): Promise<ErrorSummary> {
    const errorHandler = ErrorHandler.getInstance();
    const summary = errorHandler.getErrorSummary();

    const topErrorCodes = Object.entries(summary.byCode)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    return {
      lastHour: summary.total,
      lastDay: summary.total * 24, // Extrapolated
      topErrorCodes,
      recoverySuggestions: this.getRecoverySuggestions()
    };
  }

  private getRecoverySuggestions(): Record<string, string> {
    const errorHandler = ErrorHandler.getInstance();
    const suggestions: Record<string, string> = {};
    
    const commonErrors = ['BAD_REQUEST', 'VALIDATION_ERROR', 'NOT_FOUND', 'RATE_LIMITED'];
    commonErrors.forEach(code => {
      suggestions[code] = errorHandler.getRecoverySuggestion(code);
    });

    return suggestions;
  }

  private calculateOverallStatus(services: SystemStatus['services']): SystemStatus['status'] {
    const serviceStatuses = Object.values(services).map(s => s.status);
    
    if (serviceStatuses.some(s => s === 'unhealthy')) {
      return 'unhealthy';
    }
    
    if (serviceStatuses.some(s => s === 'degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}

const monitoringService = MonitoringService.getInstance();

async function healthHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return APIErrorHandler.handleBadRequest(res, 'Only GET method is allowed');
  }

  try {
    const healthService = getHealthService();
    
    // Check if detailed health check is requested
    const detailed = req.query.detailed === 'true';
    
    if (detailed) {
      // Perform comprehensive health check
      const healthResult = await healthService.performHealthCheck();
      
      // Add additional information
      const enhancedResult = {
        ...healthResult,
        uptime: healthService.getUptimeString(),
        memoryAlerts: healthService.getMemoryAlerts(),
        connectivity: await healthService.testConnectivity()
      };
      
      const builder = new ResponseBuilder().setData(enhancedResult);
      
      // Set appropriate status code based on system health
      let statusCode = 200;
      if (healthResult.status === 'unhealthy') {
        statusCode = 503;
      } else if (healthResult.status === 'degraded') {
        statusCode = 200; // Still functional
      }

      res.status(statusCode);
      builder.send(res);
    } else {
      // Quick health check
      const quickStatus = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: healthService.getUptimeString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
      
      const builder = new ResponseBuilder().setData(quickStatus);
      builder.send(res);
    }

  } catch (error) {
    console.error('Health check error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

// Enhanced health API with caching, rate limiting, and performance monitoring
const enhancedHealthHandler = withCors(
  createPerformanceMonitoringMiddleware({
    enableMetricsCollection: true,
    enableCacheHitTracking: true,
    enableRateLimitTracking: true
  })(
    createRateLimitMiddleware({
      max: 60, // 60 requests per minute for health checks
      windowMs: 60 * 1000
    })(
      createCacheMiddleware({
        ttl: 30 * 1000, // 30 seconds for health checks
        cacheControlHeader: 'public, max-age=30, stale-while-revalidate=60',
        skipCache: (req) => req.query.detailed === 'true' // Don't cache detailed health checks
      })(healthHandler)
    )
  )
);

export default enhancedHealthHandler;
export { monitoringService };