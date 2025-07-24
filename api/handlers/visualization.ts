import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, ResponseBuilder, withCors } from '../utils/response.js';
import { createCacheMiddleware } from '../middleware/cache.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import timezoneService from '../services/timezone-service.js';
import formatService from '../services/format-service.js';

interface VisualizationData {
  type: string;
  data: any;
  metadata: {
    generatedAt: string;
    timezone: string;
    format: string;
  };
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill?: boolean;
  }>;
}

interface HeatmapData {
  days: string[];
  hours: number[];
  data: Array<{
    day: string;
    hour: number;
    value: number;
    label: string;
  }>;
}

class VisualizationService {
  generateTimezoneChart(
    fromTimezone: string,
    toTimezone: string,
    days: number = 30
  ): ChartData {
    const resolvedFrom = timezoneService.resolveTimezone(fromTimezone);
    const resolvedTo = timezoneService.resolveTimezone(toTimezone);

    const labels: string[] = [];
    const offsetData: number[] = [];
    const dstData: number[] = [];

    for (let i = -days; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      labels.push(date.toISOString().split('T')[0]);
      
      const fromOffset = timezoneService.getTimezoneOffset(date, resolvedFrom);
      const toOffset = timezoneService.getTimezoneOffset(date, resolvedTo);
      offsetData.push(toOffset - fromOffset);
      
      const fromDST = timezoneService.isDST(date, resolvedFrom) ? 60 : 0;
      const toDST = timezoneService.isDST(date, resolvedTo) ? 60 : 0;
      dstData.push(toDST - fromDST);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Timezone Offset Difference (minutes)',
          data: offsetData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: false
        },
        {
          label: 'DST Difference (minutes)',
          data: dstData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: false
        }
      ]
    };
  }

  generateBusinessHoursHeatmap(
    timezone1: string,
    timezone2: string,
    businessHours: { start: number; end: number } = { start: 9, end: 17 }
  ): HeatmapData {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const data: Array<{
      day: string;
      hour: number;
      value: number;
      label: string;
    }> = [];

    const resolved1 = timezoneService.resolveTimezone(timezone1);
    const resolved2 = timezoneService.resolveTimezone(timezone2);

    days.forEach((day, dayIndex) => {
      hours.forEach(hour => {
        const date = new Date();
        date.setDay(dayIndex);
        date.setHours(hour, 0, 0, 0);

        const tz1Hour = date.getHours();
        const tz2Hour = date.getHours();

        const isBusiness1 = tz1Hour >= businessHours.start && tz1Hour < businessHours.end;
        const isBusiness2 = tz2Hour >= businessHours.start && tz2Hour < businessHours.end;

        let value = 0;
        let label = 'Outside business hours';

        if (isBusiness1 && isBusiness2) {
          value = 2;
          label = 'Both timezones in business hours';
        } else if (isBusiness1 || isBusiness2) {
          value = 1;
          label = 'One timezone in business hours';
        }

        data.push({
          day,
          hour,
          value,
          label
        });
      });
    });

    return {
      days,
      hours,
      data
    };
  }

  generateTimestampDistribution(
    timestamps: number[],
    timezone: string = 'UTC',
    format: string = 'iso8601'
  ): {
    hourly: Array<{ hour: number; count: number; percentage: number }>;
    daily: Array<{ day: string; count: number; percentage: number }>;
    monthly: Array<{ month: string; count: number; percentage: number }>;
  } {
    const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, percentage: 0 }));
    const daily = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ].map(day => ({ day, count: 0, percentage: 0 }));
    const monthly = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ].map(month => ({ month, count: 0, percentage: 0 }));

    timestamps.forEach(timestamp => {
      const date = new Date(timestamp * 1000);
      const localDate = timezoneService.getCurrentTimeInTimezone(timezone);
      const localHour = new Date(localDate.timestamp * 1000).getHours();
      const localDay = new Date(localDate.timestamp * 1000).getDay();
      const localMonth = new Date(localDate.timestamp * 1000).getMonth();

      hourly[localHour].count++;
      daily[localDay].count++;
      monthly[localMonth].count++;
    });

    // Calculate percentages
    const total = timestamps.length;
    if (total > 0) {
      hourly.forEach(h => h.percentage = Math.round((h.count / total) * 100 * 100) / 100);
      daily.forEach(d => d.percentage = Math.round((d.count / total) * 100 * 100) / 100);
      monthly.forEach(m => m.percentage = Math.round((m.count / total) * 100 * 100) / 100);
    }

    return { hourly, daily, monthly };
  }

  generateConversionTimeline(
    timestamps: number[],
    targetTimezone: string,
    sourceTimezone: string = 'UTC'
  ): Array<{
    original: number;
    converted: number;
    formatted: string;
    offset: number;
  }> {
    return timestamps.map(timestamp => {
      const converted = timezoneService.convertTimestamp(timestamp, sourceTimezone, targetTimezone);
      const formatted = formatService.formatDate(
        new Date(converted.convertedTimestamp * 1000),
        'iso8601',
        targetTimezone
      );

      return {
        original: timestamp,
        converted: converted.convertedTimestamp,
        formatted,
        offset: converted.offsetDifference
      };
    });
  }

  createTimezoneMapData(): Array<{
    timezone: string;
    offset: number;
    label: string;
    coordinates: { lat: number; lng: number };
  }> {
    // Simplified timezone coordinates for mapping
    const timezoneCoordinates: Record<string, { lat: number; lng: number }> = {
      'UTC': { lat: 51.5074, lng: -0.1278 },
      'America/New_York': { lat: 40.7128, lng: -74.0060 },
      'America/Los_Angeles': { lat: 34.0522, lng: -118.2437 },
      'America/Chicago': { lat: 41.8781, lng: -87.6298 },
      'Europe/London': { lat: 51.5074, lng: -0.1278 },
      'Europe/Paris': { lat: 48.8566, lng: 2.3522 },
      'Asia/Tokyo': { lat: 35.6762, lng: 139.6503 },
      'Asia/Shanghai': { lat: 31.2304, lng: 121.4737 },
      'Australia/Sydney': { lat: -33.8688, lng: 151.2093 },
      'Asia/Kolkata': { lat: 19.0760, lng: 72.8777 }
    };

    const commonTimezones = timezoneService.getCommonTimezones();
    
    return commonTimezones.map(tz => ({
      timezone: tz.identifier,
      offset: tz.offset,
      label: tz.displayName,
      coordinates: timezoneCoordinates[tz.identifier] || { lat: 0, lng: 0 }
    }));
  }
}

