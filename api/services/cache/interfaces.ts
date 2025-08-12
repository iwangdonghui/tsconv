/**
 * Unified Cache Service Interfaces
 * Provides consistent interfaces for all cache implementations
 */

export interface CacheableRequest {
  endpoint: string;
  parameters: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  keys: string[];
  hitRatio: number;
  memoryUsage?: number;
  uptime: number;
}

export interface CacheHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: number;
  error?: string;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export interface CacheConfiguration {
  enabled: boolean;
  defaultTTL: number;
  maxSize: number;
  keyPrefix: string;
  compressionEnabled: boolean;
  serializationFormat: 'json' | 'msgpack';
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

export interface CacheKeyOptions {
  prefix?: string;
  suffix?: string;
  includeUserId?: boolean;
  includeTimestamp?: boolean;
  hashLongKeys?: boolean;
}

export interface CacheSetOptions {
  ttl?: number;
  compress?: boolean;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high';
}

export interface CacheGetOptions {
  decompress?: boolean;
  updateLastAccess?: boolean;
}

export interface CacheBatchOperation<T = unknown> {
  key: string;
  value?: T;
  ttl?: number;
  options?: CacheSetOptions;
}

/**
 * Unified Cache Service Interface
 * All cache implementations must implement this interface
 */
export interface ICacheService {
  // Basic operations
  get<T>(key: string, options?: CacheGetOptions): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(pattern?: string): Promise<void>;

  // Batch operations
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  mset(operations: CacheBatchOperation[]): Promise<void>;
  mdelete(keys: string[]): Promise<number>;

  // Key management
  generateKey(request: CacheableRequest, options?: CacheKeyOptions): string;
  keys(pattern?: string): Promise<string[]>;
  expire(key: string, ttl: number): Promise<boolean>;
  ttl(key: string): Promise<number>;

  // Statistics and monitoring
  stats(): Promise<CacheStats>;
  healthCheck(): Promise<CacheHealthCheck>;

  // Cache management
  flush(): Promise<void>;
  size(): Promise<number>;

  // Tag-based operations (for advanced cache invalidation)
  getByTag(tag: string): Promise<string[]>;
  deleteByTag(tag: string): Promise<number>;

  // Utility methods
  serialize<T>(value: T): string;
  deserialize<T>(value: string): T;
  compress(data: string): Promise<string>;
  decompress(data: string): Promise<string>;
}

/**
 * Cache Provider Interface
 * Defines the contract for different cache providers (Redis, Upstash, Memory, etc.)
 */
export interface ICacheProvider {
  name: string;
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<boolean>;

  // Raw operations (provider-specific)
  rawGet(key: string): Promise<string | null>;
  rawSet(key: string, value: string, ttlMs?: number): Promise<void>;
  rawDelete(key: string): Promise<boolean>;
  rawExists(key: string): Promise<boolean>;
  rawKeys(pattern?: string): Promise<string[]>;
  rawFlush(): Promise<void>;
}

/**
 * Cache Strategy Interface
 * Defines different caching strategies (write-through, write-back, etc.)
 */
export interface ICacheStrategy {
  name: string;

  get<T>(key: string, fallback?: () => Promise<T>): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;

  // Strategy-specific methods
  invalidate(pattern: string): Promise<void>;
  refresh<T>(key: string, fetcher: () => Promise<T>): Promise<T>;
  warmup(keys: string[]): Promise<void>;
}

/**
 * Cache Event Interface
 * For cache event handling and monitoring
 */
export interface CacheEvent {
  type: 'hit' | 'miss' | 'set' | 'delete' | 'clear' | 'error' | 'connect' | 'disconnect';
  key?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  error?: Error;
}

export interface ICacheEventHandler {
  onEvent(event: CacheEvent): void | Promise<void>;
}

/**
 * Cache Metrics Interface
 * For detailed performance monitoring
 */
export interface CacheMetrics {
  operations: {
    gets: number;
    sets: number;
    deletes: number;
    hits: number;
    misses: number;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
  };
  memory: {
    used: number;
    available: number;
    fragmentation: number;
  };
  network?: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
}

export interface ICacheMetricsCollector {
  collect(): Promise<CacheMetrics>;
  reset(): void;
  getMetrics(timeRange?: { start: Date; end: Date }): Promise<CacheMetrics>;
}
