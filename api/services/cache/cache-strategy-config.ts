/**
 * Cache Strategy Configuration System
 * Provides configurable caching strategies for different use cases
 */

import { CacheConfiguration } from './interfaces';

export type CacheStrategyType = 
  | 'aggressive'     // High hit rate, longer TTL
  | 'balanced'       // Balanced performance and memory usage
  | 'conservative'   // Lower memory usage, shorter TTL
  | 'performance'    // Maximum performance, high memory usage
  | 'memory-optimized' // Minimal memory usage
  | 'custom';        // User-defined configuration

export interface CacheStrategyProfile {
  name: string;
  description: string;
  config: CacheConfiguration;
  useCase: string;
  performance: {
    expectedHitRate: number;
    memoryUsage: 'low' | 'medium' | 'high';
    latency: 'low' | 'medium' | 'high';
  };
}

export interface EndpointCacheConfig {
  endpoint: string;
  strategy: CacheStrategyType;
  customConfig?: Partial<CacheConfiguration>;
  enabled: boolean;
  priority: 'low' | 'normal' | 'high';
  tags?: string[];
}

export interface DynamicCacheConfig {
  globalStrategy: CacheStrategyType;
  endpointConfigs: EndpointCacheConfig[];
  autoOptimization: {
    enabled: boolean;
    adjustmentInterval: number; // milliseconds
    performanceThresholds: {
      minHitRate: number;
      maxMemoryUsage: number;
      maxLatency: number;
    };
  };
  monitoring: {
    enabled: boolean;
    metricsRetention: number; // milliseconds
    alertThresholds: {
      hitRate: number;
      errorRate: number;
      memoryUsage: number;
    };
  };
}

/**
 * Predefined cache strategy profiles
 */
export const CACHE_STRATEGY_PROFILES: Record<CacheStrategyType, CacheStrategyProfile> = {
  aggressive: {
    name: 'Aggressive Caching',
    description: 'Maximum caching for high-traffic, stable data',
    config: {
      enabled: true,
      defaultTTL: 3600000, // 1 hour
      maxSize: 500 * 1024 * 1024, // 500MB
      keyPrefix: 'aggressive',
      compressionEnabled: true,
      serializationFormat: 'json',
      evictionPolicy: 'lru'
    },
    useCase: 'Static content, configuration data, rarely changing APIs',
    performance: {
      expectedHitRate: 0.95,
      memoryUsage: 'high',
      latency: 'low'
    }
  },

  balanced: {
    name: 'Balanced Caching',
    description: 'Good balance between performance and resource usage',
    config: {
      enabled: true,
      defaultTTL: 900000, // 15 minutes
      maxSize: 200 * 1024 * 1024, // 200MB
      keyPrefix: 'balanced',
      compressionEnabled: true,
      serializationFormat: 'json',
      evictionPolicy: 'lru'
    },
    useCase: 'General API responses, user data, moderate update frequency',
    performance: {
      expectedHitRate: 0.80,
      memoryUsage: 'medium',
      latency: 'low'
    }
  },

  conservative: {
    name: 'Conservative Caching',
    description: 'Minimal caching for frequently changing data',
    config: {
      enabled: true,
      defaultTTL: 300000, // 5 minutes
      maxSize: 50 * 1024 * 1024, // 50MB
      keyPrefix: 'conservative',
      compressionEnabled: false,
      serializationFormat: 'json',
      evictionPolicy: 'ttl'
    },
    useCase: 'Real-time data, user-specific content, frequently updated APIs',
    performance: {
      expectedHitRate: 0.60,
      memoryUsage: 'low',
      latency: 'medium'
    }
  },

  performance: {
    name: 'Performance Optimized',
    description: 'Maximum performance regardless of memory usage',
    config: {
      enabled: true,
      defaultTTL: 1800000, // 30 minutes
      maxSize: 1024 * 1024 * 1024, // 1GB
      keyPrefix: 'performance',
      compressionEnabled: false, // No compression for speed
      serializationFormat: 'json',
      evictionPolicy: 'lfu'
    },
    useCase: 'High-performance applications, gaming, real-time systems',
    performance: {
      expectedHitRate: 0.90,
      memoryUsage: 'high',
      latency: 'low'
    }
  },

  'memory-optimized': {
    name: 'Memory Optimized',
    description: 'Minimal memory footprint with compression',
    config: {
      enabled: true,
      defaultTTL: 600000, // 10 minutes
      maxSize: 25 * 1024 * 1024, // 25MB
      keyPrefix: 'memory-opt',
      compressionEnabled: true,
      serializationFormat: 'json',
      evictionPolicy: 'lru'
    },
    useCase: 'Resource-constrained environments, mobile apps, edge computing',
    performance: {
      expectedHitRate: 0.70,
      memoryUsage: 'low',
      latency: 'medium'
    }
  },

  custom: {
    name: 'Custom Configuration',
    description: 'User-defined cache configuration',
    config: {
      enabled: true,
      defaultTTL: 300000, // 5 minutes (default)
      maxSize: 100 * 1024 * 1024, // 100MB (default)
      keyPrefix: 'custom',
      compressionEnabled: false,
      serializationFormat: 'json',
      evictionPolicy: 'lru'
    },
    useCase: 'Specific requirements not covered by predefined strategies',
    performance: {
      expectedHitRate: 0.75,
      memoryUsage: 'medium',
      latency: 'medium'
    }
  }
};

