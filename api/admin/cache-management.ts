/**
 * Cache Management API
 * Provides endpoints for managing cache strategies and monitoring performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { CacheStrategyManager, CacheStrategyType, CACHE_STRATEGY_PROFILES } from '../services/cache/cache-strategy-config';
import { StrategicCacheService } from '../services/cache/cache-strategy-applier';

// Global instances
let strategyManager: CacheStrategyManager;
let strategicCache: StrategicCacheService;

// Initialize cache management
function initializeCacheManagement() {
  if (!strategyManager) {
    strategyManager = new CacheStrategyManager();
    strategicCache = new StrategicCacheService(strategyManager);
  }
}

/**
 * GET /api/admin/cache-management
 * Get current cache configuration and statistics
 */
export async function GET(request: NextRequest) {
  try {
    initializeCacheManagement();
    
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    switch (action) {
      case 'config':
        return NextResponse.json({
          success: true,
          data: {
            currentConfig: strategyManager.getCurrentConfig(),
            availableStrategies: strategyManager.getAvailableStrategies(),
            performanceSummary: strategyManager.getPerformanceSummary()
          }
        });
        
      case 'stats':
        const stats = await strategicCache.stats();
        return NextResponse.json({
          success: true,
          data: stats
        });
        
      case 'health':
        const health = await strategicCache.healthCheck();
        return NextResponse.json({
          success: true,
          data: health
        });
        
      case 'strategies':
        return NextResponse.json({
          success: true,
          data: {
            profiles: CACHE_STRATEGY_PROFILES,
            current: strategyManager.getGlobalStrategy()
          }
        });
        
      default:
        return NextResponse.json({
          success: true,
          data: {
            config: strategyManager.getCurrentConfig(),
            stats: await strategicCache.stats(),
            health: await strategicCache.healthCheck()
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
 * POST /api/admin/cache-management
 * Update cache configuration
 */
export async function POST(request: NextRequest) {
  try {
    initializeCacheManagement();
    
    const body = await request.json();
    const { action, ...data } = body;
    
    switch (action) {
      case 'updateGlobalStrategy':
        const { strategy } = data as { strategy: CacheStrategyType };
        if (!CACHE_STRATEGY_PROFILES[strategy]) {
          return NextResponse.json({
            success: false,
            error: `Invalid strategy: ${strategy}`
          }, { status: 400 });
        }
        
        strategyManager.updateGlobalStrategy(strategy);
        return NextResponse.json({
          success: true,
          message: `Global strategy updated to ${strategy}`,
          data: { strategy }
        });
        
      case 'updateEndpointStrategy':
        const { endpoint, strategy: endpointStrategy, customConfig } = data as {
          endpoint: string;
          strategy: CacheStrategyType;
          customConfig?: Record<string, unknown>;
        };
        
        if (!CACHE_STRATEGY_PROFILES[endpointStrategy]) {
          return NextResponse.json({
            success: false,
            error: `Invalid strategy: ${endpointStrategy}`
          }, { status: 400 });
        }
        
        strategyManager.updateEndpointStrategy(endpoint, endpointStrategy, customConfig);
        strategicCache.updateStrategy(endpoint, endpointStrategy);
        
        return NextResponse.json({
          success: true,
          message: `Strategy for ${endpoint} updated to ${endpointStrategy}`,
          data: { endpoint, strategy: endpointStrategy, customConfig }
        });
        
      case 'updateConfig':
        const { config } = data;
        strategyManager.updateConfig(config);
        
        return NextResponse.json({
          success: true,
          message: 'Configuration updated successfully',
          data: { config: strategyManager.getCurrentConfig() }
        });
        
      case 'importConfig':
        const { configJson } = data as { configJson: string };
        strategyManager.importConfig(configJson);
        
        return NextResponse.json({
          success: true,
          message: 'Configuration imported successfully',
          data: { config: strategyManager.getCurrentConfig() }
        });
        
      case 'clearCache':
        const { pattern } = data as { pattern?: string };
        await strategicCache.clear(pattern);
        
        return NextResponse.json({
          success: true,
          message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All cache cleared',
          data: { pattern }
        });
        
      case 'flushCache':
        await strategicCache.flush();
        
        return NextResponse.json({
          success: true,
          message: 'All cache flushed successfully'
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
 * PUT /api/admin/cache-management
 * Bulk update cache configurations
 */
export async function PUT(request: NextRequest) {
  try {
    initializeCacheManagement();
    
    const body = await request.json();
    const { endpointConfigs } = body;
    
    if (!Array.isArray(endpointConfigs)) {
      return NextResponse.json({
        success: false,
        error: 'endpointConfigs must be an array'
      }, { status: 400 });
    }
    
    const results = [];
    
    for (const config of endpointConfigs) {
      try {
        const { endpoint, strategy, customConfig } = config;
        
        if (!CACHE_STRATEGY_PROFILES[strategy]) {
          results.push({
            endpoint,
            success: false,
            error: `Invalid strategy: ${strategy}`
          });
          continue;
        }
        
        strategyManager.updateEndpointStrategy(endpoint, strategy, customConfig);
        strategicCache.updateStrategy(endpoint, strategy);
        
        results.push({
          endpoint,
          success: true,
          strategy
        });
        
      } catch (error) {
        results.push({
          endpoint: config.endpoint,
          success: false,
          error: (error as Error).message
        });
      }
    }
    
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
 * DELETE /api/admin/cache-management
 * Remove endpoint-specific configurations
 */
export async function DELETE(request: NextRequest) {
  try {
    initializeCacheManagement();
    
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');
    const tag = url.searchParams.get('tag');
    
    if (endpoint) {
      // Remove endpoint-specific configuration
      const currentConfig = strategyManager.getCurrentConfig();
      const updatedEndpointConfigs = currentConfig.endpointConfigs.filter(
        config => config.endpoint !== endpoint
      );
      
      strategyManager.updateConfig({
        ...currentConfig,
        endpointConfigs: updatedEndpointConfigs
      });
      
      return NextResponse.json({
        success: true,
        message: `Configuration for ${endpoint} removed`,
        data: { endpoint }
      });
      
    } else if (tag) {
      // Delete cache entries by tag
      const deletedCount = await strategicCache.deleteByTag(tag);
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} cache entries with tag: ${tag}`,
        data: { tag, deletedCount }
      });
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either endpoint or tag parameter is required'
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
 * PATCH /api/admin/cache-management
 * Partial updates to cache configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    initializeCacheManagement();
    
    const body = await request.json();
    const { action, ...data } = body;
    
    switch (action) {
      case 'toggleAutoOptimization':
        const currentConfig = strategyManager.getCurrentConfig();
        const newAutoOptimization = {
          ...currentConfig.autoOptimization,
          enabled: !currentConfig.autoOptimization.enabled
        };
        
        strategyManager.updateConfig({
          ...currentConfig,
          autoOptimization: newAutoOptimization
        });
        
        return NextResponse.json({
          success: true,
          message: `Auto-optimization ${newAutoOptimization.enabled ? 'enabled' : 'disabled'}`,
          data: { autoOptimization: newAutoOptimization }
        });
        
      case 'updateThresholds':
        const { thresholds } = data;
        const config = strategyManager.getCurrentConfig();
        
        strategyManager.updateConfig({
          ...config,
          autoOptimization: {
            ...config.autoOptimization,
            performanceThresholds: {
              ...config.autoOptimization.performanceThresholds,
              ...thresholds
            }
          }
        });
        
        return NextResponse.json({
          success: true,
          message: 'Performance thresholds updated',
          data: { thresholds }
        });
        
      case 'updateMonitoring':
        const { monitoring } = data;
        const monitoringConfig = strategyManager.getCurrentConfig();
        
        strategyManager.updateConfig({
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

// Export the strategic cache service for use in other parts of the application
export { strategicCache, strategyManager };
