import { VercelRequest, VercelResponse } from '@vercel/node';
import { ResponseBuilder, withCors, APIErrorHandler } from '../utils/response';
import { createCacheMiddleware } from '../middleware/cache';
import { createRateLimitMiddleware } from '../middleware/rate-limit';
import cacheService from '../services/cache-service';
import formatService from '../services/format-service';
// import { formatDate, parseTimestamp } from '../utils/conversion-utils'; // Unused import

// 基础时间戳转换处理
async function handleConvert(req: VercelRequest, res: VercelResponse) {
  try {
    const { timestamp, date, format, timezone = 'UTC' } = req.query;
    
    let targetDate: Date;
    
    if (timestamp) {
      const ts = parseInt(timestamp as string, 10);
      if (isNaN(ts)) {
        return APIErrorHandler.handleBadRequest(res, 'Invalid timestamp format');
      }
      targetDate = new Date(ts * (ts > 9999999999 ? 1 : 1000));
    } else if (date) {
      targetDate = new Date(date as string);
      if (isNaN(targetDate.getTime())) {
        return APIErrorHandler.handleBadRequest(res, 'Invalid date format');
      }
    } else {
      return APIErrorHandler.handleBadRequest(res, 'Either timestamp or date parameter is required');
    }

    let formatsToUse = ['iso8601', 'us-datetime', 'eu-datetime'];
    if (format && typeof format === 'string') {
      const validation = formatService.validateFormat(format);
      if (validation.valid) {
        formatsToUse = [format];
      } else {
        formatsToUse = ['iso8601'];
      }
    }

    const results = formatsToUse.map(fmt => ({
      format: fmt,
      result: formatService.formatDate(targetDate, fmt, timezone as string),
      timezone
    }));

    const response = new ResponseBuilder()
      .setData({
        original: {
          timestamp: Math.floor(targetDate.getTime() / 1000),
          date: targetDate.toISOString()
        },
        formats: results.reduce((acc, item) => {
          acc[item.format] = item.result;
          return acc;
        }, {} as Record<string, string>),
        utc: targetDate.toUTCString(),
        local: targetDate.toLocaleString()
      })
      .addMetadata('timezone', timezone)
      .addMetadata('formats', formatsToUse)
      .addMetadata('timestamp', new Date().toISOString());

    response.send(res);
  } catch (error) {
    console.error('Convert error:', error);
    APIErrorHandler.handleServerError(res, error as Error);
  }
}

// 格式列表处理
async function handleFormats(req: VercelRequest, res: VercelResponse) {
  try {
    const { category } = req.query;
    
    let formats;
    if (category && typeof category === 'string') {
      formats = formatService.listFormatsByCategory(category);
    } else {
      formats = formatService.listFormats();
    }

    const response = new ResponseBuilder()
      .setData({
        formats,
        total: formats.length,
        categories: ['standard', 'human', 'regional', 'technical']
      });

    response.send(res);
  } catch (error) {
    console.error('Formats error:', error);
    APIErrorHandler.handleServerError(res, error as Error);
  }
}

// 健康检查处理
async function handleHealth(req: VercelRequest, res: VercelResponse) {
  try {
    const cacheHealth = await cacheService.healthCheck();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        cache: cacheHealth,
        api: { status: 'healthy', responseTime: 1 }
      },
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    const response = new ResponseBuilder().setData(healthData);
    response.send(res);
  } catch (error) {
    console.error('Health check error:', error);
    APIErrorHandler.handleServerError(res, error as Error);
  }
}

// 创建统一的API处理器
const createAPIHandler = (handler: Function) => {
  return createRateLimitMiddleware()(
    createCacheMiddleware({
      ttl: 300 * 1000, // 5 minutes
      cacheControlHeader: 'public, max-age=300'
    })(async (req: VercelRequest, res: VercelResponse) => {
      withCors(res);

      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      try {
        await handler(req, res);
      } catch (error) {
        console.error('API handler error:', error);
        APIErrorHandler.handleServerError(res, error as Error);
      }
    })
  );
};

// 导出统一的处理器
export const convertAPI = createAPIHandler(handleConvert);
export const formatsAPI = createAPIHandler(handleFormats);
export const healthAPI = createAPIHandler(handleHealth);

// 默认导出主要的转换处理器
export default convertAPI;