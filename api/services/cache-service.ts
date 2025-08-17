import config from '../config/config';
import { CacheService, CacheStats, CacheableRequest } from '../types/api';

class MemoryCacheService implements CacheService {
  private cache = new Map<string, { value: any; expires: number; lastAccess: number }>();
  private cacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  private maxSize: number;
  private frequentKeys = new Set<string>();
  private warmupEnabled: boolean = true;

  constructor(maxSize: number = 1000) {
    // Default to 1000 items instead of bytes
    this.maxSize = maxSize;
    this.startCleanupInterval();
    this.startWarmupInterval();
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) {
      this.cacheStats.misses++;
      return null;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      return null;
    }

    // Update last access time for LRU algorithm
    item.lastAccess = Date.now();

    // Track frequently accessed keys for cache warming
    if (this.warmupEnabled) {
      this.frequentKeys.add(key);
    }

    this.cacheStats.hits++;
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl: number = config.caching.defaultTTL): Promise<void> {
    // Check current cache size and implement LRU eviction if needed
    if (this.cache.size >= this.maxSize) {
      // Evict multiple items if we're at capacity
      const evictCount = Math.max(1, Math.floor(this.maxSize * 0.1)); // Evict 10% or at least 1
      for (let i = 0; i < evictCount; i++) {
        this.evictLRU();
      }
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
      lastAccess: Date.now(),
    });
    this.cacheStats.sets++;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    this.frequentKeys.delete(key);
    this.cacheStats.deletes++;
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }

    // Update last access time
    item.lastAccess = Date.now();
    return true;
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const regex = new RegExp(pattern);
      // Convert iterator to array to avoid downlevelIteration issues
      const allKeys = Array.from(this.cache.keys());
      for (const key of allKeys) {
        if (regex.test(key)) {
          this.cache.delete(key);
          this.frequentKeys.delete(key);
        }
      }
    } else {
      this.cache.clear();
      this.frequentKeys.clear();
    }
  }

  async stats(): Promise<CacheStats> {
    this.cleanupExpired();
    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  async healthCheck(): Promise<{ status: string; type: string; details: any }> {
    try {
      return {
        status: 'healthy',
        type: 'memory',
        details: {
          cacheType: 'In-memory cache (Redis not configured)',
          size: this.cache.size,
          maxSize: this.maxSize,
          ttlEnabled: true,
          lruEnabled: true,
          hits: this.cacheStats.hits,
          misses: this.cacheStats.misses,
          hitRatio: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses || 1),
          warmupEnabled: this.warmupEnabled,
          frequentKeysCount: this.frequentKeys.size,
          estimatedSizeBytes: this.estimateCacheSize(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        type: 'memory',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  generateKey(request: CacheableRequest): string {
    // Optimize key generation by using a more efficient approach
    // 1. Only include non-null and non-undefined parameters
    // 2. Use a more compact representation for arrays and objects
    // 3. Use a faster hashing algorithm for large parameter sets

    const filteredParams: Record<string, any> = {};

    // Filter out null/undefined values to reduce key size
    for (const [key, value] of Object.entries(request.parameters)) {
      if (value !== null && value !== undefined) {
        filteredParams[key] = value;
      }
    }

    // For large parameter sets, use a more efficient serialization
    let paramString: string;

    if (Object.keys(filteredParams).length > 10) {
      // For complex objects, use a more efficient approach
      paramString = this.fastHash(this.serializeObject(filteredParams));
    } else {
      // For simple objects, use the standard approach with consistent serialization
      paramString = Object.keys(filteredParams)
        .sort()
        .map(key => {
          const value = filteredParams[key];
          // Special handling for arrays to make keys more compact
          if (Array.isArray(value) && value.length > 5) {
            return `${key}:[${value.length}items]`;
          }
          return `${key}:${this.serializeValue(value)}`;
        })
        .join('|');
    }

    return `cache:${request.endpoint}:${request.userId || 'anonymous'}:${paramString}`;
  }

  private serializeObject(obj: any): string {
    // Consistent object serialization that handles nested objects
    if (obj === null || obj === undefined) {
      return String(obj);
    }

    if (typeof obj !== 'object') {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      return `[${obj.map(item => this.serializeObject(item)).join(',')}]`;
    }

    // Sort keys to ensure consistent serialization
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys.map(key => `"${key}":${this.serializeObject(obj[key])}`);
    return `{${pairs.join(',')}}`;
  }

  private serializeValue(value: any): string {
    // Consistent value serialization
    return this.serializeObject(value);
  }

  private fastHash(str: string): string {
    // Simple but fast hashing algorithm (djb2)
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i);
    }
    return (hash >>> 0).toString(36); // Convert to positive number and base36
  }

  private evictLRU(): void {
    // Find the least recently used items
    let oldestTime = Infinity;
    let oldestKey: string | null = null;

    // Skip frequent keys when evicting to maintain performance
    // Convert iterator to array to avoid downlevelIteration issues
    const entries = Array.from(this.cache.entries());

    for (const [key, item] of entries) {
      if (!this.frequentKeys.has(key) && item.lastAccess < oldestTime) {
        oldestTime = item.lastAccess;
        oldestKey = key;
      }
    }

    // If all keys are frequent, fall back to the oldest one
    if (oldestKey === null) {
      for (const [key, item] of entries) {
        if (item.lastAccess < oldestTime) {
          oldestTime = item.lastAccess;
          oldestKey = key;
        }
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.frequentKeys.delete(oldestKey);
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    // Convert iterator to array to avoid downlevelIteration issues
    const entries = Array.from(this.cache.entries());

    for (const [key, item] of entries) {
      if (now > item.expires) {
        this.cache.delete(key);
        this.frequentKeys.delete(key);
      }
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => this.cleanupExpired(), 60000); // Cleanup every minute
  }

  private startWarmupInterval(): void {
    // Periodically analyze and warm up frequently accessed timezone data
    setInterval(() => {
      if (this.warmupEnabled && this.frequentKeys.size > 0) {
        this.warmupFrequentKeys();
      }
    }, 300000); // Every 5 minutes
  }

  private warmupFrequentKeys(): void {
    // Extend TTL for frequently accessed keys
    // Convert iterator to array to avoid downlevelIteration issues
    const frequentKeysArray = Array.from(this.frequentKeys);

    for (const key of frequentKeysArray) {
      const item = this.cache.get(key);
      if (item) {
        // If it's a timezone-related key, extend its TTL
        if (key.includes('timezone') || key.includes('tz-data')) {
          item.expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        }
      }
    }
  }

  // NOTE: reserved for future diagnostics; suppress unused warning intentionally
   
  private estimateCacheSize(): number {
    let size = 0;
    const entries = Array.from(this.cache.entries());
    for (const [key, item] of entries) {
      const valueSize = JSON.stringify(item.value).length;
      size += key.length + valueSize + 16; // 16 bytes for overhead
    }
    return size;
  }

  // Method to optimize memory usage for batch operations
  async optimizeBatchOperation<T>(
    keys: string[],
    operation: (key: string) => Promise<T>
  ): Promise<T[]> {
    // Process in smaller chunks to avoid memory spikes
    const chunkSize = 50;
    const results: T[] = [];

    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(chunk.map(operation));
      results.push(...chunkResults);

      // Allow garbage collection between chunks
      if (i + chunkSize < keys.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return results;
  }
}

// Export the class for direct use and testing
export { MemoryCacheService };

// For backward compatibility, export a default instance
// In production, use the cache-factory.ts instead
const memoryCacheService = new MemoryCacheService();
export default memoryCacheService;
