import { VercelRequest, VercelResponse } from '@vercel/node';
import { UnifiedConvertHandler } from './unified-convert';

// Working convert handler using unified architecture
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add mode parameter to query for working mode
  if (req.method === 'GET') {
    req.query.mode = 'working';
  } else if (req.body && typeof req.body === 'object') {
    req.body.options = {
      mode: 'working',
      ...req.body.options
    };
  }

  const convertHandler = new UnifiedConvertHandler();
  await convertHandler.handle(req, res);
}