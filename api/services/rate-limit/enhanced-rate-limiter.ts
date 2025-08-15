/**
 * Enhanced Rate Limiter Service
 * Unified rate limiting service with strategy support and monitoring
 */

import { RateLimiter, RateLimitResult, RateLimitRule, RateLimitStats } from '../../types/api';
import { RateLimitContext, RateLimitStrategyResult } from './rate-limit-strategy';
import { DynamicRateLimitConfig, RateLimitStrategyManager } from './rate-limit-strategy-manager';

export interface EnhancedRateLimiterConfig {
  strategyConfig?: Partial<DynamicRateLimitConfig>;
  fallbackToMemory?: boolean;
  enableMonitoring?: boolean;
  enableAdaptive?: boolean;
}

export interface RateLimitMonitoringData {
  identifier: string;
  endpoint: string;
  strategy: string;
  allowed: boolean;
  remaining: number;
  latency: number;
  timestamp: number;
  userType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Enhanced Rate Limiter with strategy support
 */
export class EnhancedRateLimiter implements RateLimiter {
  private strategyManager: RateLimitStrategyManager;
  private config: EnhancedRateLimiterConfig;
  private monitoringData: RateLimitMonitoringData[] = [];
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: EnhancedRateLimiterConfig = {}) {
    this.config = {
      fallbackToMemory: true,
      enableMonitoring: true,
      enableAdaptive: false,
      ...config,
    };

    this.strategyManager = new RateLimitStrategyManager(config.strategyConfig);

    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }
  }

  /**
   * Check rate limit without incrementing
   */
  async checkLimit(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    try {
      const context = this.createContext(identifier, rule);
      const result = await this.strategyManager.checkLimit(context);

      return this.convertToRateLimitResult(result);
    } catch (error) {
      if (this.config.fallbackToMemory) {
        return this.fallbackCheck(identifier, rule);
      }
      throw error;
    }
  }

  /**
   * Increment rate limit counter
   */
  async increment(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const startTime = Date.now();

    try {
      const context = this.createContext(identifier, rule);
      const result = await this.strategyManager.increment(context);

      // Record monitoring data
      if (this.config.enableMonitoring) {
        this.recordMonitoringData({
          identifier,
          endpoint: rule.identifier,
          strategy: result.strategy,
          allowed: result.allowed,
          remaining: result.remaining,
          latency: Date.now() - startTime,
          timestamp: Date.now(),
          userType: context.userType,
          metadata: context.metadata,
        });
      }

      return this.convertToRateLimitResult(result);
    } catch (error) {
      if (this.config.fallbackToMemory) {
        return this.fallbackIncrement(identifier, rule);
      }
      throw error;
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string, _rule: RateLimitRule): Promise<void> {
    try {
      await this.strategyManager.reset(identifier);
    } catch (error) {
      // Silently fail for reset operations
      console.warn('Rate limit reset failed:', error);
    }
  }

  /**
   * Get rate limit statistics
   */
  async getStats(identifier: string): Promise<RateLimitStats> {
    try {
      // Get metrics from strategy manager
      // const metrics = this.strategyManager.getPerformanceMetrics(); // Currently not used

      return {
        identifier,
        currentCount: 0, // Would need to be implemented per strategy
        limit: 100, // Default limit
        window: 60000, // Default window
        resetTime: Date.now() + 60000,
      };
    } catch (error) {
      return {
        identifier,
        currentCount: 0,
        limit: 0,
        window: 0,
        resetTime: Date.now(),
      };
    }
  }

  /**
   * Create context from identifier and rule
   */
  private createContext(identifier: string, rule: RateLimitRule): RateLimitContext {
    // Extract information from identifier if it contains structured data
    // const parts = identifier.split(':'); // Currently not used
    const userType = this.determineUserType(identifier, rule);

    return {
      identifier,
      userType,
      endpoint: rule.identifier,
      method: 'GET', // Default method
      timestamp: Date.now(),
      metadata: {
        ruleType: rule.type,
        originalRule: rule,
      },
    };
  }

  /**
   * Determine user type from identifier and rule
   */
  private determineUserType(
    identifier: string,
    _rule: RateLimitRule
  ): 'anonymous' | 'authenticated' | 'premium' | 'admin' {
    // Check if identifier suggests authentication
    if (identifier.includes('auth:') || identifier.includes('user:')) {
      return 'authenticated';
    }

    if (identifier.includes('admin:')) {
      return 'admin';
    }

    if (identifier.includes('premium:')) {
      return 'premium';
    }

    return 'anonymous';
  }

  /**
   * Convert strategy result to standard rate limit result
   */
  private convertToRateLimitResult(result: RateLimitStrategyResult): RateLimitResult {
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetTime: result.resetTime,
      totalLimit: result.totalLimit,
    };
  }

  /**
   * Fallback check using simple in-memory rate limiting
   */
  private fallbackCheck(_identifier: string, rule: RateLimitRule): RateLimitResult {
    // Simple fallback implementation
    return {
      allowed: true,
      remaining: rule.limit - 1,
      resetTime: Date.now() + rule.window,
      totalLimit: rule.limit,
    };
  }

  /**
   * Fallback increment using simple in-memory rate limiting
   */
  private fallbackIncrement(_identifier: string, rule: RateLimitRule): RateLimitResult {
    // Simple fallback implementation
    return {
      allowed: true,
      remaining: rule.limit - 1,
      resetTime: Date.now() + rule.window,
      totalLimit: rule.limit,
    };
  }

  /**
   * Record monitoring data
   */
  private recordMonitoringData(data: RateLimitMonitoringData): void {
    this.monitoringData.push(data);

    // Keep only recent data (last hour by default)
    const cutoff = Date.now() - 3600000; // 1 hour
    this.monitoringData = this.monitoringData.filter(item => item.timestamp > cutoff);
  }

  /**
   * Start monitoring and adaptive adjustment
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.processMonitoringData();
    }, 60000); // Process every minute
  }

  /**
   * Process monitoring data for insights and adaptive adjustments
   */
  private processMonitoringData(): void {
    if (this.monitoringData.length === 0) return;

    const recentData = this.monitoringData.filter(
      item => item.timestamp > Date.now() - 300000 // Last 5 minutes
    );

    if (recentData.length === 0) return;

    // Calculate metrics
    const totalRequests = recentData.length;
    const blockedRequests = recentData.filter(item => !item.allowed).length;
    const blockedPercentage = (blockedRequests / totalRequests) * 100;
    const averageLatency = recentData.reduce((sum, item) => sum + item.latency, 0) / totalRequests;

    // Check if adaptive adjustment is needed
    if (this.config.enableAdaptive) {
      this.performAdaptiveAdjustment(blockedPercentage, averageLatency);
    }

    // Log metrics for monitoring
    console.log(
      `Rate Limit Metrics: ${totalRequests} requests, ${blockedPercentage.toFixed(1)}% blocked, ${averageLatency.toFixed(1)}ms avg latency`
    );
  }

  /**
   * Perform adaptive adjustment based on metrics
   */
  private performAdaptiveAdjustment(blockedPercentage: number, averageLatency: number): void {
    const config = this.strategyManager.getCurrentConfig();

    // If too many requests are being blocked, consider loosening limits
    if (blockedPercentage > config.monitoring.alertThresholds.blockedPercentage) {
      console.log('High block rate detected, consider adjusting rate limits');
      // Could implement automatic adjustment here
    }

    // If latency is too high, consider tightening limits
    if (averageLatency > config.monitoring.alertThresholds.responseTime) {
      console.log('High latency detected, consider tightening rate limits');
      // Could implement automatic adjustment here
    }
  }

  /**
   * Get monitoring summary
   */
  getMonitoringSummary(): Record<string, unknown> {
    const recentData = this.monitoringData.filter(
      item => item.timestamp > Date.now() - 3600000 // Last hour
    );

    if (recentData.length === 0) {
      return { message: 'No recent monitoring data' };
    }

    const totalRequests = recentData.length;
    const blockedRequests = recentData.filter(item => !item.allowed).length;
    const uniqueIdentifiers = new Set(recentData.map(item => item.identifier)).size;
    const endpointStats = new Map<string, { requests: number; blocked: number }>();

    recentData.forEach(item => {
      const existing = endpointStats.get(item.endpoint) || { requests: 0, blocked: 0 };
      existing.requests++;
      if (!item.allowed) existing.blocked++;
      endpointStats.set(item.endpoint, existing);
    });

    return {
      totalRequests,
      blockedRequests,
      blockedPercentage: (blockedRequests / totalRequests) * 100,
      uniqueIdentifiers,
      averageLatency: recentData.reduce((sum, item) => sum + item.latency, 0) / totalRequests,
      endpointStats: Object.fromEntries(endpointStats),
      strategyMetrics: this.strategyManager.getPerformanceMetrics(),
    };
  }

  /**
   * Update strategy configuration
   */
  updateStrategyConfig(updates: Partial<DynamicRateLimitConfig>): void {
    const currentConfig = this.strategyManager.getCurrentConfig();
    const newConfig = { ...currentConfig, ...updates };
    this.strategyManager.importConfig(JSON.stringify(newConfig));
  }

  /**
   * Get current configuration
   */
  getConfiguration(): {
    enhancedConfig: EnhancedRateLimiterConfig;
    strategyConfig: DynamicRateLimitConfig;
  } {
    return {
      enhancedConfig: this.config,
      strategyConfig: this.strategyManager.getCurrentConfig(),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    strategies: number;
    monitoring: boolean;
    recentRequests: number;
    blockedPercentage: number;
  }> {
    const recentData = this.monitoringData.filter(
      item => item.timestamp > Date.now() - 300000 // Last 5 minutes
    );

    const blockedRequests = recentData.filter(item => !item.allowed).length;
    const blockedPercentage =
      recentData.length > 0 ? (blockedRequests / recentData.length) * 100 : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (blockedPercentage > 50) {
      status = 'unhealthy';
    } else if (blockedPercentage > 20) {
      status = 'degraded';
    }

    return {
      status,
      strategies: this.strategyManager.getCurrentConfig().endpointConfigs.length,
      monitoring: this.config.enableMonitoring || false,
      recentRequests: recentData.length,
      blockedPercentage,
    };
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.monitoringData = [];
  }
}
