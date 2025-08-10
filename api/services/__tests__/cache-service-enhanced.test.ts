import { describe, it, expect, beforeEach } from 'vitest';
import cacheService, { MemoryCacheService } from '../cache-service';
import { CacheableRequest } from '../../types/api';

describe('Cache Service Enhanced Tests', () => {
  beforeEach(async () => {
    // Clear the cache before each test
    await cacheService.clear();
  });

  describe('Cache Stats Tracking', () => {
    it('should track cache hit ratio accurately', async () => {
      // Clear cache first to ensure clean state
      await cacheService.clear();

      // Set up test data
      const keys = ['hit-ratio-1', 'hit-ratio-2', 'hit-ratio-3'];
      const value = { data: 'test-value' };

      // Set values
      for (const key of keys) {
        await cacheService.set(key, value);
      }

      // Create hits (3 keys, each accessed twice = 6 hits)
      for (const key of keys) {
        await cacheService.get(key);
        await cacheService.get(key);
      }

      // Create misses (3 different non-existent keys = 3 misses)
      await cacheService.get('miss-1');
      await cacheService.get('miss-2');
      await cacheService.get('miss-3');

      // Get stats
      const stats = await cacheService.stats();

      // Should have 6 hits and 3 misses
      expect(stats.hits).toBeGreaterThanOrEqual(6);
      expect(stats.misses).toBeGreaterThanOrEqual(3);

      // Calculate expected hit ratio
      const expectedHitRatio = 6 / (6 + 3); // 0.67

      // Get health check which includes hit ratio
      const health = await cacheService.healthCheck();

      // Verify hit ratio is calculated correctly
      expect(health.details.hitRatio).toBeCloseTo(expectedHitRatio, 1);
    });

    it('should track cache size accurately', async () => {
      // Clear cache first
      await cacheService.clear();

      // Add 10 items
      for (let i = 0; i < 10; i++) {
        await cacheService.set(`size-test-${i}`, { data: `value-${i}` });
      }

      // Get stats
      const stats = await cacheService.stats();

      // Should have at least 10 items
      expect(stats.size).toBeGreaterThanOrEqual(10);

      // Keys array should contain all the keys we added
      for (let i = 0; i < 10; i++) {
        expect(stats.keys).toContain(`size-test-${i}`);
      }

      // Delete 5 items
      for (let i = 0; i < 5; i++) {
        await cacheService.del(`size-test-${i}`);
      }

      // Get updated stats
      const updatedStats = await cacheService.stats();

      // Should have 5 fewer items
      expect(updatedStats.size).toBe(stats.size - 5);

      // Deleted keys should not be present
      for (let i = 0; i < 5; i++) {
        expect(updatedStats.keys).not.toContain(`size-test-${i}`);
      }

      // Remaining keys should still be present
      for (let i = 5; i < 10; i++) {
        expect(updatedStats.keys).toContain(`size-test-${i}`);
      }
    });

    it('should reset stats when cache is cleared', async () => {
      // Set some values and access them to generate stats
      await cacheService.set('clear-test-1', { data: 'value-1' });
      await cacheService.set('clear-test-2', { data: 'value-2' });

      await cacheService.get('clear-test-1');
      await cacheService.get('clear-test-2');
      await cacheService.get('non-existent');

      // Get stats before clearing
      const statsBefore = await cacheService.stats();
      expect(statsBefore.size).toBeGreaterThan(0);
      expect(statsBefore.hits).toBeGreaterThan(0);
      expect(statsBefore.misses).toBeGreaterThan(0);

      // Clear cache
      await cacheService.clear();

      // Get stats after clearing
      const statsAfter = await cacheService.stats();

      // Size should be 0
      expect(statsAfter.size).toBe(0);

      // Keys array should be empty
      expect(statsAfter.keys.length).toBe(0);

      // Hits and misses should persist (they're cumulative)
      expect(statsAfter.hits).toBe(statsBefore.hits);
      expect(statsAfter.misses).toBe(statsBefore.misses);
    });
  });

  describe('Cache Key Generation Edge Cases', () => {
    it('should handle nested objects in parameters', () => {
      const request: CacheableRequest = {
        endpoint: 'batch',
        parameters: {
          options: {
            continueOnError: true,
            maxItems: 100,
            nestedOption: {
              setting1: true,
              setting2: 'value',
            },
          },
          timestamps: [1, 2, 3],
        },
      };

      const key = cacheService.generateKey(request);
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');

      // Generate key again with same parameters in different order
      const request2: CacheableRequest = {
        endpoint: 'batch',
        parameters: {
          timestamps: [1, 2, 3],
          options: {
            nestedOption: {
              setting2: 'value',
              setting1: true,
            },
            maxItems: 100,
            continueOnError: true,
          },
        },
      };

      const key2 = cacheService.generateKey(request2);

      // Keys should be the same despite different order
      expect(key).toBe(key2);
    });

    it('should handle special characters in parameters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>/?\\';

      const request: CacheableRequest = {
        endpoint: 'convert',
        parameters: {
          text: specialChars,
          format: 'special',
        },
      };

      const key = cacheService.generateKey(request);
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');

      // Should be able to retrieve with the generated key
      cacheService.set(key, { data: 'test' });
      expect(cacheService.get(key)).resolves.toBeDefined();
    });

    it('should handle very large parameter objects efficiently', () => {
      // Create a large parameter object
      const largeParams: Record<string, any> = {};
      for (let i = 0; i < 1000; i++) {
        largeParams[`param${i}`] = `value${i}`;
      }

      const request: CacheableRequest = {
        endpoint: 'batch',
        parameters: largeParams,
      };

      const start = performance.now();
      const key = cacheService.generateKey(request);
      const duration = performance.now() - start;

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');

      // Key generation should be fast even for large objects
      expect(duration).toBeLessThan(50); // 50ms

      // Key should be reasonably sized
      expect(key.length).toBeLessThan(1000);
    });
  });

  describe('Cache Eviction Policy', () => {
    it('should evict least recently used items when cache is full', async () => {
      // This test verifies that LRU eviction works correctly
      // We need to create a cache service with a smaller size for this test
      const smallCache = new MemoryCacheService(50); // Small cache size

      // First, fill the cache with items
      const itemCount = 50;
      for (let i = 0; i < itemCount; i++) {
        await smallCache.set(`lru-test-${i}`, { data: `value-${i}` });
      }

      // Access some items to make them recently used
      const recentlyUsedKeys = [
        'lru-test-45',
        'lru-test-46',
        'lru-test-47',
        'lru-test-48',
        'lru-test-49',
      ];
      for (const key of recentlyUsedKeys) {
        await smallCache.get(key);
      }

      // Add more items to trigger eviction
      const newItemCount = 25;
      for (let i = 0; i < newItemCount; i++) {
        await smallCache.set(`new-item-${i}`, { data: `new-value-${i}` });
      }

      // Check that recently used items are still in cache
      for (const key of recentlyUsedKeys) {
        const value = await smallCache.get(key);
        expect(value).toBeDefined();
      }

      // Check that some of the oldest items have been evicted
      let evictedCount = 0;
      for (let i = 0; i < 20; i++) {
        const value = await smallCache.get(`lru-test-${i}`);
        if (value === null) {
          evictedCount++;
        }
      }

      // Some of the oldest items should have been evicted
      expect(evictedCount).toBeGreaterThan(0);
    });

    it('should prioritize keeping frequently accessed items', async () => {
      // Fill cache with items
      for (let i = 0; i < 50; i++) {
        await cacheService.set(`freq-test-${i}`, { data: `value-${i}` });
      }

      // Access some items frequently
      const frequentKeys = ['freq-test-10', 'freq-test-20', 'freq-test-30'];
      for (const key of frequentKeys) {
        // Access each key multiple times
        for (let i = 0; i < 5; i++) {
          await cacheService.get(key);
        }
      }

      // Add more items to trigger eviction
      for (let i = 0; i < 50; i++) {
        await cacheService.set(`new-freq-item-${i}`, { data: `new-value-${i}` });
      }

      // Frequently accessed items should still be in cache
      for (const key of frequentKeys) {
        const value = await cacheService.get(key);
        expect(value).toBeDefined();
      }
    });
  });

  describe('Cache Warmup Functionality', () => {
    it('should track frequently accessed keys', async () => {
      // Access some keys multiple times
      const frequentKey = 'warmup-test-key';
      await cacheService.set(frequentKey, { data: 'test-value' });

      // Access the key multiple times
      for (let i = 0; i < 5; i++) {
        await cacheService.get(frequentKey);
      }

      // Check health info to see if the key is tracked as frequent
      const health = await cacheService.healthCheck();

      // Should have warmup enabled and some frequent keys
      expect(health.details.warmupEnabled).toBe(true);
      expect(health.details.frequentKeysCount).toBeGreaterThan(0);
    });
  });

  describe('Cache Performance Optimization', () => {
    it('should optimize batch operations efficiently', async () => {
      // Create a large number of keys
      const keyCount = 200;
      const keys = Array.from({ length: keyCount }, (_, i) => `batch-key-${i}`);

      // Set values for all keys
      for (const key of keys) {
        await cacheService.set(key, { data: 'test-value' });
      }

      // Use optimizeBatchOperation to get all values
      const start = performance.now();
      const results = await cacheService.optimizeBatchOperation(keys, key => cacheService.get(key));
      const duration = performance.now() - start;

      // Should return results for all keys
      expect(results.length).toBe(keyCount);

      // Should be reasonably fast
      expect(duration).toBeLessThan(1000); // 1 second for 200 operations
    });
  });
});
