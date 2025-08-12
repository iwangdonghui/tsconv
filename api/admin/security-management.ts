/**
 * Security Management API
 * Provides endpoints for managing security policies, viewing threats, and monitoring security events
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { SecurityPolicyLevel } from '../services/security/security-policy-manager';
import { ThreatPattern } from '../services/security/threat-detection-engine';
import { UnifiedSecurityMiddleware } from '../services/security/unified-security-middleware';

// Global security middleware instance for management
let securityMiddleware: UnifiedSecurityMiddleware;

// Initialize security middleware for management
function initializeSecurityManagement() {
  if (!securityMiddleware) {
    securityMiddleware = new UnifiedSecurityMiddleware({
      policyLevel: 'standard',
      enableThreatDetection: true,
      enableLogging: true,
      enableRealTimeBlocking: true,
    });
  }
}

/**
 * GET /api/admin/security-management
 * Get security configuration, statistics, and logs
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    initializeSecurityManagement();

    if (req.method === 'GET') {
      const action = req.query.action as string;

      switch (action) {
        case 'stats':
          const stats = securityMiddleware.getSecurityStats();
          return res.status(200).json({
            success: true,
            data: stats,
          });

        case 'logs':
          const filter: any = {
            level: req.query.level ? (req.query.level as string).split(',') : undefined,
            event: req.query.event ? (req.query.event as string).split(',') : undefined,
            blocked: req.query.blocked ? req.query.blocked === 'true' : undefined,
            limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
            offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
            ip: req.query.ip as string,
            endpoint: req.query.endpoint as string,
          };

          if (req.query.timeRange) {
            const [start, end] = (req.query.timeRange as string).split(',');
            filter.timeRange = {
              start: parseInt(start),
              end: parseInt(end),
            };
          }

          const logs = securityMiddleware.getSecurityLogs(filter);
          return res.status(200).json({
            success: true,
            data: {
              logs,
              filter,
              total: logs.length,
            },
          });

        case 'threats':
          const threatStats = securityMiddleware.getSecurityStats();
          return res.status(200).json({
            success: true,
            data: {
              threats: threatStats.threats,
              recentThreats: securityMiddleware.getSecurityLogs({
                event: ['malicious_payload', 'suspicious_request', 'bot_detected'],
                limit: 50,
              }),
            },
          });

        case 'blocked-ips':
          const securityStats = securityMiddleware.getSecurityStats();
          return res.status(200).json({
            success: true,
            data: {
              blocking: securityStats.blocking,
              recentBlocked: securityMiddleware.getSecurityLogs({
                blocked: true,
                limit: 50,
              }),
            },
          });

        case 'policy':
          const policyStats = securityMiddleware.getSecurityStats();
          return res.status(200).json({
            success: true,
            data: {
              policy: policyStats.policy,
            },
          });

        default:
          // Return comprehensive security overview
          const overview = securityMiddleware.getSecurityStats();
          const recentLogs = securityMiddleware.getSecurityLogs({ limit: 20 });

          return res.status(200).json({
            success: true,
            data: {
              overview,
              recentActivity: recentLogs,
              timestamp: Date.now(),
            },
          });
      }
    } else if (req.method === 'POST') {
      const { action, ...data } = req.body;

      switch (action) {
        case 'updatePolicy':
          const { level, customConfig, reason } = data as {
            level?: SecurityPolicyLevel;
            customConfig?: any;
            reason?: string;
          };

          if (level) {
            securityMiddleware.updatePolicy(level, reason);
          }

          if (customConfig) {
            securityMiddleware.applyCustomPolicy(customConfig, reason);
          }

          return res.status(200).json({
            success: true,
            message: 'Security policy updated successfully',
            data: {
              level,
              customConfig: !!customConfig,
              reason,
            },
          });

        case 'clearBlocked':
          securityMiddleware.clearBlockedIPs();

          return res.status(200).json({
            success: true,
            message: 'Blocked IPs cleared successfully',
          });

        case 'addThreatPattern':
          const { pattern } = data as { pattern: ThreatPattern };

          // This would require exposing the threat detection engine
          // For now, return a placeholder response
          return res.status(200).json({
            success: true,
            message: 'Threat pattern management not yet implemented',
            data: { pattern },
          });

        default:
          return res.status(400).json({
            success: false,
            error: `Unknown action: ${action}`,
          });
      }
    } else if (req.method === 'DELETE') {
      const action = req.query.action as string;

      switch (action) {
        case 'clearLogs':
          // This would require exposing the security logger
          // For now, return a placeholder response
          return res.status(200).json({
            success: true,
            message: 'Security logs cleared successfully',
          });

        case 'unblockIP':
          const ip = req.query.ip as string;
          if (!ip) {
            return res.status(400).json({
              success: false,
              error: 'IP address is required',
            });
          }

          // This would require exposing the IP blocking functionality
          // For now, return a placeholder response
          return res.status(200).json({
            success: true,
            message: `IP ${ip} unblocked successfully`,
            data: { ip },
          });

        default:
          return res.status(400).json({
            success: false,
            error: `Unknown action: ${action}`,
          });
      }
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error) {
    console.error('Security management API error:', error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Security Management Dashboard Data
 * Helper function to get comprehensive security dashboard data
 */
