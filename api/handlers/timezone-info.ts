import { VercelRequest, VercelResponse } from '@vercel/node';
import { CommonTimezone, TimezoneInfo } from '../types/api';
import { APIErrorHandler, createCorsHeaders } from '../utils/response';

// Common timezone data
const COMMON_TIMEZONES: CommonTimezone[] = [
  // North America
  {
    identifier: 'America/New_York',
    displayName: 'Eastern Time',
    region: 'North America',
    popularityRank: 1,
    offset: -300,
    isDST: false,
  },
  {
    identifier: 'America/Chicago',
    displayName: 'Central Time',
    region: 'North America',
    popularityRank: 2,
    offset: -360,
    isDST: false,
  },
  {
    identifier: 'America/Denver',
    displayName: 'Mountain Time',
    region: 'North America',
    popularityRank: 3,
    offset: -420,
    isDST: false,
  },
  {
    identifier: 'America/Los_Angeles',
    displayName: 'Pacific Time',
    region: 'North America',
    popularityRank: 4,
    offset: -480,
    isDST: false,
  },
  {
    identifier: 'America/Phoenix',
    displayName: 'Arizona Time',
    region: 'North America',
    popularityRank: 15,
    offset: -420,
    isDST: false,
  },
  {
    identifier: 'America/Anchorage',
    displayName: 'Alaska Time',
    region: 'North America',
    popularityRank: 20,
    offset: -540,
    isDST: false,
  },
  {
    identifier: 'Pacific/Honolulu',
    displayName: 'Hawaii Time',
    region: 'North America',
    popularityRank: 18,
    offset: -600,
    isDST: false,
  },

  // Europe
  {
    identifier: 'Europe/London',
    displayName: 'Greenwich Mean Time',
    region: 'Europe',
    popularityRank: 5,
    offset: 0,
    isDST: false,
  },
  {
    identifier: 'Europe/Paris',
    displayName: 'Central European Time',
    region: 'Europe',
    popularityRank: 6,
    offset: 60,
    isDST: false,
  },
  {
    identifier: 'Europe/Berlin',
    displayName: 'Central European Time',
    region: 'Europe',
    popularityRank: 7,
    offset: 60,
    isDST: false,
  },
  {
    identifier: 'Europe/Rome',
    displayName: 'Central European Time',
    region: 'Europe',
    popularityRank: 12,
    offset: 60,
    isDST: false,
  },
  {
    identifier: 'Europe/Madrid',
    displayName: 'Central European Time',
    region: 'Europe',
    popularityRank: 14,
    offset: 60,
    isDST: false,
  },
  {
    identifier: 'Europe/Amsterdam',
    displayName: 'Central European Time',
    region: 'Europe',
    popularityRank: 16,
    offset: 60,
    isDST: false,
  },
  {
    identifier: 'Europe/Moscow',
    displayName: 'Moscow Time',
    region: 'Europe',
    popularityRank: 11,
    offset: 180,
    isDST: false,
  },

  // Asia
  {
    identifier: 'Asia/Tokyo',
    displayName: 'Japan Standard Time',
    region: 'Asia',
    popularityRank: 8,
    offset: 540,
    isDST: false,
  },
  {
    identifier: 'Asia/Shanghai',
    displayName: 'China Standard Time',
    region: 'Asia',
    popularityRank: 9,
    offset: 480,
    isDST: false,
  },
  {
    identifier: 'Asia/Kolkata',
    displayName: 'India Standard Time',
    region: 'Asia',
    popularityRank: 10,
    offset: 330,
    isDST: false,
  },
  {
    identifier: 'Asia/Dubai',
    displayName: 'Gulf Standard Time',
    region: 'Asia',
    popularityRank: 13,
    offset: 240,
    isDST: false,
  },
  {
    identifier: 'Asia/Singapore',
    displayName: 'Singapore Time',
    region: 'Asia',
    popularityRank: 17,
    offset: 480,
    isDST: false,
  },
  {
    identifier: 'Asia/Seoul',
    displayName: 'Korea Standard Time',
    region: 'Asia',
    popularityRank: 19,
    offset: 540,
    isDST: false,
  },

  // Australia/Oceania
  {
    identifier: 'Australia/Sydney',
    displayName: 'Australian Eastern Time',
    region: 'Australia',
    popularityRank: 21,
    offset: 600,
    isDST: false,
  },
  {
    identifier: 'Australia/Melbourne',
    displayName: 'Australian Eastern Time',
    region: 'Australia',
    popularityRank: 22,
    offset: 600,
    isDST: false,
  },
  {
    identifier: 'Australia/Perth',
    displayName: 'Australian Western Time',
    region: 'Australia',
    popularityRank: 25,
    offset: 480,
    isDST: false,
  },

  // UTC
  {
    identifier: 'UTC',
    displayName: 'Coordinated Universal Time',
    region: 'UTC',
    popularityRank: 23,
    offset: 0,
    isDST: false,
  },
];

