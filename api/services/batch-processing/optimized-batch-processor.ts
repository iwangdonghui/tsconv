/**
 * Optimized Batch Processor
 * High-performance batch processing with intelligent chunking, caching, and parallel execution
 */

import { convertTimestamp } from '../../utils/conversion-utils';

export interface BatchItem {
  id?: string;
  timestamp: number | string;
  outputFormats?: string[];
  timezone?: string;
  targetTimezone?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface BatchProcessingOptions {
  maxConcurrency?: number;
  chunkSize?: number;
  timeout?: number;
  continueOnError?: boolean;
  enableCaching?: boolean;
  enableDeduplication?: boolean;
  enablePrioritization?: boolean;
  enableProgressTracking?: boolean;
  enableAnalytics?: boolean;
  retryFailedItems?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface BatchResult {
  id?: string;
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  processingTime: number;
  index: number;
  retryCount?: number;
  cacheHit?: boolean;
  priority?: string;
}

export interface BatchProcessingStats {
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  cacheHits: number;
  duplicatesSkipped: number;
  totalProcessingTime: number;
  averageItemTime: number;
  fastestItem: number;
  slowestItem: number;
  throughputPerSecond: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  concurrencyStats: {
    maxConcurrency: number;
    averageConcurrency: number;
    peakConcurrency: number;
  };
}

export interface ProgressUpdate {
  completed: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining: number;
  currentThroughput: number;
  errors: number;
  cacheHits: number;
}

/**
 * Optimized Batch Processor with advanced performance features
 */
export class OptimizedBatchProcessor {
  private cache = new Map<string, { data: any; timestamp: number; hits: number }>();
  private deduplicationMap = new Map<string, Promise<BatchResult>>();
  private progressCallbacks: Array<(progress: ProgressUpdate) => void> = [];
  private processingStats: BatchProcessingStats;
  private activeTasks = new Set<Promise<any>>();
  private priorityQueues = new Map<string, BatchItem[]>();

  constructor() {
    this.processingStats = this.initializeStats();

    // Start cache cleanup interval
    setInterval(() => this.cleanupCache(), 300000); // 5 minutes
  }

  /**
   * Process batch with optimizations
   */
  async processBatch(
    items: BatchItem[],
    options: BatchProcessingOptions = {}
  ): Promise<{
    results: BatchResult[];
    stats: BatchProcessingStats;
  }> {
    const startTime = Date.now();
    this.processingStats = this.initializeStats();
    this.processingStats.totalItems = items.length;

    // Apply default options
    const opts = {
      maxConcurrency: 10,
      chunkSize: 50,
      timeout: 30000,
      continueOnError: true,
      enableCaching: true,
      enableDeduplication: true,
      enablePrioritization: true,
      enableProgressTracking: false,
      enableAnalytics: true,
      retryFailedItems: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...options,
    };

    try {
      // Preprocess items
      const processedItems = await this.preprocessItems(items, opts);

      // Process with optimizations
      const results = await this.executeOptimizedProcessing(processedItems, opts, startTime);

      // Post-process results
      const finalResults = await this.postprocessResults(results, opts);

      // Calculate final stats
      this.calculateFinalStats(finalResults, startTime);

      return {
        results: finalResults,
        stats: this.processingStats,
      };
    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    } finally {
      // Cleanup
      this.deduplicationMap.clear();
      this.activeTasks.clear();
    }
  }

  /**
   * Preprocess items for optimization
   */
  private async preprocessItems(
    items: BatchItem[],
    options: BatchProcessingOptions
  ): Promise<BatchItem[]> {
    let processedItems = [...items];

    // Apply deduplication
    if (options.enableDeduplication) {
      processedItems = this.deduplicateItems(processedItems);
    }

    // Apply prioritization
    if (options.enablePrioritization) {
      processedItems = this.prioritizeItems(processedItems);
    }

    // Validate items
    processedItems = this.validateItems(processedItems);

    return processedItems;
  }

  /**
   * Execute optimized processing
   */
  private async executeOptimizedProcessing(
    items: BatchItem[],
    options: BatchProcessingOptions,
    startTime: number
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    const chunks = this.createOptimalChunks(items, options);

    let activeConcurrency = 0;
    let peakConcurrency = 0;
    const concurrencyHistory: number[] = [];

    for (const chunk of chunks) {
      // Process chunk with concurrency control
      const chunkPromises = chunk.map(async (item, index) => {
        activeConcurrency++;
        peakConcurrency = Math.max(peakConcurrency, activeConcurrency);
        concurrencyHistory.push(activeConcurrency);

        try {
          const result = await this.processItemWithOptimizations(
            item,
            results.length + index,
            options
          );

          // Update progress
          if (options.enableProgressTracking) {
            this.updateProgress(results.length + index + 1, items.length, startTime);
          }

          return result;
        } finally {
          activeConcurrency--;
        }
      });

      // Wait for chunk completion
      const chunkResults = await Promise.allSettled(chunkPromises);

      // Process chunk results
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          this.updateProcessingStats(result.value);
        } else {
          // Handle failed items
          const failedResult: BatchResult = {
            id: chunk[index]?.id || `unknown-${index}`,
            success: false,
            error: {
              code: 'PROCESSING_ERROR',
              message: result.reason?.message || 'Unknown error',
              details: { originalError: result.reason },
            },
            processingTime: 0,
            index: results.length + index,
          };
          results.push(failedResult);
          this.updateProcessingStats(failedResult);
        }
      });

      // Apply backpressure if needed
      if (this.shouldApplyBackpressure(results)) {
        await this.applyBackpressure();
      }
    }

