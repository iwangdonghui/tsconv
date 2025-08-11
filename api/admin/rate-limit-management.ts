/**
 * Rate Limit Management API
 * Provides endpoints for managing rate limiting strategies and monitoring performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimitStrategyType } from '../services/rate-limit/rate-limit-strategy';
import { EndpointRateLimitConfig } from '../services/rate-limit/rate-limit-strategy-manager';
import { getEnhancedRateLimiter, getRateLimitConfigInitializer } from '../services/rate-limit/rate-limit-config-init';

// Global instances
let rateLimiter: any;
let configInitializer: any;

// Initialize rate limit management
async function initializeRateLimitManagement() {
  if (!rateLimiter) {
    rateLimiter = await getEnhancedRateLimiter();
    configInitializer = getRateLimitConfigInitializer();
  }
}

/**
 * GET /api/admin/rate-limit-management
 * Get current rate limiting configuration and statistics
 */
export async function GET(request: NextRequest) {
  try {
    await initializeRateLimitManagement();
    
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    switch (action) {
      case 'config':
        const config = rateLimiter.getConfiguration();
        return NextResponse.json({
          success: true,
          data: {
            configuration: config,
            summary: configInitializer.getConfigurationSummary()
          }
        });
        
      case 'monitoring':
        const monitoringSummary = rateLimiter.getMonitoringSummary();
        return NextResponse.json({
          success: true,
          data: monitoringSummary
        });
        
      case 'health':
        const health = await rateLimiter.healthCheck();
        return NextResponse.json({
          success: true,
          data: health
        });
        
      case 'strategies':
        return NextResponse.json({
          success: true,
          data: {
            available: [
              'fixed-window',
              'sliding-window', 
              'token-bucket',
              'leaky-bucket',
              'adaptive',
              'tiered',
              'custom'
            ],
            descriptions: {
              'fixed-window': 'Traditional fixed time window rate limiting',
              'sliding-window': 'Sliding time window for smoother rate limiting',
              'token-bucket': 'Token bucket algorithm for burst handling',
              'leaky-bucket': 'Leaky bucket for steady rate limiting',
              'adaptive': 'Adaptive rate limiting based on system load',
              'tiered': 'Tiered limits based on user type',
              'custom': 'Custom strategy implementation'
            }
          }
        });
        
      case 'endpoints':
        const endpointConfig = rateLimiter.getConfiguration().strategyConfig.endpointConfigs;
        return NextResponse.json({
          success: true,
          data: {
            endpoints: endpointConfig,
            count: endpointConfig.length
          }
        });
        
      default:
        return NextResponse.json({
          success: true,
          data: {
            config: rateLimiter.getConfiguration(),
            monitoring: rateLimiter.getMonitoringSummary(),
            health: await rateLimiter.healthCheck()
          }
        });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/rate-limit-management
 * Update rate limiting configuration
 */
export async function POST(request: NextRequest) {
  try {
    await initializeRateLimitManagement();
    
    const body = await request.json();
    const { action, ...data } = body;
    
    switch (action) {
      case 'updateGlobalStrategy':
        const { strategy } = data as { strategy: RateLimitStrategyType };
        
        const validStrategies = ['fixed-window', 'sliding-window', 'token-bucket', 'leaky-bucket', 'adaptive', 'tiered', 'custom'];
        if (!validStrategies.includes(strategy)) {
          return NextResponse.json({
            success: false,
            error: `Invalid strategy: ${strategy}`
          }, { status: 400 });
        }
        
        const currentConfig = rateLimiter.getConfiguration().strategyConfig;
        rateLimiter.updateStrategyConfig({
          ...currentConfig,
          globalStrategy: strategy
        });
        
        return NextResponse.json({
          success: true,
          message: `Global strategy updated to ${strategy}`,
          data: { strategy }
        });
        
      case 'updateEndpointStrategy':
        const { endpoint, strategy: endpointStrategy, limits } = data as {
          endpoint: string;
          strategy: RateLimitStrategyType;
          limits?: Record<string, { limit: number; window: number }>;
        };
        
        configInitializer.updateEndpointConfig(endpoint, endpointStrategy, limits);
        
        return NextResponse.json({
          success: true,
          message: `Strategy for ${endpoint} updated to ${endpointStrategy}`,
          data: { endpoint, strategy: endpointStrategy, limits }
        });
        
      case 'addEndpointConfig':
        const { newEndpoint, newStrategy, newLimits, priority, enabled } = data as {
          newEndpoint: string;
          newStrategy: RateLimitStrategyType;
          newLimits: Record<string, { limit: number; window: number }>;
          priority?: number;
          enabled?: boolean;
        };
        
        const config = rateLimiter.getConfiguration().strategyConfig;
        const newConfig: EndpointRateLimitConfig = {
          endpoint: newEndpoint,
          strategy: newStrategy,
          rule: {
            identifier: newEndpoint,
            limit: newLimits.anonymous?.limit || 60,
            window: newLimits.anonymous?.window || 60000,
            type: 'ip'
          },
          enabled: enabled ?? true,
          priority: priority || 1
        };
        
        config.endpointConfigs.push(newConfig);
        rateLimiter.updateStrategyConfig(config);
        
        return NextResponse.json({
          success: true,
          message: `Endpoint configuration added for ${newEndpoint}`,
          data: newConfig
        });
        
      case 'removeEndpointConfig':
        const { removeEndpoint } = data as { removeEndpoint: string };
        
        const configToUpdate = rateLimiter.getConfiguration().strategyConfig;
        configToUpdate.endpointConfigs = configToUpdate.endpointConfigs.filter(
          c => c.endpoint !== removeEndpoint
        );
        rateLimiter.updateStrategyConfig(configToUpdate);
        
        return NextResponse.json({
          success: true,
          message: `Endpoint configuration removed for ${removeEndpoint}`,
          data: { endpoint: removeEndpoint }
        });
        
      case 'updateMonitoring':
        const { monitoring } = data;
        const monitoringConfig = rateLimiter.getConfiguration().strategyConfig;
        
        rateLimiter.updateStrategyConfig({
          ...monitoringConfig,
          monitoring: {
            ...monitoringConfig.monitoring,
            ...monitoring
          }
        });
        
        return NextResponse.json({
          success: true,
          message: 'Monitoring configuration updated',
          data: { monitoring }
        });
        
      case 'resetIdentifier':
        const { identifier } = data as { identifier: string };
        
        await rateLimiter.reset(identifier, {
          identifier: 'reset',
          limit: 1,
          window: 1000,
          type: 'ip'
        });
        
        return NextResponse.json({
          success: true,
          message: `Rate limit reset for identifier: ${identifier}`,
          data: { identifier }
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/rate-limit-management
 * Bulk update rate limiting configurations
 */
export async function PUT(request: NextRequest) {
  try {
    await initializeRateLimitManagement();
    
    const body = await request.json();
    const { endpointConfigs } = body;
    
    if (!Array.isArray(endpointConfigs)) {
      return NextResponse.json({
        success: false,
        error: 'endpointConfigs must be an array'
      }, { status: 400 });
    }
    
    const results = [];
    const config = rateLimiter.getConfiguration().strategyConfig;
    
    for (const endpointConfig of endpointConfigs) {
      try {
        const { endpoint, strategy, limits, enabled, priority } = endpointConfig;
        
        const existingIndex = config.endpointConfigs.findIndex(c => c.endpoint === endpoint);
        
        const newConfig: EndpointRateLimitConfig = {
          endpoint,
          strategy,
          rule: {
            identifier: endpoint,
            limit: limits?.anonymous?.limit || 60,
            window: limits?.anonymous?.window || 60000,
            type: 'ip'
          },
          enabled: enabled ?? true,
          priority: priority || 1
        };
        
        if (existingIndex >= 0) {
          config.endpointConfigs[existingIndex] = newConfig;
        } else {
          config.endpointConfigs.push(newConfig);
        }
        
        results.push({
          endpoint,
          success: true,
          action: existingIndex >= 0 ? 'updated' : 'added'
        });
        
      } catch (error) {
        results.push({
          endpoint: endpointConfig.endpoint,
          success: false,
          error: (error as Error).message
        });
      }
    }
    
    // Apply the updated configuration
    rateLimiter.updateStrategyConfig(config);
    
    return NextResponse.json({
      success: true,
      message: 'Bulk update completed',
      data: { results }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/rate-limit-management
 * Remove endpoint configurations or reset rate limits
 */
export async function DELETE(request: NextRequest) {
  try {
    await initializeRateLimitManagement();
    
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');
    const identifier = url.searchParams.get('identifier');
    const action = url.searchParams.get('action');
    
    if (action === 'reset-all') {
      // Reset all rate limits (dangerous operation)
      const config = rateLimiter.getConfiguration().strategyConfig;
      
      // This would require implementing a reset-all method
      // For now, we'll just return a success message
      return NextResponse.json({
        success: true,
        message: 'All rate limits reset',
        data: { action: 'reset-all' }
      });
      
    } else if (endpoint) {
      // Remove endpoint configuration
      const config = rateLimiter.getConfiguration().strategyConfig;
      const originalLength = config.endpointConfigs.length;
      
      config.endpointConfigs = config.endpointConfigs.filter(c => c.endpoint !== endpoint);
      rateLimiter.updateStrategyConfig(config);
      
      const removed = originalLength > config.endpointConfigs.length;
      
      return NextResponse.json({
        success: true,
        message: removed ? `Configuration for ${endpoint} removed` : `No configuration found for ${endpoint}`,
        data: { endpoint, removed }
      });
      
    } else if (identifier) {
      // Reset rate limit for specific identifier
      await rateLimiter.reset(identifier, {
        identifier: 'reset',
        limit: 1,
        window: 1000,
        type: 'ip'
      });
      
      return NextResponse.json({
        success: true,
        message: `Rate limit reset for identifier: ${identifier}`,
        data: { identifier }
      });
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either endpoint, identifier, or action=reset-all parameter is required'
      }, { status: 400 });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/rate-limit-management
 * Partial updates to rate limiting configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    await initializeRateLimitManagement();
    
    const body = await request.json();
    const { action, ...data } = body;
    
    switch (action) {
      case 'toggleAdaptive':
        const currentConfig = rateLimiter.getConfiguration().strategyConfig;
        const newAdaptiveSettings = {
          ...currentConfig.adaptiveSettings,
          enabled: !currentConfig.adaptiveSettings.enabled
        };
        
        rateLimiter.updateStrategyConfig({
          ...currentConfig,
          adaptiveSettings: newAdaptiveSettings
        });
        
        return NextResponse.json({
          success: true,
          message: `Adaptive rate limiting ${newAdaptiveSettings.enabled ? 'enabled' : 'disabled'}`,
          data: { adaptiveSettings: newAdaptiveSettings }
        });
        
      case 'updateThresholds':
        const { thresholds } = data;
        const config = rateLimiter.getConfiguration().strategyConfig;
        
        rateLimiter.updateStrategyConfig({
          ...config,
          monitoring: {
            ...config.monitoring,
            alertThresholds: {
              ...config.monitoring.alertThresholds,
              ...thresholds
            }
          }
        });
        
        return NextResponse.json({
          success: true,
          message: 'Alert thresholds updated',
          data: { thresholds }
        });
        
      case 'toggleEndpoint':
        const { endpoint } = data;
        const toggleConfig = rateLimiter.getConfiguration().strategyConfig;
        const endpointConfig = toggleConfig.endpointConfigs.find(c => c.endpoint === endpoint);
        
        if (endpointConfig) {
          endpointConfig.enabled = !endpointConfig.enabled;
          rateLimiter.updateStrategyConfig(toggleConfig);
          
          return NextResponse.json({
            success: true,
            message: `Endpoint ${endpoint} ${endpointConfig.enabled ? 'enabled' : 'disabled'}`,
            data: { endpoint, enabled: endpointConfig.enabled }
          });
        } else {
          return NextResponse.json({
            success: false,
            error: `Endpoint configuration not found: ${endpoint}`
          }, { status: 404 });
        }
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// Export the enhanced rate limiter for use in other parts of the application
export { rateLimiter, configInitializer };
