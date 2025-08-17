/**
 * API Key Management Endpoint
 *
 * This endpoint provides comprehensive API key management functionality
 * including creation, listing, revocation, and monitoring.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { defaultAPISecurityMiddleware } from '../middleware/api-security';
import { adminAuthMiddleware, APIKeyInfo, apiKeyManager } from '../middleware/auth';
import { createValidationMiddleware } from '../middleware/type-validation';
import { createCorsHeaders } from '../utils/response';

// ============================================================================
// Types
// ============================================================================

interface CreateAPIKeyRequest {
  name: string;
  userId?: string;
  roles?: string[];
  permissions?: string[];
  rateLimit?: {
    requests: number;
    window: number;
  };
  expiresIn?: string; // e.g., "30d", "1y", "never"
}

interface FormattedAPIKey {
  id: string;
  name: string;
  key: string;
  userId?: string;
  roles: string[];
  permissions: string[];
  rateLimit?: {
    requests: number;
    window: number;
  };
  enabled: boolean;
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
}

interface APIKeyListResponse {
  keys: Omit<APIKeyInfo, 'key' | 'hashedKey'>[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const createAPIKeySchema = {
  name: {
    required: true,
    type: 'string' as const,
    min: 1,
    max: 100,
    pattern: /^[a-zA-Z0-9\s\-_]+$/,
  },
  userId: {
    type: 'string' as const,
    pattern: /^[a-zA-Z0-9\-_]+$/,
  },
  roles: {
    type: 'array' as const,
    validator: (value: unknown) => {
      if (!Array.isArray(value)) return false;
      return value.every(role => typeof role === 'string' && role.length > 0);
    },
  },
  permissions: {
    type: 'array' as const,
    validator: (value: unknown) => {
      if (!Array.isArray(value)) return false;
      return value.every(perm => typeof perm === 'string' && perm.length > 0);
    },
  },
  expiresIn: {
    type: 'string' as const,
    pattern: /^(\d+[dwmy]|never)$/,
  },
};

// Reserved placeholder for future partial update schema (intentionally unused to satisfy lint)

const _updateAPIKeySchema: Record<string, unknown> | undefined = undefined;
void _updateAPIKeySchema; // mark as intentionally unused

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parses expiration string to timestamp
 */
function parseExpiration(expiresIn: string): number | undefined {
  if (expiresIn === 'never') {
    return undefined;
  }

  const match = expiresIn.match(/^(\d+)([dwmy])$/);
  if (!match) {
    throw new Error('Invalid expiration format');
  }

  const value = parseInt(match[1] || '0');
  const unit = match[2];

  const now = Date.now();
  switch (unit) {
    case 'd':
      return now + value * 24 * 60 * 60 * 1000;
    case 'w':
      return now + value * 7 * 24 * 60 * 60 * 1000;
    case 'm':
      return now + value * 30 * 24 * 60 * 60 * 1000;
    case 'y':
      return now + value * 365 * 24 * 60 * 60 * 1000;
    default:
      throw new Error('Invalid expiration unit');
  }
}

/**
 * Formats API key for response (masks the key)
 */
function formatAPIKeyForResponse(keyInfo: APIKeyInfo, showKey: boolean = false): FormattedAPIKey {
  const { key, hashedKey, ...safeKeyInfo } = keyInfo;
  void hashedKey; // mark as intentionally unused

  return {
    ...safeKeyInfo,
    key: showKey ? key : `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
    createdAt: new Date(keyInfo.createdAt).toISOString(),
    lastUsed: keyInfo.lastUsed ? new Date(keyInfo.lastUsed).toISOString() : null,
    expiresAt: keyInfo.expiresAt ? new Date(keyInfo.expiresAt).toISOString() : null,
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Creates a new API key
 */
async function createAPIKey(req: VercelRequest, res: VercelResponse) {
  const {
    name,
    userId,
    roles = ['user'],
    permissions = ['read'],
    expiresIn = 'never',
  } = req.body as CreateAPIKeyRequest;

  try {
    const expiresAt = parseExpiration(expiresIn);

    const keyInfo = apiKeyManager.createAPIKey({
      name,
      userId,
      roles,
      permissions,
      expiresAt,
    });

    return res.status(201).json({
      success: true,
      data: formatAPIKeyForResponse(keyInfo, true), // Show full key only on creation
      message: 'API key created successfully',
      metadata: {
        processingTime: 1,
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Request',
      message: error instanceof Error ? error.message : 'Failed to create API key',
    });
  }
}

/**
 * Lists API keys with pagination
 */
async function listAPIKeys(req: VercelRequest, res: VercelResponse) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const userId = req.query.userId as string;

  try {
    const allKeys = apiKeyManager.listAPIKeys(userId);
    const total = allKeys.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const keys = allKeys.slice(startIndex, endIndex);

    const response: APIKeyListResponse = {
      keys: keys.map(key => ({
        ...key,
        createdAt: new Date(key.createdAt).toISOString(),
        lastUsed: key.lastUsed ? new Date(key.lastUsed).toISOString() : null,
        expiresAt: key.expiresAt ? new Date(key.expiresAt).toISOString() : null,
      })) as any,
      total,
      page,
      limit,
    };

    return res.status(200).json({
      success: true,
      data: response,
      metadata: {
        processingTime: 1,
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to list API keys',
    });
  }
}

/**
 * Gets a specific API key by ID
 */
async function getAPIKey(req: VercelRequest, res: VercelResponse) {
  const keyId = req.query.id as string;

  if (!keyId) {
    return res.status(400).json({
      success: false,
      error: 'Missing Parameter',
      message: 'API key ID is required',
    });
  }

  try {
    const allKeys = apiKeyManager.listAPIKeys();
    const keyInfo = allKeys.find(key => key.id === keyId);

    if (!keyInfo) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'API key not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: formatAPIKeyForResponse(keyInfo as any, false),
      metadata: {
        processingTime: 1,
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get API key',
    });
  }
}

/**
 * Revokes an API key
 */
async function revokeAPIKey(req: VercelRequest, res: VercelResponse) {
  const keyId = req.query.id as string;

  if (!keyId) {
    return res.status(400).json({
      success: false,
      error: 'Missing Parameter',
      message: 'API key ID is required',
    });
  }

  try {
    const success = apiKeyManager.revokeAPIKey(keyId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'API key not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'API key revoked successfully',
      metadata: {
        processingTime: 1,
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to revoke API key',
    });
  }
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply security middleware
  defaultAPISecurityMiddleware()(req, res, () => {
    // Apply admin authentication
    adminAuthMiddleware(req, res, async () => {
      // Set CORS headers
      const corsHeaders = createCorsHeaders(req.headers.origin as string);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      try {
        switch (req.method) {
          case 'POST': {
            // Validate request body for creation
            const createValidation = createValidationMiddleware(createAPIKeySchema);
            return createValidation(req, res, () => createAPIKey(req, res));
          }

          case 'GET':
            if (req.query.id) {
              return getAPIKey(req, res);
            } else {
              return listAPIKeys(req, res);
            }

          case 'DELETE':
            return revokeAPIKey(req, res);

          default:
            return res.status(405).json({
              success: false,
              error: 'Method Not Allowed',
              message: `Method ${req.method} is not allowed`,
            });
        }
      } catch (error) {
        console.error('API key management error:', error);

        return res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to process API key request',
        });
      }
    });
  });
}
