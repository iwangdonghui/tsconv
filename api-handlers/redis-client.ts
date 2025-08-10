// Redis client adapter for Cloudflare Workers/Pages
// Supports both Upstash Redis and fallback to memory cache

interface RedisResponse {
  result?: any;
  error?: string;
}

interface CacheEntry {
  value: any;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 1000; // Limit memory usage

  set(key: string, value: any, ttlSeconds: number = 3600): boolean {
    // Clean expired entries if cache is getting full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
    return true;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  del(key: string): boolean {
    return this.cache.delete(key);
  }

  exists(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }

    // If still too large, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      const toRemove = entries.slice(0, Math.floor(this.maxSize * 0.2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

export class RedisClient {
  private redisUrl: string | null;
  private redisToken: string | null;
  private enabled: boolean;
  private memoryCache: MemoryCache;

  constructor(env: any) {
    this.redisUrl = env.UPSTASH_REDIS_REST_URL || null;
    this.redisToken = env.UPSTASH_REDIS_REST_TOKEN || null;
    this.enabled = !!(this.redisUrl && this.redisToken && env.REDIS_ENABLED !== 'false');
    this.memoryCache = new MemoryCache();
  }

  private async makeRedisRequest(command: string[]): Promise<RedisResponse> {
    if (!this.enabled || !this.redisUrl || !this.redisToken) {
      throw new Error('Redis not configured');
    }

    try {
      const response = await fetch(this.redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        throw new Error(`Redis request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Redis request error:', error);
      throw error;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      if (this.enabled) {
        const serialized = JSON.stringify(value);
        const result = await this.makeRedisRequest([
          'SETEX',
          key,
          ttlSeconds.toString(),
          serialized,
        ]);
        return result.result === 'OK';
      } else {
        // Fallback to memory cache
        return this.memoryCache.set(key, value, ttlSeconds);
      }
    } catch (error) {
      console.warn('Redis SET failed, using memory cache:', error);
      return this.memoryCache.set(key, value, ttlSeconds);
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(['GET', key]);
        if (result.result === null) return null;
        return JSON.parse(result.result);
      } else {
        // Fallback to memory cache
        return this.memoryCache.get(key);
      }
    } catch (error) {
      console.warn('Redis GET failed, using memory cache:', error);
      return this.memoryCache.get(key);
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(['DEL', key]);
        return result.result > 0;
      } else {
        // Fallback to memory cache
        return this.memoryCache.del(key);
      }
    } catch (error) {
      console.warn('Redis DEL failed, using memory cache:', error);
      return this.memoryCache.del(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(['EXISTS', key]);
        return result.result > 0;
      } else {
        // Fallback to memory cache
        return this.memoryCache.exists(key);
      }
    } catch (error) {
      console.warn('Redis EXISTS failed, using memory cache:', error);
      return this.memoryCache.exists(key);
    }
  }

  async ping(): Promise<boolean> {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(['PING']);
        return result.result === 'PONG';
      } else {
        return true; // Memory cache is always "available"
      }
    } catch (error) {
      console.warn('Redis PING failed:', error);
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(['INCR', key]);
        return result.result;
      } else {
        // Simple increment for memory cache
        const current = this.memoryCache.get(key) || 0;
        const newValue = current + 1;
        this.memoryCache.set(key, newValue, 3600);
        return newValue;
      }
    } catch (error) {
      console.warn('Redis INCR failed, using memory cache:', error);
      const current = this.memoryCache.get(key) || 0;
      const newValue = current + 1;
      this.memoryCache.set(key, newValue, 3600);
      return newValue;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      if (this.enabled) {
        const result = await this.makeRedisRequest(['EXPIRE', key, ttlSeconds.toString()]);
        return result.result === 1;
      } else {
        // For memory cache, we need to get and re-set with new TTL
        const value = this.memoryCache.get(key);
        if (value !== null) {
          return this.memoryCache.set(key, value, ttlSeconds);
        }
        return false;
      }
    } catch (error) {
      console.warn('Redis EXPIRE failed:', error);
      return false;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getStats(): { enabled: boolean; type: string; size?: number } {
    return {
      enabled: this.enabled,
      type: this.enabled ? 'redis' : 'memory',
      size: this.enabled ? undefined : this.memoryCache.size(),
    };
  }
}
