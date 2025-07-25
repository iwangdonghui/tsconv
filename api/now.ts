import {
  VercelRequest,
  VercelResponse,
  ResponseBuilder,
  withCors,
  createCacheMiddleware,
  createRateLimitMiddleware
} from './_shared';

async function nowHandler(req: VercelRequest, res: VercelResponse) {
  withCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const now = new Date();
    const timestamp = Math.floor(now.getTime() / 1000);
    
    const formats = {
      iso8601: now.toISOString(),
      utc: now.toUTCString(),
      timestamp: timestamp,
      local: now.toLocaleString(),
      unix: timestamp
    };

    const response = new ResponseBuilder()
      .setData({
        current: {
          timestamp,
          date: now.toISOString(),
          formats
        },
        meta: {
          timestamp: now.toISOString()
        }
      });

    response.send(res);
  } catch (error) {
    console.error('Now API error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  }
}

const enhancedNowHandler = createRateLimitMiddleware()(
  createCacheMiddleware({
    ttl: 1000, // 1 second for current time
    cacheControlHeader: 'public, max-age=1'
  })(nowHandler)
);

export default enhancedNowHandler;
