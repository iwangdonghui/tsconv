/**
 * Cache Configuration Initialization
 * Sets up default cache strategies for different API endpoints
 */

import { CacheStrategyManager, CacheStrategyType } from './cache-strategy-config';
import { StrategicCacheService } from './cache-strategy-applier';

export interface EndpointCacheProfile {
  endpoint: string;
  strategy: CacheStrategyType;
  priority: 'low' | 'normal' | 'high';
  tags: string[];
  description: string;
}

/**
 * Default cache profiles for API endpoints
 */
export const DEFAULT_ENDPOINT_PROFILES: EndpointCacheProfile[] = [
  {
    endpoint: '/api/convert',
    strategy: 'aggressive',
    priority: 'high',
    tags: ['conversion', 'timestamp', 'core'],
    description: 'Main timestamp conversion endpoint - high traffic, stable results'
  },
  {
    endpoint: '/api/now',
    strategy: 'conservative',
    priority: 'normal',
    tags: ['current-time', 'realtime'],
    description: 'Current time endpoint - frequently changing data'
  },
  {
    endpoint: '/api/timezone-convert',
    strategy: 'balanced',
    priority: 'high',
    tags: ['timezone', 'conversion'],
    description: 'Timezone conversion - moderate caching for performance'
  },
  {
    endpoint: '/api/batch-convert',
    strategy: 'performance',
    priority: 'high',
    tags: ['batch', 'conversion', 'performance'],
    description: 'Batch conversion - optimize for speed'
  },
  {
    endpoint: '/api/formats',
    strategy: 'aggressive',
    priority: 'normal',
    tags: ['formats', 'metadata', 'static'],
    description: 'Format definitions - rarely changing data'
  },
  {
    endpoint: '/api/health',
    strategy: 'memory-optimized',
    priority: 'low',
    tags: ['health', 'monitoring'],
    description: 'Health check - minimal caching for real-time status'
  },
  {
    endpoint: '/api/admin/*',
    strategy: 'conservative',
    priority: 'low',
    tags: ['admin', 'management'],
    description: 'Admin endpoints - minimal caching for security'
  },
  {
    endpoint: '/api/v1/*',
    strategy: 'balanced',
    priority: 'normal',
    tags: ['v1', 'legacy'],
    description: 'Legacy v1 endpoints - balanced approach'
  }
];

/**
 * Environment-specific cache configurations
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    globalStrategy: 'conservative' as CacheStrategyType,
    autoOptimization: {
      enabled: false,
      adjustmentInterval: 600000, // 10 minutes
      performanceThresholds: {
        minHitRate: 0.60,
        maxMemoryUsage: 0.70,
        maxLatency: 200
      }
    },
    monitoring: {
      enabled: true,
      metricsRetention: 3600000, // 1 hour
      alertThresholds: {
        hitRate: 0.40,
        errorRate: 0.10,
        memoryUsage: 0.80
      }
    }
  },
  
  production: {
    globalStrategy: 'balanced' as CacheStrategyType,
    autoOptimization: {
      enabled: true,
      adjustmentInterval: 300000, // 5 minutes
      performanceThresholds: {
        minHitRate: 0.75,
        maxMemoryUsage: 0.80,
        maxLatency: 100
      }
    },
    monitoring: {
      enabled: true,
      metricsRetention: 86400000, // 24 hours
      alertThresholds: {
        hitRate: 0.60,
        errorRate: 0.05,
        memoryUsage: 0.90
      }
    }
  },
  
  test: {
    globalStrategy: 'memory-optimized' as CacheStrategyType,
    autoOptimization: {
      enabled: false,
      adjustmentInterval: 60000, // 1 minute
      performanceThresholds: {
        minHitRate: 0.50,
        maxMemoryUsage: 0.50,
        maxLatency: 500
      }
    },
    monitoring: {
      enabled: false,
      metricsRetention: 300000, // 5 minutes
      alertThresholds: {
        hitRate: 0.30,
        errorRate: 0.20,
        memoryUsage: 0.70
      }
    }
  }
};

/**
 * Cache Configuration Initializer
 */
