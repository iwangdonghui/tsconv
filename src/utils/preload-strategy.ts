/**
 * Preload Strategy for Code Splitting Optimization
 *
 * This module provides intelligent preloading strategies to improve
 * perceived performance by loading components before they're needed.
 */

// Component import functions for preloading
export const componentImports = {
  // Core tools (high priority)
  TimestampConverter: () => import('../components/TimestampConverter'),
  FormatTool: () => import('../components/FormatTool'),

  // Calculator tools (medium priority)
  WorkdaysCalculator: () => import('../components/WorkdaysCalculator'),
  DateDiffCalculator: () => import('../components/DateDiffCalculator'),
  TimezoneExplorer: () => import('../components/TimezoneExplorer'),

  // Documentation (low priority)
  ApiDocs: () => import('../components/ApiDocs'),
  EnhancedApiDocs: () => import('../components/EnhancedApiDocs'),
  Guide: () => import('../components/Guide'),
  HowTo: () => import('../components/HowTo'),

  // System pages (lowest priority)
  HealthPage: () => import('../components/HealthPage'),
};

// Preload priorities
export const preloadPriorities = {
  immediate: ['TimestampConverter'], // Load immediately after app start
  high: ['FormatTool', 'WorkdaysCalculator'], // Load on user interaction
  medium: ['DateDiffCalculator', 'TimezoneExplorer'], // Load on idle
  low: ['ApiDocs', 'Guide', 'HowTo'], // Load on demand
  background: ['EnhancedApiDocs', 'HealthPage'], // Load in background
};

// Route-based preloading map
export const routePreloadMap: Record<string, string[]> = {
  '/': ['FormatTool', 'WorkdaysCalculator'], // From home, likely to go to tools
  '/format': ['TimestampConverter', 'DateDiffCalculator'], // Related tools
  '/workdays': ['DateDiffCalculator', 'TimezoneExplorer'], // Related calculators
  '/date-diff': ['WorkdaysCalculator', 'TimezoneExplorer'], // Related calculators
  '/timezones': ['DateDiffCalculator', 'WorkdaysCalculator'], // Related tools
  '/api': ['ApiDocs', 'Guide'], // Documentation flow
  '/api-docs': ['EnhancedApiDocs', 'HowTo'], // Documentation flow
  '/guide': ['HowTo', 'ApiDocs'], // Documentation flow
  '/how-to': ['Guide', 'ApiDocs'], // Documentation flow
};

/**
 * Preloads a component
 */
export function preloadComponent(componentName: keyof typeof componentImports): Promise<any> {
  const importFn = componentImports[componentName];
  if (!importFn) {
    console.warn(`Component ${componentName} not found in preload map`);
    return Promise.resolve();
  }

  return importFn().catch(error => {
    console.warn(`Failed to preload component ${componentName}:`, error);
  });
}

/**
 * Preloads multiple components
 */
export function preloadComponents(componentNames: string[]): Promise<any[]> {
  const validNames = componentNames.filter(
    name => name in componentImports
  ) as (keyof typeof componentImports)[];

  return Promise.all(validNames.map(preloadComponent));
}

/**
 * Preloads components based on priority
 */
export function preloadByPriority(priority: keyof typeof preloadPriorities): Promise<any[]> {
  const components = preloadPriorities[priority];
  return preloadComponents(components);
}

/**
 * Preloads components based on current route
 */
export function preloadForRoute(currentPath: string): Promise<any[]> {
  const componentsToPreload = routePreloadMap[currentPath] || [];
  return preloadComponents(componentsToPreload);
}

/**
 * Intelligent preloading based on user behavior
 */
export class PreloadManager {
  private preloadedComponents = new Set<string>();
  // Reserved for future use - queue for preloading components
  // @ts-ignore - Will be used in future implementation
  private _preloadQueue: string[] = [];
  private isPreloading = false;

  constructor() {
    this.initializePreloading();
  }

  private async initializePreloading() {
    // Preload immediate priority components
    await this.preloadImmediate();

    // Set up idle preloading
    this.scheduleIdlePreloading();

    // Set up intersection observer for link preloading
    this.setupLinkPreloading();
  }

  private async preloadImmediate() {
    try {
      await preloadByPriority('immediate');
      preloadPriorities.immediate.forEach(component => {
        this.preloadedComponents.add(component);
      });
    } catch (error) {
      console.warn('Failed to preload immediate components:', error);
    }
  }

  private scheduleIdlePreloading() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadInBackground();
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        this.preloadInBackground();
      }, 2000);
    }
  }

  private async preloadInBackground() {
    if (this.isPreloading) return;
    this.isPreloading = true;

    try {
      // Preload high priority components
      await preloadByPriority('high');
      preloadPriorities.high.forEach(component => {
        this.preloadedComponents.add(component);
      });

      // Preload medium priority components
      await preloadByPriority('medium');
      preloadPriorities.medium.forEach(component => {
        this.preloadedComponents.add(component);
      });
    } catch (error) {
      console.warn('Failed to preload background components:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  private setupLinkPreloading() {
    // Preload components when user hovers over navigation links
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const link = entry.target as HTMLAnchorElement;
          const href = link.getAttribute('href');
          if (href) {
            this.preloadForRoute(href);
          }
        }
      });
    });

    // Observe navigation links
    document.querySelectorAll('a[href^="/"]').forEach(link => {
      observer.observe(link);
    });
  }

  public preloadForRoute(path: string): Promise<any[]> {
    const components = routePreloadMap[path] || [];
    const unloadedComponents = components.filter(
      component => !this.preloadedComponents.has(component)
    );

    if (unloadedComponents.length === 0) {
      return Promise.resolve([]);
    }

    return preloadComponents(unloadedComponents).then(results => {
      unloadedComponents.forEach(component => {
        this.preloadedComponents.add(component);
      });
      return results;
    });
  }

  public preloadComponent(componentName: string): Promise<any> {
    if (this.preloadedComponents.has(componentName)) {
      return Promise.resolve();
    }

    return preloadComponent(componentName as keyof typeof componentImports).then(result => {
      this.preloadedComponents.add(componentName);
      return result;
    });
  }

  public getPreloadedComponents(): string[] {
    return Array.from(this.preloadedComponents);
  }

  public isComponentPreloaded(componentName: string): boolean {
    return this.preloadedComponents.has(componentName);
  }
}

// Global preload manager instance
export const preloadManager = new PreloadManager();

// Hook for using preload manager in components
export function usePreloadManager() {
  return preloadManager;
}
