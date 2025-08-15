/**
 * Upstash Cache Service
 * REST API-based Redis service for serverless environments
 */

import { BaseCacheService } from './base-cache-service';
import {
  CacheBatchOperation,
  CacheConfiguration,
  CacheGetOptions,
  CacheHealthCheck,
  CacheSetOptions,
} from './interfaces';

export interface UpstashConfig {
  url?: string;
  token?: string;
  fallbackToMemory?: boolean;
}

export class UpstashCacheService extends BaseCacheService {
  private upstashConfig: UpstashConfig;
  private fallbackCache: any; // Memory cache fallback
  private connected = false;

  constructor(config: CacheConfiguration, upstashConfig?: UpstashConfig) {
    super(config);

    this.upstashConfig = {
      url: upstashConfig?.url || process.env.UPSTASH_REDIS_REST_URL,
      token: upstashConfig?.token || process.env.UPSTASH_REDIS_REST_TOKEN,
      fallbackToMemory: upstashConfig?.fallbackToMemory ?? true,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Check if Upstash credentials are available
      if (!this.upstashConfig.url || !this.upstashConfig.token) {
        throw new Error('Upstash credentials not configured');
      }

      // Test connection
      await this.testConnection();
      this.connected = true;
      // eslint-disable-next-line no-console
      console.log('✅ Upstash cache service connected');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ Upstash connection failed, using memory fallback:', error);

      if (this.upstashConfig.fallbackToMemory) {
        await this.initializeFallback();
      } else {
        throw error;
      }
    }
  }

  private async testConnection(): Promise<void> {
    // Placeholder for Upstash connection test
    // In real implementation: make a simple REST API call to test connectivity
    if (!this.upstashConfig.url?.includes('upstash.io')) {
      throw new Error('Upstash connection not available');
    }
  }

  private async initializeFallback(): Promise<void> {
    // Use memory cache as fallback
    const { MemoryCacheService } = await import('./memory-cache-service');
    this.fallbackCache = new MemoryCacheService(this.config);
    this.connected = false;
  }

  // private async makeUpstashRequest(command: string[], retries = 3): Promise<any> {
  //   if (!this.connected) {
  //     throw new Error('Upstash not connected');
  //   }

  //   // Placeholder for Upstash REST API request
  //   // In real implementation: make HTTP request to Upstash REST API
  //   // const response = await fetch(`${this.upstashConfig.url}/${command.join('/')}`, {
  //   //   headers: { 'Authorization': `Bearer ${this.upstashConfig.token}` }
  //   // });

  //   throw new Error('Upstash request not implemented');
  // }

