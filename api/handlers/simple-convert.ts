import { VercelRequest, VercelResponse } from '@vercel/node';
import { UnifiedConvertHandler } from './unified-convert';

// Simple convert handler using unified architecture
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add mode parameter to query for simple mode
  if (req.method === 'GET') {
    req.query.mode = 'simple';
    req.query.metadata = 'false'; // Simple mode doesn't include metadata by default
  } else if (req.body && typeof req.body === 'object') {
    req.body.options = {
      mode: 'simple',
      includeMetadata: false,
      ...req.body.options,
    };
  }

  const convertHandler = new UnifiedConvertHandler();
  await convertHandler.handle(req, res);
}
