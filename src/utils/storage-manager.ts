/**
 * Storage Manager - Optimized Local Storage with Compression and TTL
 * 
 * This module provides an enhanced localStorage interface with:
 * - Automatic compression for large data
 * - TTL (Time To Live) support
 * - Storage quota management
 * - Fallback strategies
 */

interface StorageItem<T = any> {
  data: T;
  timestamp: number;
  ttl?: number;
  compressed?: boolean;
}

interface StorageOptions {
  ttl?: number; // Time to live in milliseconds
  compress?: boolean; // Whether to compress large data
  namespace?: string; // Storage namespace
}

interface StorageInfo {
  used: number;
  available: number;
  quota: number;
  items: Array<{
    key: string;
    size: number;
    age: number;
    hasExpired: boolean;
  }>;
}

class StorageManager {
  private namespace: string;
  private compressionThreshold: number = 1024; // Compress data larger than 1KB

  constructor(namespace: string = 'tsconv') {
    this.namespace = namespace;
  }

  /**
   * Sets an item in storage with optional TTL and compression
   */
  setItem<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    try {
      const fullKey = this.getFullKey(key);
      const now = Date.now();
      
      let dataToStore: T | string = value;
      let compressed = false;

      // Serialize the data
      const serialized = JSON.stringify(value);

      // Compress if data is large and compression is enabled
      if (options.compress !== false && serialized.length > this.compressionThreshold) {
        try {
          dataToStore = this.compress(serialized) as T;
          compressed = true;
        } catch (error) {
          console.warn('Compression failed, storing uncompressed:', error);
        }
      }

      const storageItem: StorageItem<T> = {
        data: dataToStore,
        timestamp: now,
        ttl: options.ttl,
        compressed
      };

      localStorage.setItem(fullKey, JSON.stringify(storageItem));
      return true;

    } catch (error) {
      console.error('Failed to set storage item:', error);
      
      // Try to free up space and retry
      if (this.isQuotaExceeded(error)) {
        this.cleanup();
        try {
          const fullKey = this.getFullKey(key);
          const storageItem: StorageItem<T> = {
            data: value,
            timestamp: Date.now(),
            ttl: options.ttl
          };
          localStorage.setItem(fullKey, JSON.stringify(storageItem));
          return true;
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }
      
      return false;
    }
  }

  /**
   * Gets an item from storage, checking TTL and decompressing if needed
   */
  getItem<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const fullKey = this.getFullKey(key);
      const stored = localStorage.getItem(fullKey);
      
      if (!stored) {
        return defaultValue;
      }

      const storageItem: StorageItem<T> = JSON.parse(stored);
      const now = Date.now();

      // Check if item has expired
      if (storageItem.ttl && (now - storageItem.timestamp) > storageItem.ttl) {
        this.removeItem(key);
        return defaultValue;
      }

      // Decompress if needed
      if (storageItem.compressed) {
        try {
          const decompressed = this.decompress(storageItem.data as string);
          return JSON.parse(decompressed);
        } catch (error) {
          console.error('Decompression failed:', error);
          this.removeItem(key);
          return defaultValue;
        }
      }

