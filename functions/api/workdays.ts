interface Holiday {
  date: string;
  name: string;
  type: string;
}

const HOLIDAYS: Record<string, Holiday[]> = {
  US: [
    { date: '2024-01-01', name: "New Year's Day", type: 'federal' },
    { date: '2024-07-04', name: 'Independence Day', type: 'federal' },
    { date: '2024-12-25', name: 'Christmas Day', type: 'federal' },
  ],
  UK: [
    { date: '2024-01-01', name: "New Year's Day", type: 'bank' },
    { date: '2024-12-25', name: 'Christmas Day', type: 'bank' },
    { date: '2024-12-26', name: 'Boxing Day', type: 'bank' },
  ],
  CN: [
    { date: '2024-01-01', name: "New Year's Day", type: 'national' },
    { date: '2024-02-10', name: 'Spring Festival', type: 'national' },
    { date: '2024-10-01', name: 'National Day', type: 'national' },
  ],
};

function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}
function isHoliday(date: Date, country: string): Holiday | null {
  const s = date.toISOString().split('T')[0];
  return (HOLIDAYS[country] || []).find(h => h.date === s) || null;
}

function addBusinessDays(
  startDate: Date,
  days: number,
  excludeWeekends: boolean,
  excludeHolidays: boolean,
  country: string
): Date {
  const currentDate = new Date(startDate);
  let added = 0;
  while (added < days) {
    currentDate.setDate(currentDate.getDate() + 1);
    let count = true;
    if (excludeWeekends && isWeekend(currentDate)) count = false;
    if (excludeHolidays && isHoliday(currentDate, country)) count = false;
    if (count) added++;
  }
  return currentDate;
}

function calculateWorkdays(
  startDate: Date,
  endDate: Date,
  excludeWeekends: boolean,
  excludeHolidays: boolean,
  country: string
) {
  let workdays = 0,
    totalDays = 0,
    weekends = 0,
    holidays = 0;
  const excluded: Array<{ date: string; reason: string; name?: string }> = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    totalDays++;
    let excludedFlag = false;
    let reason = '';
    let holidayName = '';
    if (excludeWeekends && isWeekend(cur)) {
      weekends++;
      excludedFlag = true;
      reason = 'Weekend';
    }
    const h = excludeHolidays ? isHoliday(cur, country) : null;
    if (h) {
      holidays++;
      excludedFlag = true;
      reason = reason ? `${reason}, Holiday` : 'Holiday';
      holidayName = h.name;
    }
    if (excludedFlag) {
      excluded.push({
        date: cur.toISOString().split('T')[0] ?? '',
        reason,
        ...(holidayName ? { name: holidayName } : {}),
      });
    } else {
      workdays++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { workdays, totalDays, weekends, holidays, excludedDates: excluded };
}

export const onRequestOptions = async () =>
  new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

export const onRequestGet = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const days = url.searchParams.get('days');
  const excludeWeekends = url.searchParams.get('excludeWeekends') ?? 'true';
  const excludeHolidays = url.searchParams.get('excludeHolidays') ?? 'false';
  const country = url.searchParams.get('country') ?? 'US';
  const mode = url.searchParams.get('mode') ?? 'dateRange';

  if (!startDate)
    return new Response(JSON.stringify({ success: false, error: 'Start date is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  const start = new Date(startDate);
  const excludeW = excludeWeekends === 'true';
  const excludeH = excludeHolidays === 'true';

  let result: any;
  if (mode === 'dayCount') {
    if (!days)
      return new Response(
        JSON.stringify({ success: false, error: 'Days parameter is required for dayCount mode' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    const target = addBusinessDays(start, parseInt(days), excludeW, excludeH, country);
    result = {
      mode: 'dayCount',
      startDate: start.toISOString().split('T')[0],
      targetDate: target.toISOString().split('T')[0],
      requestedDays: parseInt(days),
      settings: { excludeWeekends: excludeW, excludeHolidays: excludeH, country },
    };
  } else {
    if (!endDate)
      return new Response(
        JSON.stringify({ success: false, error: 'End date is required for dateRange mode' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    const end = new Date(endDate);
    const calc = calculateWorkdays(start, end, excludeW, excludeH, country);
    result = {
      mode: 'dateRange',
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      ...calc,
      settings: { excludeWeekends: excludeW, excludeHolidays: excludeH, country },
    };
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: result,
      metadata: { timestamp: new Date().toISOString(), cached: false },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    }
  );
};
