/**
 * Rate Limit Strategy System
 * Provides flexible and configurable rate limiting strategies
 */

import { RateLimitRule, RateLimitResult } from '../../types/api';

export type RateLimitStrategyType = 
  | 'fixed-window'      // Traditional fixed time window
  | 'sliding-window'    // Sliding time window for smoother limiting
  | 'token-bucket'      // Token bucket algorithm for burst handling
  | 'leaky-bucket'      // Leaky bucket for steady rate limiting
  | 'adaptive'          // Adaptive rate limiting based on system load
  | 'tiered'            // Tiered limits based on user type/subscription
  | 'custom';           // Custom strategy implementation

export interface RateLimitStrategyConfig {
  type: RateLimitStrategyType;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  priority: number;
  enabled: boolean;
}

export interface RateLimitContext {
  identifier: string;
  userType?: 'anonymous' | 'authenticated' | 'premium' | 'admin';
  endpoint: string;
  method: string;
  userAgent?: string;
  country?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface RateLimitStrategyResult extends RateLimitResult {
  strategy: string;
  context: RateLimitContext;
  nextAllowedTime?: number;
  backoffMultiplier?: number;
  warnings?: string[];
}

/**
 * Base class for rate limiting strategies
 */
export abstract class BaseRateLimitStrategy {
  protected config: RateLimitStrategyConfig;
  protected metrics = new Map<string, {
    requests: number;
    blocked: number;
    lastReset: number;
    averageLatency: number;
  }>();

  constructor(config: RateLimitStrategyConfig) {
    this.config = config;
  }

  abstract checkLimit(context: RateLimitContext, rule: RateLimitRule): Promise<RateLimitStrategyResult>;
  abstract increment(context: RateLimitContext, rule: RateLimitRule): Promise<RateLimitStrategyResult>;
  abstract reset(identifier: string): Promise<void>;

  /**
   * Get strategy configuration
   */
  getConfig(): RateLimitStrategyConfig {
    return { ...this.config };
  }

  /**
   * Update strategy parameters
   */
  updateConfig(updates: Partial<RateLimitStrategyConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get strategy metrics
   */
  getMetrics(identifier?: string): Record<string, unknown> {
    if (identifier) {
      return this.metrics.get(identifier) || {};
    }
    
    const totalMetrics = {
      totalRequests: 0,
      totalBlocked: 0,
      averageLatency: 0,
      identifiers: this.metrics.size
    };

    for (const metric of this.metrics.values()) {
      totalMetrics.totalRequests += metric.requests;
      totalMetrics.totalBlocked += metric.blocked;
      totalMetrics.averageLatency += metric.averageLatency;
    }

    if (this.metrics.size > 0) {
      totalMetrics.averageLatency /= this.metrics.size;
    }

    return totalMetrics;
  }

  /**
   * Update metrics for an identifier
   */
  protected updateMetrics(identifier: string, blocked: boolean, latency: number = 0): void {
    const existing = this.metrics.get(identifier) || {
      requests: 0,
      blocked: 0,
      lastReset: Date.now(),
      averageLatency: 0
    };

    existing.requests++;
    if (blocked) existing.blocked++;
    existing.averageLatency = (existing.averageLatency + latency) / 2;

    this.metrics.set(identifier, existing);
  }

  /**
   * Clean up old metrics
   */
  protected cleanupMetrics(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, metric] of this.metrics.entries()) {
      if (now - metric.lastReset > maxAge) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.metrics.delete(key));
  }
}

/**
 * Fixed Window Strategy
 * Traditional rate limiting with fixed time windows
 */
export class FixedWindowStrategy extends BaseRateLimitStrategy {
  private windows = new Map<string, { count: number; resetTime: number }>();

  async checkLimit(context: RateLimitContext, rule: RateLimitRule): Promise<RateLimitStrategyResult> {
    const key = this.generateKey(context, rule);
    const now = Date.now();
    
    let window = this.windows.get(key);
    
    // Create new window if doesn't exist or expired
    if (!window || window.resetTime <= now) {
      window = { count: 0, resetTime: now + rule.window };
      this.windows.set(key, window);
    }

    const allowed = window.count < rule.limit;
    const remaining = Math.max(0, rule.limit - window.count);

    return {
      allowed,
      remaining,
      resetTime: window.resetTime,
      totalLimit: rule.limit,
      strategy: this.config.name,
      context
    };
  }

  async increment(context: RateLimitContext, rule: RateLimitRule): Promise<RateLimitStrategyResult> {
    const key = this.generateKey(context, rule);
    const now = Date.now();
    
    let window = this.windows.get(key);
    
    // Create new window if doesn't exist or expired
    if (!window || window.resetTime <= now) {
      window = { count: 1, resetTime: now + rule.window };
      this.windows.set(key, window);
      
      this.updateMetrics(context.identifier, false);
      
      return {
        allowed: true,
        remaining: rule.limit - 1,
        resetTime: window.resetTime,
        totalLimit: rule.limit,
        strategy: this.config.name,
        context
      };
    }

    // Increment count
    window.count++;
    const allowed = window.count <= rule.limit;
    const remaining = Math.max(0, rule.limit - window.count);

    this.updateMetrics(context.identifier, !allowed);

    return {
      allowed,
      remaining,
      resetTime: window.resetTime,
      totalLimit: rule.limit,
      strategy: this.config.name,
      context
    };
  }