/**
 * Cache Strategy Configuration Manager
 */
export class CacheStrategyManager {
  private currentConfig: DynamicCacheConfig;
  private performanceMetrics = new Map<string, {
    hitRate: number;
    memoryUsage: number;
    latency: number;
    lastUpdated: number;
  }>();

  constructor(initialConfig?: Partial<DynamicCacheConfig>) {
    this.currentConfig = this.mergeWithDefaults(initialConfig || {});
  }

  /**
   * Get configuration for a specific endpoint
   */
  getEndpointConfig(endpoint: string): CacheConfiguration {
    // Find specific endpoint configuration
    const endpointConfig = this.currentConfig.endpointConfigs.find(
      config => config.endpoint === endpoint || this.matchesPattern(endpoint, config.endpoint)
    );

    if (endpointConfig && endpointConfig.enabled) {
      const baseConfig = CACHE_STRATEGY_PROFILES[endpointConfig.strategy].config;
      
      // Merge with custom configuration if provided
      return {
        ...baseConfig,
        ...endpointConfig.customConfig,
        keyPrefix: `${baseConfig.keyPrefix}:${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`
      };
    }

    // Fall back to global strategy
    return CACHE_STRATEGY_PROFILES[this.currentConfig.globalStrategy].config;
  }

  /**
   * Update strategy for a specific endpoint
   */
  updateEndpointStrategy(endpoint: string, strategy: CacheStrategyType, customConfig?: Partial<CacheConfiguration>): void {
    const existingIndex = this.currentConfig.endpointConfigs.findIndex(
      config => config.endpoint === endpoint
    );

    const newConfig: EndpointCacheConfig = {
      endpoint,
      strategy,
      customConfig,
      enabled: true,
      priority: 'normal'
    };

    if (existingIndex >= 0) {
      this.currentConfig.endpointConfigs[existingIndex] = {
        ...this.currentConfig.endpointConfigs[existingIndex],
        ...newConfig
      };
    } else {
      this.currentConfig.endpointConfigs.push(newConfig);
    }
  }

  /**
   * Get current global strategy
   */
  getGlobalStrategy(): CacheStrategyType {
    return this.currentConfig.globalStrategy;
  }

  /**
   * Update global strategy
   */
  updateGlobalStrategy(strategy: CacheStrategyType): void {
    this.currentConfig.globalStrategy = strategy;
  }

  /**
   * Get strategy profile information
   */
  getStrategyProfile(strategy: CacheStrategyType): CacheStrategyProfile {
    return CACHE_STRATEGY_PROFILES[strategy];
  }

  /**
   * Get all available strategies
   */
  getAvailableStrategies(): CacheStrategyProfile[] {
    return Object.values(CACHE_STRATEGY_PROFILES);
  }

