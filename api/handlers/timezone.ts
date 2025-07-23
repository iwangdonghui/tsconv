import { VercelRequest, VercelResponse } from '@vercel/node';
import { CommonTimezone } from '../types/api';
import timezoneService from '../services/timezone-service';
import { APIErrorHandler, withCors, ResponseBuilder } from '../utils/response';
import { createCacheMiddleware } from '../middleware/cache';
import { createRateLimitMiddleware } from '../middleware/rate-limit';

interface TimezoneInfoRequest {
  timezone: string;
  includeTransitions?: boolean;
  includeAliases?: boolean;
}

interface TimezoneListRequest {
  region?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface TimezoneConversionRequest {
  timestamp: number;
  fromTimezone: string;
  toTimezone: string;
  includeInfo?: boolean;
}

async function timezoneInfoHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return await getTimezoneInfo(req, res);
  } else if (req.method === 'POST') {
    return await processTimezoneConversion(req, res);
  }
  return APIErrorHandler.handleBadRequest(res, 'Only GET and POST methods are allowed');
}

async function getTimezoneInfo(req: VercelRequest, res: VercelResponse) {
  try {
    const timezone = req.query.timezone as string;
    const includeTransitions = req.query.includeTransitions === 'true';
    const includeAliases = req.query.includeAliases === 'true';

    if (!timezone) {
      return APIErrorHandler.handleBadRequest(res, 'timezone parameter is required');
    }

    const resolvedTimezone = timezoneService.resolveTimezone(timezone);
    if (!timezoneService.validateTimezone(resolvedTimezone)) {
      const suggestions = timezoneService.getTimezoneSuggestions(timezone);
      return APIErrorHandler.handleBadRequest(res, 'Invalid timezone', {
        suggestions: suggestions.slice(0, 3).map(tz => tz.identifier),
        provided: timezone
      });
    }

    const info = timezoneService.getTimezoneInfo(resolvedTimezone);
    if (!includeTransitions) delete info.dstTransitions;
    if (!includeAliases) delete info.aliases;

    const builder = new ResponseBuilder()
      .setData(info);
    builder.send(res);

  } catch (error) {
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

async function listTimezonesHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const region = req.query.region as string;
    const search = req.query.search as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    let timezones: CommonTimezone[];

    if (search) {
      timezones = timezoneService.searchTimezones(search);
    } else if (region) {
      timezones = timezoneService.getCommonTimezonesByRegion(region);
    } else {
      timezones = timezoneService.getCommonTimezones();
    }

    const paginatedTimezones = timezones.slice(offset, offset + limit);
    const total = timezones.length;

    const response = {
      timezones: paginatedTimezones,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };

    const builder = new ResponseBuilder()
      .setData(response)
      .setRateLimit({
        limit: 100,
        remaining: 100 - response.timezones.length,
        resetTime: Date.now() + 60000,
        window: 60000
      });
    builder.send(res);

  } catch (error) {
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

async function processTimezoneConversion(req: VercelRequest, res: VercelResponse) {
  try {
    const body = req.body as TimezoneConversionRequest;
    const { timestamp, fromTimezone, toTimezone, includeInfo = false } = body;

    if (typeof timestamp !== 'number' || timestamp < 0) {
      return APIErrorHandler.handleBadRequest(res, 'timestamp must be a positive number');
    }

    if (!fromTimezone || typeof fromTimezone !== 'string') {
      return APIErrorHandler.handleBadRequest(res, 'fromTimezone must be provided as a string');
    }

    if (!toTimezone || typeof toTimezone !== 'string') {
      return APIErrorHandler.handleBadRequest(res, 'toTimezone must be provided as a string');
    }

    const resolvedFrom = timezoneService.resolveTimezone(fromTimezone);
    const resolvedTo = timezoneService.resolveTimezone(toTimezone);

    if (!timezoneService.validateTimezone(resolvedFrom)) {
      const suggestions = timezoneService.getTimezoneSuggestions(fromTimezone);
      return APIErrorHandler.handleBadRequest(res, 'Invalid fromTimezone', {
        suggestions: suggestions.slice(0, 3).map(tz => tz.identifier),
        provided: fromTimezone
      });
    }

    if (!timezoneService.validateTimezone(resolvedTo)) {
      const suggestions = timezoneService.getTimezoneSuggestions(toTimezone);
      return APIErrorHandler.handleBadRequest(res, 'Invalid toTimezone', {
        suggestions: suggestions.slice(0, 3).map(tz => tz.identifier),
        provided: toTimezone
      });
    }

    const conversion = timezoneService.convertTimestamp(timestamp, resolvedFrom, resolvedTo);

    const response: any = {
      originalTimestamp: conversion.originalTimestamp,
      convertedTimestamp: conversion.convertedTimestamp,
      offsetDifference: conversion.offsetDifference,
      formattedResults: formatTimezoneResults(conversion.convertedTimestamp, resolvedTo)
    };

    if (includeInfo) {
      response.fromTimezone = conversion.fromTimezone;
      response.toTimezone = conversion.toTimezone;
    }

    const builder = new ResponseBuilder()
      .setData(response);
    builder.send(res);

  } catch (error) {
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

function formatTimezoneResults(timestamp: number, timezone: string) {
  const date = new Date(timestamp * 1000);
  return {
    iso8601: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString('en-US', { timeZone: timezone }),
    shortTime: date.toLocaleTimeString('en-US', { timeZone: timezone }),
    shortDate: date.toLocaleDateString('en-US', { timeZone: timezone })
  };
}

async function getCurrentTimeHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const timezone = req.query.timezone as string;
    if (!timezone) {
      return APIErrorHandler.handleBadRequest(res, 'timezone parameter is required');
    }

    const resolvedTimezone = timezoneService.resolveTimezone(timezone);
    if (!timezoneService.validateTimezone(resolvedTimezone)) {
      const suggestions = timezoneService.getTimezoneSuggestions(timezone);
      return APIErrorHandler.handleBadRequest(res, 'Invalid timezone', {
        suggestions: suggestions.slice(0, 3).map(tz => tz.identifier),
        provided: timezone
      });
    }

    const currentTime = timezoneService.getCurrentTimeInTimezone(resolvedTimezone);
    const builder = new ResponseBuilder().setData(currentTime);
    builder.send(res);

  } catch (error) {
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

async function timezoneSuggestionsHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const query = req.query.query as string;
    if (!query || query.length < 2) {
      return APIErrorHandler.handleBadRequest(res, 'query parameter must be at least 2 characters');
    }

    const suggestions = timezoneService.getTimezoneSuggestions(query);
    const builder = new ResponseBuilder().setData({ suggestions });
    builder.send(res);

  } catch (error) {
    if (error instanceof Error) {
      APIErrorHandler.handleServerError(res, error);
    } else {
      APIErrorHandler.handleServerError(res, new Error('Unknown error'));
    }
  }
}

// Enhanced timezone API endpoints with caching and rate limiting
const enhancedTimezoneInfoHandler = withCors(
  createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 24 * 60 * 60 * 1000, // 24 hours for timezone data
      cacheControlHeader: 'public, max-age=86400, stale-while-revalidate=172800'
    })(timezoneInfoHandler)
  )
);

const enhancedListTimezonesHandler = withCors(
  createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 24 * 60 * 60 * 1000, // 24 hours for timezone list
      cacheControlHeader: 'public, max-age=86400, stale-while-revalidate=172800'
    })(listTimezonesHandler)
  )
);

const enhancedTimezoneConversionHandler = withCors(
  createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 5 * 60 * 1000, // 5 minutes for conversions
      cacheControlHeader: 'public, max-age=300, stale-while-revalidate=600'
    })(processTimezoneConversion)
  )
);

const enhancedCurrentTimeHandler = withCors(
  createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 60 * 1000, // 1 minute for current time
      cacheControlHeader: 'public, max-age=60, stale-while-revalidate=300'
    })(getCurrentTimeHandler)
  )
);

const enhancedTimezoneSuggestionsHandler = withCors(
  createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 24 * 60 * 60 * 1000, // 24 hours for suggestions
      cacheControlHeader: 'public, max-age=86400, stale-while-revalidate=172800'
    })(timezoneSuggestionsHandler)
  )
);

export {
  enhancedTimezoneInfoHandler,
  enhancedListTimezonesHandler,
  enhancedTimezoneConversionHandler,
  enhancedCurrentTimeHandler,
  enhancedTimezoneSuggestionsHandler
};