  async reset(identifier: string): Promise<void> {
    // Remove all windows for this identifier
    const keysToDelete: string[] = [];
    for (const key of this.windows.keys()) {
      if (key.startsWith(`${identifier}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.windows.delete(key));
    this.metrics.delete(identifier);
  }

  private generateKey(context: RateLimitContext, rule: RateLimitRule): string {
    return `${context.identifier}:${rule.identifier}:${context.endpoint}`;
  }
}

/**
 * Sliding Window Strategy
 * More accurate rate limiting using sliding time windows
 */
export class SlidingWindowStrategy extends BaseRateLimitStrategy {
  private requests = new Map<string, number[]>(); // timestamps of requests

  async checkLimit(context: RateLimitContext, rule: RateLimitRule): Promise<RateLimitStrategyResult> {
    const key = this.generateKey(context, rule);
    const now = Date.now();
    const windowStart = now - rule.window;
    
    // Get and clean old requests
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    this.requests.set(key, validTimestamps);

    const currentCount = validTimestamps.length;
    const allowed = currentCount < rule.limit;
    const remaining = Math.max(0, rule.limit - currentCount);

    // Calculate next allowed time if blocked
    let nextAllowedTime: number | undefined;
    if (!allowed && validTimestamps.length > 0) {
      nextAllowedTime = validTimestamps[0] + rule.window;
    }

    return {
      allowed,
      remaining,
      resetTime: now + rule.window,
      totalLimit: rule.limit,
      strategy: this.config.name,
      context,
      nextAllowedTime
    };
  }

  async increment(context: RateLimitContext, rule: RateLimitRule): Promise<RateLimitStrategyResult> {
    const key = this.generateKey(context, rule);
    const now = Date.now();
    const windowStart = now - rule.window;
    
    // Get and clean old requests
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    
    // Add current request
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    const currentCount = validTimestamps.length;
    const allowed = currentCount <= rule.limit;
    const remaining = Math.max(0, rule.limit - currentCount);

    this.updateMetrics(context.identifier, !allowed);

    // Calculate next allowed time if blocked
    let nextAllowedTime: number | undefined;
    if (!allowed && validTimestamps.length > 1) {
      nextAllowedTime = validTimestamps[0] + rule.window;
    }

    return {
      allowed,
      remaining,
      resetTime: now + rule.window,
      totalLimit: rule.limit,
      strategy: this.config.name,
      context,
      nextAllowedTime
    };
  }

  async reset(identifier: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const key of this.requests.keys()) {
      if (key.startsWith(`${identifier}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.requests.delete(key));
    this.metrics.delete(identifier);
  }

  private generateKey(context: RateLimitContext, rule: RateLimitRule): string {
    return `${context.identifier}:${rule.identifier}:${context.endpoint}`;
  }
}

/**
 * Token Bucket Strategy
 * Allows bursts while maintaining average rate
 */
export class TokenBucketStrategy extends BaseRateLimitStrategy {
  private buckets = new Map<string, {
    tokens: number;
    lastRefill: number;
    capacity: number;
    refillRate: number;
  }>();

  async checkLimit(context: RateLimitContext, rule: RateLimitRule): Promise<RateLimitStrategyResult> {
    const key = this.generateKey(context, rule);
    const bucket = this.getBucket(key, rule);
    
    this.refillBucket(bucket);
    
    const allowed = bucket.tokens >= 1;
    const remaining = Math.floor(bucket.tokens);

    return {
      allowed,
      remaining,
      resetTime: Date.now() + rule.window,
      totalLimit: bucket.capacity,
      strategy: this.config.name,
      context
    };
  }

  async increment(context: RateLimitContext, rule: RateLimitRule): Promise<RateLimitStrategyResult> {
    const key = this.generateKey(context, rule);
    const bucket = this.getBucket(key, rule);
    
    this.refillBucket(bucket);
    
    const allowed = bucket.tokens >= 1;
    
    if (allowed) {
      bucket.tokens -= 1;
    }
    
    const remaining = Math.floor(bucket.tokens);
    this.updateMetrics(context.identifier, !allowed);

    return {
      allowed,
      remaining,
      resetTime: Date.now() + rule.window,
      totalLimit: bucket.capacity,
      strategy: this.config.name,
      context
    };
  }

  async reset(identifier: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const key of this.buckets.keys()) {
      if (key.startsWith(`${identifier}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.buckets.delete(key));
    this.metrics.delete(identifier);
  }

  private getBucket(key: string, rule: RateLimitRule) {
    let bucket = this.buckets.get(key);
    
    if (!bucket) {
      bucket = {
        tokens: rule.limit,
        lastRefill: Date.now(),
        capacity: rule.limit,
        refillRate: rule.limit / (rule.window / 1000) // tokens per second
      };
      this.buckets.set(key, bucket);
    }
    
    return bucket;
  }

  private refillBucket(bucket: { tokens: number; lastRefill: number; capacity: number; refillRate: number }): void {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * bucket.refillRate;
    
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  private generateKey(context: RateLimitContext, rule: RateLimitRule): string {
    return `${context.identifier}:${rule.identifier}:${context.endpoint}`;
  }
}
