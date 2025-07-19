import { VercelRequest, VercelResponse } from '@vercel/node';

interface BatchResponse {
  success: boolean;
  data?: any[];
  error?: {
    code: string;
    message: string;
  };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only POST method is allowed"
      }
    });
  }

  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Request body must contain an 'items' array"
        }
      });
    }

    if (items.length > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: "TOO_MANY_ITEMS",
          message: "Maximum 100 items allowed per batch request"
        }
      });
    }

    const results = items.map((item, index) => {
      try {
        // 尝试解析为时间戳
        const timestamp = parseInt(item);
        if (!isNaN(timestamp) && timestamp >= 0 && timestamp <= 2147483647) {
          const date = new Date(timestamp * 1000);
          return {
            input: item,
            type: 'timestamp',
            success: true,
            data: {
              timestamp,
              utc: date.toUTCString(),
              iso8601: date.toISOString()
            }
          };
        }

        // 尝试解析为日期
        const date = new Date(item);
        if (!isNaN(date.getTime())) {
          return {
            input: item,
            type: 'date',
            success: true,
            data: {
              date: item,
              timestamp: Math.floor(date.getTime() / 1000),
              utc: date.toUTCString(),
              iso8601: date.toISOString()
            }
          };
        }

        return {
          input: item,
          success: false,
          error: {
            code: "INVALID_FORMAT",
            message: "Unable to parse as timestamp or date"
          }
        };
      } catch (error) {
        return {
          input: item,
          success: false,
          error: {
            code: "PARSE_ERROR",
            message: "Error parsing input"
          }
        };
      }
    });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Batch API Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred"
      }
    });
  }
}