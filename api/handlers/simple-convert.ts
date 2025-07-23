import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { timestamp, date } = req.query;

    if (!timestamp && !date) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Please provide either timestamp or date parameter'
        }
      });
    }

    let inputDate: Date;
    let inputTimestamp: number;

    if (timestamp) {
      const ts = parseInt(String(timestamp));
      if (isNaN(ts)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid timestamp format'
          }
        });
      }
      inputTimestamp = ts;
      inputDate = new Date(ts * 1000);
    } else {
      inputDate = new Date(String(date));
      if (isNaN(inputDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid date format'
          }
        });
      }
      inputTimestamp = Math.floor(inputDate.getTime() / 1000);
    }

    // 生成各种格式
    const formats = {
      iso8601: inputDate.toISOString(),
      utc: inputDate.toUTCString(),
      timestamp: inputTimestamp,
      local: inputDate.toLocaleString(),
      date: inputDate.toLocaleDateString(),
      time: inputDate.toLocaleTimeString(),
      relative: getRelativeTime(inputDate)
    };

    const response = {
      success: true,
      data: {
        input: timestamp || date,
        timestamp: inputTimestamp,
        formats: formats
      },
      metadata: {
        processingTime: Date.now() - Date.now(),
        itemCount: 1,
        cacheHit: false
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Simple convert error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
}

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