// Timezone aliases
const TIMEZONE_ALIASES: Record<string, string> = {
  EST: 'America/New_York',
  EDT: 'America/New_York',
  CST: 'America/Chicago',
  CDT: 'America/Chicago',
  MST: 'America/Denver',
  MDT: 'America/Denver',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  GMT: 'UTC',
  BST: 'Europe/London',
  CET: 'Europe/Paris',
  CEST: 'Europe/Paris',
  JST: 'Asia/Tokyo',
  IST: 'Asia/Kolkata',
  AEST: 'Australia/Sydney',
  AEDT: 'Australia/Sydney',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const corsHeaders = createCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests for timezone info
  if (req.method !== 'GET') {
    return APIErrorHandler.handleMethodNotAllowed(
      res,
      'Only GET method is allowed for timezone info'
    );
  }

  try {
    const startTime = Date.now();

    // Parse query parameters
    const timezone = req.query.timezone as string;
    const region = req.query.region as string;
    const search = req.query.search as string;
    const popular = req.query.popular === 'true';
    const includeAliases = req.query.aliases !== 'false';
    const includeDST = req.query.dst !== 'false';

    let result: any;

    if (timezone) {
      // Get specific timezone information
      result = await getSpecificTimezoneInfo(timezone, { includeAliases, includeDST });
    } else {
      // Get list of timezones with optional filtering
      result = await getTimezoneList({ region, search, popular, includeAliases });
    }

    APIErrorHandler.sendSuccess(res, result, {
      processingTime: Date.now() - startTime,
      itemCount: Array.isArray(result.timezones) ? result.timezones.length : 1,
      cacheHit: false,
    });
  } catch (error) {
    console.error('Timezone info error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'timezone-info',
    });
  }
}

async function getSpecificTimezoneInfo(
  timezone: string,
  options: { includeAliases: boolean; includeDST: boolean }
): Promise<any> {
  // Normalize timezone identifier
  const normalizedTimezone = normalizeTimezone(timezone);

  // Get current time for calculations
  const now = new Date();

  // Get timezone information
  const timezoneInfo = await getDetailedTimezoneInfo(normalizedTimezone, now, options);

  if (!timezoneInfo) {
    throw new Error(`Timezone '${timezone}' not found or invalid`);
  }

  return {
    timezone: timezoneInfo,
    query: {
      original: timezone,
      normalized: normalizedTimezone,
      timestamp: Math.floor(now.getTime() / 1000),
    },
  };
}

async function getTimezoneList(filters: {
  region?: string;
  search?: string;
  popular?: boolean;
  includeAliases: boolean;
}): Promise<any> {
  let timezones = [...COMMON_TIMEZONES];

  // Filter by region
  if (filters.region) {
    const regionLower = filters.region.toLowerCase();
    timezones = timezones.filter(tz => tz.region.toLowerCase().includes(regionLower));
  }

  // Filter by search term
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    timezones = timezones.filter(
      tz =>
        tz.identifier.toLowerCase().includes(searchLower) ||
        tz.displayName.toLowerCase().includes(searchLower) ||
        tz.region.toLowerCase().includes(searchLower)
    );
  }

  // Filter by popularity
  if (filters.popular) {
    timezones = timezones.filter(tz => tz.popularityRank <= 15);
  }

  // Sort by popularity rank
  timezones.sort((a, b) => a.popularityRank - b.popularityRank);

  // Add current offset and DST status
  const now = new Date();
  const enrichedTimezones = await Promise.all(
    timezones.map(async tz => {
      const currentOffset = getCurrentOffset(tz.identifier, now);
      const isDST = isDaylightSavingTime(tz.identifier, now);

      return {
        ...tz,
        currentOffset,
        isDST,
        aliases: filters.includeAliases ? getTimezoneAliases(tz.identifier) : undefined,
      };
    })
  );

  // Group by region
  const groupedByRegion = enrichedTimezones.reduce(
    (acc, tz) => {
      if (!acc[tz.region]) {
        acc[tz.region] = [];
      }
      acc[tz.region]!.push(tz);
      return acc;
    },
    {} as Record<string, any[]>
  );

  return {
    timezones: enrichedTimezones,
    groupedByRegion,
    metadata: {
      totalCount: enrichedTimezones.length,
      regions: Object.keys(groupedByRegion),
      filters: {
        region: filters.region || null,
        search: filters.search || null,
        popular: filters.popular || false,
      },
    },
  };
}

