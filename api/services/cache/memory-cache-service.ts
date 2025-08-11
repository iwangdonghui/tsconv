/**
 * Enhanced Memory Cache Service
 * High-performance in-memory cache with LRU eviction and advanced features
 */

import { BaseCacheService } from './base-cache-service';
import {
  CacheConfiguration,
  CacheGetOptions,
  CacheHealthCheck,
  CacheSetOptions,
} from './interfaces';

interface CacheEntry<T = unknown> {
  value: T;
  expires: number;
  lastAccess: number;
  accessCount: number;
  size: number;
  tags: string[];
  priority: 'low' | 'normal' | 'high';
}

export class MemoryCacheService extends BaseCacheService {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private tagIndex = new Map<string, Set<string>>(); // Tag to keys mapping
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private accessCounter = 0;

  constructor(config: CacheConfiguration) {
    super(config);
    this.startCleanupInterval();
  }

  async get<T>(key: string, options: CacheGetOptions = {}): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.updateStats('miss');
      this.emitEvent({
        type: 'miss',
        key,
        timestamp: Date.now(),
      });
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.removeFromTagIndex(key, entry.tags);
      this.updateStats('miss');
      this.emitEvent({
        type: 'miss',
        key,
        timestamp: Date.now(),
        metadata: { reason: 'expired' },
      });
      return null;
    }

    // Update access tracking
    if (options.updateLastAccess !== false) {
      entry.lastAccess = Date.now();
      entry.accessCount++;
      this.accessOrder.set(key, ++this.accessCounter);
    }

    this.updateStats('hit');
    this.emitEvent({
      type: 'hit',
      key,
      timestamp: Date.now(),
    });

    return entry.value as T;
  }

  async set<T>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    const { ttl = this.config.defaultTTL, tags = [], priority = 'normal' } = options;

    // Calculate entry size (approximate)
    const serializedValue = this.serialize(value);
    const entrySize = this.calculateSize(serializedValue);

    // Check if we need to evict entries
    await this.ensureCapacity(entrySize);

    // Create cache entry
    const entry: CacheEntry<T> = {
      value,
      expires: Date.now() + ttl,
      lastAccess: Date.now(),
      accessCount: 1,
      size: entrySize,
      tags,
      priority,
    };

    // Remove old entry from tag index if it exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.removeFromTagIndex(key, oldEntry.tags);
    }

    // Set new entry
    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);

    // Update tag index
    this.addToTagIndex(key, tags);

    this.updateStats('set');
    this.emitEvent({
      type: 'set',
      key,
      timestamp: Date.now(),
      metadata: { size: entrySize, ttl, tags },
    });
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.accessOrder.delete(key);
    this.removeFromTagIndex(key, entry.tags);

    this.updateStats('delete');
    this.emitEvent({
      type: 'delete',
      key,
      timestamp: Date.now(),
    });

    return true;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    if (Date.now() > entry.expires) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const regex = new RegExp(pattern);
      const keysToDelete = Array.from(this.cache.keys()).filter(key => regex.test(key));

      for (const key of keysToDelete) {
        await this.delete(key);
      }
    } else {
      this.cache.clear();
      this.accessOrder.clear();
      this.tagIndex.clear();
      this.emitEvent({
        type: 'clear',
        timestamp: Date.now(),
      });
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());

    if (pattern) {
      const regex = new RegExp(pattern);
      return allKeys.filter(key => regex.test(key));
    }

    return allKeys;
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  async flush(): Promise<void> {
    await this.clear();
  }

  async healthCheck(): Promise<CacheHealthCheck> {
    const startTime = Date.now();

    try {
      // Test basic operations
      const testKey = `health_check_${Date.now()}`;
      await this.set(testKey, 'test', { ttl: 1000 });
      const value = await this.get(testKey);
      await this.delete(testKey);

      const responseTime = Date.now() - startTime;

      return {
        status: value === 'test' ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: Date.now(),
        connectionStatus: 'connected',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        error: (error as Error).message,
        connectionStatus: 'disconnected',
      };
    }
  }

  // Enhanced tag-based operations
  override async getByTag(tag: string): Promise<string[]> {
    const keys = this.tagIndex.get(tag);
    return keys ? Array.from(keys) : [];
  }

  override async deleteByTag(tag: string): Promise<number> {
    const keys = await this.getByTag(tag);
    let deletedCount = 0;

    for (const key of keys) {
      const deleted = await this.delete(key);
      if (deleted) deletedCount++;
    }

    return deletedCount;
  }

  // Memory management
  private async ensureCapacity(newEntrySize: number): Promise<void> {
    const currentMemoryUsage = this.getCurrentMemoryUsage();
    const maxMemory = this.config.maxSize;

    if (currentMemoryUsage + newEntrySize > maxMemory) {
      const targetSize = maxMemory * 0.8; // Evict to 80% capacity
      const toEvict = currentMemoryUsage + newEntrySize - targetSize;
      await this.evictEntries(toEvict);
    }
  }

  private async evictEntries(bytesToEvict: number): Promise<void> {
    let evicted = 0;
    const entries = Array.from(this.cache.entries());

    // Sort by eviction priority (LRU + priority + access frequency)
    entries.sort(([keyA, entryA], [keyB, entryB]) => {
      const priorityWeight = { low: 0, normal: 1, high: 2 };
      const scoreA = this.calculateEvictionScore(keyA, entryA, priorityWeight);
      const scoreB = this.calculateEvictionScore(keyB, entryB, priorityWeight);
      return scoreA - scoreB; // Lower score = higher eviction priority
    });

    for (const [key, entry] of entries) {
      if (evicted >= bytesToEvict) break;

      await this.delete(key);
      evicted += entry.size;
    }
  }

  private calculateEvictionScore(
    key: string,
    entry: CacheEntry,
    priorityWeight: Record<string, number>
  ): number {
    const now = Date.now();
    const age = now - entry.lastAccess;
    const accessOrder = this.accessOrder.get(key) || 0;
    const priority = priorityWeight[entry.priority] || 0;

    // Lower score = higher eviction priority
    return age / 1000 - entry.accessCount * 10 - priority * 1000 - accessOrder;
  }

  private getCurrentMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  private calculateSize(value: string): number {
    // Rough estimation of memory usage
    return Buffer.byteLength(value, 'utf8') + 100; // Add overhead for metadata
  }

  // Tag index management
  private addToTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  private removeFromTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  // Cleanup interval
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Run every minute
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }
  }

  // Cleanup on destruction
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
