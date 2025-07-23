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

  const response = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: Math.floor(Date.now() / 1000),
      uptime: process.uptime(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform
      },
      services: {
        api: {
          status: 'healthy',
          responseTime: 1
        },
        cache: {
          status: 'healthy',
          type: 'memory'
        }
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    },
    metadata: {
      processingTime: 1,
      itemCount: 1,
      cacheHit: false
    }
  };

  res.status(200).json(response);
}