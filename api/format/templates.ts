import { VercelRequest, VercelResponse } from '@vercel/node';

// Predefined format templates
const FORMAT_TEMPLATES = {
  'iso': 'YYYY-MM-DDTHH:mm:ss.sssZ',
  'iso-date': 'YYYY-MM-DD',
  'iso-time': 'HH:mm:ss',
  'us-date': 'MM/DD/YYYY',
  'us-datetime': 'MM/DD/YYYY HH:mm:ss',
  'eu-date': 'DD/MM/YYYY',
  'eu-datetime': 'DD/MM/YYYY HH:mm:ss',
  'readable': 'MMMM Do, YYYY',
  'readable-full': 'dddd, MMMM Do, YYYY [at] h:mm A',
  'compact': 'YYYYMMDD',
  'compact-time': 'YYYYMMDDHHmmss',
  'unix': 'X',
  'unix-ms': 'x',
  'rfc2822': 'ddd, DD MMM YYYY HH:mm:ss ZZ',
  'sql': 'YYYY-MM-DD HH:mm:ss',
  'filename': 'YYYY-MM-DD_HH-mm-ss',
  'log': 'YYYY-MM-DD HH:mm:ss.SSS'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
  
  return res.status(200).json({
    success: true,
    data: {
      templates: FORMAT_TEMPLATES
    },
    metadata: {
      timestamp: new Date().toISOString(),
      cached: false
    }
  });
}
