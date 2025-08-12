/**
 * Rate Limit Configuration Initialization
 * Sets up default rate limiting strategies for different API endpoints
 */

import { RateLimitStrategyType } from './rate-limit-strategy';
import { EndpointRateLimitConfig, DynamicRateLimitConfig } from './rate-limit-strategy-manager';
import { EnhancedRateLimiter, EnhancedRateLimiterConfig } from './enhanced-rate-limiter';

export interface EndpointRateLimitProfile {
  endpoint: string;
  method?: string;
  strategy: RateLimitStrategyType;
  limits: {
    anonymous: { limit: number; window: number };
    authenticated: { limit: number; window: number };
    premium: { limit: number; window: number };
    admin: { limit: number; window: number };
  };
  priority: number;
  description: string;
}

/**
 * Default rate limit profiles for API endpoints
 */
export const DEFAULT_ENDPOINT_PROFILES: EndpointRateLimitProfile[] = [
  {
    endpoint: '/api/convert',
    strategy: 'sliding-window',
    limits: {
      anonymous: { limit: 60, window: 60000 }, // 60 requests per minute
      authenticated: { limit: 120, window: 60000 }, // 120 requests per minute
      premium: { limit: 300, window: 60000 }, // 300 requests per minute
      admin: { limit: 1000, window: 60000 } // 1000 requests per minute
    },
    priority: 1,
    description: 'Main conversion endpoint - high traffic, needs burst handling'
  },
  {
    endpoint: '/api/batch-convert',
    strategy: 'token-bucket',
    limits: {
      anonymous: { limit: 10, window: 60000 }, // 10 requests per minute
      authenticated: { limit: 30, window: 60000 }, // 30 requests per minute
      premium: { limit: 100, window: 60000 }, // 100 requests per minute
      admin: { limit: 500, window: 60000 } // 500 requests per minute
    },
    priority: 1,
    description: 'Batch conversion - resource intensive, needs strict limiting'
  },
  {
    endpoint: '/api/now',
    strategy: 'fixed-window',
    limits: {
      anonymous: { limit: 30, window: 60000 }, // 30 requests per minute
      authenticated: { limit: 60, window: 60000 }, // 60 requests per minute
      premium: { limit: 120, window: 60000 }, // 120 requests per minute
      admin: { limit: 300, window: 60000 } // 300 requests per minute
    },
    priority: 2,
    description: 'Current time endpoint - moderate usage'
  },
  {
    endpoint: '/api/timezone-convert',
    strategy: 'sliding-window',
    limits: {
      anonymous: { limit: 40, window: 60000 }, // 40 requests per minute
      authenticated: { limit: 80, window: 60000 }, // 80 requests per minute
      premium: { limit: 200, window: 60000 }, // 200 requests per minute
      admin: { limit: 600, window: 60000 } // 600 requests per minute
    },
    priority: 2,
    description: 'Timezone conversion - moderate complexity'
  },
  {
    endpoint: '/api/formats',
    strategy: 'fixed-window',
    limits: {
      anonymous: { limit: 20, window: 60000 }, // 20 requests per minute
      authenticated: { limit: 40, window: 60000 }, // 40 requests per minute
      premium: { limit: 100, window: 60000 }, // 100 requests per minute
      admin: { limit: 200, window: 60000 } // 200 requests per minute
    },
    priority: 3,
    description: 'Format definitions - low frequency, cacheable'
  },
  {
    endpoint: '/api/health',
    strategy: 'fixed-window',
    limits: {
      anonymous: { limit: 10, window: 60000 }, // 10 requests per minute
      authenticated: { limit: 20, window: 60000 }, // 20 requests per minute
      premium: { limit: 50, window: 60000 }, // 50 requests per minute
      admin: { limit: 100, window: 60000 } // 100 requests per minute
    },
    priority: 4,
    description: 'Health check - monitoring endpoint'
  },
  {
    endpoint: '/api/admin/*',
    strategy: 'sliding-window',
    limits: {
      anonymous: { limit: 0, window: 60000 }, // No access for anonymous
      authenticated: { limit: 5, window: 60000 }, // Very limited for authenticated
      premium: { limit: 10, window: 60000 }, // Limited for premium
      admin: { limit: 100, window: 60000 } // Full access for admin
    },
    priority: 1,
    description: 'Admin endpoints - restricted access'
  },
  {
    endpoint: '/api/v1/*',
    strategy: 'fixed-window',
    limits: {
      anonymous: { limit: 30, window: 60000 }, // 30 requests per minute
      authenticated: { limit: 60, window: 60000 }, // 60 requests per minute
      premium: { limit: 120, window: 60000 }, // 120 requests per minute
      admin: { limit: 300, window: 60000 } // 300 requests per minute
    },
    priority: 3,
    description: 'Legacy v1 endpoints - standard limits'
  }
];