  /**
   * Update performance metrics for optimization
   */
  updatePerformanceMetrics(endpoint: string, metrics: {
    hitRate: number;
    memoryUsage: number;
    latency: number;
  }): void {
    this.performanceMetrics.set(endpoint, {
      ...metrics,
      lastUpdated: Date.now()
    });

    // Trigger auto-optimization if enabled
    if (this.currentConfig.autoOptimization.enabled) {
      this.performAutoOptimization(endpoint, metrics);
    }
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): DynamicCacheConfig {
    return { ...this.currentConfig };
  }

  /**
   * Update entire configuration
   */
  updateConfig(config: Partial<DynamicCacheConfig>): void {
    this.currentConfig = this.mergeWithDefaults(config);
  }

  /**
   * Export configuration for persistence
   */
  exportConfig(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson) as Partial<DynamicCacheConfig>;
      this.updateConfig(config);
    } catch (error) {
      throw new Error(`Invalid configuration JSON: ${error}`);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {
      totalEndpoints: this.performanceMetrics.size,
      globalStrategy: this.currentConfig.globalStrategy,
      autoOptimization: this.currentConfig.autoOptimization.enabled
    };

    if (this.performanceMetrics.size > 0) {
      const metrics = Array.from(this.performanceMetrics.values());
      summary.averageHitRate = metrics.reduce((sum, m) => sum + m.hitRate, 0) / metrics.length;
      summary.averageLatency = metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length;
      summary.totalMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0);
    }

    return summary;
  }

  // Private helper methods
  private mergeWithDefaults(config: Partial<DynamicCacheConfig>): DynamicCacheConfig {
    return {
      globalStrategy: config.globalStrategy || 'balanced',
      endpointConfigs: config.endpointConfigs || [],
      autoOptimization: {
        enabled: config.autoOptimization?.enabled ?? false,
        adjustmentInterval: config.autoOptimization?.adjustmentInterval ?? 300000, // 5 minutes
        performanceThresholds: {
          minHitRate: config.autoOptimization?.performanceThresholds?.minHitRate ?? 0.70,
          maxMemoryUsage: config.autoOptimization?.performanceThresholds?.maxMemoryUsage ?? 0.80,
          maxLatency: config.autoOptimization?.performanceThresholds?.maxLatency ?? 100
        }
      },
      monitoring: {
        enabled: config.monitoring?.enabled ?? true,
        metricsRetention: config.monitoring?.metricsRetention ?? 86400000, // 24 hours
        alertThresholds: {
          hitRate: config.monitoring?.alertThresholds?.hitRate ?? 0.50,
          errorRate: config.monitoring?.alertThresholds?.errorRate ?? 0.05,
          memoryUsage: config.monitoring?.alertThresholds?.memoryUsage ?? 0.90
        }
      }
    };
  }

  private matchesPattern(endpoint: string, pattern: string): boolean {
    // Simple pattern matching - can be enhanced with regex
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test(endpoint);
    }
    return endpoint === pattern;
  }

  private performAutoOptimization(endpoint: string, metrics: {
    hitRate: number;
    memoryUsage: number;
    latency: number;
  }): void {
    const thresholds = this.currentConfig.autoOptimization.performanceThresholds;
    const currentConfig = this.currentConfig.endpointConfigs.find(c => c.endpoint === endpoint);
    
    // Auto-adjust strategy based on performance
    if (metrics.hitRate < thresholds.minHitRate) {
      // Low hit rate - try more aggressive caching
      if (!currentConfig || currentConfig.strategy !== 'aggressive') {
        this.updateEndpointStrategy(endpoint, 'aggressive');
      }
    } else if (metrics.memoryUsage > thresholds.maxMemoryUsage) {
      // High memory usage - try memory-optimized strategy
      if (!currentConfig || currentConfig.strategy !== 'memory-optimized') {
        this.updateEndpointStrategy(endpoint, 'memory-optimized');
      }
    } else if (metrics.latency > thresholds.maxLatency) {
      // High latency - try performance strategy
      if (!currentConfig || currentConfig.strategy !== 'performance') {
        this.updateEndpointStrategy(endpoint, 'performance');
      }
    }
  }
}
