/**
 * API Authentication and Authorization Middleware
 *
 * This middleware provides comprehensive authentication and authorization
 * for API endpoints including API keys, JWT tokens, and role-based access control.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

// ============================================================================
// Types
// ============================================================================

export interface AuthConfig {
  jwtSecret?: string;
  apiKeyHeader?: string;
  allowedApiKeys?: string[];
  requireAuth?: boolean;
  allowedRoles?: string[];
  rateLimitByUser?: boolean;
}

export interface AuthContext {
  authenticated: boolean;
  method: 'api-key' | 'jwt' | 'none';
  userId?: string;
  apiKey?: string;
  roles?: string[];
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

export interface JWTPayload {
  sub: string; // user ID
  iat: number; // issued at
  exp: number; // expiration
  roles?: string[];
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

export interface APIKeyInfo {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  userId?: string;
  roles: string[];
  permissions: string[];
  rateLimit?: {
    requests: number;
    window: number;
  };
  enabled: boolean;
  createdAt: number;
  lastUsed?: number;
  expiresAt?: number;
}

// ============================================================================
// API Key Management
// ============================================================================

export class APIKeyManager {
  private keys: Map<string, APIKeyInfo> = new Map();

  /**
   * Generates a new API key
   */
  generateAPIKey(prefix: string = 'ak'): string {
    const randomBytes = crypto.randomBytes(32);
    const key = `${prefix}_${randomBytes.toString('hex')}`;
    return key;
  }

  /**
   * Hashes an API key for secure storage
   */
  hashAPIKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Creates a new API key
   */
  createAPIKey(options: {
    name: string;
    userId?: string;
    roles?: string[];
    permissions?: string[];
    rateLimit?: { requests: number; window: number };
    expiresAt?: number;
  }): APIKeyInfo {
    const key = this.generateAPIKey();
    const hashedKey = this.hashAPIKey(key);

    const apiKeyInfo: APIKeyInfo = {
      id: crypto.randomUUID(),
      name: options.name,
      key, // Only returned once during creation
      hashedKey,
      userId: options.userId,
      roles: options.roles || [],
      permissions: options.permissions || [],
      rateLimit: options.rateLimit,
      enabled: true,
      createdAt: Date.now(),
      expiresAt: options.expiresAt,
    };

    this.keys.set(hashedKey, apiKeyInfo);
    return apiKeyInfo;
  }

  /**
   * Validates an API key
   */
  validateAPIKey(key: string): APIKeyInfo | null {
    const hashedKey = this.hashAPIKey(key);
    const keyInfo = this.keys.get(hashedKey);

    if (!keyInfo) {
      return null;
    }

    // Check if key is enabled
    if (!keyInfo.enabled) {
      return null;
    }

    // Check if key is expired
    if (keyInfo.expiresAt && Date.now() > keyInfo.expiresAt) {
      return null;
    }

    // Update last used timestamp
    keyInfo.lastUsed = Date.now();

    return keyInfo;
  }

  /**
   * Revokes an API key
   */
  revokeAPIKey(keyId: string): boolean {
    const entries = Array.from(this.keys.entries());
    for (const [, keyInfo] of entries) {
      if (keyInfo.id === keyId) {
        keyInfo.enabled = false;
        return true;
      }
    }
    return false;
  }

  /**
   * Lists all API keys (without the actual key values)
   */
  listAPIKeys(userId?: string): Omit<APIKeyInfo, 'key' | 'hashedKey'>[] {
    const keys = Array.from(this.keys.values());
    const filteredKeys = userId ? keys.filter(k => k.userId === userId) : keys;

    return filteredKeys.map(({ key, hashedKey, ...keyInfo }) => {
      void key;
      void hashedKey; // mark as intentionally unused
      return keyInfo;
    });
  }
}

// ============================================================================
// JWT Token Management
// ============================================================================

