/**
 * Rate Limit Strategy Manager
 * Manages multiple rate limiting strategies and applies them based on context
 */

import { RateLimitRule } from '../../types/api';
import {
  BaseRateLimitStrategy,
  FixedWindowStrategy,
  RateLimitContext,
  RateLimitStrategyConfig,
  RateLimitStrategyResult,
  RateLimitStrategyType,
  SlidingWindowStrategy,
  TokenBucketStrategy,
} from './rate-limit-strategy';

export interface EndpointRateLimitConfig {
  endpoint: string;
  method?: string;
  strategy: RateLimitStrategyType;
  rule: RateLimitRule;
  enabled: boolean;
  priority: number;
  conditions?: {
    userTypes?: string[];
    countries?: string[];
    userAgents?: string[];
  };
}

export interface DynamicRateLimitConfig {
  globalStrategy: RateLimitStrategyType;
  endpointConfigs: EndpointRateLimitConfig[];
  adaptiveSettings: {
    enabled: boolean;
    loadThreshold: number;
    adjustmentFactor: number;
    monitoringInterval: number;
  };
  monitoring: {
    enabled: boolean;
    metricsRetention: number;
    alertThresholds: {
      blockedPercentage: number;
      errorRate: number;
      responseTime: number;
    };
  };
}

/**
 * Predefined strategy configurations
 */
export const DEFAULT_STRATEGY_CONFIGS: Record<RateLimitStrategyType, RateLimitStrategyConfig> = {
  'fixed-window': {
    type: 'fixed-window',
    name: 'Fixed Window',
    description: 'Traditional fixed time window rate limiting',
    parameters: {},
    priority: 1,
    enabled: true,
  },
  'sliding-window': {
    type: 'sliding-window',
    name: 'Sliding Window',
    description: 'Sliding time window for smoother rate limiting',
    parameters: {},
    priority: 2,
    enabled: true,
  },
  'token-bucket': {
    type: 'token-bucket',
    name: 'Token Bucket',
    description: 'Token bucket algorithm for burst handling',
    parameters: {
      burstMultiplier: 2,
    },
    priority: 3,
    enabled: true,
  },
  'leaky-bucket': {
    type: 'leaky-bucket',
    name: 'Leaky Bucket',
    description: 'Leaky bucket for steady rate limiting',
    parameters: {
      leakRate: 1,
    },
    priority: 4,
    enabled: false,
  },
  adaptive: {
    type: 'adaptive',
    name: 'Adaptive',
    description: 'Adaptive rate limiting based on system load',
    parameters: {
      baseStrategy: 'sliding-window',
      loadFactor: 0.8,
    },
    priority: 5,
    enabled: false,
  },
  tiered: {
    type: 'tiered',
    name: 'Tiered',
    description: 'Tiered limits based on user type',
    parameters: {
      tiers: {
        anonymous: { multiplier: 1 },
        authenticated: { multiplier: 2 },
        premium: { multiplier: 5 },
        admin: { multiplier: 10 },
      },
    },
    priority: 6,
    enabled: false,
  },
  custom: {
    type: 'custom',
    name: 'Custom',
    description: 'Custom strategy implementation',
    parameters: {},
    priority: 7,
    enabled: false,
  },
};

/**
 * Rate Limit Strategy Manager
 */
export class RateLimitStrategyManager {
  private strategies = new Map<RateLimitStrategyType, BaseRateLimitStrategy>();
  private config: DynamicRateLimitConfig;
  private performanceMetrics = new Map<
    string,
    {
      requests: number;
      blocked: number;
      averageLatency: number;
      lastUpdated: number;
    }
  >();

  constructor(config?: Partial<DynamicRateLimitConfig>) {
    this.config = this.mergeWithDefaults(config || {});
    this.initializeStrategies();
  }

  /**
   * Check rate limit for a request
   */
  async checkLimit(context: RateLimitContext): Promise<RateLimitStrategyResult> {
    const { strategy, rule } = this.getStrategyForContext(context);
    const strategyInstance = this.strategies.get(strategy);

    if (!strategyInstance) {
      throw new Error(`Strategy ${strategy} not found`);
    }

    const result = await strategyInstance.checkLimit(context, rule);
    this.updatePerformanceMetrics(context.identifier, false, 0);

    return result;
  }

