import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, ResponseBuilder, withCors } from '../utils/response';
import { createCacheMiddleware } from '../middleware/cache';
import { createRateLimitMiddleware } from '../middleware/rate-limit';
import timezoneService from '../services/timezone-service';

interface TimezoneDifferenceData {
  fromTimezone: string;
  toTimezone: string;
  currentOffset: number;
  offsetHours: number;
  offsetMinutes: number;
  direction: 'ahead' | 'behind';
  isDST: {
    from: boolean;
    to: boolean;
  };
  dstDifference: number;
  nextDSTTransition?: {
    date: string;
    offsetChange: number;
    type: 'start' | 'end';
  };
}

interface TimezoneComparisonData {
  timezone1: string;
  timezone2: string;
  differences: {
    current: TimezoneDifferenceData;
    historical: Array<{
      date: string;
      offset: number;
      isDST1: boolean;
      isDST2: boolean;
    }>;
    upcoming: Array<{
      date: string;
      offset: number;
      type: string;
    }>;
  };
  businessHours: {
    timezone1: {
      start: string;
      end: string;
      workingHours: Array<{
        day: string;
        open: string;
        close: string;
      }>;
    };
    timezone2: {
      start: string;
      end: string;
      workingHours: Array<{
        day: string;
        open: string;
        close: string;
      }>;
    };
  };
}

