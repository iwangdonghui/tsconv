import { CommonTimezone, DSTTransition, TimezoneInfo } from '../types/api';

class TimezoneService {
  // Maps are initialized but may be lazily populated; keep declarations for clarity
   
  // Using built-ins for resolution now; keep map placeholder for future expansion
  private timezones: Map<string, TimezoneInfo> = new Map();
  private commonTimezones: CommonTimezone[] = [];
  private shortcuts: Map<string, string> = new Map();
   

  constructor() {
    this.initialize();
    void this.timezones; // mark as intentionally retained for future use
  }

  private initialize(): void {
    this.initializeCommonTimezones();
    this.initializeShortcuts();
  }

  private initializeCommonTimezones(): void {
    const commonZones = [
      {
        identifier: 'UTC',
        displayName: 'Coordinated Universal Time',
        region: 'Global',
        popularityRank: 1,
      },
      {
        identifier: 'America/New_York',
        displayName: 'Eastern Time (US & Canada)',
        region: 'North America',
        popularityRank: 2,
      },
      {
        identifier: 'America/Chicago',
        displayName: 'Central Time (US & Canada)',
        region: 'North America',
        popularityRank: 3,
      },
      {
        identifier: 'America/Denver',
        displayName: 'Mountain Time (US & Canada)',
        region: 'North America',
        popularityRank: 4,
      },
      {
        identifier: 'America/Los_Angeles',
        displayName: 'Pacific Time (US & Canada)',
        region: 'North America',
        popularityRank: 5,
      },
      {
        identifier: 'America/Toronto',
        displayName: 'Eastern Time (Canada)',
        region: 'North America',
        popularityRank: 6,
      },
      {
        identifier: 'America/Vancouver',
        displayName: 'Pacific Time (Canada)',
        region: 'North America',
        popularityRank: 7,
      },
      { identifier: 'Europe/London', displayName: 'London', region: 'Europe', popularityRank: 8 },
      { identifier: 'Europe/Paris', displayName: 'Paris', region: 'Europe', popularityRank: 9 },
      { identifier: 'Europe/Berlin', displayName: 'Berlin', region: 'Europe', popularityRank: 10 },
      { identifier: 'Europe/Rome', displayName: 'Rome', region: 'Europe', popularityRank: 11 },
      { identifier: 'Europe/Madrid', displayName: 'Madrid', region: 'Europe', popularityRank: 12 },
      { identifier: 'Europe/Moscow', displayName: 'Moscow', region: 'Europe', popularityRank: 13 },
      { identifier: 'Asia/Tokyo', displayName: 'Tokyo', region: 'Asia', popularityRank: 14 },
      { identifier: 'Asia/Shanghai', displayName: 'Shanghai', region: 'Asia', popularityRank: 15 },
      {
        identifier: 'Asia/Singapore',
        displayName: 'Singapore',
        region: 'Asia',
        popularityRank: 16,
      },
      { identifier: 'Asia/Kolkata', displayName: 'Kolkata', region: 'Asia', popularityRank: 17 },
      { identifier: 'Asia/Dubai', displayName: 'Dubai', region: 'Asia', popularityRank: 18 },
      {
        identifier: 'Australia/Sydney',
        displayName: 'Sydney',
        region: 'Australia',
        popularityRank: 19,
      },
      {
        identifier: 'Australia/Melbourne',
        displayName: 'Melbourne',
        region: 'Australia',
        popularityRank: 20,
      },
      {
        identifier: 'Pacific/Auckland',
        displayName: 'Auckland',
        region: 'Pacific',
        popularityRank: 21,
      },
      {
        identifier: 'Brazil/East',
        displayName: 'Brasília',
        region: 'South America',
        popularityRank: 22,
      },
      {
        identifier: 'America/Sao_Paulo',
        displayName: 'São Paulo',
        region: 'South America',
        popularityRank: 23,
      },
      {
        identifier: 'Africa/Johannesburg',
        displayName: 'Johannesburg',
        region: 'Africa',
        popularityRank: 24,
      },
      { identifier: 'Africa/Cairo', displayName: 'Cairo', region: 'Africa', popularityRank: 25 },
    ];

    this.commonTimezones = commonZones.map(zone => ({
      ...zone,
      offset: this.getCurrentOffset(zone.identifier),
      isDST: this.isDST(new Date(), zone.identifier),
    }));
  }

