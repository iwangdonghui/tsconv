/**
 * Security Configuration Initializer
 * Centralized security configuration management for different environments and use cases
 */

import { SecurityPolicyLevel } from './security-policy-manager';
import { SecurityMiddlewareConfig, UnifiedSecurityMiddleware } from './unified-security-middleware';

export interface SecurityEnvironmentConfig {
  policyLevel: SecurityPolicyLevel;
  enableThreatDetection: boolean;
  enableRealTimeBlocking: boolean;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  maxLogs: number;
  retentionPeriod: number;
  customPolicyOverrides?: any;
}

/**
 * Environment-specific security configurations
 */
export const SECURITY_ENVIRONMENT_CONFIGS: Record<string, SecurityEnvironmentConfig> = {
  development: {
    policyLevel: 'minimal',
    enableThreatDetection: true,
    enableRealTimeBlocking: false,
    enableLogging: true,
    logLevel: 'debug',
    maxLogs: 1000,
    retentionPeriod: 24 * 60 * 60 * 1000, // 1 day
    customPolicyOverrides: {
      requestFiltering: {
        maxRequestSize: 50 * 1024 * 1024, // 50MB for development
        blockedUserAgents: [], // Allow all user agents in development
      },
      inputValidation: {
        sanitizeInput: false, // Don't sanitize in development for debugging
      },
      responseSecurity: {
        hideServerInfo: false, // Show server info in development
      },
    },
  },

  test: {
    policyLevel: 'minimal',
    enableThreatDetection: true,
    enableRealTimeBlocking: false,
    enableLogging: false,
    logLevel: 'error',
    maxLogs: 100,
    retentionPeriod: 60 * 60 * 1000, // 1 hour
    customPolicyOverrides: {
      requestFiltering: {
        maxRequestSize: 100 * 1024 * 1024, // 100MB for testing
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      },
      threatDetection: {
        confidenceThreshold: 95, // Very high threshold for testing
      },
    },
  },

  staging: {
    policyLevel: 'standard',
    enableThreatDetection: true,
    enableRealTimeBlocking: true,
    enableLogging: true,
    logLevel: 'info',
    maxLogs: 5000,
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    customPolicyOverrides: {
      requestFiltering: {
        maxRequestSize: 10 * 1024 * 1024, // 10MB
      },
      threatDetection: {
        confidenceThreshold: 70,
      },
    },
  },

  production: {
    policyLevel: 'strict',
    enableThreatDetection: true,
    enableRealTimeBlocking: true,
    enableLogging: true,
    logLevel: 'warn',
    maxLogs: 10000,
    retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
    customPolicyOverrides: {
      requestFiltering: {
        maxRequestSize: 5 * 1024 * 1024, // 5MB
        blockedCountries: ['CN', 'RU', 'KP'], // Block high-risk countries
      },
      threatDetection: {
        confidenceThreshold: 60,
        realTimeAnalysis: true,
        mlBasedDetection: true,
      },
      botDetection: {
        challengeMode: true,
        behaviorAnalysis: true,
      },
    },
  },

  'high-security': {
    policyLevel: 'maximum',
    enableThreatDetection: true,
    enableRealTimeBlocking: true,
    enableLogging: true,
    logLevel: 'debug',
    maxLogs: 20000,
    retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
    customPolicyOverrides: {
      requestFiltering: {
        maxRequestSize: 1 * 1024 * 1024, // 1MB
        allowedCountries: ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU'],
        blockedUserAgents: [
          'curl',
          'wget',
          'python-requests',
          'bot',
          'crawler',
          'spider',
          'scraper',
          'scanner',
          'test',
          'monitor',
          'check',
          'probe',
        ],
      },
      inputValidation: {
        maxFieldLength: 100,
        maxFieldCount: 5,
        blockedPatterns: [
          '<script',
          'javascript:',
          'data:text/html',
          'vbscript:',
          'onload=',
          'onerror=',
          'eval(',
          'setTimeout(',
          'setInterval(',
          'Function(',
          'constructor',
          'prototype',
          'union',
          'select',
          'insert',
          'update',
          'delete',
          'drop',
          'create',
          'alter',
          'exec',
          'system',
          'cmd',
          'shell',
          'bash',
          'powershell',
          'wget',
          'curl',
        ],
      },
      threatDetection: {
        confidenceThreshold: 40,
        realTimeAnalysis: true,
        patternMatching: true,
        anomalyDetection: true,
        mlBasedDetection: true,
      },
      botDetection: {
        challengeMode: true,
        honeypotFields: [
          'email_confirm',
          'website',
          'phone_backup',
          'company_name',
          'referral_code',
        ],
        behaviorAnalysis: true,
        fingerprintTracking: true,
      },
    },
  },
};

/**
 * Security Configuration Initializer
 */