async function getDetailedTimezoneInfo(
  timezone: string,
  date: Date,
  options: { includeAliases: boolean; includeDST: boolean }
): Promise<TimezoneInfo | null> {
  try {
    const currentOffset = getCurrentOffset(timezone, date);
    const isDST = isDaylightSavingTime(timezone, date);
    const displayName = getTimezoneDisplayName(timezone);

    const info: TimezoneInfo = {
      identifier: timezone,
      displayName,
      currentOffset,
      isDST,
    };

    if (options.includeAliases) {
      info.aliases = getTimezoneAliases(timezone);
    }

    if (options.includeDST && isDST) {
      info.dstTransitions = getDSTTransitions(timezone, date.getFullYear());
    }

    return info;
  } catch (error) {
    console.warn(`Failed to get timezone info for ${timezone}:`, error);
    return null;
  }
}

function normalizeTimezone(timezone: string): string {
  // Check if it's an alias
  const alias = TIMEZONE_ALIASES[timezone.toUpperCase()];
  if (alias) {
    return alias;
  }

  // Return as-is if it looks like a valid IANA timezone
  if (timezone.includes('/') || timezone === 'UTC') {
    return timezone;
  }

  // Handle UTC variations
  const upperTimezone = timezone.toUpperCase();
  if (['UTC', 'GMT', 'Z'].includes(upperTimezone)) {
    return 'UTC';
  }

  // Default to treating as IANA timezone identifier
  return timezone;
}

function getCurrentOffset(timezone: string, date: Date): number {
  try {
    // Use Intl.DateTimeFormat to get accurate offset
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60); // in minutes
  } catch (error) {
    return 0;
  }
}

function isDaylightSavingTime(timezone: string, date: Date): boolean {
  try {
    // Compare current offset with January offset
    const januaryDate = new Date(date.getFullYear(), 0, 1);
    const julyDate = new Date(date.getFullYear(), 6, 1);

    const januaryOffset = getCurrentOffset(timezone, januaryDate);
    const julyOffset = getCurrentOffset(timezone, julyDate);
    const currentOffset = getCurrentOffset(timezone, date);

    // DST is in effect if current offset is different from standard time
    const standardOffset = Math.max(januaryOffset, julyOffset);
    return currentOffset !== standardOffset;
  } catch (error) {
    return false;
  }
}

function getTimezoneDisplayName(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'long',
    });

    const parts = formatter.formatToParts(new Date());
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');

    return timeZonePart?.value || timezone;
  } catch (error) {
    return timezone;
  }
}

function getTimezoneAliases(timezone: string): string[] {
  const aliases: string[] = [];

  // Find aliases that map to this timezone
  for (const [alias, target] of Object.entries(TIMEZONE_ALIASES)) {
    if (target === timezone) {
      aliases.push(alias);
    }
  }

  return aliases;
}

function getDSTTransitions(timezone: string, year: number): any[] {
  // This is a simplified implementation
  // In a real application, you would use a comprehensive timezone database
  const transitions: any[] = [];

  try {
    // Check common DST transition dates
    const springTransition = new Date(year, 2, 14); // Mid March
    const fallTransition = new Date(year, 10, 7); // Early November

    const winterOffset = getCurrentOffset(timezone, new Date(year, 0, 1));
    const summerOffset = getCurrentOffset(timezone, new Date(year, 6, 1));

    if (winterOffset !== summerOffset) {
      transitions.push({
        date: springTransition.toISOString().split('T')[0],
        offsetBefore: winterOffset,
        offsetAfter: summerOffset,
        type: 'start',
      });

      transitions.push({
        date: fallTransition.toISOString().split('T')[0],
        offsetBefore: summerOffset,
        offsetAfter: winterOffset,
        type: 'end',
      });
    }
  } catch (error) {
    // Return empty array if we can't determine transitions
  }

  return transitions;
}