      return storageItem.data;

    } catch (error) {
      console.error('Failed to get storage item:', error);
      return defaultValue;
    }
  }

  /**
   * Removes an item from storage
   */
  removeItem(key: string): boolean {
    try {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Failed to remove storage item:', error);
      return false;
    }
  }

  /**
   * Checks if an item exists and is not expired
   */
  hasItem(key: string): boolean {
    const fullKey = this.getFullKey(key);
    const stored = localStorage.getItem(fullKey);
    
    if (!stored) {
      return false;
    }

    try {
      const storageItem: StorageItem = JSON.parse(stored);
      const now = Date.now();

      // Check if expired
      if (storageItem.ttl && (now - storageItem.timestamp) > storageItem.ttl) {
        this.removeItem(key);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets all keys in the namespace
   */
  getKeys(): string[] {
    const keys: string[] = [];
    const prefix = `${this.namespace}:`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }
    
    return keys;
  }

  /**
   * Clears all items in the namespace
   */
  clear(): boolean {
    try {
      const keys = this.getKeys();
      keys.forEach(key => this.removeItem(key));
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Gets storage information and usage
   */
  async getStorageInfo(): Promise<StorageInfo> {
    const info: StorageInfo = {
      used: 0,
      available: 0,
      quota: 0,
      items: []
    };

    // Get storage quota (if available)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        info.quota = estimate.quota || 0;
        info.used = estimate.usage || 0;
        info.available = info.quota - info.used;
      } catch (error) {
        console.warn('Storage estimate not available:', error);
      }
    }

    // Calculate localStorage usage for this namespace
    const keys = this.getKeys();
    const now = Date.now();

    keys.forEach(key => {
      try {
        const fullKey = this.getFullKey(key);
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          const storageItem: StorageItem = JSON.parse(stored);
          const size = new Blob([stored]).size;
          const age = now - storageItem.timestamp;
          const hasExpired = storageItem.ttl ? age > storageItem.ttl : false;

          info.items.push({
            key,
            size,
            age,
            hasExpired
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze storage item ${key}:`, error);
      }
    });

    return info;
  }

  /**
   * Cleans up expired items and optionally frees space
   */
  cleanup(freeSpaceKB?: number): number {
    const keys = this.getKeys();
    let freedSpace = 0;
    let removedCount = 0;

    // Remove expired items first
    keys.forEach(key => {
      try {
        const fullKey = this.getFullKey(key);
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          const storageItem: StorageItem = JSON.parse(stored);
          const now = Date.now();

          if (storageItem.ttl && (now - storageItem.timestamp) > storageItem.ttl) {
            const size = new Blob([stored]).size;
            this.removeItem(key);
            freedSpace += size;
            removedCount++;
          }
        }
      } catch (error) {
        // Remove corrupted items
        this.removeItem(key);
        removedCount++;
      }
    });

    // If we need to free more space, remove oldest items
    if (freeSpaceKB && freedSpace < freeSpaceKB * 1024) {
      const remainingKeys = this.getKeys();
      const itemsWithAge = remainingKeys.map(key => {
        const fullKey = this.getFullKey(key);
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          try {
            const storageItem: StorageItem = JSON.parse(stored);
            return {
              key,
              age: Date.now() - storageItem.timestamp,
              size: new Blob([stored]).size
            };
          } catch (error) {
            return { key, age: 0, size: 0 };
          }
        }
        return { key, age: 0, size: 0 };
      }).sort((a, b) => b.age - a.age); // Sort by age (oldest first)

      for (const item of itemsWithAge) {
        if (freedSpace >= freeSpaceKB * 1024) break;
        
        this.removeItem(item.key);
        freedSpace += item.size;
        removedCount++;
      }
    }

    console.log(`Cleanup completed: ${removedCount} items removed, ${freedSpace} bytes freed`);
    return removedCount;
  }

  /**
   * Simple compression using base64 encoding (placeholder for real compression)
   */
  private compress(data: string): string {
    // In a real implementation, you might use a library like pako for gzip compression
    // For now, we'll use a simple base64 encoding as a placeholder
    return btoa(encodeURIComponent(data));
  }

  /**
   * Simple decompression
   */
  private decompress(data: string): string {
    return decodeURIComponent(atob(data));
  }

  /**
   * Gets the full key with namespace
   */
  private getFullKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Checks if error is due to quota exceeded
   */
  private isQuotaExceeded(error: any): boolean {
    return error instanceof DOMException && (
      error.code === 22 ||
      error.code === 1014 ||
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }
}

// Global storage manager instances
export const storageManager = new StorageManager('tsconv');
export const tempStorageManager = new StorageManager('tsconv-temp');

/**
 * React hook for using storage manager
 */
export function useStorage<T>(
  key: string, 
  defaultValue?: T, 
  options: StorageOptions = {}
): [T | undefined, (value: T) => boolean, () => boolean] {
  const [value, setValue] = React.useState<T | undefined>(() => 
    storageManager.getItem(key, defaultValue)
  );

  const setStoredValue = React.useCallback((newValue: T): boolean => {
    const success = storageManager.setItem(key, newValue, options);
    if (success) {
      setValue(newValue);
    }
    return success;
  }, [key, options]);

  const removeStoredValue = React.useCallback((): boolean => {
    const success = storageManager.removeItem(key);
    if (success) {
      setValue(defaultValue);
    }
    return success;
  }, [key, defaultValue]);

  return [value, setStoredValue, removeStoredValue];
}

/**
 * Utility function to format storage size
 */
export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Import React for the hook
import React from 'react';