export class SecurityConfigInitializer {
  private static instance: SecurityConfigInitializer;
  private securityMiddleware: UnifiedSecurityMiddleware | null = null;
  private currentEnvironment: string = 'development';
  private initialized = false;

  private constructor() {}

  static getInstance(): SecurityConfigInitializer {
    if (!SecurityConfigInitializer.instance) {
      SecurityConfigInitializer.instance = new SecurityConfigInitializer();
    }
    return SecurityConfigInitializer.instance;
  }

  /**
   * Initialize security system based on environment
   */
  async initialize(environment?: string): Promise<UnifiedSecurityMiddleware> {
    if (this.initialized && this.securityMiddleware) {
      return this.securityMiddleware;
    }

    const env = environment || process.env.NODE_ENV || 'development';
    this.currentEnvironment = env;

    // Get environment configuration
    const envConfig = SECURITY_ENVIRONMENT_CONFIGS[env] || SECURITY_ENVIRONMENT_CONFIGS.development;

    if (!envConfig) {
      throw new Error(`Security configuration not found for environment: ${env}`);
    }

    // Create middleware configuration
    const middlewareConfig: SecurityMiddlewareConfig = {
      policyLevel: envConfig.policyLevel,
      enableThreatDetection: envConfig.enableThreatDetection,
      enableRealTimeBlocking: envConfig.enableRealTimeBlocking,
      enableLogging: envConfig.enableLogging,
      customPolicyConfig: envConfig.customPolicyOverrides,
      loggerConfig: {
        maxLogs: envConfig.maxLogs,
        retentionPeriod: envConfig.retentionPeriod || 7,
        logLevel: envConfig.logLevel || 'info',
      },
    };

    // Initialize security middleware
    this.securityMiddleware = new UnifiedSecurityMiddleware(middlewareConfig);
    this.initialized = true;

    // Log initialization
    console.log(`🔒 Security system initialized for ${env} environment`);
    console.log(`📊 Policy level: ${envConfig.policyLevel}`);
    console.log(`🔍 Threat detection: ${envConfig.enableThreatDetection ? 'enabled' : 'disabled'}`);
    console.log(
      `🚫 Real-time blocking: ${envConfig.enableRealTimeBlocking ? 'enabled' : 'disabled'}`
    );
    console.log(
      `📝 Logging: ${envConfig.enableLogging ? 'enabled' : 'disabled'} (level: ${envConfig.logLevel})`
    );

    return this.securityMiddleware;
  }

  /**
   * Get current security middleware
   */
  getSecurityMiddleware(): UnifiedSecurityMiddleware | null {
    return this.securityMiddleware;
  }

  /**
   * Update security configuration
   */
  updateConfiguration(
    environment: string,
    customConfig?: Partial<SecurityEnvironmentConfig>
  ): void {
    if (!this.securityMiddleware) {
      throw new Error('Security system not initialized');
    }

    const envConfig =
      SECURITY_ENVIRONMENT_CONFIGS[environment] || SECURITY_ENVIRONMENT_CONFIGS.development;

    if (!envConfig) {
      throw new Error(`Security configuration not found for environment: ${environment}`);
    }

    const mergedConfig = { ...envConfig, ...customConfig };

    // Update policy level
    this.securityMiddleware.updatePolicy(
      mergedConfig.policyLevel,
      `Environment changed to ${environment}`
    );

    // Apply custom policy overrides
    if (mergedConfig.customPolicyOverrides) {
      this.securityMiddleware.applyCustomPolicy(
        mergedConfig.customPolicyOverrides,
        `Custom configuration for ${environment}`
      );
    }

    this.currentEnvironment = environment;
    console.log(`🔄 Security configuration updated for ${environment} environment`);
  }

  /**
   * Get current configuration summary
   */
  getConfigurationSummary(): Record<string, unknown> {
    if (!this.securityMiddleware) {
      return { error: 'Security system not initialized' };
    }

    const envConfig = SECURITY_ENVIRONMENT_CONFIGS[this.currentEnvironment];
    const stats = this.securityMiddleware.getSecurityStats();

    return {
      initialized: this.initialized,
      environment: this.currentEnvironment,
      configuration: envConfig,
      currentStats: stats,
      availableEnvironments: Object.keys(SECURITY_ENVIRONMENT_CONFIGS),
    };
  }

