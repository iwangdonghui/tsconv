/**
 * Cache Strategy Applier
 * Applies cache strategies to actual cache operations with intelligent routing
 */

import { getCacheService } from './cache-factory';
import { CacheStrategyManager, CacheStrategyType } from './cache-strategy-config';
import {
  CacheableRequest,
  CacheGetOptions,
  CacheHealthCheck,
  CacheKeyOptions,
  CacheSetOptions,
  CacheStats,
  ICacheService,
} from './interfaces';

export interface CacheOperationContext {
  endpoint: string;
  userId?: string;
  sessionId?: string;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  errors: number;
  totalLatency: number;
  operationCount: number;
  lastReset: number;
}

/**
 * Strategic Cache Service
 * Wraps cache operations with intelligent strategy application
 */
export class StrategicCacheService implements ICacheService {
  private strategyManager: CacheStrategyManager;
  private cacheServices = new Map<string, ICacheService>();
  private metrics = new Map<string, CacheMetrics>();
  private metricsUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private startTime: number;

  constructor(strategyManager?: CacheStrategyManager) {
    this.strategyManager = strategyManager || new CacheStrategyManager();
    this.startTime = Date.now();
    this.startMetricsCollection();
  }

  /**
   * Strategic get operation
   */
  async get<T>(key: string, options?: CacheGetOptions): Promise<T | null> {
    const context = this.extractContextFromKey(key);
    const startTime = Date.now();

    try {
      const cacheService = this.getCacheServiceForContext(context);
      const result = await cacheService.get<T>(key, options);

      // Update metrics
      this.updateMetrics(context.endpoint, {
        type: result !== null ? 'hit' : 'miss',
        latency: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.updateMetrics(context.endpoint, {
        type: 'error',
        latency: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Strategic set operation
   */
  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const context = this.extractContextFromKey(key);
    const startTime = Date.now();

    try {
      const cacheService = this.getCacheServiceForContext(context);
      const config = this.strategyManager.getEndpointConfig(context.endpoint);

      // Apply strategy-specific options
      const strategicOptions: CacheSetOptions = {
        ...options,
        ttl: options?.ttl || config.defaultTTL,
        compress: options?.compress ?? config.compressionEnabled,
        tags: [...(options?.tags || []), ...(context.tags || [])],
        priority: context.priority || 'normal',
      };

      await cacheService.set(key, value, strategicOptions);

      // Update metrics
      this.updateMetrics(context.endpoint, {
        type: 'set',
        latency: Date.now() - startTime,
      });
    } catch (error) {
      this.updateMetrics(context.endpoint, {
        type: 'error',
        latency: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Strategic delete operation
   */
  async delete(key: string): Promise<boolean> {
    const context = this.extractContextFromKey(key);
    const cacheService = this.getCacheServiceForContext(context);
    return await cacheService.delete(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const context = this.extractContextFromKey(key);
    const cacheService = this.getCacheServiceForContext(context);
    return await cacheService.exists(key);
  }

  /**
   * Clear cache with pattern
   */
  async clear(pattern?: string): Promise<void> {
    // Clear all cache services
    for (const cacheService of this.cacheServices.values()) {
      await cacheService.clear(pattern);
    }
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    const allKeys: string[] = [];

    for (const cacheService of this.cacheServices.values()) {
      const keys = await cacheService.keys(pattern);
      allKeys.push(...keys);
    }

    // Remove duplicates
    return [...new Set(allKeys)];
  }

  /**
   * Get cache size
   */
  async size(): Promise<number> {
    let totalSize = 0;

    for (const cacheService of this.cacheServices.values()) {
      totalSize += await cacheService.size();
    }

    return totalSize;
  }

  /**
   * Flush all caches
   */
  async flush(): Promise<void> {
    for (const cacheService of this.cacheServices.values()) {
      await cacheService.flush();
    }
  }

  /**
   * Batch get operations
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    // Group keys by cache service
    const keyGroups = new Map<ICacheService, string[]>();
    const keyIndexMap = new Map<string, number>();

    keys.forEach((key, index) => {
      keyIndexMap.set(key, index);
      const context = this.extractContextFromKey(key);
      const cacheService = this.getCacheServiceForContext(context);

      if (!keyGroups.has(cacheService)) {
        keyGroups.set(cacheService, []);
      }
      keyGroups.get(cacheService)!.push(key);
    });

    // Execute batch operations
    const results: (T | null)[] = new Array(keys.length).fill(null);

    for (const [cacheService, serviceKeys] of keyGroups.entries()) {
      const serviceResults = await cacheService.mget<T>(serviceKeys);

      serviceKeys.forEach((key, serviceIndex) => {
        const originalIndex = keyIndexMap.get(key)!;
        results[originalIndex] = serviceResults[serviceIndex];
      });
    }

    return results;
  }

  /**
   * Batch set operations
   */
  async mset(
    operations: Array<{ key: string; value: unknown; ttl?: number; options?: CacheSetOptions }>
  ): Promise<void> {
    // Group operations by cache service
    const operationGroups = new Map<ICacheService, typeof operations>();

    for (const operation of operations) {
      const context = this.extractContextFromKey(operation.key);
      const cacheService = this.getCacheServiceForContext(context);

      if (!operationGroups.has(cacheService)) {
        operationGroups.set(cacheService, []);
      }
      operationGroups.get(cacheService)!.push(operation);
    }

    // Execute batch operations
    const promises = Array.from(operationGroups.entries()).map(([cacheService, ops]) =>
      cacheService.mset(ops)
    );

    await Promise.all(promises);
  }

  /**
   * Batch delete operations
   */
  async mdelete(keys: string[]): Promise<number> {
    // Group keys by cache service
    const keyGroups = new Map<ICacheService, string[]>();

    keys.forEach(key => {
      const context = this.extractContextFromKey(key);
      const cacheService = this.getCacheServiceForContext(context);

      if (!keyGroups.has(cacheService)) {
        keyGroups.set(cacheService, []);
      }
      keyGroups.get(cacheService)!.push(key);
    });

    // Execute batch operations
    let totalDeleted = 0;

    for (const [cacheService, serviceKeys] of keyGroups.entries()) {
      totalDeleted += await cacheService.mdelete(serviceKeys);
    }

    return totalDeleted;
  }

  /**
   * Generate cache key with strategy context
   */
  generateKey(
    request: CacheableRequest,
    options?: CacheKeyOptions & { includeStrategy?: boolean }
  ): string {
    const context: CacheOperationContext = {
      endpoint: request.endpoint,
      userId: request.userId,
      sessionId: request.sessionId,
    };

    const cacheService = this.getCacheServiceForContext(context);
    let key = cacheService.generateKey(request);

    // Include strategy information in key if requested
    if (options?.includeStrategy) {
      const strategy = this.getStrategyForEndpoint(context.endpoint);
      key = `${strategy}:${key}`;
    }

    return key;
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    const context = this.extractContextFromKey(key);
    const cacheService = this.getCacheServiceForContext(context);
    return await cacheService.ttl(key);
  }

  /**
   * Set TTL for key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const context = this.extractContextFromKey(key);
    const cacheService = this.getCacheServiceForContext(context);
    return await cacheService.expire(key, ttl);
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<CacheStats> {
    let totalHits = 0;
    let totalMisses = 0;
    let totalSets = 0;
    let totalDeletes = 0;
    let totalSize = 0;
    const allKeys: string[] = [];

    // Aggregate stats from all cache services
    for (const [key, cacheService] of this.cacheServices.entries()) {
      try {
        const serviceStats = await cacheService.stats();
        totalHits += serviceStats.hits;
        totalMisses += serviceStats.misses;
        totalSets += serviceStats.sets;
        totalDeletes += serviceStats.deletes;
        totalSize += serviceStats.size;
        allKeys.push(...serviceStats.keys);
      } catch (error) {
        console.warn(`Failed to get stats from cache service ${key}:`, error);
      }
    }

    const hitRatio = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    return {
      hits: totalHits,
      misses: totalMisses,
      sets: totalSets,
      deletes: totalDeletes,
      size: totalSize,
      keys: allKeys,
      hitRatio,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Health check across all cache services
   */
  async healthCheck(): Promise<CacheHealthCheck> {
    const startTime = Date.now();
    let healthyServices = 0;
    let totalServices = 0;
    let lastError: string | undefined;

    for (const [key, cacheService] of this.cacheServices.entries()) {
      try {
        const serviceHealth = await cacheService.healthCheck();
        totalServices++;
        if (serviceHealth.status === 'healthy') {
          healthyServices++;
        }
      } catch (error) {
        totalServices++;
        lastError = (error as Error).message;
      }
    }

    const responseTime = Date.now() - startTime;
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (healthyServices === 0) {
      status = 'unhealthy';
    } else if (healthyServices < totalServices) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      responseTime,
      lastCheck: Date.now(),
      error: lastError,
      connectionStatus:
        status === 'healthy'
          ? 'connected'
          : status === 'degraded'
            ? 'reconnecting'
            : 'disconnected',
    };
  }

  /**
   * Tag-based operations
   */
  async getByTag(tag: string): Promise<string[]> {
    const allKeys: string[] = [];

    for (const cacheService of this.cacheServices.values()) {
      const keys = await cacheService.getByTag(tag);
      allKeys.push(...keys);
    }

    return [...new Set(allKeys)];
  }

  async deleteByTag(tag: string): Promise<number> {
    let totalDeleted = 0;

    for (const cacheService of this.cacheServices.values()) {
      totalDeleted += await cacheService.deleteByTag(tag);
    }

    return totalDeleted;
  }

  /**
   * Serialization utilities
   */
  serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  deserialize<T>(value: string): T {
    return JSON.parse(value) as T;
  }

  async compress(data: string): Promise<string> {
    return data; // Placeholder - implement actual compression if needed
  }

  async decompress(data: string): Promise<string> {
    return data; // Placeholder - implement actual decompression if needed
  }

  // Strategy management methods
  updateStrategy(endpoint: string, strategy: CacheStrategyType): void {
    this.strategyManager.updateEndpointStrategy(endpoint, strategy);
    // Clear cache service for this endpoint to force recreation with new strategy
    this.cacheServices.delete(this.getServiceKeyForEndpoint(endpoint));
  }

  getStrategy(endpoint: string): CacheStrategyType {
    return this.getStrategyForEndpoint(endpoint);
  }

  getStrategyManager(): CacheStrategyManager {
    return this.strategyManager;
  }

  // Private helper methods
  private getCacheServiceForContext(context: CacheOperationContext): ICacheService {
    const serviceKey = this.getServiceKeyForEndpoint(context.endpoint);

    if (!this.cacheServices.has(serviceKey)) {
      const config = this.strategyManager.getEndpointConfig(context.endpoint);
      const cacheService = getCacheService({ customConfig: config });
      this.cacheServices.set(serviceKey, cacheService);
    }

    return this.cacheServices.get(serviceKey)!;
  }

  private getServiceKeyForEndpoint(endpoint: string): string {
    const strategy = this.getStrategyForEndpoint(endpoint);
    return `${strategy}:${endpoint}`;
  }

  private getStrategyForEndpoint(endpoint: string): CacheStrategyType {
    const endpointConfigs = this.strategyManager.getCurrentConfig().endpointConfigs;
    const config = endpointConfigs.find(c => c.endpoint === endpoint);
    return config?.strategy || this.strategyManager.getGlobalStrategy();
  }

  private extractContextFromKey(key: string): CacheOperationContext {
    // Extract endpoint from key structure
    // Assuming key format: "prefix:endpoint:hash" or similar
    const parts = key.split(':');
    const endpoint = parts.length > 1 ? parts[1] : 'default';

    return {
      endpoint,
      priority: 'normal',
    };
  }

  private updateMetrics(
    endpoint: string,
    operation: {
      type: 'hit' | 'miss' | 'set' | 'error';
      latency: number;
    }
  ): void {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, {
        hits: 0,
        misses: 0,
        sets: 0,
        errors: 0,
        totalLatency: 0,
        operationCount: 0,
        lastReset: Date.now(),
      });
    }

    const metrics = this.metrics.get(endpoint)!;

    switch (operation.type) {
      case 'hit':
        metrics.hits++;
        break;
      case 'miss':
        metrics.misses++;
        break;
      case 'set':
        metrics.sets++;
        break;
      case 'error':
        metrics.errors++;
        break;
    }

    metrics.totalLatency += operation.latency;
    metrics.operationCount++;
  }

  private startMetricsCollection(): void {
    this.metricsUpdateInterval = setInterval(() => {
      this.updateStrategyManagerMetrics();
    }, 60000); // Update every minute
  }

  private updateStrategyManagerMetrics(): void {
    for (const [endpoint, metrics] of this.metrics.entries()) {
      if (metrics.operationCount > 0) {
        const hitRate = metrics.hits / (metrics.hits + metrics.misses || 1);
        const avgLatency = metrics.totalLatency / metrics.operationCount;
        const errorRate = metrics.errors / metrics.operationCount;

        this.strategyManager.updatePerformanceMetrics(endpoint, {
          hitRate,
          memoryUsage: 0, // Would need to calculate actual memory usage
          latency: avgLatency,
        });
      }
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }

    // Cleanup cache services
    for (const cacheService of this.cacheServices.values()) {
      if ('destroy' in cacheService && typeof cacheService.destroy === 'function') {
        await cacheService.destroy();
      }
    }

    this.cacheServices.clear();
    this.metrics.clear();
  }
}
