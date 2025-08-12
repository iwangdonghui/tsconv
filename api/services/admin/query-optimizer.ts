/**
 * Admin Query Optimizer
 * High-performance data querying with intelligent caching, indexing, and optimization
 */

export interface QueryConfig {
  enableCaching: boolean;
  enableIndexing: boolean;
  enablePagination: boolean;
  enableAggregation: boolean;
  maxResults: number;
  cacheTimeout: number;
  indexRefreshInterval: number;
}

export interface QueryRequest {
  resource: string;
  filters: Record<string, any>;
  sort?: { field: string; direction: 'asc' | 'desc' }[];
  pagination?: { offset: number; limit: number };
  aggregation?: {
    groupBy?: string[];
    metrics?: Array<{ field: string; operation: 'count' | 'sum' | 'avg' | 'min' | 'max' }>;
  };
  fields?: string[];
  timeRange?: { start: number; end: number };
}

export interface QueryResult<T = any> {
  data: T[];
  total: number;
  filtered: number;
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  aggregation?: Record<string, any>;
  metadata: {
    executionTime: number;
    cacheHit: boolean;
    indexUsed: boolean;
    optimizations: string[];
  };
}

export interface DataIndex {
  field: string;
  type: 'hash' | 'btree' | 'text' | 'time';
  values: Map<any, number[]>; // value -> array of record indices
  lastUpdated: number;
  hitCount: number;
}

/**
 * Admin Query Optimizer
 */
export class AdminQueryOptimizer {
  private static instance: AdminQueryOptimizer;
  private config: QueryConfig;
  private queryCache = new Map<
    string,
    { result: QueryResult; timestamp: number; hitCount: number }
  >();
  private dataIndexes = new Map<string, DataIndex>();
  private queryStats = new Map<string, { count: number; totalTime: number; avgTime: number }>();
  private dataSources = new Map<string, any[]>();

  constructor(config: Partial<QueryConfig> = {}) {
    this.config = {
      enableCaching: true,
      enableIndexing: true,
      enablePagination: true,
      enableAggregation: true,
      maxResults: 10000,
      cacheTimeout: 300000, // 5 minutes
      indexRefreshInterval: 600000, // 10 minutes
      ...config,
    };

    this.initializeDataSources();
    this.startIndexMaintenance();
  }

  static getInstance(config?: Partial<QueryConfig>): AdminQueryOptimizer {
    if (!AdminQueryOptimizer.instance) {
      AdminQueryOptimizer.instance = new AdminQueryOptimizer(config);
    }
    return AdminQueryOptimizer.instance;
  }

