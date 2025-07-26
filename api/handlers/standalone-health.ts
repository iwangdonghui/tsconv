import { VercelRequest, VercelResponse } from '@vercel/node';
import { UnifiedHealthHandler } from './unified-health';

// Standalone health check handler using unified architecture
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add mode parameter to query for standalone mode
  req.query.mode = 'standalone';

  const healthHandler = new UnifiedHealthHandler();
  await healthHandler.handle(req, res);
}