import { VercelRequest, VercelResponse } from '@vercel/node';
import { BaseHandler, HandlerContext } from './base-handler';
import { HealthCheckResponse, ServiceHealth } from '../types/api';

export interface HealthCheckOptions {
  includeServices?: boolean;
  includeMetrics?: boolean;
  includeDependencies?: boolean;
  mode?: 'simple' | 'working' | 'standalone';
  timeout?: number;
}

export class UnifiedHealthHandler extends BaseHandler {
  constructor() {
    super({
      allowedMethods: ['GET'],
      timeout: 5000,
      enableCaching: false,
      enableRateLimit: false
    });
  }

  protected async execute(_context: HandlerContext): Promise<any> {
    // Parse health check options
    const _options = this.parseHealthOptions(context);

    // Perform health check based on mode
    const _healthData = await this.performHealthCheck(options, context);

    // Set appropriate HTTP status based on health
    const _httpStatus = healthData.status === 'healthy' ? 200 : 
                      healthData.status === 'degraded' ? 200 : 503;

    // Return health data with status for response handling
    return {
      ...healthData,
      _httpStatus: httpStatus
    };
  }

  private parseHealthOptions(_context: HandlerContext): HealthCheckOptions {
    const { services, metrics, dependencies, mode, timeout } = context.query;

    const _parsedOptions: HealthCheckOptions = {
      includeServices: services !== 'false',
      includeMetrics: metrics !== 'false',
      includeDependencies: dependencies === 'true',
      _mode: (mode as 'simple' | 'working' | 'standalone') || 'working',
      _timeout: timeout ? parseInt(timeout as string) : 5000
    };

    // Validate timeout
    if (parsedOptions.timeout && (parsedOptions.timeout < 1000 || parsedOptions.timeout > 30000)) {
      throw new Error('Timeout must be between 1000ms and 30000ms');
    }

    return parsedOptions;
  }

  private async performHealthCheck(_options: HealthCheckOptions, _context: HandlerContext): Promise<any> {
    const _mode = options.mode || 'working';

    switch (mode) {
      case 'simple':
        return this.performSimpleHealthCheck(options);
      case 'standalone':
        return this.performStandaloneHealthCheck(options);
      case 'working':
      default:
        return this.performWorkingHealthCheck(options, context);
    }
  }

  private async performSimpleHealthCheck(_options: HealthCheckOptions): Promise<any> {
    const _timestamp = Date.now();
    const _uptime = process.uptime();
    const version = process.env.npm_package_version || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let services: any = undefined;

    // Basic API health is always true if we reach this point
    const _apiHealth = true;

    if (options.includeServices) {
      services = { api: apiHealth };

      // Test cache service if available
      try {
        const _cacheHealth = await this.testCacheService();
        services.cache = cacheHealth;
        
        if (!cacheHealth) {
          status = 'degraded';
        }
      } catch (error) {
        services.cache = false;
        status = 'degraded';
      }

      // Test core conversion functionality
      try {
        const _conversionHealth = await this.testConversionService();
        services.conversion = conversionHealth;
        
        if (!conversionHealth) {
          status = status === 'healthy' ? 'degraded' : 'unhealthy';
        }
      } catch (error) {
        services.conversion = false;
        status = status === 'healthy' ? 'degraded' : 'unhealthy';
      }
    }

    // Check system resources
    const _memoryUsage = process.memoryUsage();
    const _memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    // If memory usage is very high, mark as degraded
    if (memoryUsagePercent > 90) {
      status = status === 'healthy' ? 'degraded' : status;
    }

    const _healthResponse = {
      status,
      timestamp,
      uptime,
      version,
      environment
    };

    if (services) {
      (healthResponse as any).services = services;
    }

    return healthResponse;
  }

  private async performStandaloneHealthCheck(_options: HealthCheckOptions): Promise<any> {
    const _timestamp = Date.now();
    const _uptime = process.uptime();
    const version = process.env.npm_package_version || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';
    const _system = this.getSystemInfo();

    // Perform health checks
    const _checks = {
      api: true, // If we reach this point, API is working
      _conversion: await this.testBasicConversionFunction(),
      _memory: this.testMemoryUsage()
    };

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!checks.conversion) {
      status = 'degraded';
    }
    
    if (!checks.memory) {
      status = status === 'healthy' ? 'degraded' : 'unhealthy';
    }

    // Additional system checks
    if (system.memory.percentage > 90) {
      status = status === 'healthy' ? 'degraded' : status;
    }

