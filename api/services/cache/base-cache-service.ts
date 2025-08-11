/**
 * Abstract Base Cache Service
 * Provides common functionality for all cache implementations
 */

import * as crypto from 'crypto';
import {
  CacheableRequest,
  CacheBatchOperation,
  CacheConfiguration,
  CacheEvent,
  CacheGetOptions,
  CacheHealthCheck,
  CacheKeyOptions,
  CacheSetOptions,
  CacheStats,
  ICacheEventHandler,
  ICacheService,
} from './interfaces';

export abstract class BaseCacheService implements ICacheService {
  protected config: CacheConfiguration;
  protected cacheStats: CacheStats;
  protected eventHandlers: ICacheEventHandler[] = [];
  protected startTime: number;

  constructor(config: CacheConfiguration) {
    this.config = config;
    this.startTime = Date.now();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      keys: [],
      hitRatio: 0,
      uptime: 0,
    };
  }

  // Abstract methods that must be implemented by concrete classes
  abstract get<T>(key: string, options?: CacheGetOptions): Promise<T | null>;
  abstract set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  abstract delete(key: string): Promise<boolean>;
  abstract exists(key: string): Promise<boolean>;
  abstract clear(pattern?: string): Promise<void>;
  abstract keys(pattern?: string): Promise<string[]>;
  abstract size(): Promise<number>;
  abstract flush(): Promise<void>;
  abstract healthCheck(): Promise<CacheHealthCheck>;

  // Default implementations for batch operations
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    for (const key of keys) {
      try {
        const value = await this.get<T>(key);
        results.push(value);
      } catch (error) {
        results.push(null);
        this.emitEvent({
          type: 'error',
          key,
          timestamp: Date.now(),
          error: error as Error,
        });
      }
    }
    return results;
  }

  async mset(operations: CacheBatchOperation[]): Promise<void> {
    for (const operation of operations) {
      try {
        await this.set(operation.key, operation.value, {
          ttl: operation.ttl,
          ...operation.options,
        });
      } catch (error) {
        this.emitEvent({
          type: 'error',
          key: operation.key,
          timestamp: Date.now(),
          error: error as Error,
        });
        throw error;
      }
    }
  }

  async mdelete(keys: string[]): Promise<number> {
    let deletedCount = 0;
    for (const key of keys) {
      try {
        const deleted = await this.delete(key);
        if (deleted) deletedCount++;
      } catch (error) {
        this.emitEvent({
          type: 'error',
          key,
          timestamp: Date.now(),
          error: error as Error,
        });
      }
    }
    return deletedCount;
  }

  // Key generation with consistent hashing
  generateKey(request: CacheableRequest, options: CacheKeyOptions = {}): string {
    const {
      prefix = this.config.keyPrefix,
      suffix = '',
      includeUserId = false,
      includeTimestamp = false,
      hashLongKeys = true,
    } = options;

    // Build key components
    const components: string[] = [];

    if (prefix) components.push(prefix);
    components.push(request.endpoint);

    // Add parameters hash
    const paramsStr = JSON.stringify(request.parameters, Object.keys(request.parameters).sort());
    components.push(this.hashString(paramsStr));

    if (includeUserId && request.userId) {
      components.push(`user:${request.userId}`);
    }

    if (request.sessionId) {
      components.push(`session:${request.sessionId}`);
    }

    if (includeTimestamp) {
      components.push(`ts:${Date.now()}`);
    }

    if (suffix) components.push(suffix);

    let key = components.join(':');

    // Hash long keys to prevent issues with key length limits
    if (hashLongKeys && key.length > 250) {
      const hash = this.hashString(key);
      key = `${prefix || 'cache'}:hashed:${hash}`;
    }

    return key;
  }

  // TTL management
  async expire(key: string, ttl: number): Promise<boolean> {
    // Default implementation - subclasses should override if they support native TTL
    const value = await this.get(key);
    if (value === null) return false;

    await this.set(key, value, { ttl });
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  async ttl(_key: string): Promise<number> {
    // Default implementation returns -1 (no TTL support)
    // Subclasses should override if they support TTL queries
    return -1;
  }

  // Tag-based operations (default implementation)
  async getByTag(tag: string): Promise<string[]> {
    // Default implementation scans all keys - inefficient but functional
    const allKeys = await this.keys();
    const taggedKeys: string[] = [];

    for (const cacheKey of allKeys) {
      // This is a simple implementation - real implementations should store tag metadata
      if (cacheKey.includes(`tag:${tag}`)) {
        taggedKeys.push(cacheKey);
      }
    }

    return taggedKeys;
  }

  async deleteByTag(tag: string): Promise<number> {
    const taggedKeys = await this.getByTag(tag);
    return await this.mdelete(taggedKeys);
  }

  // Serialization utilities
  serialize<T>(value: T): string {
    if (this.config.serializationFormat === 'json') {
      return JSON.stringify(value);
    }
    // Add msgpack support later if needed
    return JSON.stringify(value);
  }

  deserialize<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      throw new Error(`Failed to deserialize cache value: ${error}`);
    }
  }

  // Compression utilities (placeholder implementations)
  async compress(data: string): Promise<string> {
    if (!this.config.compressionEnabled) return data;
    // TODO: Implement actual compression (gzip, lz4, etc.)
    return data;
  }

  async decompress(data: string): Promise<string> {
    if (!this.config.compressionEnabled) return data;
    // TODO: Implement actual decompression
    return data;
  }

  // Statistics
  async stats(): Promise<CacheStats> {
    const currentSize = await this.size();
    const currentKeys = await this.keys();

    this.cacheStats.size = currentSize;
    this.cacheStats.keys = currentKeys;
    this.cacheStats.hitRatio =
      this.cacheStats.hits + this.cacheStats.misses > 0
        ? this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
        : 0;
    this.cacheStats.uptime = Date.now() - this.startTime;

    return { ...this.cacheStats };
  }

  // Event handling
  addEventHandler(handler: ICacheEventHandler): void {
    this.eventHandlers.push(handler);
  }

  removeEventHandler(handler: ICacheEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  protected emitEvent(event: CacheEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler.onEvent(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in cache event handler:', error);
      }
    }
  }

  // Utility methods
  protected hashString(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  protected updateStats(operation: 'hit' | 'miss' | 'set' | 'delete'): void {
    switch (operation) {
      case 'hit':
        this.cacheStats.hits++;
        break;
      case 'miss':
        this.cacheStats.misses++;
        break;
      case 'set':
        this.cacheStats.sets++;
        break;
      case 'delete':
        this.cacheStats.deletes++;
        break;
    }
  }

  // Configuration management
  getConfiguration(): CacheConfiguration {
    return { ...this.config };
  }

  updateConfiguration(updates: Partial<CacheConfiguration>): void {
    this.config = { ...this.config, ...updates };
  }
}
