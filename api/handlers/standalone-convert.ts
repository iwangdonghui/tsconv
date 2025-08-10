import { VercelRequest, VercelResponse } from '@vercel/node';
import { UnifiedConvertHandler } from './unified-convert';

// Standalone convert handler using unified architecture
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add mode parameter to query for standalone mode
  if (req.method === 'GET') {
    req.query.mode = 'standalone';
  } else if (req.body && typeof req.body === 'object') {
    req.body.options = {
      mode: 'standalone',
      ...req.body.options,
    };
  }

  const convertHandler = new UnifiedConvertHandler();
  await convertHandler.handle(req, res);
}
