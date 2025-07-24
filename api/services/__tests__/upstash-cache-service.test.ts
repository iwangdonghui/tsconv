import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UpstashCacheService } from '../upstash-cache-service.js';

// Mock Upstash Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    flushdb: vi.fn(),
    scan: vi.fn(),
    info: vi.fn(),
    dbsize: vi.fn(),
    mget: vi.fn(),
    pipeline: vi.fn().mockReturnValue({
      setex: vi.fn(),
      exec: vi.fn().mockResolvedValue([])
    })
  }))
}));

describe('UpstashCacheService', () => {
  let cacheService: UpstashCacheService;
  let mockRedis: any;

  beforeEach(() => {
    // Reset environment variables
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    
    cacheService = new UpstashCacheService();
    mockRedis = (cacheService as any).redis;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  describe('Basic Operations', () => {
    it('should initialize with Upstash Redis client', () => {
      expect(mockRedis).toBeDefined();
    });

    it('should set and get values correctly when connected', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      // Mock successful connection
      (cacheService as any).isConnected = true;
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(value);
      
      await cacheService.set(key, value);
      const result = await cacheService.get<typeof value>(key);
      
      expect(mockRedis.setex).toHaveBeenCalledWith(key, 300, JSON.stringify(value));
      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      (cacheService as any).isConnected = true;
      mockRedis.get.mockResolvedValue(null);
      
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should check if key exists correctly', async () => {
      (cacheService as any).isConnected = true;
      mockRedis.exists.mockResolvedValue(1);
      
      const exists = await cacheService.exists('test-key');
      expect(exists).toBe(true);
      
      mockRedis.exists.mockResolvedValue(0);
      const notExists = await cacheService.exists('non-existent-key');
      expect(notExists).toBe(false);
    });

    it('should delete keys correctly', async () => {
      (cacheService as any).isConnected = true;
      mockRedis.del.mockResolvedValue(1);
      
      await cacheService.del('test-key');
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to memory cache when Redis is disconnected', async () => {
      (cacheService as any).isConnected = false;
      
      const key = 'fallback-key';
      const value = { data: 'fallback-value' };
      
      await cacheService.set(key, value);
      const result = await cacheService.get<typeof value>(key);
      
      expect(result).toEqual(value);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should fallback when Redis operations fail', async () => {
      (cacheService as any).isConnected = true;
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      
      const key = 'error-key';
      const value = { data: 'error-value' };
      
      // Set in fallback cache first
      (cacheService as any).fallbackCache.set(key, value);
      
      const result = await cacheService.get<typeof value>(key);
      expect(result).toEqual(value);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when connected', async () => {
      (cacheService as any).isConnected = true;
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info.mockResolvedValue('redis_version:6.2.0\nuptime_in_seconds:3600');
      
      const health = await cacheService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.type).toBe('upstash-redis');
      expect(health.details.connection).toBe('active');
    });

    it('should return degraded status when disconnected', async () => {
      (cacheService as any).isConnected = false;
      
      const health = await cacheService.healthCheck();
      
      expect(health.status).toBe('degraded');
      expect(health.type).toBe('memory-fallback');
      expect(health.details.redisStatus).toBe('disconnected');
    });

    it('should return unhealthy status on error', async () => {
      (cacheService as any).isConnected = true;
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));
      
      const health = await cacheService.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.type).toBe('upstash-redis');
    });
  });

  describe('Statistics', () => {
    it('should return Redis statistics when connected', async () => {
      (cacheService as any).isConnected = true;
      mockRedis.info.mockResolvedValue('used_memory:1048576');
      mockRedis.dbsize.mockResolvedValue(10);
      mockRedis.scan.mockResolvedValue([0, ['key1', 'key2', 'key3']]);
      
      const stats = await cacheService.stats();
      
      expect(stats.size).toBe(10);
      expect(stats.memoryUsed).toBe(1048576);
      expect(stats.keys).toEqual(['key1', 'key2', 'key3']);
    });

    it('should fallback to memory stats when Redis fails', async () => {
      (cacheService as any).isConnected = false;
      
      const stats = await cacheService.stats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
    });
  });

  describe('Batch Operations', () => {
    it('should perform batch get operations', async () => {
      (cacheService as any).isConnected = true;
      const keys = ['key1', 'key2', 'key3'];
      const values = ['value1', 'value2', null];
      
      mockRedis.mget.mockResolvedValue(values);
      
      const results = await cacheService.mget<string>(keys);
      
      expect(mockRedis.mget).toHaveBeenCalledWith(...keys);
      expect(results).toEqual(values);
    });

    it('should perform batch set operations', async () => {
      (cacheService as any).isConnected = true;
      const keyValuePairs = [
        { key: 'key1', value: 'value1', ttl: 300000 },
        { key: 'key2', value: 'value2', ttl: 600000 }
      ];
      
      const mockPipeline = {
        setex: vi.fn(),
        exec: vi.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);
      
      await cacheService.mset(keyValuePairs);
      
      expect(mockPipeline.setex).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    it('should provide connection status', async () => {
      const status = await cacheService.getConnectionStatus();
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('attempts');
      expect(typeof status.connected).toBe('boolean');
      expect(typeof status.attempts).toBe('number');
    });

    it('should allow forced reconnection', async () => {
      const testConnectionSpy = vi.spyOn(cacheService as any, 'testConnection');
      
      await cacheService.forceReconnect();
      
      expect(testConnectionSpy).toHaveBeenCalled();
    });
  });

  describe('Clear Operations', () => {
    it('should clear all keys when no pattern provided', async () => {
      (cacheService as any).isConnected = true;
      mockRedis.flushdb.mockResolvedValue('OK');
      
      await cacheService.clear();
      
      expect(mockRedis.flushdb).toHaveBeenCalled();
    });

    it('should clear keys matching pattern', async () => {
      (cacheService as any).isConnected = true;
      const pattern = 'test:*';
      const matchingKeys = ['test:key1', 'test:key2'];
      
      // Mock scan to return matching keys
      vi.spyOn(cacheService as any, 'scanKeys').mockResolvedValue(matchingKeys);
      mockRedis.del.mockResolvedValue(2);
      
      await cacheService.clear(pattern);
      
      expect(mockRedis.del).toHaveBeenCalledWith(...matchingKeys);
    });
  });

  describe('Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const request1 = {
        endpoint: 'convert',
        parameters: { timestamp: 1234567890, format: 'iso8601' },
        userId: 'user123'
      };
      
      const request2 = {
        endpoint: 'convert',
        parameters: { format: 'iso8601', timestamp: 1234567890 },
        userId: 'user123'
      };
      
      const key1 = cacheService.generateKey(request1);
      const key2 = cacheService.generateKey(request2);
      
      expect(key1).toBe(key2);
    });
  });
});