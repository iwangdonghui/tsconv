// Frontend-specific type definitions to avoid API dependency
// Note: These interfaces are exported for future API expansion
export interface SupportedFormat {
  name: string;
  pattern: string;
  example: string;
  description: string;
  category: 'standard' | 'locale' | 'custom' | 'iso' | 'regional' | 'human' | 'technical';
}

export interface FormattedResult {
  format: string;
  result: string;
  success: boolean;
  error?: string;
}

export interface FormatValidationResult {
  valid: boolean;
  format?: string;
  error?: string;
  suggestions?: string[];
}

export interface TimezoneInfo {
  identifier: string;
  displayName: string;
  currentOffset: number;
  isDST: boolean;
  aliases?: string[];
}

export interface CommonTimezone {
  identifier: string;
  displayName: string;
  region: string;
  popularityRank: number;
  offset: number;
  isDST: boolean;
}

export interface DSTTransition {
  date: string;
  offsetBefore: number;
  offsetAfter: number;
  type: 'start' | 'end';
}

export const mockFormatService = {
  format: async (_timestamp: number, formats: string[], _timezone?: string) => {
    return formats.map(format => ({
      format,
      result: 'mock-result',
      success: true,
    }));
  },
  validateFormat: (format: string) => ({
    valid: true,
    format,
    suggestions: [],
  }),
  getSupportedFormats: () => [
    {
      name: 'iso8601',
      pattern: 'YYYY-MM-DDTHH:mm:ss.sssZ',
      example: '2022-01-01T00:00:00.000Z',
      description: 'ISO 8601 format',
      category: 'standard',
    },
    {
      name: 'us-date',
      pattern: 'MM/DD/YYYY',
      example: '01/15/2022',
      description: 'US date format',
      category: 'regional',
    },
    {
      name: 'eu-date',
      pattern: 'DD/MM/YYYY',
      example: '15/01/2022',
      description: 'European date format',
      category: 'regional',
    },
  ],
  registerFormat: () => true,
  unregisterFormat: () => true,
  listFormats: () => [
    {
      name: 'ISO 8601',
      pattern: 'YYYY-MM-DDTHH:mm:ss.sssZ',
      example: '2022-01-01T00:00:00.000Z',
      description: 'ISO 8601 format',
      category: 'standard',
    },
    {
      name: 'US Date',
      pattern: 'MM/DD/YYYY HH:mm:ss',
      example: '01/15/2024 02:30:45 PM',
      description: 'US date and time format',
      category: 'regional',
    },
    {
      name: 'European Date',
      pattern: 'DD.MM.YYYY HH:mm:ss',
      example: '15.01.2024 14:30:45',
      description: 'European date and time format',
      category: 'regional',
    },
    {
      name: 'Human Readable',
      pattern: 'relative',
      example: '2 hours ago',
      description: 'Relative time format',
      category: 'human',
    },
    {
      name: 'Unix Timestamp',
      pattern: 'seconds',
      example: '1640995200',
      description: 'Unix timestamp in seconds',
      category: 'technical',
    },
    {
      name: 'SQL Datetime',
      pattern: 'YYYY-MM-DD HH:mm:ss',
      example: '2024-01-15 14:30:45',
      description: 'SQL datetime format',
      category: 'technical',
    },
  ],
  getFormat: (_name: string) => null,
  formatDate: (date: Date, _formatName: string) => date.toISOString(),
  parseDate: (value: string, _formatName: string) => new Date(value),
};

export const mockTimezoneService = {
  validateTimezone: (_timezone: string) => true,
  resolveTimezone: (shortcut: string) => {
    const mapping: Record<string, string> = {
      EST: 'America/New_York',
      PST: 'America/Los_Angeles',
      CST: 'America/Chicago',
      MST: 'America/Denver',
    };
    return mapping[shortcut] || 'UTC';
  },
  getTimezoneInfo: (timezone: string) => ({
    identifier: timezone,
    displayName: timezone.replace('_', ' '),
    currentOffset: 0,
    isDST: false,
    aliases: [],
  }),
  convertTimestamp: (timestamp: number, fromTimezone: string, toTimezone: string) => ({
    originalTimestamp: timestamp,
    convertedTimestamp: timestamp,
    fromTimezone: mockTimezoneService.getTimezoneInfo(fromTimezone),
    toTimezone: mockTimezoneService.getTimezoneInfo(toTimezone),
    offsetDifference: 0,
  }),
  getCommonTimezones: () => [
    {
      identifier: 'UTC',
      displayName: 'Coordinated Universal Time',
      region: 'Global',
      popularityRank: 1,
      offset: 0,
      isDST: false,
    },
    {
      identifier: 'America/New_York',
      displayName: 'Eastern Time (US & Canada)',
      region: 'North America',
      popularityRank: 2,
      offset: -5,
      isDST: false,
    },
    {
      identifier: 'America/Los_Angeles',
      displayName: 'Pacific Time (US & Canada)',
      region: 'North America',
      popularityRank: 3,
      offset: -8,
      isDST: false,
    },
    {
      identifier: 'Europe/London',
      displayName: 'London, GMT',
      region: 'Europe',
      popularityRank: 4,
      offset: 0,
      isDST: false,
    },
    {
      identifier: 'Asia/Tokyo',
      displayName: 'Tokyo, Japan',
      region: 'Asia',
      popularityRank: 5,
      offset: 9,
      isDST: false,
    },
    {
      identifier: 'Asia/Shanghai',
      displayName: 'Beijing, Shanghai',
      region: 'Asia',
      popularityRank: 6,
      offset: 8,
      isDST: false,
    },
    {
      identifier: 'Europe/Berlin',
      displayName: 'Berlin, CET',
      region: 'Europe',
      popularityRank: 7,
      offset: 1,
      isDST: false,
    },
    {
      identifier: 'Australia/Sydney',
      displayName: 'Sydney, Australia',
      region: 'Oceania',
      popularityRank: 8,
      offset: 10,
      isDST: false,
    },
    {
      identifier: 'America/Chicago',
      displayName: 'Central Time (US & Canada)',
      region: 'North America',
      popularityRank: 9,
      offset: -6,
      isDST: false,
    },
    {
      identifier: 'America/Denver',
      displayName: 'Mountain Time (US & Canada)',
      region: 'North America',
      popularityRank: 10,
      offset: -7,
      isDST: false,
    },
  ],
  getDSTTransitions: (_timezone: string) => [],
  getBusinessHours: (timezone: string) => ({
    timezone,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    workingHours: { start: '09:00', end: '17:00' },
    currentTime: new Date().toISOString(),
    isBusinessHours: true,
  }),
  findOptimalMeetingTime: (fromTimezone: string, toTimezone: string) => [
    {
      utcTime: '2024-01-15T14:00:00.000Z',
      localTimes: {
        [fromTimezone]: '14:00',
        [toTimezone]: '09:00',
      },
      isBusinessHours: {
        [fromTimezone]: true,
        [toTimezone]: true,
      },
      score: 1.0,
    },
  ],
};
