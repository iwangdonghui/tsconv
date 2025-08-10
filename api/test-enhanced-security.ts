/**
 * Enhanced Security Headers Test Endpoint
 *
 * This endpoint is specifically for testing enhanced security headers.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { maximumSecurityHeadersMiddleware } from './middleware/enhanced-security-headers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Apply enhanced security headers
    maximumSecurityHeadersMiddleware(req, res);

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

    // Get applied headers for debugging
    const appliedHeaders: Record<string, string> = {};
    const headerNames = [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Embedder-Policy',
      'Cross-Origin-Opener-Policy',
      'Cross-Origin-Resource-Policy',
      'Expect-CT',
      'X-DNS-Prefetch-Control',
      'X-Download-Options',
      'X-Permitted-Cross-Domain-Policies',
    ];

    headerNames.forEach(name => {
      const value = res.getHeader(name);
      if (value) {
        appliedHeaders[name] = value.toString();
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Enhanced security headers test endpoint',
      data: {
        appliedHeaders,
        headerCount: Object.keys(appliedHeaders).length,
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
