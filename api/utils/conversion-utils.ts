/**
 * Utility functions for timestamp and timezone conversions
 */

export function convertTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
  try {
    // Use Intl.DateTimeFormat for timezone conversion
    const fromOffset = getTimezoneOffset(date, fromTimezone);
    const toOffset = getTimezoneOffset(date, toTimezone);
    
    // Calculate the difference in milliseconds
    const offsetDiff = (fromOffset - toOffset) * 60 * 1000;
    
    // Apply the offset difference
    return new Date(date.getTime() + offsetDiff);
  } catch (error) {
    console.warn(`Timezone conversion error from ${fromTimezone} to ${toTimezone}:`, error);
    return date; // Return original date if conversion fails
  }
}

export function getTimezoneOffset(date: Date, timezone: string): number {
  try {
    // Create a date in the target timezone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    // Calculate offset in minutes
    return (utcDate.getTime() - tzDate.getTime()) / (1000 * 60);
  } catch (error) {
    console.warn(`Failed to get timezone offset for ${timezone}:`, error);
    return 0; // Return 0 offset if calculation fails
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

export function parseTimestamp(input: string | number): { timestamp: number; isValid: boolean } {
  let timestamp: number;
  
  if (typeof input === 'string') {
    // Try parsing as ISO date first
    const date = new Date(input);
    if (!isNaN(date.getTime())) {
      return { timestamp: Math.floor(date.getTime() / 1000), isValid: true };
    }
    
    // Try parsing as timestamp string
    timestamp = parseInt(input, 10);
  } else {
    timestamp = input;
  }
  
  // Validate timestamp range
  if (isNaN(timestamp) || timestamp < 0 || timestamp > 2147483647) {
    return { timestamp: 0, isValid: false };
  }
  
  return { timestamp, isValid: true };
}

export function formatRelativeTime(date: Date, baseDate: Date = new Date()): string {
  const diffInSeconds = Math.floor((baseDate.getTime() - date.getTime()) / 1000);
  const absDiff = Math.abs(diffInSeconds);
  
  const units = [
    { name: 'year', seconds: 31536000 },
    { name: 'month', seconds: 2592000 },
    { name: 'week', seconds: 604800 },
    { name: 'day', seconds: 86400 },
    { name: 'hour', seconds: 3600 },
    { name: 'minute', seconds: 60 },
    { name: 'second', seconds: 1 }
  ];
  
  for (const unit of units) {
    const count = Math.floor(absDiff / unit.seconds);
    if (count >= 1) {
      const plural = count > 1 ? 's' : '';
      if (diffInSeconds > 0) {
        return `${count} ${unit.name}${plural} ago`;
      } else {
        return `in ${count} ${unit.name}${plural}`;
      }
    }
  }
  
  return 'just now';
}

export function validateDateRange(date: Date, minDate?: Date, maxDate?: Date): boolean {
  if (minDate && date < minDate) return false;
  if (maxDate && date > maxDate) return false;
  return true;
}

export function getCommonTimezones(): Array<{ identifier: string; displayName: string; offset: number }> {
  const commonTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney'
  ];
  
  const now = new Date();
  
  return commonTimezones.map(tz => {
    try {
      const offset = getTimezoneOffset(now, tz);
      const displayName = tz.replace('_', ' ').replace('/', ' / ');
      
      return {
        identifier: tz,
        displayName,
        offset
      };
    } catch (error) {
      return {
        identifier: tz,
        displayName: tz,
        offset: 0
      };
    }
  });
}

export function formatDate(date: Date, format?: string, timezone?: string): string {
  try {
    if (format) {
      // Handle custom format strings
      switch (format.toLowerCase()) {
        case 'iso':
          return date.toISOString();
        case 'utc':
          return date.toUTCString();
        case 'unix':
          return Math.floor(date.getTime() / 1000).toString();
        case 'milliseconds':
          return date.getTime().toString();
        case 'relative':
          return formatRelativeTime(date);
        default:
          // Try to use as locale format
          if (timezone) {
            return date.toLocaleString('en-US', { timeZone: timezone });
          }
          return date.toLocaleString('en-US');
      }
    }
    
    // Default format
    if (timezone) {
      return date.toLocaleString('en-US', { timeZone: timezone });
    }
    return date.toLocaleString('en-US');
  } catch (error) {
    console.warn('Date formatting error:', error);
    return date.toString();
  }
}

export function detectTimestampFormat(input: string): 'unix' | 'milliseconds' | 'iso' | 'unknown' {
  // Check if it's a number (unix timestamp)
  if (/^\d+$/.test(input)) {
    const num = parseInt(input, 10);
    if (num > 1000000000 && num < 10000000000) {
      return 'unix'; // Unix timestamp (10 digits)
    } else if (num > 1000000000000 && num < 10000000000000) {
      return 'milliseconds'; // Milliseconds timestamp (13 digits)
    }
  }
  
  // Check if it's ISO format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(input)) {
    return 'iso';
  }
  
  return 'unknown';
}

export async function convertTimestamp(
  timestamp: number,
  outputFormats: string[] = [],
  timezone?: string,
  targetTimezone?: string
): Promise<any> {
  const date = new Date(timestamp * 1000);

  // Basic conversion data
  const data: any = {
    timestamp,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString()
  };

  // Add timezone conversion if specified
  if (timezone && targetTimezone) {
    try {
      // Check if timezones are valid first
      if (!isValidTimezone(timezone) || !isValidTimezone(targetTimezone)) {
        data.conversionError = 'Invalid timezone conversion';
      } else {
        const convertedDate = convertTimezone(date, timezone, targetTimezone);
        data.converted = {
          timestamp: Math.floor(convertedDate.getTime() / 1000),
          iso: convertedDate.toISOString(),
          local: convertedDate.toLocaleString()
        };
      }
    } catch (error) {
      data.conversionError = 'Invalid timezone conversion';
    }
  }

  // Add custom formats if specified
  if (outputFormats.length > 0) {
    data.formats = {};
    for (const format of outputFormats) {
      try {
        switch (format.toLowerCase()) {
          case 'iso':
            data.formats.iso = date.toISOString();
            break;
          case 'utc':
            data.formats.utc = date.toUTCString();
            break;
          case 'local':
            data.formats.local = date.toLocaleString();
            break;
          case 'unix':
            data.formats.unix = timestamp;
            break;
          case 'milliseconds':
            data.formats.milliseconds = timestamp * 1000;
            break;
          default:
            // Try to use as locale string format
            data.formats[format] = date.toLocaleString('en-US', { timeZone: format });
        }
      } catch (error) {
        data.formats[format] = 'Invalid format';
      }
    }
  }

  return data;
}