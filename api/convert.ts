import { VercelRequest, VercelResponse } from '@vercel/node';

interface ConvertResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only GET method is allowed"
      }
    });
  }

  try {
    const { timestamp, date } = req.query;

    if (!timestamp && !date) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_PARAMETER",
          message: "Please provide either 'timestamp' or 'date' parameter"
        }
      });
    }

    // 不允许同时提供两个参数
    if (timestamp && date) {
      return res.status(400).json({
        success: false,
        error: {
          code: "CONFLICTING_PARAMETERS",
          message: "Please provide either 'timestamp' or 'date', not both"
        }
      });
    }

    let result: any = {};

    if (timestamp) {
      const ts = parseInt(timestamp as string);
      if (isNaN(ts)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_TIMESTAMP",
            message: "The provided timestamp is invalid"
          }
        });
      }

      // 验证时间戳范围（1970-2038年）
      if (ts < 0 || ts > 2147483647) {
        return res.status(400).json({
          success: false,
          error: {
            code: "TIMESTAMP_OUT_OF_RANGE",
            message: "Timestamp must be between 0 and 2147483647"
          }
        });
      }

      const date = new Date(ts * 1000);
      result = {
        success: true,
        data: {
          timestamp: ts,
          utc: date.toUTCString(),
          iso8601: date.toISOString(),
          relative: getRelativeTime(date)
        }
      };
    }

    if (date) {
      const parsedDate = new Date(date as string);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_DATE",
            message: "The date parameter cannot be parsed. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)"
          }
        });
      }

      result = {
        success: true,
        data: {
          date: date,
          timestamp: Math.floor(parsedDate.getTime() / 1000),
          utc: parsedDate.toUTCString(),
          iso8601: parsedDate.toISOString()
        }
      };
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred"
      }
    });
  }
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}
