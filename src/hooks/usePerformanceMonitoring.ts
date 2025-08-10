/**
 * Performance Monitoring Hook
 * 
 * React hook for integrating performance monitoring into components
 */

import { useEffect, useCallback, useRef } from 'react';
import { markTiming, measureTiming, trackApiResponseTime, getPerformanceMonitor } from '../lib/performance-monitoring';

interface UsePerformanceMonitoringOptions {
  componentName?: string;
  trackRenders?: boolean;
  trackEffects?: boolean;
  trackApiCalls?: boolean;
}

interface PerformanceHookReturn {
  markStart: (name: string) => void;
  markEnd: (name: string) => void;
  measureTime: (name: string, startMark: string, endMark?: string) => void;
  trackApi: (endpoint: string, duration: number) => void;
  startApiTimer: (endpoint: string) => () => void;
}

/**
 * Hook for performance monitoring in React components
 */
export function usePerformanceMonitoring(
  options: UsePerformanceMonitoringOptions = {}
): PerformanceHookReturn {
  const {
    componentName = 'UnknownComponent',
    trackRenders = false,
    trackEffects = false,
    trackApiCalls = true,
  } = options;

  const renderCount = useRef(0);
  const mountTime = useRef<number>(0);

  // Track component mount/unmount
  useEffect(() => {
    mountTime.current = performance.now();
    
    if (trackEffects) {
      markTiming(`${componentName}-mount-start`);
    }

    return () => {
      if (trackEffects) {
        markTiming(`${componentName}-unmount`);
        measureTiming(
          `${componentName}-lifecycle`,
          `${componentName}-mount-start`,
          `${componentName}-unmount`
        );
      }
    };
  }, [componentName, trackEffects]);

  // Track renders
  useEffect(() => {
    renderCount.current += 1;
    
    if (trackRenders) {
      const renderMark = `${componentName}-render-${renderCount.current}`;
      markTiming(renderMark);
      
      // Measure time since mount for first render
      if (renderCount.current === 1 && mountTime.current > 0) {
        const timeSinceMount = performance.now() - mountTime.current;
        console.log(`🎨 ${componentName} first render took ${timeSinceMount.toFixed(2)}ms`);
      }
    }
  });

  // Mark timing point
  const markStart = useCallback((name: string) => {
    markTiming(`${componentName}-${name}-start`);
  }, [componentName]);

  const markEnd = useCallback((name: string) => {
    markTiming(`${componentName}-${name}-end`);
  }, [componentName]);

  // Measure time between marks
  const measureTime = useCallback((name: string, startMark: string, endMark?: string) => {
    const fullName = `${componentName}-${name}`;
    const fullStartMark = startMark.includes(componentName) ? startMark : `${componentName}-${startMark}`;
    const fullEndMark = endMark ? (endMark.includes(componentName) ? endMark : `${componentName}-${endMark}`) : undefined;
    
    measureTiming(fullName, fullStartMark, fullEndMark);
  }, [componentName]);

  // Track API response time
  const trackApi = useCallback((endpoint: string, duration: number) => {
    if (trackApiCalls) {
      trackApiResponseTime(endpoint, duration);
    }
  }, [trackApiCalls]);

  // Start API timer (returns a function to end the timer)
  const startApiTimer = useCallback((endpoint: string) => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      trackApi(endpoint, duration);
      return duration;
    };
  }, [trackApi]);

  return {
    markStart,
    markEnd,
    measureTime,
    trackApi,
    startApiTimer,
  };
}

/**
 * Hook for monitoring async operations
 */
export function useAsyncPerformanceMonitoring() {
  const trackAsyncOperation = useCallback(async <T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const startMark = `async-${name}-start`;
    const endMark = `async-${name}-end`;
    
    markTiming(startMark);
    
    try {
      const result = await operation();
      markTiming(endMark);
      measureTiming(`async-${name}`, startMark, endMark);
      return result;
    } catch (error) {
      markTiming(endMark);
      measureTiming(`async-${name}-error`, startMark, endMark);
      throw error;
    }
  }, []);

  return { trackAsyncOperation };
}

/**
 * Hook for monitoring fetch requests
 */
export function useFetchPerformanceMonitoring() {
  const trackFetch = useCallback(async (
    url: string,
    options?: RequestInit
  ): Promise<Response> => {
    const endpoint = new URL(url, window.location.origin).pathname;
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, options);
      const duration = performance.now() - startTime;
      
      // Track API response time
      trackApiResponseTime(endpoint, duration);
      
      // Log slow requests
      if (duration > 1000) {
        console.warn(`🐌 Slow API request: ${endpoint} took ${duration.toFixed(2)}ms`);
      }
      
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      trackApiResponseTime(`${endpoint}-error`, duration);
      throw error;
    }
  }, []);

  return { trackFetch };
}

/**
 * Hook for monitoring component re-renders
 */
export function useRenderPerformanceMonitoring(componentName: string, dependencies: any[] = []) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef<number>(0);
  const previousDeps = useRef<any[]>([]);

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = performance.now();
    
    // Calculate time since last render
    const timeSinceLastRender = lastRenderTime.current > 0 ? currentTime - lastRenderTime.current : 0;
    lastRenderTime.current = currentTime;
    
    // Check which dependencies changed
    const changedDeps: number[] = [];
    dependencies.forEach((dep, index) => {
      if (previousDeps.current[index] !== dep) {
        changedDeps.push(index);
      }
    });
    previousDeps.current = [...dependencies];
    
    // Log render information
    if (renderCount.current > 1) {
      console.log(`🔄 ${componentName} render #${renderCount.current}`, {
        timeSinceLastRender: timeSinceLastRender.toFixed(2) + 'ms',
        changedDependencies: changedDeps,
        totalDependencies: dependencies.length,
      });
      
      // Warn about frequent re-renders
      if (timeSinceLastRender < 16) { // Less than one frame (60fps)
        console.warn(`⚡ ${componentName} is re-rendering very frequently (${timeSinceLastRender.toFixed(2)}ms since last render)`);
      }
    }
  }, dependencies);

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current,
  };
}

/**
 * Hook for monitoring memory usage
 */
export function useMemoryMonitoring(intervalMs: number = 30000) {
  useEffect(() => {
    if (!('memory' in performance)) {
      console.warn('Memory monitoring not supported in this browser');
      return;
    }

    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        const usagePercent = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        
        console.log(`💾 Memory usage: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`);
        
        // Warn about high memory usage
        if (usagePercent > 80) {
          console.warn(`🚨 High memory usage detected: ${usagePercent}%`);
        }
      }
    };

    const interval = setInterval(checkMemory, intervalMs);
    checkMemory(); // Initial check

    return () => clearInterval(interval);
  }, [intervalMs]);
}

/**
 * Hook for monitoring Web Vitals in components
 */
export function useWebVitalsMonitoring() {
  useEffect(() => {
    const monitor = getPerformanceMonitor();
    if (!monitor) {
      console.warn('Performance monitor not initialized');
      return;
    }

    // Log current Web Vitals
    const summary = monitor.getPerformanceSummary();
    console.log('📊 Current Web Vitals:', summary.webVitals);
  }, []);

  const getWebVitals = useCallback(() => {
    const monitor = getPerformanceMonitor();
    return monitor ? monitor.getPerformanceSummary().webVitals : {};
  }, []);

  return { getWebVitals };
}
