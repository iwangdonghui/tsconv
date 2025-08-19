function calculateDateDifference(start: Date, end: Date, absolute = false) {
  let s = new Date(start),
    e = new Date(end);
  if (absolute && s > e) [s, e] = [e, s];
  const diffMs = e.getTime() - s.getTime();
  const isNeg = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const seconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(days / 365.25);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months % 12 > 0) parts.push(`${months % 12} month${months % 12 !== 1 ? 's' : ''}`);
  if (days % 30 > 0)
    parts.push(`${Math.floor(days % 30)} day${Math.floor(days % 30) !== 1 ? 's' : ''}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`);
  let humanReadable = parts.length > 0 ? parts.join(', ') : '0 seconds';
  if (isNeg && !absolute) humanReadable = `${humanReadable} ago`;
  return {
    milliseconds: absolute ? absMs : diffMs,
    seconds: absolute ? seconds : isNeg ? -seconds : seconds,
    minutes: absolute ? minutes : isNeg ? -minutes : minutes,
    hours: absolute ? hours : isNeg ? -hours : hours,
    days: absolute ? days : isNeg ? -days : days,
    weeks: absolute ? weeks : isNeg ? -weeks : weeks,
    months: absolute ? months : isNeg ? -months : months,
    years: absolute ? years : isNeg ? -years : years,
    humanReadable,
    isNegative: !absolute && isNeg,
    direction: isNeg ? 'past' : 'future',
  };
}

function formatNumber(num: number) {
  return new Intl.NumberFormat().format(Math.abs(num));
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
  const startTime = url.searchParams.get('startTime');
  const endTime = url.searchParams.get('endTime');
  const includeTime = url.searchParams.get('includeTime') === 'true';
  const absolute = url.searchParams.get('absolute') === 'true';

  if (!startDate || !endDate)
    return new Response(
      JSON.stringify({ success: false, error: 'Both start date and end date are required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );

  let start: Date, end: Date;
  if (includeTime && startTime && endTime) {
    start = new Date(`${startDate}T${startTime}`);
    end = new Date(`${endDate}T${endTime}`);
  } else {
    start = new Date(startDate);
    end = new Date(endDate);
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return new Response(JSON.stringify({ success: false, error: 'Invalid date format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  const difference = calculateDateDifference(start, end, absolute);
  const result = {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    includeTime,
    absolute,
    difference,
    formatted: {
      years: formatNumber(difference.years),
      months: formatNumber(difference.months),
      weeks: formatNumber(difference.weeks),
      days: formatNumber(difference.days),
      hours: formatNumber(difference.hours),
      minutes: formatNumber(difference.minutes),
      seconds: formatNumber(difference.seconds),
    },
  };

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
