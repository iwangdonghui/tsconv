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

  // 简单的测试响应
  const response = {
    success: true,
    message: 'API测试成功！',
    timestamp: Math.floor(Date.now() / 1000),
    method: req.method,
    query: req.query,
    body: req.body,
    environment: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      rateLimiting: process.env.RATE_LIMITING_ENABLED || 'unknown',
      caching: process.env.CACHING_ENABLED || 'unknown'
    }
  };

  res.status(200).json(response);
}