const visualizationService = new VisualizationService();

async function visualizationHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return APIErrorHandler.handleBadRequest(res, 'Only GET and POST methods are allowed');
  }

  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const {
      type,
      fromTimezone,
      toTimezone,
      timestamps,
      timezone = 'UTC',
      format = 'iso8601',
      days = '30'
    } = params;

    if (!type) {
      return APIErrorHandler.handleBadRequest(res, 'type parameter is required');
    }

    let response: any;

    switch (type) {
      case 'timezone-chart':
        if (!fromTimezone || !toTimezone) {
          return APIErrorHandler.handleBadRequest(res, 'fromTimezone and toTimezone are required for timezone-chart');
        }
        response = visualizationService.generateTimezoneChart(
          String(fromTimezone),
          String(toTimezone),
          parseInt(String(days))
        );
        break;

      case 'business-heatmap':
        if (!fromTimezone || !toTimezone) {
          return APIErrorHandler.handleBadRequest(res, 'fromTimezone and toTimezone are required for business-heatmap');
        }
        response = visualizationService.generateBusinessHoursHeatmap(
          String(fromTimezone),
          String(toTimezone)
        );
        break;

      case 'timestamp-distribution':
        if (!timestamps) {
          return APIErrorHandler.handleBadRequest(res, 'timestamps parameter is required for timestamp-distribution');
        }
        const timestampArray = Array.isArray(timestamps) 
          ? timestamps.map(Number) 
          : String(timestamps).split(',').map(Number);
        response = visualizationService.generateTimestampDistribution(
          timestampArray,
          String(timezone),
          String(format)
        );
        break;

      case 'conversion-timeline':
        if (!timestamps || !toTimezone) {
          return APIErrorHandler.handleBadRequest(res, 'timestamps and toTimezone are required for conversion-timeline');
        }
        const convTimestamps = Array.isArray(timestamps)
          ? timestamps.map(Number)
          : String(timestamps).split(',').map(Number);
        response = visualizationService.generateConversionTimeline(
          convTimestamps,
          String(toTimezone),
          String(params.sourceTimezone || 'UTC')
        );
        break;

      case 'timezone-map':
        response = visualizationService.createTimezoneMapData();
        break;

      default:
        return APIErrorHandler.handleBadRequest(res, `Unsupported visualization type: ${type}`);
    }

    const builder = new ResponseBuilder().setData(response);
    builder.send(res);

  } catch (error) {
    console.error('Visualization API error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

// Enhanced visualization API with caching and rate limiting
const enhancedVisualizationHandler = withCors(
  createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 5 * 60 * 1000, // 5 minutes for visualization data
      cacheControlHeader: 'public, max-age=300, stale-while-revalidate=600'
    })(visualizationHandler)
  )
);

export default enhancedVisualizationHandler;
export { visualizationService };