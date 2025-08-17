/**
 * Service Worker Registration and Management
 *
 * This module handles service worker registration, updates, and cache management.
 */

import React from 'react';
import logger from './logger';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface CacheInfo {
  name: string;
  size: number;
  entries: number;
}

class ServiceWorkerManager {
  private state: ServiceWorkerState = {
    isSupported: false,
    isRegistered: false,
    isOnline: navigator.onLine,
    updateAvailable: false,
    registration: null,
  };

  private listeners: Array<(state: ServiceWorkerState) => void> = [];

  constructor() {
    this.state.isSupported = 'serviceWorker' in navigator;
    this.setupOnlineListener();
  }

  /**
   * Registers the service worker
   */
  async register(): Promise<boolean> {
    if (!this.state.isSupported) {
      logger.warn('Service Worker not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.state.registration = registration;
      this.state.isRegistered = true;

      logger.info(
        'Service Worker registered successfully',
        registration as unknown as Record<string, unknown>
      );

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        this.handleUpdateFound(registration);
      });

      // Check for existing waiting service worker
      if (registration.waiting) {
        this.state.updateAvailable = true;
        this.notifyListeners();
      }

      this.notifyListeners();
      return true;
    } catch (error) {
      logger.error('Service Worker registration failed', error as Error);
      return false;
    }
  }

  /**
   * Unregisters the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.state.registration) {
      return false;
    }

    try {
      const result = await this.state.registration.unregister();
      if (result) {
        this.state.isRegistered = false;
        this.state.registration = null;
        this.state.updateAvailable = false;
        this.notifyListeners();
      }
      return result;
    } catch (error) {
      logger.error('Service Worker unregistration failed', error as Error);
      return false;
    }
  }

  /**
   * Updates the service worker
   */
  async update(): Promise<void> {
    if (!this.state.registration) {
      throw new Error('No service worker registration found');
    }

    try {
      await this.state.registration.update();
      logger.info('Service Worker update check completed');
    } catch (error) {
      logger.error('Service Worker update failed', error as Error);
      throw error;
    }
  }

  /**
   * Activates waiting service worker
   */
  async activateWaiting(): Promise<void> {
    if (!this.state.registration?.waiting) {
      throw new Error('No waiting service worker found');
    }

    // Send message to waiting service worker to skip waiting
    this.state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Listen for controlling change
    return new Promise(resolve => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.state.updateAvailable = false;
        this.notifyListeners();
        resolve();
      });
    });
  }

  /**
   * Gets cache information
   */
  async getCacheInfo(): Promise<CacheInfo[]> {
    if (!('caches' in window)) {
      return [];
    }

    try {
      const cacheNames = await caches.keys();
      const cacheInfos: CacheInfo[] = [];

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        let totalSize = 0;
        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }

        cacheInfos.push({
          name: cacheName,
          size: totalSize,
          entries: keys.length,
        });
      }

      return cacheInfos;
    } catch (error) {
      logger.error('Failed to get cache info', error as Error);
      return [];
    }
  }

  /**
   * Clears all caches
   */
  async clearCaches(): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      logger.info('All caches cleared');
      return true;
    } catch (error) {
      logger.error('Failed to clear caches', error as Error);
      return false;
    }
  }

  /**
   * Clears specific cache
   */
  async clearCache(cacheName: string): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const result = await caches.delete(cacheName);
      logger.info(`Cache ${cacheName} cleared`, result as unknown as Record<string, unknown>);
      return result;
    } catch (error) {
      logger.error(`Failed to clear cache ${cacheName}`, error as Error);
      return false;
    }
  }

  /**
   * Preloads critical resources
   */
  async preloadCriticalResources(urls: string[]): Promise<void> {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cache = await caches.open('tsconv-preload');

      await Promise.all(
        urls.map(async url => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              logger.info('Preloaded', { url });
            }
          } catch (error) {
            logger.warn('Failed to preload', { url, error: String(error) });
          }
        })
      );
    } catch (error) {
      console.error('Preload failed:', error);
    }
  }

  /**
   * Gets current state
   */
  getState(): ServiceWorkerState {
    return { ...this.state };
  }

  /**
   * Adds state change listener
   */
  addListener(listener: (state: ServiceWorkerState) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Handles service worker update found
   */
  private handleUpdateFound(registration: ServiceWorkerRegistration): void {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New service worker is available
        this.state.updateAvailable = true;
        this.notifyListeners();
        logger.info('New service worker available');
      }
    });
  }

  /**
   * Sets up online/offline listener
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.notifyListeners();
    });
  }

  /**
   * Notifies all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        logger.error('Service worker listener error', error as Error);
      }
    });
  }
}

// Global service worker manager instance
export const serviceWorkerManager = new ServiceWorkerManager();

/**
 * React hook for service worker state
 */
export function useServiceWorker() {
  const [state, setState] = React.useState(serviceWorkerManager.getState());

  React.useEffect(() => {
    const unsubscribe = serviceWorkerManager.addListener(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    register: () => serviceWorkerManager.register(),
    unregister: () => serviceWorkerManager.unregister(),
    update: () => serviceWorkerManager.update(),
    activateWaiting: () => serviceWorkerManager.activateWaiting(),
    getCacheInfo: () => serviceWorkerManager.getCacheInfo(),
    clearCaches: () => serviceWorkerManager.clearCaches(),
    clearCache: (name: string) => serviceWorkerManager.clearCache(name),
    preloadCriticalResources: (urls: string[]) =>
      serviceWorkerManager.preloadCriticalResources(urls),
  };
}

/**
 * Utility function to format cache size
 */
export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Checks if the app is running in standalone mode (PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Gets network information (if available)
 */
export function getNetworkInfo(): { effectiveType?: string; downlink?: number; rtt?: number } {
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (!connection) {
    return {};
  }

  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
  };
}

// Auto-register service worker in production
if (process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    serviceWorkerManager.register().then(success => {
      if (success) {
        logger.info('Service Worker registered successfully');
      }
    });
  });
}
