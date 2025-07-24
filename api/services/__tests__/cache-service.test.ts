import { describe, it, expect, beforeEach } from 'vitest';
import cacheService from '../cache-service.js';
import { CacheableRequest } from '../../types/api.js';

describe('Cache Service', () => {
  
  beforeEach(async () => {
    // Clear the cache before each test
    await cacheService.clear();
  });

  describe('Basic Operations', () => {
    it('should set and get values correctly', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      await cacheService.set(key, value);
      const result = await cacheService.get<typeof value>(key);
      
      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should correctly check if a key exists', async () => {
      const key = 'exists-key';
      const value = { data: 'test-value' };
      
      await cacheService.set(key, value);
      const exists = await cacheService.exists(key);
      
      expect(exists).toBe(true);
      
      const nonExistentExists = await cacheService.exists('non-existent-key');
      expect(nonExistentExists).toBe(false);
    });

    it('should delete keys correctly', async () => {
      const key = 'delete-key';
      const value = { data: 'test-value' };
      
      await cacheService.set(key, value);
      await cacheService.del(key);
      
      const result = await cacheService.get(key);
      expect(result).toBeNull();
    });
  });

  describe('TTL and Expiration', () => {
    it('should respect TTL settings', async () => {
      const key = 'ttl-key';
      const value = { data: 'expires-soon' };
      
      // Set with a very short TTL (10ms)
      await cacheService.set(key, value, 10);
      
      // Should exist immediately
      let result = await cacheService.get<typeof value>(key);
      expect(result).toEqual(value);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Should be expired now
      result = await cacheService.get<typeof value>(key);
      expect(result).toBeNull();
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const request1: CacheableRequest = {
        endpoint: 'convert',
        parameters: { timestamp: 1234567890, format: 'iso8601' }
      };
      
      const request2: CacheableRequest = {
        endpoint: 'convert',
        parameters: { format: 'iso8601', timestamp: 1234567890 }
      };
      
      // Different order of parameters should result in the same key
      const key1 = cacheService.generateKey(request1);
      const key2 = cacheService.generateKey(request2);
      
      expect(key1).toEqual(key2);
    });
    
    it('should generate different keys for different endpoints', () => {
      const request1: CacheableRequest = {
        endpoint: 'convert',
        parameters: { timestamp: 1234567890 }
      };
      
      const request2: CacheableRequest = {
        endpoint: 'batch',
        parameters: { timestamp: 1234567890 }
      };
      
      const key1 = cacheService.generateKey(request1);
      const key2 = cacheService.generateKey(request2);
      
      expect(key1).not.toEqual(key2);
    });
    
    it('should include userId in the cache key when provided', () => {
      const request1: CacheableRequest = {
        endpoint: 'convert',
        parameters: { timestamp: 1234567890 },
        userId: 'user123'
      };
      
      const request2: CacheableRequest = {
        endpoint: 'convert',
        parameters: { timestamp: 1234567890 },
        userId: 'user456'
      };
      
      const key1 = cacheService.generateKey(request1);
      const key2 = cacheService.generateKey(request2);
      
      expect(key1).not.toEqual(key2);
    });
  });

  describe('Cache Stats', () => {
    it('should track cache statistics correctly', async () => {
      const key1 = 'stats-key-1';
      const key2 = 'stats-key-2';
      const value1 = { data: 'value1' };
      const value2 = { data: 'value2' };
      
      // Set some values
      await cacheService.set(key1, value1);
      await cacheService.set(key2, value2);
      
      // Get some values (hits)
      await cacheService.get(key1);
      await cacheService.get(key2);
      
      // Try to get non-existent key (miss)
      await cacheService.get('non-existent');
      
      const stats = await cacheService.stats();
      
      expect(stats.hits).toBeGreaterThanOrEqual(2);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
      expect(stats.size).toBeGreaterThanOrEqual(2);
      expect(stats.keys).toContain(key1);
      expect(stats.keys).toContain(key2);
      expect(Array.isArray(stats.keys)).toBe(true);
    });
    
    it('should track hit ratio correctly', async () => {
      // Clear cache first
      await cacheService.clear();
      
      const key = 'hit-ratio-key';
      const value = { data: 'test' };
      
      // Set a value
      await cacheService.set(key, value);
      
      // Get it multiple times (hits)
      await cacheService.get(key);
      await cacheService.get(key);
      await cacheService.get(key);
      
      // Try non-existent keys (misses)
      await cacheService.get('miss1');
      await cacheService.get('miss2');
      
      const stats = await cacheService.stats();
      
      // Should have at least 3 hits and 2 misses
      expect(stats.hits).toBeGreaterThanOrEqual(3);
      expect(stats.misses).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Cache Performance', () => {
    it('should handle multiple concurrent operations', async () => {
      const operations = [];
      const keyPrefix = 'concurrent-';
      
      // Create 100 concurrent set operations
      for (let i = 0; i < 100; i++) {
        operations.push(cacheService.set(`${keyPrefix}${i}`, { index: i }));
      }
      
      await Promise.all(operations);
      
      // Verify all keys were set
      for (let i = 0; i < 100; i++) {
        const result = await cacheService.get<{ index: number }>(`${keyPrefix}${i}`);
        expect(result).toEqual({ index: i });
      }
    });
    
    it('should handle large number of concurrent operations efficiently', async () => {
      const operations = [];
      const keyPrefix = 'perf-';
      
      // Create 200 concurrent operations (mix of sets and gets)
      for (let i = 0; i < 100; i++) {
        operations.push(cacheService.set(`${keyPrefix}${i}`, { index: i }));
      }
      
      for (let i = 0; i < 100; i++) {
        operations.push(cacheService.get(`${keyPrefix}${i}`));
      }
      
      const start = performance.now();
      await Promise.all(operations);
      const end = performance.now();
      
      // Should complete within reasonable time (2 seconds)
      expect(end - start).toBeLessThan(2000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', async () => {
      await cacheService.set('null-key', null);
      const nullResult = await cacheService.get('null-key');
      expect(nullResult).toBeNull();
      
      // Test undefined value handling
      await cacheService.set('undefined-key', undefined);
      const undefinedResult = await cacheService.get('undefined-key');
      // undefined should be stored and retrieved as undefined
      expect(undefinedResult).toBeUndefined();
    });
    
    it('should handle complex objects', async () => {
      const complexObject = {
        nested: {
          array: [1, 2, 3],
          map: new Map([['key', 'value']]),
          date: new Date(),
          regex: /test/,
          func: function() { return 'test'; }
        }
      };
      
      await cacheService.set('complex-key', complexObject);
      const result = await cacheService.get('complex-key');
      
      // Functions and some complex types won't be preserved in JSON serialization
      expect(result).toHaveProperty('nested.array');
      expect((result as any).nested.array).toEqual([1, 2, 3]);
      expect(result).toHaveProperty('nested.date');
      // Map and function won't be preserved as is
    });
    
    it('should handle very large values', async () => {
      const largeValue = {
        data: 'x'.repeat(10000), // 10KB string
        array: new Array(1000).fill(0).map((_, i) => ({ id: i, value: `item-${i}` }))
      };
      
      await cacheService.set('large-key', largeValue);
      const result = await cacheService.get<typeof largeValue>('large-key');
      
      expect(result?.data.length).toBe(10000);
      expect(result?.array.length).toBe(1000);
      expect(result?.array[999].id).toBe(999);
    });
    
    it('should handle empty strings and arrays', async () => {
      await cacheService.set('empty-string', '');
      await cacheService.set('empty-array', []);
      await cacheService.set('empty-object', {});
      
      const emptyString = await cacheService.get<string>('empty-string');
      const emptyArray = await cacheService.get<any[]>('empty-array');
      const emptyObject = await cacheService.get<Record<string, any>>('empty-object');
      
      expect(emptyString).toBe('');
      expect(emptyArray).toEqual([]);
      expect(emptyObject).toEqual({});
    });
    
    it('should handle special characters in keys', async () => {
      const specialKeys = [
        'key:with:colons',
        'key|with|pipes',
        'key with spaces',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key/with/slashes'
      ];
      
      for (const key of specialKeys) {
        await cacheService.set(key, { originalKey: key });
        const result = await cacheService.get<{ originalKey: string }>(key);
        expect(result?.originalKey).toBe(key);
      }
    });
    
    it('should handle cache overflow with LRU eviction', async () => {
      // This test verifies LRU eviction behavior
      // We'll create entries and verify that LRU logic works
      const entries = [];
      
      // Create a reasonable number of entries
      for (let i = 0; i < 50; i++) {
        const key = `overflow-key-${i}`;
        const value = { index: i, data: 'x'.repeat(1000) }; // Larger values to trigger size limits
        entries.push({ key, value });
        await cacheService.set(key, value);
      }
      
      // Access some keys to make them "recently used"
      await cacheService.get('overflow-key-45');
      await cacheService.get('overflow-key-46');
      await cacheService.get('overflow-key-47');
      await cacheService.get('overflow-key-48');
      await cacheService.get('overflow-key-49');
      
      // Add more entries to potentially trigger eviction
      for (let i = 50; i < 100; i++) {
        const key = `overflow-key-${i}`;
        const value = { index: i, data: 'x'.repeat(1000) };
        await cacheService.set(key, value);
      }
      
      // The most recently added and accessed items should still be present
      const recentItem = await cacheService.get<{ index: number; data: string }>('overflow-key-99');
      expect(recentItem).toBeDefined();
      expect(recentItem?.index).toBe(99);
      
      // Recently accessed items should still be present
      const accessedItem = await cacheService.get<{ index: number; data: string }>('overflow-key-49');
      expect(accessedItem).toBeDefined();
      expect(accessedItem?.index).toBe(49);
    });
    
    it('should handle rapid TTL expiration', async () => {
      const key = 'rapid-expire';
      const value = { data: 'expires-fast' };
      
      // Set with 1ms TTL
      await cacheService.set(key, value, 1);
      
      // Should exist immediately
      let result = await cacheService.get(key);
      expect(result).toEqual(value);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Should be expired
      result = await cacheService.get(key);
      expect(result).toBeNull();
    });
    
    it('should handle concurrent access to the same key', async () => {
      const key = 'concurrent-key';
      const operations = [];
      
      // Create 50 concurrent operations on the same key
      for (let i = 0; i < 25; i++) {
        operations.push(cacheService.set(key, { value: i }));
        operations.push(cacheService.get(key));
      }
      
      // Should not throw errors
      await expect(Promise.all(operations)).resolves.toBeDefined();
      
      // Key should exist after all operations
      const finalResult = await cacheService.get<{ value: number }>(key);
      expect(finalResult).toBeDefined();
    });
  });
  
  describe('Cache Clear Operations', () => {
    it('should clear all cache entries', async () => {
      // Set multiple values
      await cacheService.set('clear-key-1', { data: 'value1' });
      await cacheService.set('clear-key-2', { data: 'value2' });
      await cacheService.set('clear-key-3', { data: 'value3' });
      
      // Verify they exist
      expect(await cacheService.exists('clear-key-1')).toBe(true);
      expect(await cacheService.exists('clear-key-2')).toBe(true);
      expect(await cacheService.exists('clear-key-3')).toBe(true);
      
      // Clear all
      await cacheService.clear();
      
      // Verify they're gone
      expect(await cacheService.exists('clear-key-1')).toBe(false);
      expect(await cacheService.exists('clear-key-2')).toBe(false);
      expect(await cacheService.exists('clear-key-3')).toBe(false);
    });
    
    it('should clear cache entries by pattern', async () => {
      // Set values with different patterns
      await cacheService.set('user:123:profile', { name: 'John' });
      await cacheService.set('user:456:profile', { name: 'Jane' });
      await cacheService.set('session:abc123', { token: 'xyz' });
      await cacheService.set('session:def456', { token: 'uvw' });
      
      // Clear only user entries
      await cacheService.clear('user:.*');
      
      // User entries should be gone
      expect(await cacheService.exists('user:123:profile')).toBe(false);
      expect(await cacheService.exists('user:456:profile')).toBe(false);
      
      // Session entries should remain
      expect(await cacheService.exists('session:abc123')).toBe(true);
      expect(await cacheService.exists('session:def456')).toBe(true);
    });
  });
  
  describe('Cache Health Check', () => {
    it('should provide health check information', async () => {
      const health = await cacheService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.type).toBe('memory');
      expect(health.details).toBeDefined();
      expect(health.details.cacheType).toContain('memory');
      expect(typeof health.details.size).toBe('number');
      expect(typeof health.details.maxSize).toBe('number');
      expect(typeof health.details.hits).toBe('number');
      expect(typeof health.details.misses).toBe('number');
      expect(typeof health.details.hitRatio).toBe('number');
    });
  });
  
  describe('Cache Key Generation Edge Cases', () => {
    it('should handle parameters with null and undefined values', () => {
      const request: CacheableRequest = {
        endpoint: 'convert',
        parameters: {
          timestamp: 1234567890,
          format: null,
          timezone: undefined,
          options: { includeMetadata: true }
        }
      };
      
      const key = cacheService.generateKey(request);
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });
    
    it('should handle large parameter objects efficiently', () => {
      const largeParams: Record<string, any> = {};
      for (let i = 0; i < 20; i++) {
        largeParams[`param${i}`] = `value${i}`;
      }
      
      const request: CacheableRequest = {
        endpoint: 'batch',
        parameters: largeParams
      };
      
      const key = cacheService.generateKey(request);
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      // For large parameter sets, should use hash-based approach
      expect(key.length).toBeLessThan(200); // Should be compact
    });
    
    it('should handle arrays in parameters', () => {
      const request: CacheableRequest = {
        endpoint: 'batch',
        parameters: {
          timestamps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Large array
          formats: ['iso8601', 'unix'],
          options: { continueOnError: true }
        }
      };
      
      const key = cacheService.generateKey(request);
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      // Should handle large arrays efficiently
      expect(key).toContain('[10items]'); // Should use compact representation
    });
  });
});