  /**
   * Create middleware for specific use case
   */
  createMiddlewareForUseCase(useCase: 'api' | 'admin' | 'public' | 'internal'): any {
    if (!this.securityMiddleware) {
      throw new Error('Security system not initialized');
    }

    const baseConfig = SECURITY_ENVIRONMENT_CONFIGS[this.currentEnvironment];

    if (!baseConfig) {
      throw new Error(
        `Security configuration not found for environment: ${this.currentEnvironment}`
      );
    }

    let customConfig: Partial<SecurityEnvironmentConfig> = {};

    switch (useCase) {
      case 'api':
        customConfig = {
          policyLevel: 'standard',
          enableThreatDetection: true,
          enableRealTimeBlocking: true,
          customPolicyOverrides: {
            requestFiltering: {
              maxRequestSize: 5 * 1024 * 1024, // 5MB for API
            },
            rateLimiting: {
              enabled: true,
              strictMode: false,
            },
          },
        };
        break;

      case 'admin':
        customConfig = {
          policyLevel: 'maximum',
          enableThreatDetection: true,
          enableRealTimeBlocking: true,
          customPolicyOverrides: {
            requestFiltering: {
              maxRequestSize: 1 * 1024 * 1024, // 1MB for admin
              allowedCountries: ['US', 'CA', 'GB'], // Restrict admin access
            },
            threatDetection: {
              confidenceThreshold: 30, // Very sensitive for admin
            },
          },
        };
        break;

      case 'public':
        customConfig = {
          policyLevel: 'strict',
          enableThreatDetection: true,
          enableRealTimeBlocking: true,
          customPolicyOverrides: {
            requestFiltering: {
              maxRequestSize: 2 * 1024 * 1024, // 2MB for public
            },
            botDetection: {
              enabled: true,
              challengeMode: false, // Don't challenge public users
            },
          },
        };
        break;

      case 'internal':
        customConfig = {
          policyLevel: 'minimal',
          enableThreatDetection: false,
          enableRealTimeBlocking: false,
          customPolicyOverrides: {
            requestFiltering: {
              maxRequestSize: 50 * 1024 * 1024, // 50MB for internal
              blockedUserAgents: [], // Allow all for internal
            },
          },
        };
        break;
    }

    // Create new middleware instance with custom config
    const middlewareConfig: SecurityMiddlewareConfig = {
      ...baseConfig,
      ...customConfig,
      loggerConfig: {
        ...baseConfig,
        logLevel: customConfig.logLevel || baseConfig.logLevel,
      },
    };

    return new UnifiedSecurityMiddleware(middlewareConfig);
  }

  /**
   * Reset security system
   */
  async reset(): Promise<void> {
    if (this.securityMiddleware) {
      this.securityMiddleware.destroy();
    }

    this.securityMiddleware = null;
    this.initialized = false;
    this.currentEnvironment = 'development';

    console.log('🔄 Security system reset');
  }

  /**
   * Export current configuration
   */
  exportConfiguration(): string {
    const config = {
      environment: this.currentEnvironment,
      timestamp: new Date().toISOString(),
      configuration: SECURITY_ENVIRONMENT_CONFIGS[this.currentEnvironment],
      stats: this.securityMiddleware?.getSecurityStats() || null,
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Health check for security system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    environment: string;
    initialized: boolean;
    components: Record<string, string>;
    issues: string[];
  }> {
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!this.initialized) {
      issues.push('Security system not initialized');
      status = 'unhealthy';
    }

    if (!this.securityMiddleware) {
      issues.push('Security middleware not available');
      status = 'unhealthy';
    }

    const components: Record<string, string> = {
      initialization: this.initialized ? 'healthy' : 'unhealthy',
      middleware: this.securityMiddleware ? 'healthy' : 'unhealthy',
      environment: this.currentEnvironment in SECURITY_ENVIRONMENT_CONFIGS ? 'healthy' : 'degraded',
    };

    if (this.securityMiddleware) {
      try {
        const stats = this.securityMiddleware.getSecurityStats();
        components.policyManager = stats.policy ? 'healthy' : 'degraded';
        components.threatDetection = stats.threats ? 'healthy' : 'degraded';
        components.logging = stats.logs ? 'healthy' : 'degraded';
      } catch (error) {
        issues.push('Failed to get security statistics');
        status = 'degraded';
      }
    }

    return {
      status,
      environment: this.currentEnvironment,
      initialized: this.initialized,
      components,
      issues,
    };
  }
}

/**
 * Convenience function to get initialized security middleware
 */
export async function getSecurityMiddleware(
  environment?: string
): Promise<UnifiedSecurityMiddleware> {
  const initializer = SecurityConfigInitializer.getInstance();
  return await initializer.initialize(environment);
}

/**
 * Convenience function to get security config initializer
 */
export function getSecurityConfigInitializer(): SecurityConfigInitializer {
  return SecurityConfigInitializer.getInstance();
}

/**
 * Create environment-specific security middleware
 */
export const createDevelopmentSecurityMiddleware = () => getSecurityMiddleware('development');
export const createProductionSecurityMiddleware = () => getSecurityMiddleware('production');
export const createTestingSecurityMiddleware = () => getSecurityMiddleware('test');
export const createHighSecurityMiddleware = () => getSecurityMiddleware('high-security');