/**
 * Environment-specific rate limit configurations
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    globalStrategy: 'fixed-window' as RateLimitStrategyType,
    multiplier: 2, // More lenient in development
    adaptiveSettings: {
      enabled: false,
      loadThreshold: 0.9,
      adjustmentFactor: 0.3,
      monitoringInterval: 120000 // 2 minutes
    },
    monitoring: {
      enabled: true,
      metricsRetention: 1800000, // 30 minutes
      alertThresholds: {
        blockedPercentage: 20,
        errorRate: 10,
        responseTime: 2000
      }
    }
  },
  
  production: {
    globalStrategy: 'sliding-window' as RateLimitStrategyType,
    multiplier: 1, // Standard limits
    adaptiveSettings: {
      enabled: true,
      loadThreshold: 0.8,
      adjustmentFactor: 0.5,
      monitoringInterval: 60000 // 1 minute
    },
    monitoring: {
      enabled: true,
      metricsRetention: 3600000, // 1 hour
      alertThresholds: {
        blockedPercentage: 10,
        errorRate: 5,
        responseTime: 1000
      }
    }
  },
  
  test: {
    globalStrategy: 'fixed-window' as RateLimitStrategyType,
    multiplier: 10, // Very lenient for testing
    adaptiveSettings: {
      enabled: false,
      loadThreshold: 0.95,
      adjustmentFactor: 0.1,
      monitoringInterval: 300000 // 5 minutes
    },
    monitoring: {
      enabled: false,
      metricsRetention: 300000, // 5 minutes
      alertThresholds: {
        blockedPercentage: 50,
        errorRate: 20,
        responseTime: 5000
      }
    }
  }
};

/**
 * Rate Limit Configuration Initializer
 */
