/**
 * Hybrid Cache Service
 * Multi-level cache with L1 (memory) and L2 (Redis/Upstash) for optimal performance
 */

import { BaseCacheService } from './base-cache-service';
import { HybridCacheConfig, SyncQueueItem } from './hybrid-cache-types';
import {
  CacheBatchOperation,
  CacheConfiguration,
  CacheGetOptions,
  CacheHealthCheck,
  CacheSetOptions,
  ICacheService,
} from './interfaces';
import { RedisCacheService } from './redis-cache-service';
import { UpstashCacheService } from './upstash-cache-service';

export class HybridCacheService extends BaseCacheService {
  private l1Cache!: ICacheService; // Memory cache
  private l2Cache!: ICacheService; // Redis/Upstash cache
  private hybridConfig: HybridCacheConfig;
  private accessCounts = new Map<string, number>();
  private syncQueue = new Map<string, SyncQueueItem>();
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: CacheConfiguration, hybridConfig?: Partial<HybridCacheConfig>) {
    super(config);

    this.hybridConfig = {
      l1Config: {
        ...config,
        maxSize: hybridConfig?.l1MaxSize || Math.floor(config.maxSize * 0.1), // 10% of total for L1
        defaultTTL: hybridConfig?.l1TTL || Math.min(config.defaultTTL, 300000), // Max 5 minutes for L1
      },
      l2Provider: hybridConfig?.l2Provider || 'redis',
      l2Config: hybridConfig?.l2Config,
      syncStrategy: hybridConfig?.syncStrategy || 'write-through',
      l1MaxSize: hybridConfig?.l1MaxSize || Math.floor(config.maxSize * 0.1),
      l1TTL: hybridConfig?.l1TTL || Math.min(config.defaultTTL, 300000),
      promoteThreshold: hybridConfig?.promoteThreshold || 3,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize L1 cache (memory)
      const { MemoryCacheService } = await import('./memory-cache-service');
      this.l1Cache = new MemoryCacheService(this.hybridConfig.l1Config as CacheConfiguration);

      // Initialize L2 cache (Redis/Upstash)
      if (this.hybridConfig.l2Provider === 'redis') {
        this.l2Cache = new RedisCacheService(this.config, this.hybridConfig.l2Config);
      } else {
        this.l2Cache = new UpstashCacheService(this.config, this.hybridConfig.l2Config);
      }

      // Start sync process for write-back strategy
      if (this.hybridConfig.syncStrategy === 'write-back') {
        this.startSyncProcess();
      }

      // eslint-disable-next-line no-console
      console.log(`✅ Hybrid cache initialized: L1(Memory) + L2(${this.hybridConfig.l2Provider})`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize hybrid cache:', error);
      throw error;
    }
  }

  async get<T>(key: string, options: CacheGetOptions = {}): Promise<T | null> {
    try {
      // Try L1 cache first
      const l1Value = await this.l1Cache.get<T>(key, options);
      if (l1Value !== null) {
        this.updateStats('hit');
        this.emitEvent({
          type: 'hit',
          key,
          timestamp: Date.now(),
          metadata: { level: 'L1' },
        });
        return l1Value;
      }

      // Try L2 cache
      const l2Value = await this.l2Cache.get<T>(key, options);
      if (l2Value !== null) {
        this.updateStats('hit');
        this.emitEvent({
          type: 'hit',
          key,
          timestamp: Date.now(),
          metadata: { level: 'L2' },
        });

        // Track access for potential promotion to L1
        this.trackAccess(key);

        // Promote to L1 if accessed frequently
        if (this.shouldPromoteToL1(key)) {
          await this.promoteToL1(key, l2Value);
        }

        return l2Value;
      }

      this.updateStats('miss');
      this.emitEvent({
        type: 'miss',
        key,
        timestamp: Date.now(),
      });

      return null;
    } catch (error) {
      this.emitEvent({
        type: 'error',
        key,
        timestamp: Date.now(),
        error: error as Error,
      });
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    try {
      const { ttl = this.config.defaultTTL } = options;

      switch (this.hybridConfig.syncStrategy) {
        case 'write-through':
          // Write to both L1 and L2 synchronously
          await Promise.all([
            this.l1Cache.set(key, value, {
              ...options,
              ttl: Math.min(ttl, this.hybridConfig.l1TTL),
            }),
            this.l2Cache.set(key, value, options),
          ]);
          break;

        case 'write-back':
          // Write to L1 immediately, queue for L2
          await this.l1Cache.set(key, value, {
            ...options,
            ttl: Math.min(ttl, this.hybridConfig.l1TTL),
          });
          this.queueForL2Sync(key, value, options);
          break;

        case 'write-around':
          // Write only to L2, bypass L1
          await this.l2Cache.set(key, value, options);
          break;
      }

      this.updateStats('set');
      this.emitEvent({
        type: 'set',
        key,
        timestamp: Date.now(),
        metadata: { strategy: this.hybridConfig.syncStrategy, ttl },
      });
    } catch (error) {
      this.emitEvent({
        type: 'error',
        key,
        timestamp: Date.now(),
        error: error as Error,
      });
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      // Delete from both levels
      const [l1Deleted, l2Deleted] = await Promise.all([
        this.l1Cache.delete(key),
        this.l2Cache.delete(key),
      ]);

      // Remove from sync queue if present
      this.syncQueue.delete(key);
      this.accessCounts.delete(key);

      const deleted = l1Deleted || l2Deleted;

      if (deleted) {
        this.updateStats('delete');
        this.emitEvent({
          type: 'delete',
          key,
          timestamp: Date.now(),
        });
      }

      return deleted;
    } catch (error) {
      this.emitEvent({
        type: 'error',
        key,
        timestamp: Date.now(),
        error: error as Error,
      });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    // Check L1 first, then L2
    const l1Exists = await this.l1Cache.exists(key);
    if (l1Exists) return true;

    return await this.l2Cache.exists(key);
  }

  async clear(pattern?: string): Promise<void> {
    try {
      await Promise.all([this.l1Cache.clear(pattern), this.l2Cache.clear(pattern)]);

      // Clear internal tracking
      if (pattern) {
        const regex = new RegExp(pattern);
        for (const key of Array.from(this.accessCounts.keys())) {
          if (regex.test(key)) {
            this.accessCounts.delete(key);
            this.syncQueue.delete(key);
          }
        }
      } else {
        this.accessCounts.clear();
        this.syncQueue.clear();
      }

      this.emitEvent({
        type: 'clear',
        timestamp: Date.now(),
        metadata: { pattern },
      });
    } catch (error) {
      throw error;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      // Combine keys from both levels, deduplicate
      const [l1Keys, l2Keys] = await Promise.all([
        this.l1Cache.keys(pattern),
        this.l2Cache.keys(pattern),
      ]);

      return Array.from(new Set([...l1Keys, ...l2Keys]));
    } catch (error) {
      return [];
    }
  }

  async size(): Promise<number> {
    try {
      const keys = await this.keys();
      return keys.length;
    } catch (error) {
      return 0;
    }
  }

  async flush(): Promise<void> {
    await this.clear();
  }

  async healthCheck(): Promise<CacheHealthCheck> {
    const startTime = Date.now();

    try {
      const [l1Health, l2Health] = await Promise.all([
        this.l1Cache.healthCheck(),
        this.l2Cache.healthCheck(),
      ]);

      const responseTime = Date.now() - startTime;

      // Determine overall health
      let status: 'healthy' | 'degraded' | 'unhealthy';
      let error: string | undefined;

      if (l1Health.status === 'healthy' && l2Health.status === 'healthy') {
        status = 'healthy';
      } else if (l1Health.status === 'healthy' || l2Health.status === 'healthy') {
        status = 'degraded';
        error = `L1: ${l1Health.status}, L2: ${l2Health.status}`;
      } else {
        status = 'unhealthy';
        error = `L1: ${l1Health.error || l1Health.status}, L2: ${l2Health.error || l2Health.status}`;
      }

      return {
        status,
        responseTime,
        lastCheck: Date.now(),
        connectionStatus: status === 'unhealthy' ? 'disconnected' : 'connected',
        error,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        connectionStatus: 'disconnected',
        error: (error as Error).message,
      };
    }
  }

  // Enhanced batch operations
  override async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      // Get from L1 first
      const l1Results = await this.l1Cache.mget<T>(keys);
      const missingKeys: string[] = [];
      const missingIndices: number[] = [];

      // Identify missing keys
      l1Results.forEach((result, index) => {
        if (result === null && keys[index]) {
          missingKeys.push(keys[index]);
          missingIndices.push(index);
        }
      });

      // Get missing keys from L2
      if (missingKeys.length > 0) {
        const l2Results = await this.l2Cache.mget<T>(missingKeys);

        // Merge results and track access for promotion
        l2Results.forEach((result, i) => {
          const originalIndex = missingIndices[i];
          const key = missingKeys[i];

          if (originalIndex !== undefined && key !== undefined) {
            l1Results[originalIndex] = result;

            if (result !== null) {
              this.trackAccess(key);
              if (this.shouldPromoteToL1(key)) {
                // Async promotion, don't wait
                // eslint-disable-next-line no-console
                this.promoteToL1(key, result).catch(console.warn);
              }
            }
          }
        });
      }

      return l1Results;
    } catch (error) {
      return keys.map(() => null);
    }
  }

  override async mset(operations: CacheBatchOperation[]): Promise<void> {
    switch (this.hybridConfig.syncStrategy) {
      case 'write-through':
        await Promise.all([
          this.l1Cache.mset(
            operations.map(op => ({
              ...op,
              options: {
                ...op.options,
                ttl: Math.min(op.ttl || this.config.defaultTTL, this.hybridConfig.l1TTL),
              },
            }))
          ),
          this.l2Cache.mset(operations),
        ]);
        break;

      case 'write-back':
        await this.l1Cache.mset(
          operations.map(op => ({
            ...op,
            options: {
              ...op.options,
              ttl: Math.min(op.ttl || this.config.defaultTTL, this.hybridConfig.l1TTL),
            },
          }))
        );

        operations.forEach(op => {
          this.queueForL2Sync(op.key, op.value, op.options || {});
        });
        break;

      case 'write-around':
        await this.l2Cache.mset(operations);
        break;
    }
  }

  override async mdelete(keys: string[]): Promise<number> {
    try {
      const [l1Count, l2Count] = await Promise.all([
        this.l1Cache.mdelete(keys),
        this.l2Cache.mdelete(keys),
      ]);

      // Clean up tracking
      keys.forEach(key => {
        this.accessCounts.delete(key);
        this.syncQueue.delete(key);
      });

      return Math.max(l1Count, l2Count);
    } catch (error) {
      return 0;
    }
  }

  // Helper methods
  private trackAccess(key: string): void {
    const count = this.accessCounts.get(key) || 0;
    this.accessCounts.set(key, count + 1);
  }

  private shouldPromoteToL1(key: string): boolean {
    const count = this.accessCounts.get(key) || 0;
    return count >= this.hybridConfig.promoteThreshold;
  }

  private async promoteToL1<T>(key: string, value: T): Promise<void> {
    try {
      await this.l1Cache.set(key, value, {
        ttl: this.hybridConfig.l1TTL,
      });

      this.emitEvent({
        type: 'set',
        key,
        timestamp: Date.now(),
        metadata: { promoted: true, level: 'L1' },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to promote key to L1:', key, error);
    }
  }

  private queueForL2Sync<T>(key: string, value: T, options: CacheSetOptions): void {
    this.syncQueue.set(key, {
      value,
      options,
      timestamp: Date.now(),
    });
  }

  private startSyncProcess(): void {
    this.syncInterval = setInterval(async () => {
      await this.processSyncQueue();
    }, 5000); // Sync every 5 seconds
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.size === 0) return;

    const operations: CacheBatchOperation[] = [];
    const keysToRemove: string[] = [];

    for (const [key, { value, options, timestamp }] of Array.from(this.syncQueue.entries())) {
      // Skip if too old (prevent stale writes)
      if (Date.now() - timestamp > 60000) {
        // 1 minute max age
        keysToRemove.push(key);
        continue;
      }

      operations.push({ key, value, ...options });
      keysToRemove.push(key);
    }

    if (operations.length > 0) {
      try {
        await this.l2Cache.mset(operations);
        keysToRemove.forEach(key => this.syncQueue.delete(key));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to sync to L2 cache:', error);
      }
    }
  }

  // Cleanup
  async destroy(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Process remaining sync queue
    if (this.hybridConfig.syncStrategy === 'write-back') {
      await this.processSyncQueue();
    }

    // Cleanup caches
    if ('destroy' in this.l1Cache && typeof this.l1Cache.destroy === 'function') {
      await this.l1Cache.destroy();
    }

    if ('destroy' in this.l2Cache && typeof this.l2Cache.destroy === 'function') {
      await this.l2Cache.destroy();
    }
  }
}
