import { VercelRequest, VercelResponse } from '@vercel/node';

// interface WorkdaysRequest {
//   startDate: string;
//   endDate?: string;
//   days?: number;
//   excludeWeekends: boolean;
//   excludeHolidays: boolean;
//   country: string;
//   mode: 'dateRange' | 'dayCount';
// }

interface Holiday {
  date: string;
  name: string;
  type: string;
}

// Simple holiday data for demo purposes
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
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

function isHoliday(date: Date, country: string): Holiday | null {
  const dateStr = date.toISOString().split('T')[0];
  const holidays = HOLIDAYS[country] || [];
  return holidays.find(h => h.date === dateStr) || null;
}

function addBusinessDays(
  startDate: Date,
  days: number,
  excludeWeekends: boolean,
  excludeHolidays: boolean,
  country: string
): Date {
  const currentDate = new Date(startDate);
  let addedDays = 0;

  while (addedDays < days) {
    currentDate.setDate(currentDate.getDate() + 1);

    let shouldCount = true;

    if (excludeWeekends && isWeekend(currentDate)) {
      shouldCount = false;
    }

    if (excludeHolidays && isHoliday(currentDate, country)) {
      shouldCount = false;
    }

    if (shouldCount) {
      addedDays++;
    }
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
  let workdays = 0;
  let totalDays = 0;
  let weekends = 0;
  let holidays = 0;
  const excludedDates: Array<{ date: string; reason: string; name?: string }> = [];

  const current = new Date(startDate);

  while (current <= endDate) {
    totalDays++;
    let isExcluded = false;
    let exclusionReason = '';
    let holidayName = '';

    if (excludeWeekends && isWeekend(current)) {
      weekends++;
      isExcluded = true;
      exclusionReason = 'Weekend';
    }

    const holiday = excludeHolidays ? isHoliday(current, country) : null;
    if (holiday) {
      holidays++;
      isExcluded = true;
      exclusionReason = exclusionReason ? `${exclusionReason}, Holiday` : 'Holiday';
      holidayName = holiday.name;
    }

    if (isExcluded) {
      excludedDates.push({
        date: current.toISOString().split('T')[0] ?? '',
        reason: exclusionReason,
        ...(holidayName ? { name: holidayName } : {}),
      });
    } else {
      workdays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    workdays,
    totalDays,
    weekends,
    holidays,
    excludedDates,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const {
      startDate,
      endDate,
      days,
      excludeWeekends = 'true',
      excludeHolidays = 'false',
      country = 'US',
      mode = 'dateRange',
    } = req.query as any;

    if (!startDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date is required',
      });
    }

    const start = new Date(startDate);
    const excludeWeekendsFlag = excludeWeekends === 'true';
    const excludeHolidaysFlag = excludeHolidays === 'true';

    let result;

    if (mode === 'dayCount') {
      if (!days) {
        return res.status(400).json({
          success: false,
          error: 'Days parameter is required for dayCount mode',
        });
      }

      const targetDate = addBusinessDays(
        start,
        parseInt(days),
        excludeWeekendsFlag,
        excludeHolidaysFlag,
        country
      );

      result = {
        mode: 'dayCount',
        startDate: start.toISOString().split('T')[0],
        targetDate: targetDate.toISOString().split('T')[0],
        requestedDays: parseInt(days),
        settings: {
          excludeWeekends: excludeWeekendsFlag,
          excludeHolidays: excludeHolidaysFlag,
          country,
        },
      };
    } else {
      if (!endDate) {
        return res.status(400).json({
          success: false,
          error: 'End date is required for dateRange mode',
        });
      }

      const end = new Date(endDate);
      const calculation = calculateWorkdays(
        start,
        end,
        excludeWeekendsFlag,
        excludeHolidaysFlag,
        country
      );

      result = {
        mode: 'dateRange',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        ...calculation,
        settings: {
          excludeWeekends: excludeWeekendsFlag,
          excludeHolidays: excludeHolidaysFlag,
          country,
        },
      };
    }

    return res.status(200).json({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    console.error('Workdays calculation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