  /**
   * Increment rate limit counter
   */
  async increment(context: RateLimitContext): Promise<RateLimitStrategyResult> {
    const startTime = Date.now();
    const { strategy, rule } = this.getStrategyForContext(context);
    const strategyInstance = this.strategies.get(strategy);

    if (!strategyInstance) {
      throw new Error(`Strategy ${strategy} not found`);
    }

    const result = await strategyInstance.increment(context, rule);
    const latency = Date.now() - startTime;

    this.updatePerformanceMetrics(context.identifier, !result.allowed, latency);

    return result;
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const promises = Array.from(this.strategies.values()).map(strategy =>
      strategy.reset(identifier)
    );

    await Promise.all(promises);
    this.performanceMetrics.delete(identifier);
  }

  /**
   * Get strategy and rule for context
   */
  private getStrategyForContext(context: RateLimitContext): {
    strategy: RateLimitStrategyType;
    rule: RateLimitRule;
  } {
    // Find matching endpoint configuration
    const endpointConfig = this.config.endpointConfigs.find(config => {
      if (!config.enabled) return false;

      // Check endpoint match
      const endpointMatch = this.matchesPattern(context.endpoint, config.endpoint);
      if (!endpointMatch) return false;

      // Check method match
      if (config.method && context.method !== config.method) return false;

      // Check conditions
      if (config.conditions) {
        if (
          config.conditions.userTypes &&
          context.userType &&
          !config.conditions.userTypes.includes(context.userType)
        ) {
          return false;
        }

        if (
          config.conditions.countries &&
          context.country &&
          !config.conditions.countries.includes(context.country)
        ) {
          return false;
        }

        if (config.conditions.userAgents && context.userAgent) {
          const userAgentMatch = config.conditions.userAgents.some(pattern =>
            this.matchesPattern(context.userAgent!, pattern)
          );
          if (!userAgentMatch) return false;
        }
      }

      return true;
    });

    if (endpointConfig) {
      return {
        strategy: endpointConfig.strategy,
        rule: this.adjustRuleForUserType(endpointConfig.rule, context.userType),
      };
    }

    // Fall back to global strategy
    return {
      strategy: this.config.globalStrategy,
      rule: this.getDefaultRule(context.userType),
    };
  }

  /**
   * Adjust rule based on user type (for tiered strategy)
   */
  private adjustRuleForUserType(rule: RateLimitRule, userType?: string): RateLimitRule {
    if (!userType) return rule;

    const tieredConfig = DEFAULT_STRATEGY_CONFIGS.tiered.parameters as any;
    const tierMultiplier = tieredConfig?.tiers?.[userType]?.multiplier || 1;

    return {
      ...rule,
      limit: Math.floor(rule.limit * tierMultiplier),
    };
  }

  /**
   * Get default rule for user type
   */
  private getDefaultRule(userType?: string): RateLimitRule {
    const baseRule: RateLimitRule = {
      identifier: 'default',
      limit: 100,
      window: 60000, // 1 minute
      type: 'ip',
    };

    return this.adjustRuleForUserType(baseRule, userType);
  }

