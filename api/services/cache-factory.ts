import { CacheService } from '../types/api.js';
import config from '../config/config.js';
import { MemoryCacheService } from '../cache-service.js';
import { UpstashCacheService } from '../upstash-cache-service.js';

/**
 * Factory function to create the appropriate cache service based on configuration
 */
export function createCacheService(): CacheService {
  // Check if Upstash Redis should be used
  if (config.caching.redis.useUpstash && 
      (process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_TOKEN)) {
    
    console.log('🚀 Initializing Upstash Redis cache service');
    return new UpstashCacheService();
  }
  
  // Check if traditional Redis should be used
  if (config.caching.enabled && 
      config.caching.redis.url && 
      config.caching.redis.url !== 'redis://localhost:6379') {
    
    console.log('⚠️ Traditional Redis configuration detected but not implemented yet');
    console.log('🔄 Falling back to memory cache service');
    return new MemoryCacheService();
  }
  
  // Default to memory cache
  console.log('💾 Using memory cache service');
  return new MemoryCacheService();
}

/**
 * Singleton cache service instance
 */
let cacheServiceInstance: CacheService | null = null;

/**
 * Get the singleton cache service instance
 */
export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = createCacheService();
  }
  return cacheServiceInstance;
}

/**
 * Reset the cache service instance (useful for testing)
 */
export function resetCacheService(): void {
  cacheServiceInstance = null;
}

/**
 * Get cache service health information
 */
export async function getCacheServiceHealth(): Promise<{
  status: string;
  type: string;
  details: any;
}> {
  const service = getCacheService();
  return service.healthCheck();
}

// Export the default instance for backward compatibility
export default getCacheService();