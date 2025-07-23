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
      processingTime: Date.now() - Date.now(),
      itemCount: Array.isArray(data.results) ? data.results.length : 1,
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

// 解析时间戳或日期
function parseInput(input: string | number): { timestamp: number; isValid: boolean } {
  if (typeof input === 'number') {
    return { timestamp: input, isValid: !isNaN(input) && input >= 0 };
  }

  const str = String(input);
  
  // 尝试解析为时间戳
  const asNumber = parseInt(str);
  if (!isNaN(asNumber) && asNumber >= 0) {
    return { timestamp: asNumber, isValid: true };
  }

  // 尝试解析为日期
  const asDate = new Date(str);
  if (!isNaN(asDate.getTime())) {
    return { timestamp: Math.floor(asDate.getTime() / 1000), isValid: true };
  }

  return { timestamp: 0, isValid: false };
}

// 格式化时间戳
function formatTimestamp(timestamp: number, formats: string[]): Record<string, string> {
  const date = new Date(timestamp * 1000);
  const result: Record<string, string> = {};

  for (const format of formats) {
    try {
      switch (format.toLowerCase()) {
        case 'iso8601':
          result[format] = date.toISOString();
          break;
        case 'utc':
          result[format] = date.toUTCString();
          break;
        case 'timestamp':
        case 'unix':
          result[format] = timestamp.toString();
          break;
        case 'local':
          result[format] = date.toLocaleString();
          break;
        case 'date':
          result[format] = date.toLocaleDateString();
          break;
        case 'time':
          result[format] = date.toLocaleTimeString();
          break;
        case 'relative':
          result[format] = getRelativeTime(date);
          break;
        case 'rfc2822':
          result[format] = date.toUTCString();
          break;
        case 'short':
          result[format] = date.toLocaleDateString('en-US', { 
            year: '2-digit', 
            month: '2-digit', 
            day: '2-digit' 
          });
          break;
        case 'long':
          result[format] = date.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          break;
        default:
          result[format] = date.toISOString();
      }
    } catch (error) {
      result[format] = `Error: ${error instanceof Error ? error.message : 'Format error'}`;
    }
  }

  return result;
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

// 处理单个转换项
function processItem(item: string | number, outputFormats: string[]): any {
  const { timestamp, isValid } = parseInput(item);
  
  if (!isValid) {
    return {
      input: item,
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: `Could not parse "${item}" as a valid timestamp or date`
      }
    };
  }

  const formats = formatTimestamp(timestamp, outputFormats);

  return {
    input: item,
    success: true,
    data: {
      timestamp: timestamp,
      formats: formats
    }
  };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return sendError(res, 'Only POST method is allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    const { 
      items, 
      outputFormats = ['iso8601', 'timestamp', 'utc'], 
      timezone, 
      targetTimezone,
      options = { continueOnError: true, maxItems: 100 }
    } = req.body;

    // 验证请求
    if (!items || !Array.isArray(items)) {
      return sendError(res, 'Request must include an items array');
    }

    if (items.length === 0) {
      return sendError(res, 'Items array cannot be empty');
    }

    if (items.length > options.maxItems) {
      return sendError(res, `Too many items. Maximum allowed: ${options.maxItems}`);
    }

    // 处理每个项目
    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        const result = processItem(item, outputFormats);
        results.push(result);
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          if (!options.continueOnError && errorCount > 0) {
            break;
          }
        }
      } catch (error) {
        const errorItem = {
          input: item,
          success: false,
          error: {
            code: 'PROCESSING_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        
        results.push(errorItem);
        errorCount++;
        
        if (!options.continueOnError && errorCount > 0) {
          break;
        }
      }
    }

    // 构建响应
    const processingTime = Date.now() - startTime;
    
    const responseData = {
      results,
      summary: {
        total: items.length,
        processed: results.length,
        successful: successCount,
        failed: errorCount,
        processingTime
      }
    };

    // 添加时区信息（如果提供）
    if (timezone || targetTimezone) {
      responseData.timezone = {
        original: timezone || 'UTC',
        target: targetTimezone || timezone || 'UTC'
      };
    }

    sendSuccess(res, responseData);

  } catch (error) {
    console.error('Batch conversion error:', error);
    sendError(res, 'An unexpected error occurred', 'INTERNAL_ERROR', 500);
  }
}