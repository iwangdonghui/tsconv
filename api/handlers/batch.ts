import { VercelRequest, VercelResponse } from '@vercel/node';
import { ResponseBuilder, withCors } from './utils/response';
import { createCacheMiddleware } from './middleware/cache';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import formatService from './services/format-service';

async function batchHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const { items, format, timezone } = req.body;

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
        let date: Date;
        let originalTimestamp: number;

        if (!isNaN(timestamp) && timestamp >= 0 && timestamp <= 2147483647) {
          date = new Date(timestamp * 1000);
          originalTimestamp = timestamp;
        } else {
          // 尝试解析为日期
          date = new Date(item);
          if (isNaN(date.getTime())) {
            return {
              input: item,
              success: false,
              error: {
                code: "INVALID_FORMAT",
                message: "Unable to parse as timestamp or date"
              }
            };
          }
          originalTimestamp = Math.floor(date.getTime() / 1000);
        }

        const formats: any = {};
        
        // 标准格式
        formats.iso8601 = date.toISOString();
        formats.utc = date.toUTCString();
        formats.timestamp = originalTimestamp;
        formats.local = date.toLocaleString();
        formats.unix = originalTimestamp;

        // 自定义格式如果指定
        if (format) {
          try {
            formats.custom = formatService.formatDate(date, String(format), timezone ? String(timezone) : 'UTC');
          } catch (error) {
            console.warn('Custom format error:', error);
          }
        }

        return {
          input: item,
          success: true,
          data: {
            original: item,
            timestamp: originalTimestamp,
            date: date.toISOString(),
            formats
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

    const response = new ResponseBuilder()
      .setData({
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });

    response.send(res);
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

const enhancedBatchHandler = withCors(
  createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 60 * 1000, // 1 minute
      cacheControlHeader: 'public, max-age=60, stale-while-revalidate=120'
    })(batchHandler)
  )
);

export default enhancedBatchHandler;