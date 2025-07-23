import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const startTime = Date.now();

  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const response = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: Math.floor(Date.now() / 1000),
        uptime: Math.floor(uptime),
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          platform: process.platform
        },
        services: {
          api: { status: 'healthy', responseTime: Date.now() - startTime },
          cache: { status: 'healthy', type: 'memory' },
          rateLimiting: { status: process.env.RATE_LIMITING_ENABLED === 'true' ? 'enabled' : 'disabled' }
        },
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        }
      },
      metadata: {
        processingTime: Date.now() - startTime,
        itemCount: 1,
        cacheHit: false
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        timestamp: Date.now()
      }
    });
  }
}