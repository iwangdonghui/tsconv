import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Visualization API Endpoint
 *
 * Generate data for charts and visualizations
 *
 * GET /api/visualization?type=timezone-chart
 * GET /api/visualization?type=time-series&start=1640995200&end=1641081600&interval=3600
 *
 * Query Parameters:
 * - type: Visualization type (required)
 * - start: Start timestamp (for time-series)
 * - end: End timestamp (for time-series)
 * - interval: Interval in seconds (for time-series)
 * - timezone: Timezone for data (optional)
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET method is allowed',
    });
  }

  try {
    const startTime = Date.now();
    const { type, start, end, interval, timezone } = req.query;

    // Validate type parameter
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'type parameter is required',
        availableTypes: ['timezone-chart', 'time-series', 'offset-map', 'dst-calendar'],
      });
    }

    let result;

    switch (type) {
      case 'timezone-chart':
        result = generateTimezoneChart();
        break;
      case 'time-series':
        result = generateTimeSeries(
          start ? parseInt(start as string) : undefined,
          end ? parseInt(end as string) : undefined,
          interval ? parseInt(interval as string) : undefined,
          timezone as string
        );
        break;
      case 'offset-map':
        result = generateOffsetMap();
        break;
      case 'dst-calendar':
        result = generateDSTCalendar(timezone as string);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Unknown visualization type: ${type}`,
          availableTypes: ['timezone-chart', 'time-series', 'offset-map', 'dst-calendar'],
        });
    }

    return res.status(200).json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: Math.floor(Date.now() / 1000),
        type,
      },
    });
  } catch (error) {
    console.error('Visualization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

function generateTimezoneChart(): string {
  const now = new Date();
  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  const data = timezones.map(tz => {
    const time = now.toLocaleString('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const offset = getTimezoneOffset(tz, now);
    const offsetHours = offset / 60;

    return {
      timezone: tz,
      name: tz.split('/').pop()?.replace(/_/g, ' ') || tz,
      time,
      offset: offsetHours,
      offsetString: formatOffset(offset),
      isDST: isDaylightSavingTime(tz, now),
    };
  });

  return JSON.stringify({
    type: 'timezone-chart',
    title: 'World Time Zones',
    data,
    chartConfig: {
      type: 'bar',
      xAxis: 'timezone',
      yAxis: 'offset',
      colorBy: 'isDST',
    },
  });
}

function generateTimeSeries(start?: number, end?: number, interval?: number, timezone?: string) {
  const startTime = start || Math.floor(Date.now() / 1000) - 86400; // 24 hours ago
  const endTime = end || Math.floor(Date.now() / 1000);
  const step = interval || 3600; // 1 hour
  const tz = timezone || 'UTC';

  const data: any[] = [];
  for (let ts = startTime; ts <= endTime; ts += step) {
    const date = new Date(ts * 1000);
    const localTime = date.toLocaleString('en-US', { timeZone: tz });

    data.push({
      timestamp: ts,
      utc: date.toISOString(),
      local: localTime,
      hour: date.getUTCHours(),
      dayOfWeek: date.getUTCDay(),
      isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
    });
  }

  return {
    type: 'time-series',
    title: `Time Series Data (${tz})`,
    data,
    period: {
      start: startTime,
      end: endTime,
      interval: step,
      timezone: tz,
    },
    chartConfig: {
      type: 'line',
      xAxis: 'timestamp',
      yAxis: 'hour',
    },
  };
}

function generateOffsetMap() {
  const offsets: any[] = [];

  // Generate data for UTC-12 to UTC+14
  for (let offset = -12; offset <= 14; offset++) {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const offsetTime = new Date(utcTime + offset * 3600000);

    offsets.push({
      offset,
      offsetString: formatOffset(offset * 60),
      time: offsetTime.toISOString().substr(11, 8),
      date: offsetTime.toISOString().substr(0, 10),
      isDifferentDay: offsetTime.getUTCDate() !== now.getUTCDate(),
    });
  }

  return {
    type: 'offset-map',
    title: 'UTC Offset Map',
    data: offsets,
    chartConfig: {
      type: 'map',
      colorBy: 'offset',
      tooltip: ['offsetString', 'time'],
    },
  };
}

function generateDSTCalendar(timezone?: string) {
  const tz = timezone || 'America/New_York';
  const year = new Date().getFullYear();
  const months: any[] = [];

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: any[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isDST = isDaylightSavingTime(tz, date);
      const offset = getTimezoneOffset(tz, date);

      days.push({
        day,
        date: date.toISOString().substr(0, 10),
        isDST,
        offset: offset / 60,
        offsetString: formatOffset(offset),
      });
    }

    months.push({
      month: month + 1,
      name: new Date(year, month, 1).toLocaleString('en-US', { month: 'long' }),
      days,
    });
  }

  return {
    type: 'dst-calendar',
    title: `DST Calendar for ${tz} (${year})`,
    timezone: tz,
    year,
    data: months,
    chartConfig: {
      type: 'calendar',
      colorBy: 'isDST',
    },
  };
}

function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / (1000 * 60));
  } catch (error) {
    return 0;
  }
}

function isDaylightSavingTime(timezone: string, date: Date): boolean {
  try {
    const januaryOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 0, 1));
    const julyOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 6, 1));
    const currentOffset = getTimezoneOffset(timezone, date);

    const standardOffset = Math.min(januaryOffset, julyOffset);
    return currentOffset !== standardOffset;
  } catch (error) {
    return false;
  }
}

function formatOffset(offsetMinutes: number): string {
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
