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

function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  if (format === 'X') return Math.floor(date.getTime() / 1000).toString();
  if (format === 'x') return date.getTime().toString();

  let result = format
    .replace(/YYYY/g, year.toString())
    .replace(/YY/g, year.toString().slice(-2))
    .replace(/MMMM/g, monthNames[month - 1] || '')
    .replace(/MMM/g, monthNamesShort[month - 1] || '')
    .replace(/MM/g, month.toString().padStart(2, '0'))
    .replace(/\bM\b/g, month.toString())
    .replace(/dddd/g, dayNames[date.getDay()] || '')
    .replace(/ddd/g, dayNamesShort[date.getDay()] || '')
    .replace(/Do/g, day.toString() + getOrdinalSuffix(day))
    .replace(/DD/g, day.toString().padStart(2, '0'))
    .replace(/\bD\b/g, day.toString())
    .replace(/HH/g, hours.toString().padStart(2, '0'))
    .replace(/hh/g, (hours % 12 || 12).toString().padStart(2, '0'))
    .replace(/\bH\b/g, hours.toString())
    .replace(/\bh\b/g, (hours % 12 || 12).toString())
    .replace(/mm/g, minutes.toString().padStart(2, '0'))
    .replace(/\bm\b/g, minutes.toString())
    .replace(/ss/g, seconds.toString().padStart(2, '0'))
    .replace(/\bs\b/g, seconds.toString())
    .replace(/SSS/g, milliseconds.toString().padStart(3, '0'))
    .replace(
      /SS/g,
      Math.floor(milliseconds / 10)
        .toString()
        .padStart(2, '0')
    )
    .replace(/S/g, Math.floor(milliseconds / 100).toString())
    .replace(/A/g, hours >= 12 ? 'PM' : 'AM')
    .replace(/a/g, hours >= 12 ? 'pm' : 'am')
    .replace(/ZZ/g, '+0000')
    .replace(/Z/g, '+00:00');

  result = result.replace(/\[([^\]]+)\]/g, '$1');
  return result;
}

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
  sql: 'YYYY-MM-DD HH:mm:ss',
  'sql-date': 'YYYY-MM-DD',
  'sql-time': 'HH:mm:ss',
  'sql-timestamp': 'YYYY-MM-DD HH:mm:ss.SSS',
  'sql-mysql': 'YYYY-MM-DD HH:mm:ss',
  'sql-postgresql': 'YYYY-MM-DD HH:mm:ss.SSS',
  'sql-sqlserver': 'YYYY-MM-DD HH:mm:ss.SSS',
  'sql-oracle': 'DD-MMM-YYYY HH:mm:ss',
  'sql-sqlite': 'YYYY-MM-DD HH:mm:ss',
  'sql-iso': 'YYYY-MM-DDTHH:mm:ss',
  'sql-utc': 'YYYY-MM-DD HH:mm:ss [UTC]',
  filename: 'YYYY-MM-DD_HH-mm-ss',
  log: 'YYYY-MM-DD HH:mm:ss.SSS',
} as const;

export const onRequestOptions = async () =>
  new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

export const onRequestGet = async (ctx: { request: Request }) => {
  const url = new URL(ctx.request.url);
  if (url.pathname.endsWith('/templates')) {
    const body = {
      success: true,
      data: { templates: FORMAT_TEMPLATES },
      metadata: { timestamp: new Date().toISOString(), cached: false },
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const ts = url.searchParams.get('timestamp');
  const date = url.searchParams.get('date');
  const format = url.searchParams.get('format');

  if (!format) {
    return new Response(JSON.stringify({ success: false, error: 'Format parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  let targetDate: Date;
  if (ts) {
    const parsed = parseInt(ts);
    if (Number.isNaN(parsed)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid timestamp format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    targetDate = new Date(parsed * 1000);
  } else if (date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid date format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    targetDate = d;
  } else {
    targetDate = new Date();
  }

  const formatPattern = (FORMAT_TEMPLATES as any)[format] || format;
  const formatted = formatDate(targetDate, formatPattern);

  return new Response(
    JSON.stringify({
      success: true,
      data: { input: { ts, date, format }, output: { formatted, timezone: 'UTC' } },
      metadata: { timestamp: new Date().toISOString(), cached: false },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    }
  );
};
