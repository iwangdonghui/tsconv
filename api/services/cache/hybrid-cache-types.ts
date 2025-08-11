/**
 * Hybrid Cache Types and Interfaces
 * Shared types for hybrid cache implementation
 */

import { CacheConfiguration, CacheSetOptions } from './interfaces';

export interface HybridCacheConfig {
  l1Config: Partial<CacheConfiguration>;
  l2Provider: 'redis' | 'upstash';
  l2Config?: unknown;
  syncStrategy: 'write-through' | 'write-back' | 'write-around';
  l1MaxSize: number;
  l1TTL: number;
  promoteThreshold: number; // Number of hits before promoting to L1
}

export interface SyncQueueItem {
  value: unknown;
  options: CacheSetOptions;
  timestamp: number;
}
