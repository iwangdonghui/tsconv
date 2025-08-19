import { VercelRequest, VercelResponse } from '@vercel/node';

// Predefined format templates
const FORMAT_TEMPLATES = {
  iso: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  'iso-date': 'YYYY-MM-DD',
  'iso-time': 'HH:mm:ss',
  'us-date': 'MM/DD/YYYY',
  'us-datetime': 'MM/DD/YYYY HH:mm:ss',
  'eu-date': 'DD/MM/YYYY',
  'eu-datetime': 'DD/MM/YYYY HH:mm:ss',
  readable: 'MMMM Do, YYYY',
  'readable-full': 'dddd, MMMM Do, YYYY [at] h:mm A',
  compact: 'YYYYMMDD',
  'compact-time': 'YYYYMMDDHHmmss',
  unix: 'X',
  'unix-ms': 'x',
  rfc2822: 'ddd, DD MMM YYYY HH:mm:ss ZZ',

  // Enhanced SQL formats for different databases and use cases
  sql: 'YYYY-MM-DD HH:mm:ss', // Standard SQL DATETIME
  'sql-date': 'YYYY-MM-DD', // SQL DATE format
  'sql-time': 'HH:mm:ss', // SQL TIME format
  'sql-timestamp': 'YYYY-MM-DD HH:mm:ss.SSS', // SQL TIMESTAMP with milliseconds
  'sql-mysql': 'YYYY-MM-DD HH:mm:ss', // MySQL DATETIME format
  'sql-postgresql': 'YYYY-MM-DD HH:mm:ss.SSS', // PostgreSQL TIMESTAMP format
  'sql-sqlserver': 'YYYY-MM-DD HH:mm:ss.SSS', // SQL Server DATETIME2 format
  'sql-oracle': 'DD-MMM-YYYY HH:mm:ss', // Oracle DATE format
  'sql-sqlite': 'YYYY-MM-DD HH:mm:ss', // SQLite DATETIME format
  'sql-iso': 'YYYY-MM-DDTHH:mm:ss', // SQL ISO format (without timezone)
  'sql-utc': 'YYYY-MM-DD HH:mm:ss [UTC]', // SQL with UTC indicator

  filename: 'YYYY-MM-DD_HH-mm-ss',
  log: 'YYYY-MM-DD HH:mm:ss.SSS',
};

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const monthNamesShort = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  // Handle special formats first
  if (format === 'X') return Math.floor(date.getTime() / 1000).toString();
  if (format === 'x') return date.getTime().toString();

  // Advanced replacements - order matters! Longer patterns first
  let result = format
    // Year
    .replace(/YYYY/g, year.toString())
    .replace(/YY/g, year.toString().slice(-2))

    // Month - longer patterns first to avoid conflicts
    .replace(/MMMM/g, monthNames[month - 1] || '')
    .replace(/MMM/g, monthNamesShort[month - 1] || '')
    .replace(/MM/g, month.toString().padStart(2, '0'))
    .replace(/\bM\b/g, month.toString()) // Use word boundary to avoid conflicts

    // Day - longer patterns first
    .replace(/dddd/g, dayNames[date.getDay()] || '')
    .replace(/ddd/g, dayNamesShort[date.getDay()] || '')
    .replace(/Do/g, day.toString() + getOrdinalSuffix(day))
    .replace(/DD/g, day.toString().padStart(2, '0'))
    .replace(/\bD\b/g, day.toString()) // Use word boundary

    // Hour - longer patterns first
    .replace(/HH/g, hours.toString().padStart(2, '0'))
    .replace(/hh/g, (hours % 12 || 12).toString().padStart(2, '0'))
    .replace(/\bH\b/g, hours.toString()) // Use word boundary
    .replace(/\bh\b/g, (hours % 12 || 12).toString())

    // Minute - longer patterns first
    .replace(/mm/g, minutes.toString().padStart(2, '0'))
    .replace(/\bm\b/g, minutes.toString()) // Use word boundary

    // Second - longer patterns first
    .replace(/ss/g, seconds.toString().padStart(2, '0'))
    .replace(/\bs\b/g, seconds.toString()) // Use word boundary

    // Milliseconds
    .replace(/SSS/g, milliseconds.toString().padStart(3, '0'))
    .replace(
      /SS/g,
      Math.floor(milliseconds / 10)
        .toString()
        .padStart(2, '0')
    )
    .replace(/S/g, Math.floor(milliseconds / 100).toString())

    // AM/PM
    .replace(/A/g, hours >= 12 ? 'PM' : 'AM')
    .replace(/a/g, hours >= 12 ? 'pm' : 'am')

    // Timezone (simplified)
    .replace(/ZZ/g, '+0000')
    .replace(/Z/g, '+00:00');

  // Handle literal text in brackets
  result = result.replace(/\[([^\]]+)\]/g, '$1');

  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle templates endpoint
  if (req.url?.includes('/templates')) {
    return res.status(200).json({
      success: true,
      data: {
        templates: FORMAT_TEMPLATES,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { timestamp, date, format, timezone = 'UTC' } = req.query as any;

    if (!format) {
      return res.status(400).json({
        success: false,
        error: 'Format parameter is required',
      });
    }

    let targetDate: Date;

    if (timestamp) {
      const ts = parseInt(timestamp);
      if (isNaN(ts)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid timestamp format',
        });
      }
      targetDate = new Date(ts * 1000);
    } else if (date) {
      targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format',
        });
      }
    } else {
      targetDate = new Date();
    }

    // Get format pattern
    const formatPattern = FORMAT_TEMPLATES[format as keyof typeof FORMAT_TEMPLATES] || format;

    // Format the date
    const formatted = formatDate(targetDate, formatPattern);

    const result = {
      input: {
        timestamp: timestamp ? parseInt(timestamp) : Math.floor(targetDate.getTime() / 1000),
        date: targetDate.toISOString(),
        format: formatPattern,
        timezone,
      },
      output: {
        formatted,
        pattern: formatPattern,
      },
    };

    return res.status(200).json({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    console.error('Format error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