export class CacheConfigInitializer {
  private static instance: CacheConfigInitializer;
  private strategyManager: CacheStrategyManager | null = null;
  private strategicCache: StrategicCacheService | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): CacheConfigInitializer {
    if (!CacheConfigInitializer.instance) {
      CacheConfigInitializer.instance = new CacheConfigInitializer();
    }
    return CacheConfigInitializer.instance;
  }

  /**
   * Initialize cache configuration based on environment
   */
  async initialize(environment?: string): Promise<{
    strategyManager: CacheStrategyManager;
    strategicCache: StrategicCacheService;
  }> {
    if (this.initialized && this.strategyManager && this.strategicCache) {
      return {
        strategyManager: this.strategyManager,
        strategicCache: this.strategicCache
      };
    }

    const env = environment || process.env.NODE_ENV || 'development';
    const envConfig = ENVIRONMENT_CONFIGS[env as keyof typeof ENVIRONMENT_CONFIGS] || ENVIRONMENT_CONFIGS.development;

    // Create strategy manager with environment-specific config
    this.strategyManager = new CacheStrategyManager({
      globalStrategy: envConfig.globalStrategy,
      endpointConfigs: DEFAULT_ENDPOINT_PROFILES.map(profile => ({
        endpoint: profile.endpoint,
        strategy: profile.strategy,
        enabled: true,
        priority: profile.priority,
        tags: profile.tags
      })),
      autoOptimization: envConfig.autoOptimization,
      monitoring: envConfig.monitoring
    });

    // Create strategic cache service
    this.strategicCache = new StrategicCacheService(this.strategyManager);

    this.initialized = true;

    // Log initialization
    console.log(`🚀 Cache system initialized for ${env} environment`);
    console.log(`📊 Global strategy: ${envConfig.globalStrategy}`);
    console.log(`🔧 Auto-optimization: ${envConfig.autoOptimization.enabled ? 'enabled' : 'disabled'}`);
    console.log(`📈 Monitoring: ${envConfig.monitoring.enabled ? 'enabled' : 'disabled'}`);
    console.log(`🎯 Configured ${DEFAULT_ENDPOINT_PROFILES.length} endpoint profiles`);

    return {
      strategyManager: this.strategyManager,
      strategicCache: this.strategicCache
    };
  }

  /**
   * Get current strategy manager
   */
  getStrategyManager(): CacheStrategyManager | null {
    return this.strategyManager;
  }

  /**
   * Get current strategic cache service
   */
  getStrategicCache(): StrategicCacheService | null {
    return this.strategicCache;
  }

  /**
   * Update configuration for specific endpoint
   */
  updateEndpointConfig(endpoint: string, strategy: CacheStrategyType, customConfig?: Record<string, unknown>): void {
    if (!this.strategyManager || !this.strategicCache) {
      throw new Error('Cache system not initialized');
    }

    this.strategyManager.updateEndpointStrategy(endpoint, strategy, customConfig);
    this.strategicCache.updateStrategy(endpoint, strategy);

    console.log(`🔄 Updated cache strategy for ${endpoint}: ${strategy}`);
  }

  /**
   * Get configuration summary
   */
  getConfigurationSummary(): Record<string, unknown> {
    if (!this.strategyManager) {
      return { error: 'Cache system not initialized' };
    }

    return {
      initialized: this.initialized,
      environment: process.env.NODE_ENV || 'development',
      globalStrategy: this.strategyManager.getGlobalStrategy(),
      endpointProfiles: DEFAULT_ENDPOINT_PROFILES.length,
      currentConfig: this.strategyManager.getCurrentConfig(),
      performanceSummary: this.strategyManager.getPerformanceSummary()
    };
  }

  /**
   * Reset cache system (useful for testing)
   */
  async reset(): Promise<void> {
    if (this.strategicCache) {
      await this.strategicCache.destroy();
    }

    this.strategyManager = null;
    this.strategicCache = null;
    this.initialized = false;

    console.log('🔄 Cache system reset');
  }

  /**
   * Export current configuration
   */
  exportConfiguration(): string {
    if (!this.strategyManager) {
      throw new Error('Cache system not initialized');
    }

    const config = {
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      configuration: this.strategyManager.getCurrentConfig(),
      endpointProfiles: DEFAULT_ENDPOINT_PROFILES
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfiguration(configJson: string): void {
    if (!this.strategyManager) {
      throw new Error('Cache system not initialized');
    }

    try {
      const config = JSON.parse(configJson);
      
      if (config.configuration) {
        this.strategyManager.updateConfig(config.configuration);
        console.log('📥 Configuration imported successfully');
      } else {
        throw new Error('Invalid configuration format');
      }
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }
}

/**
 * Convenience function to get initialized cache services
 */
export async function getCacheServices(environment?: string): Promise<{
  strategyManager: CacheStrategyManager;
  strategicCache: StrategicCacheService;
}> {
  const initializer = CacheConfigInitializer.getInstance();
  return await initializer.initialize(environment);
}

/**
 * Convenience function to get strategic cache service
 */
export async function getStrategicCacheService(environment?: string): Promise<StrategicCacheService> {
  const { strategicCache } = await getCacheServices(environment);
  return strategicCache;
}

/**
 * Convenience function to get strategy manager
 */
export async function getCacheStrategyManager(environment?: string): Promise<CacheStrategyManager> {
  const { strategyManager } = await getCacheServices(environment);
  return strategyManager;
}