  /**
   * Execute optimized query
   */
  async executeQuery<T = any>(request: QueryRequest): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryKey = this.generateQueryKey(request);

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getCachedResult(queryKey);
      if (cached) {
        cached.hitCount++;
        return {
          ...cached.result,
          metadata: {
            ...cached.result.metadata,
            cacheHit: true,
          },
        };
      }
    }

    // Get data source
    const dataSource = this.dataSources.get(request.resource);
    if (!dataSource) {
      throw new Error(`Data source '${request.resource}' not found`);
    }

    // Execute optimized query
    const result = await this.performOptimizedQuery<T>(dataSource, request, startTime);

    // Cache result
    if (this.config.enableCaching) {
      this.cacheResult(queryKey, result);
    }

    // Update query statistics
    this.updateQueryStats(request.resource, Date.now() - startTime);

    return result;
  }

  /**
   * Perform optimized query execution
   */
  private async performOptimizedQuery<T>(
    dataSource: any[],
    request: QueryRequest,
    startTime: number
  ): Promise<QueryResult<T>> {
    const optimizations: string[] = [];
    let filteredData = [...dataSource];
    let indexUsed = false;

    // Apply filters with index optimization
    if (request.filters && Object.keys(request.filters).length > 0) {
      const filterResult = this.applyFiltersWithIndex(filteredData, request.filters);
      filteredData = filterResult.data;
      indexUsed = filterResult.indexUsed;
      optimizations.push(...filterResult.optimizations);
    }

    // Apply time range filter
    if (request.timeRange) {
      filteredData = this.applyTimeRangeFilter(filteredData, request.timeRange);
      optimizations.push('time_range_filter');
    }

    const filteredCount = filteredData.length;

    // Apply sorting with optimization
    if (request.sort && request.sort.length > 0) {
      filteredData = this.applySorting(filteredData, request.sort);
      optimizations.push('optimized_sorting');
    }

    // Apply field selection
    if (request.fields && request.fields.length > 0) {
      filteredData = this.applyFieldSelection(filteredData, request.fields);
      optimizations.push('field_projection');
    }

    // Apply pagination
    let paginationInfo = { offset: 0, limit: this.config.maxResults, hasMore: false };
    if (this.config.enablePagination && request.pagination) {
      const paginationResult = this.applyPagination(filteredData, request.pagination);
      filteredData = paginationResult.data;
      paginationInfo = paginationResult.pagination;
      optimizations.push('pagination');
    }

    // Apply aggregation
    let aggregationResult: Record<string, any> | undefined;
    if (this.config.enableAggregation && request.aggregation) {
      aggregationResult = this.applyAggregation(filteredData, request.aggregation);
      optimizations.push('aggregation');
    }

    const executionTime = Date.now() - startTime;

    return {
      data: filteredData,
      total: dataSource.length,
      filtered: filteredCount,
      pagination: paginationInfo,
      aggregation: aggregationResult,
      metadata: {
        executionTime,
        cacheHit: false,
        indexUsed,
        optimizations,
      },
    };
  }

  /**
   * Apply filters with index optimization
   */
  private applyFiltersWithIndex(
    data: any[],
    filters: Record<string, any>
  ): { data: any[]; indexUsed: boolean; optimizations: string[] } {
    const optimizations: string[] = [];
    let indexUsed = false;
    let filteredData = data;

    for (const [field, value] of Object.entries(filters)) {
      if (this.config.enableIndexing) {
        const index = this.getOrCreateIndex(field, data);
        if (index) {
          const indexedResults = this.queryIndex(index, value);
          if (indexedResults.length < filteredData.length * 0.5) {
            // Use index if it reduces results significantly
            filteredData = indexedResults.map(idx => data[idx]);
            indexUsed = true;
            optimizations.push(`index_${field}`);
            continue;
          }
        }
      }

      // Fallback to linear search
      filteredData = filteredData.filter(item => this.matchesFilter(item, field, value));
      optimizations.push(`linear_filter_${field}`);
    }

    return { data: filteredData, indexUsed, optimizations };
  }

  /**
   * Apply time range filter
   */
  private applyTimeRangeFilter(data: any[], timeRange: { start: number; end: number }): any[] {
    return data.filter(item => {
      const timestamp = item.timestamp || item.createdAt || item.time || 0;
      return timestamp >= timeRange.start && timestamp <= timeRange.end;
    });
  }

  /**
   * Apply sorting with optimization
   */
  private applySorting(
    data: any[],
    sortConfig: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): any[] {
    return data.sort((a, b) => {
      for (const sort of sortConfig) {
        const aVal = this.getNestedValue(a, sort.field);
        const bVal = this.getNestedValue(b, sort.field);

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;

        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Apply field selection
   */
  private applyFieldSelection(data: any[], fields: string[]): any[] {
    return data.map(item => {
      const selected: any = {};
      fields.forEach(field => {
        selected[field] = this.getNestedValue(item, field);
      });
      return selected;
    });
  }

  /**
   * Apply pagination
   */
  private applyPagination(
    data: any[],
    pagination: { offset: number; limit: number }
  ): { data: any[]; pagination: { offset: number; limit: number; hasMore: boolean } } {
    const { offset, limit } = pagination;
    const paginatedData = data.slice(offset, offset + limit);
    const hasMore = offset + limit < data.length;

    return {
      data: paginatedData,
      pagination: { offset, limit, hasMore },
    };
  }

  /**
   * Apply aggregation
   */
  private applyAggregation(
    data: any[],
    aggregation: QueryRequest['aggregation']
  ): Record<string, any> {
    const result: Record<string, any> = {};

    if (!aggregation) return result;

    // Group by aggregation
    if (aggregation.groupBy && aggregation.groupBy.length > 0) {
      const groups = new Map<string, any[]>();

      data.forEach(item => {
        const groupKey = aggregation
          .groupBy!.map(field => this.getNestedValue(item, field))
          .join('|');
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(item);
      });

      result.groups = Object.fromEntries(groups);
    }

    // Metrics aggregation
    if (aggregation.metrics && aggregation.metrics.length > 0) {
      result.metrics = {};

      aggregation.metrics.forEach(metric => {
        const values = data
          .map(item => this.getNestedValue(item, metric.field))
          .filter(val => val != null);

        switch (metric.operation) {
          case 'count':
            result.metrics[`${metric.field}_count`] = values.length;
            break;
          case 'sum':
            result.metrics[`${metric.field}_sum`] = values.reduce(
              (sum, val) => sum + (Number(val) || 0),
              0
            );
            break;
          case 'avg':
            const sum = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
            result.metrics[`${metric.field}_avg`] = values.length > 0 ? sum / values.length : 0;
            break;
          case 'min':
            result.metrics[`${metric.field}_min`] =
              values.length > 0 ? Math.min(...values.map(Number)) : null;
            break;
          case 'max':
            result.metrics[`${metric.field}_max`] =
              values.length > 0 ? Math.max(...values.map(Number)) : null;
            break;
        }
      });
    }

    return result;
  }

  /**
   * Index management
   */
  private getOrCreateIndex(field: string, data: any[]): DataIndex | null {
    const indexKey = field;
    let index = this.dataIndexes.get(indexKey);

    if (!index) {
      index = this.createIndex(field, data);
      if (index) {
        this.dataIndexes.set(indexKey, index);
      }
    }

    return index;
  }

  private createIndex(field: string, data: any[]): DataIndex | null {
    const values = new Map<any, number[]>();

    data.forEach((item, index) => {
      const value = this.getNestedValue(item, field);
      if (value != null) {
        if (!values.has(value)) {
          values.set(value, []);
        }
        values.get(value)!.push(index);
      }
    });

    return {
      field,
      type: this.determineIndexType(field, data),
      values,
      lastUpdated: Date.now(),
      hitCount: 0,
    };
  }

  private queryIndex(index: DataIndex, value: any): number[] {
    index.hitCount++;

    // Exact match
    if (index.values.has(value)) {
      return index.values.get(value)!;
    }

    // Range queries for numeric values
    if (typeof value === 'object' && value !== null) {
      const results: number[] = [];

      for (const [indexValue, indices] of index.values.entries()) {
        if (this.matchesRangeQuery(indexValue, value)) {
          results.push(...indices);
        }
      }

      return results;
    }

    return [];
  }

  /**
   * Cache management
   */
  private generateQueryKey(request: QueryRequest): string {
    return `query:${JSON.stringify(request)}`;
  }

  private getCachedResult(queryKey: string): { result: QueryResult; hitCount: number } | null {
    const cached = this.queryCache.get(queryKey);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
      this.queryCache.delete(queryKey);
      return null;
    }

    return cached;
  }

  private cacheResult(queryKey: string, result: QueryResult): void {
    this.queryCache.set(queryKey, {
      result,
      timestamp: Date.now(),
      hitCount: 0,
    });

    // Limit cache size
    if (this.queryCache.size > 1000) {
      const oldestKey = Array.from(this.queryCache.keys())[0];
      this.queryCache.delete(oldestKey);
    }
  }

  /**
   * Initialize data sources
   */
  private initializeDataSources(): void {
    // Initialize with empty data sources - these would be populated by actual data
    this.dataSources.set('users', []);
    this.dataSources.set('sessions', []);
    this.dataSources.set('audit_logs', []);
    this.dataSources.set('security_logs', []);
    this.dataSources.set('health_checks', []);
    this.dataSources.set('metrics', []);
  }

  /**
   * Update data source
   */
  updateDataSource(resource: string, data: any[]): void {
    this.dataSources.set(resource, data);

    // Invalidate related caches and indexes
    this.invalidateCacheForResource(resource);
    this.invalidateIndexesForResource(resource);
  }

  /**
   * Utility methods
   */
  private matchesFilter(item: any, field: string, value: any): boolean {
    const itemValue = this.getNestedValue(item, field);

    if (typeof value === 'object' && value !== null) {
      return this.matchesRangeQuery(itemValue, value);
    }

    return itemValue === value;
  }

  private matchesRangeQuery(itemValue: any, rangeQuery: any): boolean {
    if (rangeQuery.$gte !== undefined && itemValue < rangeQuery.$gte) return false;
    if (rangeQuery.$lte !== undefined && itemValue > rangeQuery.$lte) return false;
    if (rangeQuery.$gt !== undefined && itemValue <= rangeQuery.$gt) return false;
    if (rangeQuery.$lt !== undefined && itemValue >= rangeQuery.$lt) return false;
    if (rangeQuery.$in !== undefined && !rangeQuery.$in.includes(itemValue)) return false;
    if (rangeQuery.$nin !== undefined && rangeQuery.$nin.includes(itemValue)) return false;

    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private determineIndexType(field: string, data: any[]): 'hash' | 'btree' | 'text' | 'time' {
    const sampleValue = data.find(item => this.getNestedValue(item, field) != null);
    if (!sampleValue) return 'hash';

    const value = this.getNestedValue(sampleValue, field);

    if (field.includes('time') || field.includes('date') || field === 'timestamp') {
      return 'time';
    }

    if (typeof value === 'number') {
      return 'btree';
    }

    if (typeof value === 'string' && value.length > 50) {
      return 'text';
    }

    return 'hash';
  }

  private updateQueryStats(resource: string, executionTime: number): void {
    const stats = this.queryStats.get(resource) || { count: 0, totalTime: 0, avgTime: 0 };
    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    this.queryStats.set(resource, stats);
  }

  private invalidateCacheForResource(resource: string): void {
    for (const [key, cached] of this.queryCache.entries()) {
      if (key.includes(`"resource":"${resource}"`)) {
        this.queryCache.delete(key);
      }
    }
  }

  private invalidateIndexesForResource(resource: string): void {
    // In a real implementation, you'd track which indexes belong to which resources
    this.dataIndexes.clear();
  }

  private startIndexMaintenance(): void {
    setInterval(() => {
      this.maintainIndexes();
    }, this.config.indexRefreshInterval);
  }

  private maintainIndexes(): void {
    const now = Date.now();

    // Remove unused indexes
    for (const [key, index] of this.dataIndexes.entries()) {
      if (now - index.lastUpdated > this.config.indexRefreshInterval * 2 && index.hitCount === 0) {
        this.dataIndexes.delete(key);
      }
    }

    // Clean up old cache entries
    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp > this.config.cacheTimeout) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Public methods for monitoring and management
   */
  getQueryStats(): Record<string, any> {
    return {
      cache: {
        size: this.queryCache.size,
        hitRate: this.calculateCacheHitRate(),
      },
      indexes: {
        count: this.dataIndexes.size,
        types: this.getIndexTypeDistribution(),
      },
      queries: Object.fromEntries(this.queryStats),
      dataSources: Object.fromEntries(
        Array.from(this.dataSources.entries()).map(([key, data]) => [key, data.length])
      ),
    };
  }

  private calculateCacheHitRate(): number {
    const totalHits = Array.from(this.queryCache.values()).reduce(
      (sum, cached) => sum + cached.hitCount,
      0
    );
    const totalQueries = Array.from(this.queryStats.values()).reduce(
      (sum, stats) => sum + stats.count,
      0
    );
    return totalQueries > 0 ? (totalHits / totalQueries) * 100 : 0;
  }

  private getIndexTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const index of this.dataIndexes.values()) {
      distribution[index.type] = (distribution[index.type] || 0) + 1;
    }
    return distribution;
  }

  clearCache(): void {
    this.queryCache.clear();
  }

  clearIndexes(): void {
    this.dataIndexes.clear();
  }

  rebuildIndexes(): void {
    this.dataIndexes.clear();
    // Indexes will be rebuilt on next query
  }
}

export default AdminQueryOptimizer;
