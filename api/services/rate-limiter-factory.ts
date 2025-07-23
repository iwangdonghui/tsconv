import { RateLimiter } from '../types/api';
import config from '../config/config';
import { UpstashRateLimiter, MemoryRateLimiter } from './upstash-rate-limiter';

/**
 * Factory function to create the appropriate rate limiter based on configuration
 */
export function createRateLimiter(): RateLimiter {
  // Only create rate limiter if rate limiting is enabled
  if (!config.rateLimiting.enabled) {
    console.log('⚠️ Rate limiting is disabled, using memory rate limiter');
    return new MemoryRateLimiter();
  }

  // Check if Upstash Redis should be used
  if (config.caching.redis.useUpstash && 
      (process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_TOKEN)) {
    
    console.log('🚀 Initializing Upstash Redis rate limiter');
    return new UpstashRateLimiter();
  }
  
  // Check if traditional Redis should be used
  if (config.caching.redis.url && 
      config.caching.redis.url !== 'redis://localhost:6379') {
    
    console.log('⚠️ Traditional Redis configuration detected but not implemented yet');
    console.log('🔄 Falling back to memory rate limiter');
    return new MemoryRateLimiter();
  }
  
  // Default to memory rate limiter
  console.log('💾 Using memory rate limiter');
  return new MemoryRateLimiter();
}

/**
 * Singleton rate limiter instance
 */
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get the singleton rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = createRateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Reset the rate limiter instance (useful for testing)
 */
export function resetRateLimiter(): void {
  rateLimiterInstance = null;
}

/**
 * Get rate limiter health information
 */
export async function getRateLimiterHealth(): Promise<{
  status: string;
  type: string;
  details: any;
}> {
  const limiter = getRateLimiter();
  
  // Check if the limiter has a healthCheck method (Upstash implementation)
  if ('healthCheck' in limiter && typeof limiter.healthCheck === 'function') {
    return (limiter as any).healthCheck();
  }
  
  // Fallback for memory rate limiter
  return {
    status: 'healthy',
    type: 'memory-rate-limiter',
    details: {
      enabled: config.rateLimiting.enabled,
      rules: config.rateLimiting.rules,
      fallbackActive: true
    }
  };
}

// Export the default instance for backward compatibility
export default getRateLimiter();