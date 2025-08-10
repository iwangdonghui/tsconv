import { VercelRequest, VercelResponse } from '@vercel/node';
import { UnifiedHealthHandler } from './unified-health';

// Working health check handler using unified architecture
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add mode parameter to query for working mode
  req.query.mode = 'working';

  const healthHandler = new UnifiedHealthHandler();
  await healthHandler.handle(req, res);
}
