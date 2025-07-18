export default function handler(req: any, res: any) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { timestamp, date, format = 'json' } = req.query;

    // 验证输入
    if (!timestamp && !date) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Please provide either "timestamp" or "date" parameter',
        example: '/api/convert?timestamp=1640995200'
      });
    }

    let result: any = {};
    let inputDate: Date;

    if (timestamp) {
      // 处理时间戳输入
      const ts = parseInt(timestamp as string);
      if (isNaN(ts)) {
        return res.status(400).json({
          error: 'Invalid timestamp',
          message: 'Timestamp must be a valid number',
          provided: timestamp
        });
      }

      // 判断是秒还是毫秒
      const timestampMs = ts.toString().length === 10 ? ts * 1000 : ts;
      inputDate = new Date(timestampMs);

      if (isNaN(inputDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid timestamp',
          message: 'Timestamp is out of valid range',
          provided: timestamp
        });
      }

      result = {
        input: {
          timestamp: ts,
          type: ts.toString().length === 10 ? 'seconds' : 'milliseconds'
        },
        output: {
          utc: inputDate.toUTCString(),
          iso8601: inputDate.toISOString(),
          unix_seconds: Math.floor(inputDate.getTime() / 1000),
          unix_milliseconds: inputDate.getTime()
        }
      };
    } else if (date) {
      // 处理日期输入
      inputDate = new Date(date as string);

      if (isNaN(inputDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid date',
          message: 'Date format is not recognized',
          provided: date
        });
      }

      result = {
        input: {
          date: date,
          parsed: inputDate.toISOString()
        },
        output: {
          utc: inputDate.toUTCString(),
          iso8601: inputDate.toISOString(),
          unix_seconds: Math.floor(inputDate.getTime() / 1000),
          unix_milliseconds: inputDate.getTime()
        }
      };
    }

    // 添加元数据
    result.meta = {
      api_version: 'v1',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
}