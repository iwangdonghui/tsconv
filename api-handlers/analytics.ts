// API Analytics and Usage Monitoring

import { CacheManager } from './cache-utils';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  REDIS_ENABLED?: string;
}

interface AnalyticsEvent {
  endpoint: string;
  method: string;
  status: number;
  responseTime: number;
  userAgent?: string;
  country?: string;
  timestamp: string;
  cached?: boolean;
}

interface AnalyticsStats {
  totalRequests: number;
  uniqueEndpoints: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  statusCodes: Record<string, number>;
  countries: Record<string, number>;
}

export class AnalyticsManager {
  private cacheManager: CacheManager;

  constructor(_env: Env) {
    this.cacheManager = new CacheManager(_env);
  }

  // Record an API request event
  async recordEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const hour = new Date().getHours();

      // Store daily stats
      await this.incrementCounter(`analytics:daily:${today}:requests`);
      await this.incrementCounter(`analytics:daily:${today}:endpoint:${event.endpoint}`);
      await this.incrementCounter(`analytics:daily:${today}:status:${event.status}`);

      // Store hourly stats for more granular analysis
      await this.incrementCounter(`analytics:hourly:${today}:${hour}:requests`);

      // Track response times (store in buckets)
      const responseTimeBucket = this.getResponseTimeBucket(event.responseTime);
      await this.incrementCounter(`analytics:daily:${today}:response_time:${responseTimeBucket}`);

      // Track cache hits
      if (event.cached) {
        await this.incrementCounter(`analytics:daily:${today}:cache_hits`);
      }

      // Track countries if available
      if (event.country) {
        await this.incrementCounter(`analytics:daily:${today}:country:${event.country}`);
      }

      // Store recent events for real-time monitoring (keep last 1000)
      await this.addToRecentEvents(event);
    } catch (error) {
      if (process.env.NODE_ENV === 'development')
        console.error('Failed to record analytics event:', error);
    }
  }

  // Get analytics stats for a specific date
  async getStats(date?: string): Promise<AnalyticsStats> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      // Get basic counters
      const totalRequests = (await this.getCounter(`analytics:daily:${targetDate}:requests`)) || 0;
      const cacheHits = (await this.getCounter(`analytics:daily:${targetDate}:cache_hits`)) || 0;

      // Get endpoint stats
      const endpointStats = await this.getEndpointStats(targetDate);

      // Get status code distribution
      const statusCodes = await this.getStatusCodeStats(targetDate);

      // Get country distribution
      const countries = await this.getCountryStats(targetDate);

      // Calculate response time stats
      const avgResponseTime = await this.getAverageResponseTime(targetDate);

      // Calculate error rate
      const errorRequests = (statusCodes['4'] || 0) + (statusCodes['5'] || 0);
      const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

      // Calculate cache hit rate
      const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

      return {
        totalRequests,
        uniqueEndpoints: endpointStats.length,
        averageResponseTime: avgResponseTime,
        errorRate,
        cacheHitRate,
        topEndpoints: endpointStats.slice(0, 10),
        statusCodes,
        countries,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development')
        console.error('Failed to get analytics stats:', error);
      return this.getEmptyStats();
    }
  }

  // Get real-time stats (last hour)
  async getRealTimeStats(): Promise<any> {
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toISOString().split('T')[0];

    try {
      const hourlyRequests =
        (await this.getCounter(`analytics:hourly:${today}:${currentHour}:requests`)) || 0;
      const recentEvents = await this.getRecentEvents(100); // Last 100 events

      // Calculate real-time metrics
      const last5MinEvents = recentEvents.filter(event => {
        const eventTime = new Date(event.timestamp);
        return now.getTime() - eventTime.getTime() < 5 * 60 * 1000; // 5 minutes
      });

      return {
        currentHourRequests: hourlyRequests,
        last5MinRequests: last5MinEvents.length,
        recentEvents: recentEvents.slice(0, 20),
        timestamp: now.toISOString(),
      };
    } catch (error) {
      console.error('Failed to get real-time stats:', error);
      return {
        currentHourRequests: 0,
        last5MinRequests: 0,
        recentEvents: [],
        timestamp: now.toISOString(),
      };
    }
  }

  // Helper methods
  private async incrementCounter(key: string): Promise<void> {
    try {
      await this.cacheManager.increment('STATS', key);
    } catch (error) {
      console.error(`Failed to increment counter ${key}:`, error);
    }
  }

  private async getCounter(key: string): Promise<number> {
    try {
      const value = await this.cacheManager.get('STATS', key);
      return typeof value === 'number' ? value : 0;
    } catch (error) {
      console.error(`Failed to get counter ${key}:`, error);
      return 0;
    }
  }

  private getResponseTimeBucket(responseTime: number): string {
    if (responseTime < 100) return 'fast';
    if (responseTime < 500) return 'medium';
    if (responseTime < 1000) return 'slow';
    return 'very_slow';
  }

  private async addToRecentEvents(event: AnalyticsEvent): Promise<void> {
    try {
      const recentEvents = await this.getRecentEvents(999);
      recentEvents.unshift(event);
      await this.cacheManager.set('STATS', 'recent_events', recentEvents.slice(0, 1000));
    } catch (error) {
      console.error('Failed to add recent event:', error);
    }
  }

  private async getRecentEvents(limit: number = 100): Promise<AnalyticsEvent[]> {
    try {
      const events = await this.cacheManager.get('STATS', 'recent_events');
      return Array.isArray(events) ? events.slice(0, limit) : [];
    } catch (error) {
      console.error('Failed to get recent events:', error);
      return [];
    }
  }

  private async getEndpointStats(
    _date: string
  ): Promise<Array<{ endpoint: string; count: number }>> {
    // This would need to be implemented based on available data
    // For now, return empty array
    return [];
  }

  private async getStatusCodeStats(date: string): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    for (const statusPrefix of ['2', '3', '4', '5']) {
      const count = await this.getCounter(`analytics:daily:${date}:status:${statusPrefix}xx`);
      if (count > 0) {
        stats[statusPrefix] = count;
      }
    }

    return stats;
  }

  private async getCountryStats(_date: string): Promise<Record<string, number>> {
    // This would need to be implemented based on available data
    return {};
  }

  private async getAverageResponseTime(_date: string): Promise<number> {
    // Calculate weighted average based on response time buckets
    const fast = (await this.getCounter(`analytics:daily:${date}:response_time:fast`)) || 0;
    const medium = (await this.getCounter(`analytics:daily:${date}:response_time:medium`)) || 0;
    const slow = (await this.getCounter(`analytics:daily:${date}:response_time:slow`)) || 0;
    const verySlow =
      (await this.getCounter(`analytics:daily:${date}:response_time:very_slow`)) || 0;

    const total = fast + medium + slow + verySlow;
    if (total === 0) return 0;

    // Use bucket midpoints for calculation
    const weightedSum = fast * 50 + medium * 300 + slow * 750 + verySlow * 1500;
    return Math.round(weightedSum / total);
  }

  private getEmptyStats(): AnalyticsStats {
    return {
      totalRequests: 0,
      uniqueEndpoints: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      topEndpoints: [],
      statusCodes: {},
      countries: {},
    };
  }
}