  /**
   * Pattern matching for endpoints and user agents
   */
  private matchesPattern(value: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test(value);
    }
    return value === pattern;
  }

  /**
   * Initialize strategy instances
   */
  private initializeStrategies(): void {
    // Initialize enabled strategies
    Object.entries(DEFAULT_STRATEGY_CONFIGS).forEach(([type, config]) => {
      if (config.enabled) {
        this.strategies.set(type as RateLimitStrategyType, this.createStrategy(config));
      }
    });
  }

  /**
   * Create strategy instance
   */
  private createStrategy(config: RateLimitStrategyConfig): BaseRateLimitStrategy {
    switch (config.type) {
      case 'fixed-window':
        return new FixedWindowStrategy(config);
      case 'sliding-window':
        return new SlidingWindowStrategy(config);
      case 'token-bucket':
        return new TokenBucketStrategy(config);
      default:
        // Fall back to fixed window for unsupported strategies
        return new FixedWindowStrategy({
          ...config,
          type: 'fixed-window',
        });
    }
  }

  /**
   * Update endpoint configuration
   */
  updateEndpointConfig(endpoint: string, updates: Partial<EndpointRateLimitConfig>): void {
    const existingIndex = this.config.endpointConfigs.findIndex(
      config => config.endpoint === endpoint
    );

    if (existingIndex >= 0) {
      const existing = this.config.endpointConfigs[existingIndex];
      if (existing) {
        this.config.endpointConfigs[existingIndex] = {
          endpoint,
          strategy: existing.strategy,
          rule: existing.rule,
          enabled: existing.enabled,
          priority: existing.priority,
          ...updates,
        };
      }
    } else {
      const newConfig: EndpointRateLimitConfig = {
        endpoint,
        strategy: 'fixed-window',
        rule: this.getDefaultRule(),
        enabled: true,
        priority: 1,
        ...updates,
      };
      this.config.endpointConfigs.push(newConfig);
    }
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): DynamicRateLimitConfig {
    return { ...this.config };
  }

  /**
   * Update global strategy
   */
  updateGlobalStrategy(strategy: RateLimitStrategyType): void {
    this.config.globalStrategy = strategy;

    // Ensure strategy is initialized
    if (!this.strategies.has(strategy)) {
      const config = DEFAULT_STRATEGY_CONFIGS[strategy];
      this.strategies.set(strategy, this.createStrategy(config));
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Record<string, unknown> {
    const summary = {
      totalIdentifiers: this.performanceMetrics.size,
      totalRequests: 0,
      totalBlocked: 0,
      averageLatency: 0,
      blockedPercentage: 0,
    };

    for (const metrics of this.performanceMetrics.values()) {
      summary.totalRequests += metrics.requests;
      summary.totalBlocked += metrics.blocked;
      summary.averageLatency += metrics.averageLatency;
    }

    if (this.performanceMetrics.size > 0) {
      summary.averageLatency /= this.performanceMetrics.size;
    }

    if (summary.totalRequests > 0) {
      summary.blockedPercentage = (summary.totalBlocked / summary.totalRequests) * 100;
    }

    return summary;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(identifier: string, blocked: boolean, latency: number): void {
    const existing = this.performanceMetrics.get(identifier) || {
      requests: 0,
      blocked: 0,
      averageLatency: 0,
      lastUpdated: Date.now(),
    };

    existing.requests++;
    if (blocked) existing.blocked++;
    existing.averageLatency = (existing.averageLatency + latency) / 2;
    existing.lastUpdated = Date.now();

    this.performanceMetrics.set(identifier, existing);
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config: Partial<DynamicRateLimitConfig>): DynamicRateLimitConfig {
    return {
      globalStrategy: config.globalStrategy || 'fixed-window',
      endpointConfigs: config.endpointConfigs || [],
      adaptiveSettings: {
        enabled: config.adaptiveSettings?.enabled ?? false,
        loadThreshold: config.adaptiveSettings?.loadThreshold ?? 0.8,
        adjustmentFactor: config.adaptiveSettings?.adjustmentFactor ?? 0.5,
        monitoringInterval: config.adaptiveSettings?.monitoringInterval ?? 60000,
      },
      monitoring: {
        enabled: config.monitoring?.enabled ?? true,
        metricsRetention: config.monitoring?.metricsRetention ?? 3600000,
        alertThresholds: {
          blockedPercentage: config.monitoring?.alertThresholds?.blockedPercentage ?? 10,
          errorRate: config.monitoring?.alertThresholds?.errorRate ?? 5,
          responseTime: config.monitoring?.alertThresholds?.responseTime ?? 1000,
        },
      },
    };
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson) as Partial<DynamicRateLimitConfig>;
      this.config = this.mergeWithDefaults(config);
      this.initializeStrategies();
    } catch (error) {
      throw new Error(`Invalid configuration JSON: ${error}`);
    }
  }
}
