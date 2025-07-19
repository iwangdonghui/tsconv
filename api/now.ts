import { VercelRequest, VercelResponse } from '@vercel/node';

interface NowResponse {
  success: boolean;
  data: {
    timestamp: number;
    utc: string;
    iso8601: string;
  };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const now = new Date();
  const timestamp = Math.floor(now.getTime() / 1000);

  res.status(200).json({
    success: true,
    data: {
      timestamp: timestamp,
      utc: now.toUTCString(),
      iso8601: now.toISOString()
    }
  });
}
