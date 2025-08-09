import { VercelRequest, VercelResponse } from '@vercel/node';

function calculateDateDifference(start: Date, end: Date, absolute: boolean = false) {
  let startDate = new Date(start);
  let endDate = new Date(end);
  
  // If absolute is true, ensure start is before end
  if (absolute && startDate > endDate) {
    [startDate, endDate] = [endDate, startDate];
  }
  
  const diffMs = endDate.getTime() - startDate.getTime();
  const isNegative = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);
  
  // Calculate different units
  const seconds = Math.floor(absDiffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44); // Average month length
  const years = Math.floor(days / 365.25); // Account for leap years
  
  // More precise calculations (for potential future use)
  // const remainingDaysAfterYears = days - (years * 365.25);
  // const remainingDaysAfterMonths = days - (months * 30.44);
  // const remainingHoursAfterDays = hours - (days * 24);
  // const remainingMinutesAfterHours = minutes - (hours * 60);
  // const remainingSecondsAfterMinutes = seconds - (minutes * 60);
  
  // Human readable format
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months % 12 > 0) parts.push(`${months % 12} month${months % 12 !== 1 ? 's' : ''}`);
  if (days % 30 > 0) parts.push(`${Math.floor(days % 30)} day${Math.floor(days % 30) !== 1 ? 's' : ''}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`);
  
  let humanReadable = parts.length > 0 ? parts.join(', ') : '0 seconds';
  if (isNegative && !absolute) {
    humanReadable = `${humanReadable} ago`;
  }
  
  return {
    milliseconds: absolute ? absDiffMs : diffMs,
    seconds: absolute ? seconds : (isNegative ? -seconds : seconds),
    minutes: absolute ? minutes : (isNegative ? -minutes : minutes),
    hours: absolute ? hours : (isNegative ? -hours : hours),
    days: absolute ? days : (isNegative ? -days : days),
    weeks: absolute ? weeks : (isNegative ? -weeks : weeks),
    months: absolute ? months : (isNegative ? -months : months),
    years: absolute ? years : (isNegative ? -years : years),
    humanReadable,
    isNegative: !absolute && isNegative,
    direction: isNegative ? 'past' : 'future'
  };
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(Math.abs(num));
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
      error: 'Method not allowed'
    });
  }
  
  try {
    const {
      startDate,
      endDate,
      startTime,
      endTime,
      includeTime = 'false',
      absolute = 'false'
    } = req.query as any;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Both start date and end date are required'
      });
    }
    
    const includeTimeFlag = includeTime === 'true';
    const absoluteFlag = absolute === 'true';
    
    // Parse dates
    let start: Date;
    let end: Date;
    
    if (includeTimeFlag && startTime && endTime) {
      start = new Date(`${startDate}T${startTime}`);
      end = new Date(`${endDate}T${endTime}`);
    } else {
      start = new Date(startDate);
      end = new Date(endDate);
    }
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }
    
    const difference = calculateDateDifference(start, end, absoluteFlag);
    
    const result = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      includeTime: includeTimeFlag,
      absolute: absoluteFlag,
      difference,
      formatted: {
        years: formatNumber(difference.years),
        months: formatNumber(difference.months),
        weeks: formatNumber(difference.weeks),
        days: formatNumber(difference.days),
        hours: formatNumber(difference.hours),
        minutes: formatNumber(difference.minutes),
        seconds: formatNumber(difference.seconds)
      }
    };
    
    return res.status(200).json({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        cached: false
      }
    });
    
  } catch (error) {
    console.error('Date difference calculation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