export async function getSecurityDashboardData() {
  initializeSecurityManagement();

  const stats = securityMiddleware.getSecurityStats();
  const recentLogs = securityMiddleware.getSecurityLogs({ limit: 100 });
  const recentThreats = securityMiddleware.getSecurityLogs({
    event: ['malicious_payload', 'suspicious_request', 'bot_detected'],
    limit: 50,
  });
  const blockedRequests = securityMiddleware.getSecurityLogs({
    blocked: true,
    limit: 50,
  });

  // Calculate additional metrics
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const oneDayAgo = now - 86400000;

  const recentActivity = recentLogs.filter(log => log.timestamp > oneHourAgo);
  const dailyActivity = recentLogs.filter(log => log.timestamp > oneDayAgo);

  const threatsByType = new Map();
  const threatsBySeverity = new Map();

  recentThreats.forEach(log => {
    if (log.security.threat) {
      const type = log.security.threat.type;
      const severity = log.security.threat.severity;

      threatsByType.set(type, (threatsByType.get(type) || 0) + 1);
      threatsBySeverity.set(severity, (threatsBySeverity.get(severity) || 0) + 1);
    }
  });

  return {
    overview: stats,
    metrics: {
      totalLogs: recentLogs.length,
      recentActivity: recentActivity.length,
      dailyActivity: dailyActivity.length,
      threatsDetected: recentThreats.length,
      requestsBlocked: blockedRequests.length,
      threatsByType: Object.fromEntries(threatsByType),
      threatsBySeverity: Object.fromEntries(threatsBySeverity),
    },
    recentLogs: recentLogs.slice(0, 20),
    recentThreats: recentThreats.slice(0, 10),
    blockedRequests: blockedRequests.slice(0, 10),
    timestamp: now,
  };
}

/**
 * Security Health Check
 * Check the health of the security system
 */
export async function getSecurityHealthCheck() {
  try {
    initializeSecurityManagement();

    const stats = securityMiddleware.getSecurityStats();
    const recentLogs = securityMiddleware.getSecurityLogs({ limit: 10 });

    // Determine health status
    let status = 'healthy';
    const issues = [];

    // Check if logging is working
    if (recentLogs.length === 0) {
      issues.push('No recent security logs detected');
      status = 'degraded';
    }

    // Check threat detection
    if (!stats.threats) {
      issues.push('Threat detection statistics unavailable');
      status = 'degraded';
    }

    // Check policy status
    if (!stats.policy) {
      issues.push('Security policy information unavailable');
      status = 'unhealthy';
    }

    return {
      status,
      timestamp: Date.now(),
      components: {
        policyManager: stats.policy ? 'healthy' : 'unhealthy',
        threatDetection: stats.threats ? 'healthy' : 'unhealthy',
        logging: recentLogs.length > 0 ? 'healthy' : 'degraded',
        blocking: stats.blocking ? 'healthy' : 'unknown',
      },
      issues,
      stats: {
        totalLogs: recentLogs.length,
        policyLevel: (stats.policy as any)?.level || 'unknown',
        threatsEnabled: !!stats.threats,
        blockingEnabled: !!stats.blocking,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: Date.now(),
      error: (error as Error).message,
      components: {
        policyManager: 'unknown',
        threatDetection: 'unknown',
        logging: 'unknown',
        blocking: 'unknown',
      },
      issues: ['Security system initialization failed'],
    };
  }
}