export class RateLimitConfigInitializer {
  private static instance: RateLimitConfigInitializer;
  private enhancedRateLimiter: EnhancedRateLimiter | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): RateLimitConfigInitializer {
    if (!RateLimitConfigInitializer.instance) {
      RateLimitConfigInitializer.instance = new RateLimitConfigInitializer();
    }
    return RateLimitConfigInitializer.instance;
  }

  /**
   * Initialize rate limiting based on environment
   */
  async initialize(environment?: string): Promise<EnhancedRateLimiter> {
    if (this.initialized && this.enhancedRateLimiter) {
      return this.enhancedRateLimiter;
    }

    const env = environment || process.env.NODE_ENV || 'development';
    const envConfig = ENVIRONMENT_CONFIGS[env as keyof typeof ENVIRONMENT_CONFIGS] || ENVIRONMENT_CONFIGS.development;

    // Create endpoint configurations
    const endpointConfigs: EndpointRateLimitConfig[] = DEFAULT_ENDPOINT_PROFILES.map(profile => ({
      endpoint: profile.endpoint,
      method: profile.method,
      strategy: profile.strategy,
      rule: {
        identifier: profile.endpoint,
        limit: Math.floor(profile.limits.anonymous.limit * envConfig.multiplier),
        window: profile.limits.anonymous.window,
        type: 'ip' as const
      },
      enabled: true,
      priority: profile.priority,
      conditions: {
        userTypes: ['anonymous', 'authenticated', 'premium', 'admin']
      }
    }));

    // Create dynamic configuration
    const strategyConfig: Partial<DynamicRateLimitConfig> = {
      globalStrategy: envConfig.globalStrategy,
      endpointConfigs,
      adaptiveSettings: envConfig.adaptiveSettings,
      monitoring: envConfig.monitoring
    };

    // Create enhanced rate limiter configuration
    const enhancedConfig: EnhancedRateLimiterConfig = {
      strategyConfig,
      fallbackToMemory: true,
      enableMonitoring: envConfig.monitoring.enabled,
      enableAdaptive: envConfig.adaptiveSettings.enabled
    };

    // Initialize enhanced rate limiter
    this.enhancedRateLimiter = new EnhancedRateLimiter(enhancedConfig);
    this.initialized = true;

    // Log initialization
    // eslint-disable-next-line no-console
    console.log(`🚀 Enhanced rate limiting initialized for ${env} environment`);
    // eslint-disable-next-line no-console
    console.log(`📊 Global strategy: ${envConfig.globalStrategy}`);
    // eslint-disable-next-line no-console
    console.log(`🔧 Adaptive limiting: ${envConfig.adaptiveSettings.enabled ? 'enabled' : 'disabled'}`);
    // eslint-disable-next-line no-console
    console.log(`📈 Monitoring: ${envConfig.monitoring.enabled ? 'enabled' : 'disabled'}`);
    // eslint-disable-next-line no-console
    console.log(`🎯 Configured ${DEFAULT_ENDPOINT_PROFILES.length} endpoint profiles`);

    return this.enhancedRateLimiter;
  }

  /**
   * Get current enhanced rate limiter
   */
  getEnhancedRateLimiter(): EnhancedRateLimiter | null {
    return this.enhancedRateLimiter;
  }

  /**
   * Update endpoint configuration
   */
  updateEndpointConfig(endpoint: string, strategy: RateLimitStrategyType, limits?: Record<string, { limit: number; window: number }>): void {
    if (!this.enhancedRateLimiter) {
      throw new Error('Rate limiter not initialized');
    }

    const config = this.enhancedRateLimiter.getConfiguration().strategyConfig;
    const existingConfig = config.endpointConfigs.find(c => c.endpoint === endpoint);

    if (existingConfig) {
      existingConfig.strategy = strategy;
      if (limits) {
        existingConfig.rule.limit = limits.anonymous?.limit || existingConfig.rule.limit;
        existingConfig.rule.window = limits.anonymous?.window || existingConfig.rule.window;
      }
    } else {
      config.endpointConfigs.push({
        endpoint,
        strategy,
        rule: {
          identifier: endpoint,
          limit: limits?.anonymous?.limit || 60,
          window: limits?.anonymous?.window || 60000,
          type: 'ip'
        },
        enabled: true,
        priority: 1
      });
    }

    this.enhancedRateLimiter.updateStrategyConfig(config);
    // eslint-disable-next-line no-console
    console.log(`🔄 Updated rate limit strategy for ${endpoint}: ${strategy}`);
  }

  /**
   * Get configuration summary
   */
  getConfigurationSummary(): Record<string, unknown> {
    if (!this.enhancedRateLimiter) {
      return { error: 'Rate limiter not initialized' };
    }

    const config = this.enhancedRateLimiter.getConfiguration();
    const healthCheck = this.enhancedRateLimiter.healthCheck();

    return {
      initialized: this.initialized,
      environment: process.env.NODE_ENV || 'development',
      globalStrategy: config.strategyConfig.globalStrategy,
      endpointProfiles: DEFAULT_ENDPOINT_PROFILES.length,
      activeEndpoints: config.strategyConfig.endpointConfigs.length,
      monitoring: config.enhancedConfig.enableMonitoring,
      adaptive: config.enhancedConfig.enableAdaptive,
      health: healthCheck
    };
  }

  /**
   * Reset rate limiter (useful for testing)
   */
  async reset(): Promise<void> {
    if (this.enhancedRateLimiter) {
      await this.enhancedRateLimiter.destroy();
    }

    this.enhancedRateLimiter = null;
    this.initialized = false;

    // eslint-disable-next-line no-console
    console.log('🔄 Rate limiting system reset');
  }

  /**
   * Export current configuration
   */
  exportConfiguration(): string {
    if (!this.enhancedRateLimiter) {
      throw new Error('Rate limiter not initialized');
    }

    const config = {
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      configuration: this.enhancedRateLimiter.getConfiguration(),
      endpointProfiles: DEFAULT_ENDPOINT_PROFILES
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfiguration(configJson: string): void {
    if (!this.enhancedRateLimiter) {
      throw new Error('Rate limiter not initialized');
    }

    try {
      const config = JSON.parse(configJson);
      
      if (config.configuration?.strategyConfig) {
        this.enhancedRateLimiter.updateStrategyConfig(config.configuration.strategyConfig);
        // eslint-disable-next-line no-console
        console.log('📥 Rate limiting configuration imported successfully');
      } else {
        throw new Error('Invalid configuration format');
      }
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }
}

/**
 * Convenience function to get initialized enhanced rate limiter
 */
export async function getEnhancedRateLimiter(environment?: string): Promise<EnhancedRateLimiter> {
  const initializer = RateLimitConfigInitializer.getInstance();
  return await initializer.initialize(environment);
}

/**
 * Convenience function to get rate limit config initializer
 */
export function getRateLimitConfigInitializer(): RateLimitConfigInitializer {
  return RateLimitConfigInitializer.getInstance();
}
