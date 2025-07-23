import { VercelRequest, VercelResponse } from '@vercel/node';

// 简化的错误处理
function sendError(res: VercelResponse, message: string, code: string = 'BAD_REQUEST', status: number = 400) {
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      timestamp: Date.now()
    }
  });
}

// 简化的成功响应
function sendSuccess(res: VercelResponse, data: any) {
  res.status(200).json({
    success: true,
    data,
    metadata: {
      processingTime: 1,
      itemCount: Array.isArray(data) ? data.length : 1,
      cacheHit: false
    }
  });
}

// CORS处理
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 相对时间计算
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  const absDiff = Math.abs(diffInSeconds);
  const prefix = diffInSeconds < 0 ? 'in' : '';
  const suffix = diffInSeconds > 0 ? 'ago' : '';

  if (absDiff < 60) return `${prefix} ${absDiff} seconds ${suffix}`.trim();
  if (absDiff < 3600) return `${prefix} ${Math.floor(absDiff / 60)} minutes ${suffix}`.trim();
  if (absDiff < 86400) return `${prefix} ${Math.floor(absDiff / 3600)} hours ${suffix}`.trim();
  if (absDiff < 2592000) return `${prefix} ${Math.floor(absDiff / 86400)} days ${suffix}`.trim();
  return `${prefix} ${Math.floor(absDiff / 2592000)} months ${suffix}`.trim();
}

// 时区转换（简化版）
function convertTimezone(date: Date, fromTz: string, toTz: string): Date {
  try {
    // 使用Intl API进行时区转换
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const targetTime = new Date(utcTime + (getTimezoneOffset(toTz) * 60000));
    return targetTime;
  } catch (error) {
    console.warn('Timezone conversion failed:', error);
    return date;
  }
}

// 获取时区偏移（简化版）
function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    return (target.getTime() - utc.getTime()) / 60000;
  } catch (error) {
    return 0;
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendError(res, 'Only GET and POST methods are allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const {
      timestamp,
      date,
      format,
      timezone,
      targetTimezone,
      includeFormats = false
    } = params;

    // 验证输入
    if (!timestamp && !date) {
      return sendError(res, 'Please provide either timestamp or date parameter');
    }

    if (timestamp && date) {
      return sendError(res, 'Please provide either timestamp or date, not both');
    }

    let inputDate: Date;
    let inputTimestamp: number;

    // 处理时间戳输入
    if (timestamp) {
      const ts = parseInt(String(timestamp));
      if (isNaN(ts)) {
        return sendError(res, 'Invalid timestamp format');
      }
      if (ts < 0 || ts > 2147483647) {
        return sendError(res, 'Timestamp must be between 0 and 2147483647');
      }
      inputTimestamp = ts;
      inputDate = new Date(ts * 1000);
    } else {
      // 处理日期字符串输入
      inputDate = new Date(String(date));
      if (isNaN(inputDate.getTime())) {
        return sendError(res, 'Invalid date format. Use ISO 8601 format');
      }
      inputTimestamp = Math.floor(inputDate.getTime() / 1000);
    }

    // 时区转换
    if (timezone && targetTimezone) {
      try {
        inputDate = convertTimezone(inputDate, String(timezone), String(targetTimezone));
        inputTimestamp = Math.floor(inputDate.getTime() / 1000);
      } catch (error) {
        return sendError(res, `Timezone conversion failed: ${error}`);
      }
    }

    // 生成各种格式
    const formats: any = {
      iso8601: inputDate.toISOString(),
      utc: inputDate.toUTCString(),
      timestamp: inputTimestamp,
      local: inputDate.toLocaleString(),
      relative: getRelativeTime(inputDate)
    };

    // 自定义格式（简化版）
    if (format) {
      const formatStr = String(format).toLowerCase();
      switch (formatStr) {
        case 'date':
          formats.custom = inputDate.toLocaleDateString();
          break;
        case 'time':
          formats.custom = inputDate.toLocaleTimeString();
          break;
        case 'short':
          formats.custom = inputDate.toLocaleDateString('en-US', { 
            year: '2-digit', 
            month: '2-digit', 
            day: '2-digit' 
          });
          break;
        case 'long':
          formats.custom = inputDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          break;
        default:
          formats.custom = inputDate.toISOString();
      }
    }

    // 额外格式
    if (includeFormats === 'true' || includeFormats === true) {
      formats.rfc2822 = inputDate.toUTCString();
      formats.unix = inputTimestamp;
      formats.shortDate = inputDate.toLocaleDateString();
      formats.shortTime = inputDate.toLocaleTimeString();
      formats.year = inputDate.getFullYear();
      formats.month = inputDate.getMonth() + 1;
      formats.day = inputDate.getDate();
      formats.hour = inputDate.getHours();
      formats.minute = inputDate.getMinutes();
      formats.second = inputDate.getSeconds();
    }

    const result = {
      input: timestamp || date,
      timestamp: inputTimestamp,
      formats: formats
    };

    // 添加时区信息
    if (timezone || targetTimezone) {
      result.timezone = {
        original: timezone || 'UTC',
        target: targetTimezone || timezone || 'UTC',
        offset: targetTimezone ? getTimezoneOffset(String(targetTimezone)) : 0
      };
    }

    sendSuccess(res, result);

  } catch (error) {
    console.error('Convert API error:', error);
    sendError(res, 'An unexpected error occurred', 'INTERNAL_ERROR', 500);
  }
}