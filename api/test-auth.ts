/**
 * Authentication Test Endpoint
 * 
 * This endpoint is specifically for testing authentication and authorization.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createCorsHeaders } from './utils/response';
import { apiKeyAuthMiddleware, adminAuthMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { defaultAPISecurityMiddleware } from './middleware/api-security';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const corsHeaders = createCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: 'Only GET method is allowed'
    });
  }
  
  // Apply API security middleware
  defaultAPISecurityMiddleware(req, res, () => {
    const authType = req.query.auth as string;
    
    switch (authType) {
      case 'required':
        // Test required authentication
        apiKeyAuthMiddleware(req, res, () => {
          return res.status(200).json({
            success: true,
            message: 'Authentication required - access granted',
            data: {
              authenticated: true,
              authMethod: (req as any).auth?.method,
              userId: (req as any).auth?.userId,
              roles: (req as any).auth?.roles
            }
          });
        });
        break;
        
      case 'admin':
        // Test admin authentication
        adminAuthMiddleware(req, res, () => {
          return res.status(200).json({
            success: true,
            message: 'Admin authentication - access granted',
            data: {
              authenticated: true,
              authMethod: (req as any).auth?.method,
              userId: (req as any).auth?.userId,
              roles: (req as any).auth?.roles
            }
          });
        });
        break;
        
      case 'optional':
      default:
        // Test optional authentication
        optionalAuthMiddleware(req, res, () => {
          return res.status(200).json({
            success: true,
            message: 'Optional authentication - access granted',
            data: {
              authenticated: (req as any).auth?.authenticated || false,
              authMethod: (req as any).auth?.method || 'none',
              userId: (req as any).auth?.userId,
              roles: (req as any).auth?.roles || []
            }
          });
        });
        break;
    }
  });
}