class TimezoneVisualizationService {
  calculateTimezoneDifference(
    fromTimezone: string,
    toTimezone: string,
    referenceDate: Date = new Date()
  ): TimezoneDifferenceData {
    const resolvedFrom = timezoneService.resolveTimezone(fromTimezone);
    const resolvedTo = timezoneService.resolveTimezone(toTimezone);

    if (!timezoneService.validateTimezone(resolvedFrom) || !timezoneService.validateTimezone(resolvedTo)) {
      throw new Error('Invalid timezone provided');
    }

    const fromInfo = timezoneService.getTimezoneInfo(resolvedFrom);
    const toInfo = timezoneService.getTimezoneInfo(resolvedTo);

    const offsetDifference = toInfo.currentOffset - fromInfo.currentOffset;
    const direction = offsetDifference >= 0 ? 'ahead' : 'behind';
    const absOffset = Math.abs(offsetDifference);

    // Find next DST transition
    const transitions = fromInfo.dstTransitions.concat(toInfo.dstTransitions);
    const nextTransition = transitions
      .filter(t => new Date(t.date) > referenceDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    return {
      fromTimezone: resolvedFrom,
      toTimezone: resolvedTo,
      currentOffset: offsetDifference,
      offsetHours: Math.floor(absOffset / 60),
      offsetMinutes: absOffset % 60,
      direction,
      isDST: {
        from: fromInfo.isDST,
        to: toInfo.isDST
      },
      dstDifference: Math.abs((fromInfo.isDST ? 1 : 0) - (toInfo.isDST ? 1 : 0)) * 60,
      nextDSTTransition: nextTransition ? {
        date: nextTransition.date,
        offsetChange: nextTransition.offsetAfter - nextTransition.offsetBefore,
        type: nextTransition.type
      } : undefined
    };
  }

  generateHistoricalData(
    fromTimezone: string,
    toTimezone: string,
    days: number = 30
  ): Array<{
    date: string;
    offset: number;
    isDST1: boolean;
    isDST2: boolean;
  }> {
    const data: Array<{
      date: string;
      offset: number;
      isDST1: boolean;
      isDST2: boolean;
    }> = [];

    const resolvedFrom = timezoneService.resolveTimezone(fromTimezone);
    const resolvedTo = timezoneService.resolveTimezone(toTimezone);

    for (let i = -days; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      const fromOffset = timezoneService.getTimezoneOffset(date, resolvedFrom);
      const toOffset = timezoneService.getTimezoneOffset(date, resolvedTo);
      const isDST1 = timezoneService.isDST(date, resolvedFrom);
      const isDST2 = timezoneService.isDST(date, resolvedTo);

      data.push({
        date: date.toISOString().split('T')[0],
        offset: toOffset - fromOffset,
        isDST1,
        isDST2
      });
    }

    return data;
  }

  calculateBusinessHoursOverlap(
    timezone1: string,
    timezone2: string,
    businessHours: { start: number; end: number } = { start: 9, end: 17 }
  ): {
    timezone1: {
      start: string;
      end: string;
      workingHours: Array<{
        day: string;
        open: string;
        close: string;
      }>;
    };
    timezone2: {
      start: string;
      end: string;
      workingHours: Array<{
        day: string;
        open: string;
        close: string;
      }>;
    };
  } {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const resolved1 = timezoneService.resolveTimezone(timezone1);
    const resolved2 = timezoneService.resolveTimezone(timezone2);

    const formatTime = (hour: number, minute: number = 0) => 
      `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    return {
      timezone1: {
        start: formatTime(businessHours.start),
        end: formatTime(businessHours.end),
        workingHours: days.map(day => ({
          day,
          open: formatTime(businessHours.start),
          close: formatTime(businessHours.end)
        }))
      },
      timezone2: {
        start: formatTime(businessHours.start),
        end: formatTime(businessHours.end),
        workingHours: days.map(day => ({
          day,
          open: formatTime(businessHours.start),
          close: formatTime(businessHours.end)
        }))
      }
    };
  }

  findOptimalMeetingTimes(
    timezone1: string,
    timezone2: string,
    businessHours: { start: number; end: number } = { start: 9, end: 17 }
  ): Array<{
    time: string;
    timezone1: {
      localTime: string;
      day: string;
      isBusinessHours: boolean;
    };
    timezone2: {
      localTime: string;
      day: string;
      isBusinessHours: boolean;
    };
  }> {
    const optimalTimes = [];
    const now = new Date();
    
    // Check next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const baseDate = new Date(now);
      baseDate.setDate(baseDate.getDate() + dayOffset);
      
      // Check every hour
      for (let hour = 0; hour < 24; hour++) {
        const checkTime = new Date(baseDate);
        checkTime.setHours(hour, 0, 0, 0);
        
        const tz1Time = timezoneService.getCurrentTimeInTimezone(timezone1);
        const tz2Time = timezoneService.getCurrentTimeInTimezone(timezone2);
        
        // Convert to local times for both timezones
        const tz1Local = new Date(checkTime.getTime());
        const tz2Local = new Date(checkTime.getTime());
        
        const tz1Hour = tz1Local.getHours();
        const tz2Hour = tz2Local.getHours();
        
        const tz1Day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tz1Local.getDay()];
        const tz2Day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tz2Local.getDay()];
        
        const isBusiness1 = tz1Hour >= businessHours.start && tz1Hour < businessHours.end;
        const isBusiness2 = tz2Hour >= businessHours.start && tz2Hour < businessHours.end;
        
        // Include if both are in business hours
        if (isBusiness1 && isBusiness2) {
          optimalTimes.push({
            time: checkTime.toISOString(),
            timezone1: {
              localTime: `${tz1Hour.toString().padStart(2, '0')}:00`,
              day: tz1Day,
              isBusinessHours: isBusiness1
            },
            timezone2: {
              localTime: `${tz2Hour.toString().padStart(2, '0')}:00`,
              day: tz2Day,
              isBusinessHours: isBusiness2
            }
          });
        }
      }
    }
    
    return optimalTimes.slice(0, 10); // Return top 10 optimal times
  }
}

const visualizationService = new TimezoneVisualizationService();

async function timezoneDifferenceHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return APIErrorHandler.handleBadRequest(res, 'Only GET method is allowed');
  }

  try {
    const { 
      from, 
      to, 
      includeHistorical = 'false', 
      includeBusiness = 'false',
      optimalMeeting = 'false',
      days = '30'
    } = req.query;

    if (!from || !to) {
      return APIErrorHandler.handleBadRequest(res, 'from and to parameters are required');
    }

    const fromTimezone = String(from);
    const toTimezone = String(to);
    const historicalDays = parseInt(String(days));

    // Validate timezones
    if (!timezoneService.validateTimezone(fromTimezone) || !timezoneService.validateTimezone(toTimezone)) {
      const suggestions = timezoneService.getTimezoneSuggestions(String(from) + String(to));
      return APIErrorHandler.handleBadRequest(res, 'Invalid timezone provided', {
        suggestions: suggestions.slice(0, 3).map(tz => tz.identifier)
      });
    }

    const currentDifference = visualizationService.calculateTimezoneDifference(fromTimezone, toTimezone);
    
    const response: any = {
      difference: currentDifference
    };

    if (includeHistorical === 'true') {
      response.historical = visualizationService.generateHistoricalData(fromTimezone, toTimezone, historicalDays);
    }

    if (includeBusiness === 'true') {
      response.businessHours = visualizationService.calculateBusinessHoursOverlap(fromTimezone, toTimezone);
    }

    if (optimalMeeting === 'true') {
      response.optimalMeetingTimes = visualizationService.findOptimalMeetingTimes(fromTimezone, toTimezone);
    }

    const builder = new ResponseBuilder().setData(response);
    builder.send(res);

  } catch (error) {
    console.error('Timezone difference API error:', error);
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

// Enhanced timezone difference API with caching and rate limiting
const enhancedTimezoneDifferenceHandler = withCors(
  createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 60 * 60 * 1000, // 1 hour for timezone data
      cacheControlHeader: 'public, max-age=3600, stale-while-revalidate=7200'
    })(timezoneDifferenceHandler)
  )
);

export default enhancedTimezoneDifferenceHandler;
export { visualizationService };