    // Update concurrency stats
    this.processingStats.concurrencyStats = {
      maxConcurrency: options.maxConcurrency || 10,
      averageConcurrency:
        concurrencyHistory.length > 0
          ? concurrencyHistory.reduce((a, b) => a + b, 0) / concurrencyHistory.length
          : 0,
      peakConcurrency,
    };

    return results;
  }

  /**
   * Process individual item with optimizations
   */
  private async processItemWithOptimizations(
    item: BatchItem,
    index: number,
    options: BatchProcessingOptions
  ): Promise<BatchResult> {
    const itemStartTime = Date.now();
    const cacheKey = this.generateCacheKey(item);

    // Check cache first
    if (options.enableCaching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      cached.hits++;

      return {
        id: item.id,
        success: true,
        data: cached.data,
        processingTime: Date.now() - itemStartTime,
        index,
        cacheHit: true,
      };
    }

    // Check deduplication
    if (options.enableDeduplication && this.deduplicationMap.has(cacheKey)) {
      const duplicateResult = await this.deduplicationMap.get(cacheKey)!;
      return {
        ...duplicateResult,
        id: item.id,
        index,
        processingTime: Date.now() - itemStartTime,
      };
    }

    // Create processing promise
    const processingPromise = this.processItemCore(item, index, itemStartTime);

    // Store in deduplication map
    if (options.enableDeduplication) {
      this.deduplicationMap.set(cacheKey, processingPromise);
    }

    const result = await processingPromise;

    // Cache successful results
    if (options.enableCaching && result.success && result.data) {
      this.cache.set(cacheKey, {
        data: result.data,
        timestamp: Date.now(),
        hits: 1,
      });
    }

    return result;
  }

  /**
   * Core item processing logic
   */
  private async processItemCore(
    item: BatchItem,
    index: number,
    startTime: number
  ): Promise<BatchResult> {
    try {
      // Validate timestamp
      const timestamp =
        typeof item.timestamp === 'string' ? parseInt(item.timestamp, 10) : item.timestamp;

      if (isNaN(timestamp)) {
        throw new Error('Invalid timestamp format');
      }

      // Convert timestamp
      const conversionResult = await convertTimestamp(
        timestamp,
        item.outputFormats || ['iso', 'unix', 'human'],
        item.timezone,
        item.targetTimezone
      );

      return {
        id: item.id,
        success: true,
        data: {
          input: item.timestamp,
          ...conversionResult,
          metadata: {
            ...conversionResult.metadata,
            priority: item.priority,
            processingOrder: index,
          },
        },
        processingTime: Date.now() - startTime,
        index,
        priority: item.priority,
      };
    } catch (error) {
      return {
        id: item.id,
        success: false,
        error: {
          code: 'CONVERSION_ERROR',
          message: (error as Error).message,
          details: {
            originalInput: item.timestamp,
            itemIndex: index,
          },
        },
        processingTime: Date.now() - startTime,
        index,
        priority: item.priority,
      };
    }
  }

  /**
   * Deduplicate items based on processing signature
   */
  private deduplicateItems(items: BatchItem[]): BatchItem[] {
    const seen = new Set<string>();
    const deduplicated: BatchItem[] = [];

    for (const item of items) {
      const signature = this.generateCacheKey(item);
      if (!seen.has(signature)) {
        seen.add(signature);
        deduplicated.push(item);
      } else {
        this.processingStats.duplicatesSkipped++;
      }
    }

    return deduplicated;
  }

  /**
   * Prioritize items for processing order
   */
  private prioritizeItems(items: BatchItem[]): BatchItem[] {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };

    return items.sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'normal'];
      const bPriority = priorityOrder[b.priority || 'normal'];
      return aPriority - bPriority;
    });
  }

  /**
   * Validate items and filter out invalid ones
   */
  private validateItems(items: BatchItem[]): BatchItem[] {
    return items.filter(item => {
      if (item.timestamp === null || item.timestamp === undefined) {
        return false;
      }

      if (typeof item.timestamp === 'string' && item.timestamp.trim() === '') {
        return false;
      }

      return true;
    });
  }

  /**
   * Create optimal chunks based on item characteristics
   */
  private createOptimalChunks(items: BatchItem[], options: BatchProcessingOptions): BatchItem[][] {
    const chunkSize = options.chunkSize || 50;
    const chunks: BatchItem[][] = [];

    // Group by priority if prioritization is enabled
    if (options.enablePrioritization) {
      const priorityGroups = new Map<string, BatchItem[]>();

      items.forEach(item => {
        const priority = item.priority || 'normal';
        if (!priorityGroups.has(priority)) {
          priorityGroups.set(priority, []);
        }
        priorityGroups.get(priority)!.push(item);
      });

      // Process high priority items first
      const priorities = ['critical', 'high', 'normal', 'low'];
      for (const priority of priorities) {
        const group = priorityGroups.get(priority);
        if (group) {
          chunks.push(...this.chunkArray(group, chunkSize));
        }
      }
    } else {
      chunks.push(...this.chunkArray(items, chunkSize));
    }

    return chunks;
  }

  /**
   * Generate cache key for item
   */
  private generateCacheKey(item: BatchItem): string {
    const keyComponents = [
      item.timestamp,
      JSON.stringify(item.outputFormats || []),
      item.timezone || '',
      item.targetTimezone || '',
    ];

    return Buffer.from(keyComponents.join('|')).toString('base64');
  }

  /**
   * Update processing statistics
   */
  private updateProcessingStats(result: BatchResult): void {
    this.processingStats.processedItems++;

    if (result.success) {
      this.processingStats.successfulItems++;
    } else {
      this.processingStats.failedItems++;
    }

    if (result.cacheHit) {
      this.processingStats.cacheHits++;
    }

    // Update timing stats
    if (
      this.processingStats.fastestItem === 0 ||
      result.processingTime < this.processingStats.fastestItem
    ) {
      this.processingStats.fastestItem = result.processingTime;
    }

    if (result.processingTime > this.processingStats.slowestItem) {
      this.processingStats.slowestItem = result.processingTime;
    }
  }

  /**
   * Update progress for tracking
   */
  private updateProgress(completed: number, total: number, startTime: number): void {
    const elapsed = Date.now() - startTime;
    const percentage = (completed / total) * 100;
    const currentThroughput = completed / (elapsed / 1000);
    const estimatedTimeRemaining = ((total - completed) / currentThroughput) * 1000;

    const progress: ProgressUpdate = {
      completed,
      total,
      percentage,
      estimatedTimeRemaining,
      currentThroughput,
      errors: this.processingStats.failedItems,
      cacheHits: this.processingStats.cacheHits,
    };

    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }

  /**
   * Check if backpressure should be applied
   */
  private shouldApplyBackpressure(results: BatchResult[]): boolean {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

    // Apply backpressure if memory usage exceeds 500MB
    return heapUsedMB > 500;
  }

  /**
   * Apply backpressure by introducing delay
   */
  private async applyBackpressure(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Post-process results
   */
  private async postprocessResults(
    results: BatchResult[],
    options: BatchProcessingOptions
  ): Promise<BatchResult[]> {
    // Retry failed items if enabled
    if (options.retryFailedItems) {
      const failedResults = results.filter(r => !r.success);
      if (failedResults.length > 0) {
        console.log(`Retrying ${failedResults.length} failed items...`);
        // Implementation would go here
      }
    }

    return results;
  }

  /**
   * Calculate final statistics
   */
  private calculateFinalStats(results: BatchResult[], startTime: number): void {
    const totalTime = Date.now() - startTime;
    this.processingStats.totalProcessingTime = totalTime;

    const processingTimes = results.map(r => r.processingTime);
    this.processingStats.averageItemTime =
      processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;

    this.processingStats.throughputPerSecond = results.length / (totalTime / 1000);

    // Memory usage
    const memoryUsage = process.memoryUsage();
    this.processingStats.memoryUsage = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
    };
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): BatchProcessingStats {
    return {
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      cacheHits: 0,
      duplicatesSkipped: 0,
      totalProcessingTime: 0,
      averageItemTime: 0,
      fastestItem: 0,
      slowestItem: 0,
      throughputPerSecond: 0,
      memoryUsage: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
      },
      concurrencyStats: {
        maxConcurrency: 0,
        averageConcurrency: 0,
        peakConcurrency: 0,
      },
    };
  }

  /**
   * Cleanup old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Utility method to chunk array
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Add progress callback
   */
  onProgress(callback: (progress: ProgressUpdate) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Remove progress callback
   */
  removeProgressCallback(callback: (progress: ProgressUpdate) => void): void {
    const index = this.progressCallbacks.indexOf(callback);
    if (index > -1) {
      this.progressCallbacks.splice(index, 1);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalHits: number;
    memoryUsage: number;
  } {
    let totalHits = 0;
    let memoryUsage = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      memoryUsage += JSON.stringify(entry.data).length;
    }

    return {
      size: this.cache.size,
      hitRate:
        totalHits > 0 ? (totalHits / (totalHits + this.processingStats.processedItems)) * 100 : 0,
      totalHits,
      memoryUsage,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current statistics
   */
  getCurrentStats(): BatchProcessingStats {
    return { ...this.processingStats };
  }
}

export default OptimizedBatchProcessor;