export class JWTManager {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.JWT_SECRET || 'default-secret-change-in-production';
  }

  /**
   * Generates a JWT token
   */
  generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: string = '1h'): string {
    const now = Math.floor(Date.now() / 1000);
    const expiration = this.parseExpiration(expiresIn);

    const fullPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + expiration,
    };

    return jwt.sign(fullPayload, this.secret);
  }

  /**
   * Validates and decodes a JWT token
   */
  validateToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as JWTPayload;

      // Check if token is expired
      if (decoded.exp && Date.now() / 1000 > decoded.exp) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Refreshes a JWT token
   */
  refreshToken(token: string, expiresIn: string = '1h'): string | null {
    const payload = this.validateToken(token);
    if (!payload) {
      return null;
    }

    // Remove timing fields for refresh
    const { iat, exp, ...refreshPayload } = payload;
    void iat;
    void exp; // mark as intentionally unused
    return this.generateToken(refreshPayload, expiresIn);
  }

  /**
   * Parses expiration string to seconds
   */
  private parseExpiration(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiration format');
    }

    const value = parseInt(match[1] || '0');
    const unit = match[2] as 's' | 'm' | 'h' | 'd';

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        throw new Error('Invalid expiration unit');
    }
  }
}

// ============================================================================
// Authorization Helpers
// ============================================================================

/**
 * Checks if user has required role
 */
export function hasRole(userRoles: string[], requiredRole: string): boolean {
  return userRoles.includes(requiredRole) || userRoles.includes('admin');
}

/**
 * Checks if user has required permission
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('*');
}

/**
 * Checks if user has any of the required roles
 */
export function hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
  return requiredRoles.some(role => hasRole(userRoles, role));
}

/**
 * Checks if user has any of the required permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some(permission => hasPermission(userPermissions, permission));
}

// ============================================================================
// Authentication Middleware
// ============================================================================

// Global instances
const apiKeyManager = new APIKeyManager();
const jwtManager = new JWTManager();

/**
 * Creates authentication middleware
 */
export function createAuthMiddleware(config: AuthConfig = {}) {
  const {
    apiKeyHeader = 'X-API-Key',
    requireAuth = true,
    allowedRoles = [],
    allowedApiKeys = [],
  } = config;

  return async (req: VercelRequest, res: VercelResponse, next?: () => void) => {
    let authContext: AuthContext = {
      authenticated: false,
      method: 'none',
    };

    // Try API key authentication first
    const apiKey = req.headers[apiKeyHeader.toLowerCase()] as string;
    if (apiKey) {
      const keyInfo = apiKeyManager.validateAPIKey(apiKey);
      if (keyInfo) {
        authContext = {
          authenticated: true,
          method: 'api-key',
          apiKey,
          userId: keyInfo.userId,
          roles: keyInfo.roles,
          permissions: keyInfo.permissions,
          metadata: { keyId: keyInfo.id, keyName: keyInfo.name },
        };
      } else if (allowedApiKeys.includes(apiKey)) {
        // Fallback to simple API key list
        authContext = {
          authenticated: true,
          method: 'api-key',
          apiKey,
          roles: ['user'],
          permissions: ['read'],
        };
      }
    }

    // Try JWT authentication if API key failed
    if (!authContext.authenticated) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = jwtManager.validateToken(token);
        if (payload) {
          authContext = {
            authenticated: true,
            method: 'jwt',
            userId: payload.sub,
            roles: payload.roles || [],
            permissions: payload.permissions || [],
            metadata: payload.metadata,
          };
        }
      }
    }

    // Check if authentication is required
    if (requireAuth && !authContext.authenticated) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required',
        message: 'Valid API key or JWT token required',
      });
    }

    // Check role-based authorization
    if (authContext.authenticated && allowedRoles.length > 0) {
      if (!hasAnyRole(authContext.roles || [], allowedRoles)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient Permissions',
          message: `Required roles: ${allowedRoles.join(', ')}`,
        });
      }
    }

    // Attach auth context to request
    (req as any).auth = authContext;

    if (next) {
      return next();
    }

    return undefined;
  };
}

/**
 * Middleware for API key only authentication
 */
export const apiKeyAuthMiddleware = createAuthMiddleware({
  requireAuth: true,
  allowedRoles: [],
});

/**
 * Middleware for admin-only access
 */
export const adminAuthMiddleware = createAuthMiddleware({
  requireAuth: true,
  allowedRoles: ['admin'],
});

/**
 * Middleware for optional authentication
 */
export const optionalAuthMiddleware = createAuthMiddleware({
  requireAuth: false,
});

// ============================================================================
// Exports
// ============================================================================

export { apiKeyManager, jwtManager };