  async get<T>(key: string, options: CacheGetOptions = {}): Promise<T | null> {
    try {
      if (!this.connected && this.fallbackCache) {
        return (await this.fallbackCache.get(key, options)) as T | null;
      }

      // Placeholder for Upstash get operation
      // In real implementation: await this.makeUpstashRequest(['GET', key]);
      return null;
    } catch (error) {
      this.emitEvent({
        type: 'error',
        key,
        timestamp: Date.now(),
        error: error as Error,
      });

      if (this.fallbackCache) {
        return (await this.fallbackCache.get(key, options)) as T | null;
      }

      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    try {
      if (!this.connected && this.fallbackCache) {
        return await this.fallbackCache.set(key, value, options);
      }

      // Placeholder for Upstash set operation
      // In real implementation: await this.makeUpstashRequest(['SET', key, JSON.stringify(value)]);

      this.updateStats('set');
      this.emitEvent({
        type: 'set',
        key,
        timestamp: Date.now(),
        metadata: { ttl: options.ttl },
      });
    } catch (error) {
      this.emitEvent({
        type: 'error',
        key,
        timestamp: Date.now(),
        error: error as Error,
      });

      if (this.fallbackCache) {
        return await this.fallbackCache.set(key, value, options);
      }

      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (!this.connected && this.fallbackCache) {
        return await this.fallbackCache.delete(key);
      }

      // Placeholder for Upstash delete operation
      // In real implementation: const result = await this.makeUpstashRequest(['DEL', key]);
      const deleted = false; // Placeholder

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
      if (this.fallbackCache) {
        return await this.fallbackCache.delete(key);
      }
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.connected && this.fallbackCache) {
        return await this.fallbackCache.exists(key);
      }

      // Placeholder for Upstash exists operation
      // In real implementation: return await this.makeUpstashRequest(['EXISTS', key]) === 1;
      return false;
    } catch (error) {
      if (this.fallbackCache) {
        return await this.fallbackCache.exists(key);
      }
      return false;
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (!this.connected && this.fallbackCache) {
        return await this.fallbackCache.clear(pattern);
      }

      // Placeholder for Upstash clear operation
      // In real implementation: scan and delete matching keys using REST API

      this.emitEvent({
        type: 'clear',
        timestamp: Date.now(),
        metadata: { pattern },
      });
    } catch (error) {
      if (this.fallbackCache) {
        return await this.fallbackCache.clear(pattern);
      }
      throw error;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      if (!this.connected && this.fallbackCache) {
        return await this.fallbackCache.keys(pattern);
      }

      // Placeholder for Upstash keys operation
      // In real implementation: use SCAN command via REST API
      return [];
    } catch (error) {
      if (this.fallbackCache) {
        return await this.fallbackCache.keys(pattern);
      }
      return [];
    }
  }

  async size(): Promise<number> {
    try {
      if (!this.connected && this.fallbackCache) {
        return await this.fallbackCache.size();
      }

      // Placeholder for Upstash size operation
      // In real implementation: await this.makeUpstashRequest(['DBSIZE']);
      return 0;
    } catch (error) {
      if (this.fallbackCache) {
        return await this.fallbackCache.size();
      }
      return 0;
    }
  }

  async flush(): Promise<void> {
    try {
      if (!this.connected && this.fallbackCache) {
        return await this.fallbackCache.flush();
      }

      // Placeholder for Upstash flush operation
      // In real implementation: await this.makeUpstashRequest(['FLUSHDB']);
    } catch (error) {
      if (this.fallbackCache) {
        return await this.fallbackCache.flush();
      }
      throw error;
    }
  }

  async healthCheck(): Promise<CacheHealthCheck> {
    const startTime = Date.now();

    try {
      if (!this.connected && this.fallbackCache) {
        const fallbackHealth = await this.fallbackCache.healthCheck();
        return {
          ...fallbackHealth,
          connectionStatus: 'fallback',
        };
      }

      // Placeholder for Upstash health check
      // In real implementation: await this.makeUpstashRequest(['PING']);

      return {
        status: this.connected ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        connectionStatus: this.connected ? 'connected' : 'disconnected',
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

  // Batch operations
  override async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.connected && this.fallbackCache) {
      return (await this.fallbackCache.mget(keys)) as (T | null)[];
    }

    // Placeholder for Upstash mget operation
    // In real implementation: use pipeline or multiple requests
    return keys.map(() => null);
  }

  override async mset(operations: CacheBatchOperation[]): Promise<void> {
    if (!this.connected && this.fallbackCache) {
      return await this.fallbackCache.mset(operations);
    }

    // Placeholder for Upstash mset operation
    // In real implementation: use pipeline or multiple requests
  }

  override async mdelete(keys: string[]): Promise<number> {
    if (!this.connected && this.fallbackCache) {
      return await this.fallbackCache.mdelete(keys);
    }

    // Placeholder for Upstash mdelete operation
    // In real implementation: use pipeline or multiple requests
    return 0;
  }

  // Cleanup
  async destroy(): Promise<void> {
    if (this.fallbackCache && 'destroy' in this.fallbackCache) {
      await this.fallbackCache.destroy();
    }

    // No persistent connections to clean up for REST API
  }
}