  private initializeShortcuts(): void {
    this.shortcuts.set('EST', 'America/New_York');
    this.shortcuts.set('EDT', 'America/New_York');
    this.shortcuts.set('CST', 'America/Chicago');
    this.shortcuts.set('CDT', 'America/Chicago');
    this.shortcuts.set('MST', 'America/Denver');
    this.shortcuts.set('MDT', 'America/Denver');
    this.shortcuts.set('PST', 'America/Los_Angeles');
    this.shortcuts.set('PDT', 'America/Los_Angeles');
    this.shortcuts.set('GMT', 'Europe/London');
    this.shortcuts.set('BST', 'Europe/London');
    this.shortcuts.set('CET', 'Europe/Paris');
    this.shortcuts.set('CEST', 'Europe/Paris');
    this.shortcuts.set('JST', 'Asia/Tokyo');
    this.shortcuts.set('KST', 'Asia/Seoul');
    this.shortcuts.set('IST', 'Asia/Kolkata');
    this.shortcuts.set('AEST', 'Australia/Sydney');
    this.shortcuts.set('ACST', 'Australia/Adelaide');
    this.shortcuts.set('AWST', 'Australia/Perth');
  }

  validateTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      // Check shortcuts
      return this.shortcuts.has(timezone.toUpperCase());
    }
  }

  resolveTimezone(timezone: string): string {
    const upperTimezone = timezone.toUpperCase();
    return this.shortcuts.get(upperTimezone) || timezone;
  }

  getTimezoneInfo(timezone: string): TimezoneInfo {
    const resolvedTimezone = this.resolveTimezone(timezone);

    try {
      const now = new Date();
      const offset = this.getCurrentOffset(resolvedTimezone);
      const isDST = this.isDST(now, resolvedTimezone);

      return {
        identifier: resolvedTimezone,
        displayName: this.getDisplayName(resolvedTimezone),
        currentOffset: offset,
        isDST,
        dstTransitions: this.getDSTTransitions(resolvedTimezone),
        aliases: this.getAliases(resolvedTimezone),
      };
    } catch (error) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
  }

  private getCurrentOffset(timezone: string): number {
    try {
      const now = new Date();

      // For UTC, return 0 directly
      if (timezone === 'UTC') {
        return 0;
      }

      // Get the timezone offset using Intl.DateTimeFormat
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        timeZoneName: 'longOffset',
      });

      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find(part => part.type === 'timeZoneName');

      if (offsetPart && offsetPart.value !== timezone) {
        // Parse offset like "GMT+05:30" or "GMT-08:00"
        const match = offsetPart.value.match(/GMT([+-])(\d{2}):(\d{2})/);
        if (match) {
          const sign = match[1] === '+' ? 1 : -1;
          const hours = parseInt(match[2]!);
          const minutes = parseInt(match[3]!);
          return sign * (hours * 60 + minutes);
        }
      }

      // Fallback method using date comparison
      // const __utcTime = now.getTime(); // reserved for debug
      const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getTime();
      const localUTCTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();

      return Math.round((localTime - localUTCTime) / 60000);
    } catch (error) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
  }

  isDST(date: Date, timezone: string): boolean {
    try {
      const resolvedTimezone = this.resolveTimezone(timezone);
      if (!this.validateTimezone(resolvedTimezone)) {
        return false;
      }

      // UTC never has DST
      if (resolvedTimezone === 'UTC') {
        return false;
      }

      // Check for invalid date
      if (isNaN(date.getTime())) {
        return false;
      }

      const jan = new Date(date.getFullYear(), 0, 1);
      const jul = new Date(date.getFullYear(), 6, 1);
      const janOffset = this.getTimezoneOffset(jan, resolvedTimezone);
      const julOffset = this.getTimezoneOffset(jul, resolvedTimezone);
      const currentOffset = this.getTimezoneOffset(date, resolvedTimezone);

      // If January and July have the same offset, no DST is observed
      if (janOffset === julOffset) {
        return false;
      }

      // For most northern hemisphere timezones:
      // - Standard time (winter) has a more negative offset
      // - DST (summer) has a less negative offset (closer to 0)
      // const __standardOffset = Math.min(janOffset, julOffset); // More negative (debug placeholder)
      const dstOffset = Math.max(janOffset, julOffset); // Less negative

      // DST is active when current offset matches the DST offset
      return currentOffset === dstOffset;
    } catch (error) {
      return false;
    }
  }

  getTimezoneOffset(date: Date, timezone: string): number {
    try {
      const resolvedTimezone = this.resolveTimezone(timezone);
      if (!this.validateTimezone(resolvedTimezone)) {
        throw new Error(`Invalid timezone: ${timezone}`);
      }

      // For UTC, return 0 directly
      if (resolvedTimezone === 'UTC') {
        return 0;
      }

      // Use a more reliable method to get timezone offset
      // const __utcTime = date.getTime(); // reserved for debug
      const localTime = new Date(
        date.toLocaleString('en-US', { timeZone: resolvedTimezone })
      ).getTime();
      const utcTimeInTz = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();

      return Math.round((localTime - utcTimeInTz) / 60000);
    } catch (error) {
      throw new Error(
        `Failed to get timezone offset for ${timezone}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private getDisplayName(timezone: string): string {
    const displayNames: Record<string, string> = {
      UTC: 'Coordinated Universal Time',
      'America/New_York': 'Eastern Time (US & Canada)',
      'America/Chicago': 'Central Time (US & Canada)',
      'America/Denver': 'Mountain Time (US & Canada)',
      'America/Los_Angeles': 'Pacific Time (US & Canada)',
      'Europe/London': 'London',
      'Europe/Paris': 'Paris',
      'Europe/Berlin': 'Berlin',
      'Asia/Tokyo': 'Tokyo',
      'Asia/Shanghai': 'Shanghai',
      'Asia/Kolkata': 'Kolkata',
      'Australia/Sydney': 'Sydney',
    };

    return displayNames[timezone] || timezone.replace(/_/g, ' ');
  }

  private getDSTTransitions(timezone: string): DSTTransition[] {
    try {
      const transitions: DSTTransition[] = [];
      const resolvedTimezone = this.resolveTimezone(timezone);
      const now = new Date();
      const year = now.getFullYear();

      // Check if timezone observes DST
      const jan = new Date(year, 0, 1);
      const jul = new Date(year, 6, 1);
      const janOffset = this.getTimezoneOffset(jan, resolvedTimezone);
      const julOffset = this.getTimezoneOffset(jul, resolvedTimezone);

      if (janOffset !== julOffset) {
        // Find more accurate DST transition dates
        const springTransition = this.findDSTTransition(year, resolvedTimezone, 'spring');
        const fallTransition = this.findDSTTransition(year, resolvedTimezone, 'fall');

        if (springTransition) {
          transitions.push({
            date: springTransition.date.toISOString(),
            offsetBefore: springTransition.offsetBefore,
            offsetAfter: springTransition.offsetAfter,
            type: 'start',
          });
        }

        if (fallTransition) {
          transitions.push({
            date: fallTransition.date.toISOString(),
            offsetBefore: fallTransition.offsetBefore,
            offsetAfter: fallTransition.offsetAfter,
            type: 'end',
          });
        }
      }

      return transitions;
    } catch (error) {
      return [];
    }
  }

  private findDSTTransition(
    year: number,
    timezone: string,
    season: 'spring' | 'fall'
  ): {
    date: Date;
    offsetBefore: number;
    offsetAfter: number;
  } | null {
    try {
      const startMonth = season === 'spring' ? 2 : 9; // March or October
      const endMonth = season === 'spring' ? 4 : 11; // May or December

      let previousOffset: number | null = null;

      for (let month = startMonth; month <= endMonth; month++) {
        for (let day = 1; day <= 31; day++) {
          const testDate = new Date(year, month, day);
          if (testDate.getMonth() !== month) break; // Invalid date

          const currentOffset = this.getTimezoneOffset(testDate, timezone);

          if (previousOffset !== null && currentOffset !== previousOffset) {
            return {
              date: testDate,
              offsetBefore: previousOffset,
              offsetAfter: currentOffset,
            };
          }

          previousOffset = currentOffset;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private getAliases(timezone: string): string[] {
    const aliases: Record<string, string[]> = {
      'America/New_York': ['EST', 'EDT'],
      'America/Chicago': ['CST', 'CDT'],
      'America/Denver': ['MST', 'MDT'],
      'America/Los_Angeles': ['PST', 'PDT'],
      'Europe/London': ['GMT', 'BST'],
      'Asia/Tokyo': ['JST'],
      'Asia/Kolkata': ['IST'],
    };

    return aliases[timezone] || [];
  }

  getCommonTimezones(): CommonTimezone[] {
    return this.commonTimezones;
  }

  getCommonTimezonesByRegion(region?: string): CommonTimezone[] {
    if (!region) return this.commonTimezones;
    return this.commonTimezones.filter(tz => tz.region.toLowerCase() === region.toLowerCase());
  }

  searchTimezones(query: string): CommonTimezone[] {
    const lowerQuery = query.toLowerCase();
    return this.commonTimezones.filter(tz => {
      const identifier = tz.identifier.toLowerCase();
      const displayName = tz.displayName.toLowerCase();
      const region = tz.region.toLowerCase();

      // Check if query matches identifier, display name, or region
      if (
        identifier.includes(lowerQuery) ||
        displayName.includes(lowerQuery) ||
        region.includes(lowerQuery)
      ) {
        return true;
      }

      // Special handling for common city names in identifiers
      // e.g., "new york" should match "America/New_York"
      const queryWords = lowerQuery.split(/\s+/);
      const identifierParts = identifier.split(/[/_]/);

      return queryWords.every(word => identifierParts.some(part => part.includes(word)));
    });
  }

  convertTimestamp(
    timestamp: number,
    fromTimezone: string,
    toTimezone: string
  ): {
    originalTimestamp: number;
    convertedTimestamp: number;
    fromTimezone: TimezoneInfo;
    toTimezone: TimezoneInfo;
    offsetDifference: number;
  } {
    const resolvedFrom = this.resolveTimezone(fromTimezone);
    const resolvedTo = this.resolveTimezone(toTimezone);

    if (!this.validateTimezone(resolvedFrom) || !this.validateTimezone(resolvedTo)) {
      throw new Error('Invalid timezone provided');
    }

    const fromInfo = this.getTimezoneInfo(resolvedFrom);
    const toInfo = this.getTimezoneInfo(resolvedTo);

    const originalDate = new Date(timestamp * 1000);
    const convertedDate = this.convertTimezone(originalDate, resolvedFrom, resolvedTo);
    const convertedTimestamp = Math.floor(convertedDate.getTime() / 1000);

    return {
      originalTimestamp: timestamp,
      convertedTimestamp,
      fromTimezone: fromInfo,
      toTimezone: toInfo,
      offsetDifference: toInfo.currentOffset - fromInfo.currentOffset,
    };
  }

  convertTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
    const resolvedFrom = this.resolveTimezone(fromTimezone);
    const resolvedTo = this.resolveTimezone(toTimezone);

    if (!this.validateTimezone(resolvedFrom) || !this.validateTimezone(resolvedTo)) {
      throw new Error('Invalid timezone provided');
    }

    if (resolvedFrom === resolvedTo) {
      return date;
    }

    try {
      // Convert to target timezone
      // const __utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000); // reserved for debug
      const fromOffset = this.getTimezoneOffset(date, resolvedFrom);
      const toOffset = this.getTimezoneOffset(date, resolvedTo);

      // Adjust for timezone difference
      const offsetDiff = toOffset - fromOffset;
      return new Date(date.getTime() + offsetDiff * 60 * 1000);
    } catch (error) {
      throw new Error(`Timezone conversion failed: ${error}`);
    }
  }

  getTimezoneDifference(fromTimezone: string, toTimezone: string): number {
    const resolvedFrom = this.resolveTimezone(fromTimezone);
    const resolvedTo = this.resolveTimezone(toTimezone);

    // const __now = new Date(); // reserved for debug
    const fromOffset = this.getCurrentOffset(resolvedFrom);
    const toOffset = this.getCurrentOffset(resolvedTo);

    return toOffset - fromOffset;
  }

  getAllAvailableTimezones(): string[] {
    try {
      // Get all available timezones from Intl API
      return Intl.supportedValuesOf('timeZone');
    } catch (error) {
      // Fallback to common timezones
      return this.commonTimezones.map(tz => tz.identifier);
    }
  }

  getTimezoneSuggestions(input: string): CommonTimezone[] {
    const lowerInput = input.toLowerCase();
    const suggestions = this.commonTimezones.filter(
      tz =>
        tz.identifier.toLowerCase().startsWith(lowerInput) ||
        tz.displayName.toLowerCase().startsWith(lowerInput)
    );

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  getCurrentTimeInTimezone(timezone: string): {
    timezone: string;
    localTime: string;
    utcTime: string;
    timestamp: number;
  } {
    const resolvedTimezone = this.resolveTimezone(timezone);
    if (!this.validateTimezone(resolvedTimezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    const now = new Date();
    const localDate = this.convertTimezone(now, 'UTC', resolvedTimezone);

    return {
      timezone: resolvedTimezone,
      localTime: localDate.toLocaleString('en-US', { timeZone: resolvedTimezone }),
      utcTime: now.toISOString(),
      timestamp: Math.floor(localDate.getTime() / 1000),
    };
  }

  // Additional utility methods for timezone offset calculations
  calculateTimezoneOffsetDifference(fromTimezone: string, toTimezone: string, date?: Date): number {
    try {
      const testDate = date || new Date();
      const resolvedFrom = this.resolveTimezone(fromTimezone);
      const resolvedTo = this.resolveTimezone(toTimezone);

      if (!this.validateTimezone(resolvedFrom) || !this.validateTimezone(resolvedTo)) {
        throw new Error('Invalid timezone provided');
      }

      const fromOffset = this.getTimezoneOffset(testDate, resolvedFrom);
      const toOffset = this.getTimezoneOffset(testDate, resolvedTo);

      return toOffset - fromOffset;
    } catch (error) {
      throw new Error(
        `Failed to calculate timezone offset difference: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getDSTTransitionDates(timezone: string): DSTTransition[] {
    // const __targetYear = year ?? new Date().getFullYear(); // reserved for future use in detailed transitions
    const resolvedTimezone = this.resolveTimezone(timezone);

    if (!this.validateTimezone(resolvedTimezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    return this.getDSTTransitions(resolvedTimezone);
  }

  isTimezoneObservingDST(timezone: string, date?: Date): boolean {
    try {
      const testDate = date || new Date();
      return this.isDST(testDate, timezone);
    } catch (error) {
      return false;
    }
  }

  getTimezoneOffsetAtDate(
    timezone: string,
    date: Date
  ): {
    offset: number;
    isDST: boolean;
    displayName: string;
  } {
    try {
      const resolvedTimezone = this.resolveTimezone(timezone);
      if (!this.validateTimezone(resolvedTimezone)) {
        throw new Error(`Invalid timezone: ${timezone}`);
      }

      const offset = this.getTimezoneOffset(date, resolvedTimezone);
      const isDST = this.isDST(date, resolvedTimezone);
      const displayName = this.getDisplayName(resolvedTimezone);

      return {
        offset,
        isDST,
        displayName,
      };
    } catch (error) {
      throw new Error(
        `Failed to get timezone offset at date: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Enhanced error handling for timezone conversion edge cases
  convertTimezoneWithValidation(date: Date, fromTimezone: string, toTimezone: string): Date {
    try {
      const resolvedFrom = this.resolveTimezone(fromTimezone);
      const resolvedTo = this.resolveTimezone(toTimezone);

      if (!this.validateTimezone(resolvedFrom)) {
        throw new Error(`Invalid source timezone: ${fromTimezone}`);
      }

      if (!this.validateTimezone(resolvedTo)) {
        throw new Error(`Invalid target timezone: ${toTimezone}`);
      }

      // Handle edge case: invalid date
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided for timezone conversion');
      }

      // Handle edge case: DST transition times
      const isDSTTransition = this.isDSTTransitionTime(date, resolvedFrom);
      if (isDSTTransition) {
        console.warn(`Converting time during DST transition for ${resolvedFrom}`);
      }

      return this.convertTimezone(date, resolvedFrom, resolvedTo);
    } catch (error) {
      throw new Error(
        `Timezone conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private isDSTTransitionTime(date: Date, timezone: string): boolean {
    try {
      const transitions = this.getDSTTransitions(timezone);
      const dateStr = date.toISOString().split('T')[0];

      return transitions.some(transition => transition.date.split('T')[0] === dateStr);
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const timezoneService = new TimezoneService();
export default timezoneService;
