import { VercelRequest, VercelResponse } from '@vercel/node';
import { UnifiedHealthHandler } from './unified-health';

// Simple health check handler using unified architecture
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add mode parameter to query for simple mode
  req.query.mode = 'simple';

  const healthHandler = new UnifiedHealthHandler();
  await healthHandler.handle(req, res);
}
