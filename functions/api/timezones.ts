interface Timezone {
  id: string;
  name: string;
  region: string;
  country: string;
  offset: string;
  offsetMinutes: number;
  currentTime: string;
  isDST: boolean;
  abbreviation: string;
}

const TIMEZONE_DATA: Timezone[] = [
  {
    id: 'America/New_York',
    name: 'Eastern Time',
    region: 'America',
    country: 'United States',
    offset: 'UTC-5',
    offsetMinutes: -300,
    currentTime: '',
    isDST: false,
    abbreviation: 'EST',
  },
  {
    id: 'America/Los_Angeles',
    name: 'Pacific Time',
    region: 'America',
    country: 'United States',
    offset: 'UTC-8',
    offsetMinutes: -480,
    currentTime: '',
    isDST: false,
    abbreviation: 'PST',
  },
  {
    id: 'Europe/London',
    name: 'Greenwich Mean Time',
    region: 'Europe',
    country: 'United Kingdom',
    offset: 'UTC+0',
    offsetMinutes: 0,
    currentTime: '',
    isDST: false,
    abbreviation: 'GMT',
  },
  {
    id: 'Europe/Paris',
    name: 'Central European Time',
    region: 'Europe',
    country: 'France',
    offset: 'UTC+1',
    offsetMinutes: 60,
    currentTime: '',
    isDST: false,
    abbreviation: 'CET',
  },
  {
    id: 'Asia/Tokyo',
    name: 'Japan Standard Time',
    region: 'Asia',
    country: 'Japan',
    offset: 'UTC+9',
    offsetMinutes: 540,
    currentTime: '',
    isDST: false,
    abbreviation: 'JST',
  },
  {
    id: 'Asia/Shanghai',
    name: 'China Standard Time',
    region: 'Asia',
    country: 'China',
    offset: 'UTC+8',
    offsetMinutes: 480,
    currentTime: '',
    isDST: false,
    abbreviation: 'CST',
  },
  {
    id: 'Australia/Sydney',
    name: 'Australian Eastern Time',
    region: 'Australia',
    country: 'Australia',
    offset: 'UTC+10',
    offsetMinutes: 600,
    currentTime: '',
    isDST: false,
    abbreviation: 'AEST',
  },
  {
    id: 'America/Chicago',
    name: 'Central Time',
    region: 'America',
    country: 'United States',
    offset: 'UTC-6',
    offsetMinutes: -360,
    currentTime: '',
    isDST: false,
    abbreviation: 'CST',
  },
  {
    id: 'Europe/Berlin',
    name: 'Central European Time',
    region: 'Europe',
    country: 'Germany',
    offset: 'UTC+1',
    offsetMinutes: 60,
    currentTime: '',
    isDST: false,
    abbreviation: 'CET',
  },
  {
    id: 'Asia/Dubai',
    name: 'Gulf Standard Time',
    region: 'Asia',
    country: 'United Arab Emirates',
    offset: 'UTC+4',
    offsetMinutes: 240,
    currentTime: '',
    isDST: false,
    abbreviation: 'GST',
  },
];

function calculateCurrentTime(offsetMinutes: number): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const targetTime = new Date(utc + offsetMinutes * 60000);
  return targetTime.toISOString();
}

function filterTimezones(timezones: Timezone[], filters: any): Timezone[] {
  let filtered = [...timezones];
  if (filters.q) {
    const q = filters.q.toLowerCase();
    filtered = filtered.filter(
      tz =>
        tz.name.toLowerCase().includes(q) ||
        tz.country.toLowerCase().includes(q) ||
        tz.region.toLowerCase().includes(q) ||
        tz.id.toLowerCase().includes(q)
    );
  }
  if (filters.region) filtered = filtered.filter(tz => tz.region === filters.region);
  if (filters.country) filtered = filtered.filter(tz => tz.country === filters.country);
  if (filters.offset) filtered = filtered.filter(tz => tz.offset === filters.offset);
  return filtered;
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
  const q = url.searchParams.get('q') || undefined;
  const region = url.searchParams.get('region') || undefined;
  const country = url.searchParams.get('country') || undefined;
  const offset = url.searchParams.get('offset') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const withTime = TIMEZONE_DATA.map(tz => ({
    ...tz,
    currentTime: calculateCurrentTime(tz.offsetMinutes),
  }));
  const filtered = filterTimezones(withTime, { q, region, country, offset });
  const limited = filtered.slice(0, limit);

  const regions = [...new Set(TIMEZONE_DATA.map(tz => tz.region))].sort();
  let availableCountries = TIMEZONE_DATA;
  if (region) availableCountries = TIMEZONE_DATA.filter(tz => tz.region === region);
  const countries = [...new Set(availableCountries.map(tz => tz.country))].sort();

  let availableOffsets = TIMEZONE_DATA;
  if (region) availableOffsets = availableOffsets.filter(tz => tz.region === region);
  if (country) availableOffsets = availableOffsets.filter(tz => tz.country === country);
  const offsets = [...new Set(availableOffsets.map(tz => tz.offset))].sort();

  const body = {
    success: true,
    data: {
      timezones: limited,
      total: filtered.length,
      showing: limited.length,
      filters: { regions, countries, offsets },
      appliedFilters: {
        q: q || null,
        region: region || null,
        country: country || null,
        offset: offset || null,
        limit,
        format: 'detailed',
      },
    },
    metadata: { timestamp: new Date().toISOString(), cached: false },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
};
