/**
 * Memory-based rate limiter implementation
 */

import { RateLimiter, RateLimitRule, RateLimitResult, RateLimitStats } from '../types/api';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
}

export class MemoryRateLimiter implements RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async checkLimit(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier;
    const now = Date.now();
    
    let entry = this.requests.get(key);
    
    // If no entry exists or the window has expired, create a new one
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + rule.window
      };
      this.requests.set(key, entry);
    }
    
    const allowed = entry.count < rule.limit;
    const remaining = Math.max(0, rule.limit - entry.count);
    
    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      totalRequests: entry.count
    };
  }

  async increment(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier;
    const now = Date.now();
    
    let entry = this.requests.get(key);
    
    // If no entry exists or the window has expired, create a new one
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 1,
        resetTime: now + rule.window
      };
      this.requests.set(key, entry);
      
      return {
        allowed: true,
        remaining: rule.limit - 1,
        resetTime: entry.resetTime,
        totalRequests: 1
      };
    }
    
    // Increment the count
    entry.count++;
    
    const allowed = entry.count <= rule.limit;
    const remaining = Math.max(0, rule.limit - entry.count);
    
    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      totalRequests: entry.count
    };
  }

  async reset(identifier: string, rule: RateLimitRule): Promise<void> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier;
    this.requests.delete(key);
  }

  async getStats(identifier: string): Promise<RateLimitStats> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier;
    const entry = this.requests.get(key);
    const now = Date.now();
    
    if (!entry || entry.resetTime <= now) {
      return {
        identifier,
        currentRequests: 0,
        remainingRequests: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        windowMs: this.config.windowMs
      };
    }
    
    return {
      identifier,
      currentRequests: entry.count,
      remainingRequests: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      windowMs: this.config.windowMs
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.requests) {
      if (entry.resetTime <= now) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.requests.delete(key));
  }
}

export default MemoryRateLimiter;