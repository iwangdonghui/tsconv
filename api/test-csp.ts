/**
 * CSP Test Endpoint
 *
 * This endpoint is specifically for testing CSP headers and security configuration.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { defaultSecurityHeadersMiddleware } from './middleware/security-headers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply security headers including CSP
  defaultSecurityHeadersMiddleware(req, res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const nonce = (req as any).cspNonce;

    return res.status(200).json({
      success: true,
      message: 'CSP test endpoint',
      data: {
        cspNonce: nonce,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      },
      metadata: {
        processingTime: 1,
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
