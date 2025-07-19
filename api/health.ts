import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only GET method is allowed"
      }
    });
  }

  const now = new Date();
  
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: Math.floor(now.getTime() / 1000),
      iso8601: now.toISOString(),
      version: '1.0.0',
      uptime: process.uptime()
    }
  });
}