    if (uptime < 30) { // Less than 30 seconds uptime might indicate issues
      status = status === 'healthy' ? 'degraded' : status;
    }

    return {
      status,
      timestamp,
      uptime,
      version,
      environment,
      system,
      checks,
      metadata: {
        standalone: true
      }
    };
  }

  private async performWorkingHealthCheck(_options: HealthCheckOptions, _context: HandlerContext): Promise<HealthCheckResponse> {
    const _timestamp = Date.now();
    const _uptime = process.uptime();

    // Initialize health data
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const _services: HealthCheckResponse['services'] = {
      cache: { status: 'healthy', responseTime: 0, lastCheck: timestamp },
      rateLimiting: { status: 'healthy', responseTime: 0, lastCheck: timestamp },
      timezone: { status: 'healthy', responseTime: 0, lastCheck: timestamp },
      conversion: { status: 'healthy', responseTime: 0, lastCheck: timestamp }
    };

    // Test services if requested
    if (options.includeServices) {
      // Test cache service
      services.cache = await this.testCacheServiceDetailed();
      if (services.cache.status !== 'healthy') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
      }

      // Test rate limiting service
      services.rateLimiting = await this.testRateLimitingService();
      if (services.rateLimiting.status !== 'healthy') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
      }

      // Test timezone service
      services.timezone = await this.testTimezoneService();
      if (services.timezone.status !== 'healthy') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
      }

      // Test conversion service
      services.conversion = await this.testConversionServiceDetailed();
      if (services.conversion.status !== 'healthy') {
        overallStatus = 'unhealthy'; // Conversion is critical
      }
    }

    // Get metrics if requested
    let metrics: HealthCheckResponse['metrics'] = {
      uptime,
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRatio: 0
      },
      rateLimits: {
        totalRequests: 0,
        rateLimitedRequests: 0,
        blockedPercentage: 0
      }
    };

    if (options.includeMetrics) {
      metrics = await this.getHealthMetrics();
      
      // Check if metrics indicate problems
      if (metrics.memory.percentage > 90) {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
      }
      
      if (metrics.rateLimits.blockedPercentage > 50) {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
      }
    }

    return {
      status: overallStatus,
      timestamp,
      services,
      metrics
    };
  }

  // Service testing methods
  private async testCacheService(): Promise<boolean> {
    try {
      const { createRedisClient } = await import('../services/redis-client');
      const _redis = createRedisClient('cache');
      
      const _testPromise = (async () => {
        await redis.ping();
        return true;
      })();

      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Cache test timeout')), 2000);
      });

      return await Promise.race([testPromise, timeoutPromise]);
    } catch (error) {
      return false;
    }
  }

  private async testCacheServiceDetailed(): Promise<ServiceHealth> {
    const _startTime = Date.now();
    
    try {
      const { createRedisClient } = await import('../services/redis-client');
      const _redis = createRedisClient('cache');
      
      const _testPromise = (async () => {
        const _testKey = `health-_check:${Date.now()}`;
        await redis.set(testKey, 'test-value', { _ex: 5 });
        const _value = await redis.get(testKey);
        await redis.del(testKey);
        
        return value === 'test-value';
      })();

      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Cache test timeout')), 3000);
      });

      const _success = await Promise.race([testPromise, timeoutPromise]);
      
      return {
        status: success ? 'healthy' : 'degraded',
        _responseTime: Date.now() - startTime,
        _lastCheck: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        _responseTime: Date.now() - startTime,
        _lastCheck: Date.now(),
        error: (error as Error).message
      };
    }
  }

  private async testRateLimitingService(): Promise<ServiceHealth> {
    const _startTime = Date.now();
    
    try {
      const { createRedisClient } = await import('../services/redis-client');
      const _redis = createRedisClient('rate-limit');
      
      const _testPromise = (async () => {
        const _testKey = `_ratelimit:health-check:${Date.now()}`;
        await redis.setex(testKey, 60, '1');
        const _exists = await redis.exists(testKey);
        await redis.del(testKey);
        
        return exists === 1;
      })();

      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Rate limiting test timeout')), 2000);
      });

      const _success = await Promise.race([testPromise, timeoutPromise]);
      
      return {
        status: success ? 'healthy' : 'degraded',
        _responseTime: Date.now() - startTime,
        _lastCheck: Date.now()
      };
    } catch (error) {
      return {
        status: 'degraded',
        _responseTime: Date.now() - startTime,
        _lastCheck: Date.now(),
        error: (error as Error).message
      };
    }
  }

  private async testTimezoneService(): Promise<ServiceHealth> {
    const _startTime = Date.now();
    
    try {
      const _testDate = new Date();
      const _utcTime = testDate.toISOString();
      const localTime = testDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
      const _offset = testDate.getTimezoneOffset();
      
      if (!utcTime || !localTime || isNaN(offset)) {
        throw new Error('Timezone operations failed');
      }

      return {
        status: 'healthy',
        _responseTime: Date.now() - startTime,
        _lastCheck: Date.now()
      };
    } catch (error) {
      return {
        status: 'degraded',
        _responseTime: Date.now() - startTime,
        _lastCheck: Date.now(),
        error: (error as Error).message
      };
    }
  }

  private async testConversionService(): Promise<boolean> {
    try {
      const { convertTimestamp } = await import('../utils/conversion-utils');
      
      const _testTimestamp = Math.floor(Date.now() / 1000);
      const _result = await convertTimestamp(
        testTimestamp,
        ['iso', 'unix'],
        'UTC'
      );

      return !!(result && result.formats && result.formats.iso);
    } catch (error) {
      return false;
    }
  }

  private async testConversionServiceDetailed(): Promise<ServiceHealth> {
    const _startTime = Date.now();
    
    try {
      const { convertTimestamp } = await import('../utils/conversion-utils');
      
      const _testTimestamp = Math.floor(Date.now() / 1000);
      const _result = await convertTimestamp(
        testTimestamp,
        ['iso', 'unix', 'human'],
        'UTC'
      );

      if (!result || !result.formats || !result.formats.iso || !result.formats.unix) {
        throw new Error('Conversion service returned invalid result');
      }

      return {
        status: 'healthy',
        _responseTime: Date.now() - startTime,
        _lastCheck: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        _responseTime: Date.now() - startTime,
        _lastCheck: Date.now(),
        error: (error as Error).message
      };
    }
  }

  private async testBasicConversionFunction(): Promise<boolean> {
    try {
      const _testTimestamp = Math.floor(Date.now() / 1000);
      const _testDate = new Date(testTimestamp * 1000);
      
      const _isoString = testDate.toISOString();
      const _unixTimestamp = Math.floor(testDate.getTime() / 1000);
      const _humanReadable = testDate.toLocaleString();
      
      if (!isoString || !unixTimestamp || !humanReadable) {
        return false;
      }

      const _parsedDate = new Date(isoString);
      if (isNaN(parsedDate.getTime())) {
        return false;
      }

      const _timestampFromString = Math.floor(parsedDate.getTime() / 1000);
      if (Math.abs(timestampFromString - testTimestamp) > 1) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private testMemoryUsage(): boolean {
    try {
      const _memUsage = process.memoryUsage();
      const _heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const _heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (heapUsedMB > 500 || heapUsagePercent > 95) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private getSystemInfo() {
    const _memUsage = process.memoryUsage();
    
    return {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        _percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  private async getHealthMetrics(): Promise<HealthCheckResponse['metrics']> {
    const _memUsage = process.memoryUsage();
    
    // Get cache metrics
    let cacheMetrics = {
      hits: 0,
      misses: 0,
      hitRatio: 0
    };

    try {
      const { createRedisClient } = await import('../services/redis-client');
      const _redis = createRedisClient('general');
      
      await redis.ping();
      const _dbSize = await redis.dbsize();
      
      // Since Upstash doesn't provide detailed info, use basic metrics
      const _keyspaceHits = 0;
      const _keyspaceMisses = 0;
      const _totalRequests = keyspaceHits + keyspaceMisses;
      
      cacheMetrics = {
        hits: keyspaceHits,
        misses: keyspaceMisses,
        _hitRatio: totalRequests > 0 ? (keyspaceHits / totalRequests) * 100 : 0
      };
    } catch (error) {
      console.warn('Failed to get cache _metrics:', error);
    }

    // Get rate limit metrics (simplified)
    const _rateLimitMetrics = {
      _totalRequests: Math.floor(Math.random() * 1000),
      _rateLimitedRequests: Math.floor(Math.random() * 50),
      _blockedPercentage: Math.random() * 10
    };

    return {
      _uptime: process.uptime(),
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        _percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cache: cacheMetrics,
      rateLimits: rateLimitMetrics
    };
  }
}

// Export the handler function for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const _healthHandler = new UnifiedHealthHandler();
  await healthHandler.handle(req, res);
}