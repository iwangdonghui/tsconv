/**
 * Enhanced Admin API
 * Comprehensive admin interface with advanced authentication, query optimization, and audit logging
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { EnhancedAuditLogger } from './services/admin/audit-logger';
import { EnhancedAdminAuth } from './services/admin/enhanced-admin-auth';
import { AdminQueryOptimizer } from './services/admin/query-optimizer';
import { APIErrorHandler, withCors } from './utils/response';

interface AdminRequest extends VercelRequest {
  auth?: {
    authenticated: boolean;
    session?: Record<string, unknown>;
    user?: Record<string, unknown>;
  };
}

// Initialize admin services
const adminAuth = EnhancedAdminAuth.getInstance();
const queryOptimizer = AdminQueryOptimizer.getInstance();
const auditLogger = EnhancedAuditLogger.getInstance();

/**
 * Main enhanced admin handler
 */
async function enhancedAdminHandler(req: AdminRequest, res: VercelResponse) {
  withCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Parse URL path
    const urlPath = new URL(req.url!, `http://${req.headers.host}`).pathname;
    const pathSegments = urlPath.split('/').filter(Boolean);
    const action = pathSegments[2] || 'dashboard'; // /api/enhanced-admin/{action}

    // Get client info
    const clientInfo = {
      ipAddress:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        (req.headers['x-real-ip'] as string) ||
        req.connection?.remoteAddress ||
        'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };

    // Authenticate request
    const authResult = await authenticateAdminRequest(req, action);
    if (!authResult.success) {
      // Log failed authentication
      auditLogger.logEvent({
        userId: 'unknown',
        sessionId: 'none',
        action: 'admin_access_denied',
        resource: 'admin',
        method: req.method!,
        endpoint: urlPath,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        duration: Date.now() - startTime,
        status: 'failure',
        severity: 'high',
        category: 'authentication',
        details: {
          responseStatus: 401,
          errorMessage: authResult.error,
        },
      });

      return APIErrorHandler.handleUnauthorized(res, authResult.error!);
    }

    req.auth = authResult.auth as {
      authenticated: boolean;
      session?: Record<string, unknown>;
      user?: Record<string, unknown>;
    };

    // Route to appropriate handler
    const result = await routeAdminRequest(req, action, correlationId, startTime);

    // Log successful operation
    auditLogger.logEvent({
      userId: (req.auth!.user?.id as string) || 'unknown',
      sessionId: (req.auth!.session?.id as string) || 'none',
      action: `admin_${action}`,
      resource: 'admin',
      method: req.method!,
      endpoint: urlPath,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      duration: Date.now() - startTime,
      status: 'success',
      severity: 'medium',
      category: 'system_admin',
      details: {
        responseStatus: 200,
        requestBody: req.method === 'POST' ? req.body : undefined,
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Enhanced admin error:', error);

    // Get client info for error logging
    const clientInfo = {
      ipAddress:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        (req.headers['x-real-ip'] as string) ||
        req.connection?.remoteAddress ||
        'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };

    // Log error
    auditLogger.logEvent({
      userId: (req.auth?.user?.id as string) || 'unknown',
      sessionId: (req.auth?.session?.id as string) || 'none',
      action: 'admin_error',
      resource: 'admin',
      method: req.method!,
      endpoint: req.url!,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      duration: Date.now() - startTime,
      status: 'error',
      severity: 'high',
      category: 'system_admin',
      details: {
        responseStatus: 500,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'enhanced-admin',
      correlationId,
    });
  }
}

/**
 * Authenticate admin request
 */
async function authenticateAdminRequest(
  req: AdminRequest,
  action: string
): Promise<{ success: boolean; auth?: Record<string, unknown>; error?: string }> {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  const clientInfo = {
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };

  // Determine required permission based on action
  const requiredPermission = getRequiredPermission(action, req.method!);

  try {
    // Try different authentication methods
    let authResult;

    if (token) {
      // JWT token authentication
      authResult = adminAuth.validateSessionAndPermissions(token, requiredPermission);
    } else if (apiKey) {
      // API key authentication
      const authResponse = await adminAuth.authenticateUser({ apiKey }, clientInfo);
      if (authResponse.success && authResponse.session) {
        authResult = adminAuth.validateSessionAndPermissions(
          authResponse.session.token,
          requiredPermission
        );
      }
    } else {
      return { success: false, error: 'Authentication required' };
    }

    if (!authResult || !authResult.valid) {
      return { success: false, error: authResult?.error || 'Authentication failed' };
    }

    return {
      success: true,
      auth: {
        authenticated: true,
        session: authResult.session,
        user: authResult.user,
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Get required permission for action
 */
function getRequiredPermission(
  action: string,
  method: string
): { resource: string; action: string; scope?: string } {
  const permissionMap: Record<string, { resource: string; action: string; scope?: string }> = {
    dashboard: { resource: 'system', action: 'read' },
    users: { resource: 'users', action: method === 'GET' ? 'read' : 'write' },
    sessions: { resource: 'users', action: 'read' },
    audit: { resource: 'audit', action: 'read' },
    health: { resource: 'health', action: 'read' },
    metrics: { resource: 'metrics', action: 'read' },
    cache: { resource: 'cache', action: 'manage' },
    security: { resource: 'security', action: 'read' },
    config: { resource: 'system', action: 'write' },
    logs: { resource: 'logs', action: 'read' },
    analytics: { resource: 'analytics', action: 'read' },
  };

  return permissionMap[action] || { resource: 'system', action: 'read' };
}

/**
 * Route admin request to appropriate handler
 */
async function routeAdminRequest(
  req: AdminRequest,
  action: string,
  correlationId: string,
  _startTime: number
): Promise<any> {
  const baseResponse = {
    success: true,
    metadata: {
      action,
      correlationId,
      processingTime: 0,
      timestamp: Date.now(),
      user: req.auth!.user?.username || 'unknown',
    },
  };

  switch (action) {
    case 'dashboard':
      return await handleDashboard(req, baseResponse);

    case 'users':
      return await handleUsers(req, baseResponse);

    case 'sessions':
      return await handleSessions(req, baseResponse);

    case 'audit':
      return await handleAudit(req, baseResponse);

    case 'health':
      return await handleHealth(req, baseResponse);

    case 'metrics':
      return await handleMetrics(req, baseResponse);

    case 'cache':
      return await handleCache(req, baseResponse);

    case 'security':
      return await handleSecurity(req, baseResponse);

    case 'analytics':
      return await handleAnalytics(req, baseResponse);

    case 'query':
      return await handleQuery(req, baseResponse);

    default:
      throw new Error(`Unknown admin action: ${action}`);
  }
}

/**
 * Individual action handlers
 */
async function handleDashboard(
  _req: AdminRequest,
  baseResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const adminStats = adminAuth.getAdminStats();
  const queryStats = queryOptimizer.getQueryStats();
  const auditAnalytics = auditLogger.generateAnalytics({
    start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
    end: Date.now(),
  });

  return {
    ...baseResponse,
    data: {
      overview: {
        totalUsers: adminStats.users.total,
        activeSessions: adminStats.sessions.active,
        recentAuditEvents: auditAnalytics.summary.totalEvents,
        systemHealth: 'healthy', // Would integrate with health monitor
      },
      stats: {
        admin: adminStats,
        query: queryStats,
        audit: auditAnalytics.summary,
      },
      recentActivity: auditLogger.queryEvents({
        limit: 10,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      }).events,
    },
  };
}

async function handleUsers(
  req: AdminRequest,
  baseResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (req.method === 'GET') {
    const users = adminAuth.getUsers();
    return {
      ...baseResponse,
      data: {
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status,
          roles: user.roles.map(r => r.name),
          lastLogin: user.lastLogin,
          loginCount: user.loginCount,
        })),
        total: users.length,
      },
    };
  }

  throw new Error(`Method ${req.method} not supported for users endpoint`);
}

async function handleSessions(
  _req: AdminRequest,
  baseResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const sessions = adminAuth.getSessions();
  return {
    ...baseResponse,
    data: {
      sessions: sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
      })),
      total: sessions.length,
    },
  };
}

async function handleAudit(
  req: AdminRequest,
  baseResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const query = {
    userId: req.query.userId as string,
    action: req.query.action as string,
    resource: req.query.resource as string,
    status: req.query.status as string,
    limit: parseInt(req.query.limit as string) || 100,
    offset: parseInt(req.query.offset as string) || 0,
    timeRange:
      req.query.startTime && req.query.endTime
        ? {
            start: parseInt(req.query.startTime as string),
            end: parseInt(req.query.endTime as string),
          }
        : undefined,
  };

  const result = auditLogger.queryEvents(query);

  return {
    ...baseResponse,
    data: {
      events: result.events,
      total: result.total,
      query,
    },
  };
}

async function handleHealth(
  _req: AdminRequest,
  baseResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Would integrate with health monitoring system
  return {
    ...baseResponse,
    data: {
      status: 'healthy',
      services: {
        auth: 'healthy',
        query: 'healthy',
        audit: 'healthy',
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    },
  };
}

async function handleMetrics(
  _req: AdminRequest,
  baseResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const adminStats = adminAuth.getAdminStats();
  const queryStats = queryOptimizer.getQueryStats();
  const auditAnalytics = auditLogger.generateAnalytics();

  return {
    ...baseResponse,
    data: {
      admin: adminStats,
      query: queryStats,
      audit: auditAnalytics,
    },
  };
}

async function handleCache(
  req: AdminRequest,
  baseResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (req.method === 'DELETE') {
    queryOptimizer.clearCache();
    adminAuth.clearPermissionCache();

    return {
      ...baseResponse,
      data: { message: 'Cache cleared successfully' },
    };
  }

  const cacheStats = queryOptimizer.getQueryStats().cache;
  return {
    ...baseResponse,
    data: { cache: cacheStats },
  };
}

async function handleSecurity(
  _req: AdminRequest,
  baseResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const recentAuditEvents = auditLogger.queryEvents({
    limit: 100,
    timeRange: {
      start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
      end: Date.now(),
    },
  }).events;

  const securityMetrics = {
    failedLogins: recentAuditEvents.filter(e => e.action === 'login' && e.status === 'failure')
      .length,
    highRiskEvents: recentAuditEvents.filter(e => e.context.riskScore >= 7).length,
    suspiciousActivity: recentAuditEvents.filter(e => e.context.flags.includes('suspicious'))
      .length,
  };

  return {
    ...baseResponse,
    data: {
      metrics: securityMetrics,
      recentEvents: recentAuditEvents.slice(0, 20),
    },
  };
}

async function handleAnalytics(
  req: AdminRequest,
  baseResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const timeRange =
    req.query.startTime && req.query.endTime
      ? {
          start: parseInt(req.query.startTime as string),
          end: parseInt(req.query.endTime as string),
        }
      : undefined;

  const analytics = auditLogger.generateAnalytics(timeRange);

  return {
    ...baseResponse,
    data: analytics,
  };
}

async function handleQuery(
  req: AdminRequest,
  baseResponse: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (req.method !== 'POST') {
    throw new Error('Query endpoint only supports POST method');
  }

  const queryRequest = req.body;
  const result = await queryOptimizer.executeQuery(queryRequest);

  return {
    ...baseResponse,
    data: result,
  };
}

export default enhancedAdminHandler;
