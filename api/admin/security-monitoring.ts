/**
 * Security Monitoring and Reporting Endpoint
 * 
 * This endpoint provides comprehensive security monitoring, threat analysis,
 * and security reporting for API usage and security events.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createCorsHeaders } from '../utils/response';
import { adminAuthMiddleware } from '../middleware/auth';
import { SecurityLogger, SecurityLogEntry } from '../middleware/api-security';

// ============================================================================
// Types
// ============================================================================

interface SecurityMetrics {
  totalRequests: number;
  threatsDetected: number;
  blockedRequests: number;
  authenticationFailures: number;
  topThreats: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
  topIPs: Array<{
    ip: string;
    requests: number;
    threats: number;
  }>;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
    threats: number;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
}

interface SecurityReport {
  summary: {
    period: string;
    totalEvents: number;
    criticalEvents: number;
    highSeverityEvents: number;
    mediumSeverityEvents: number;
    lowSeverityEvents: number;
  };
  threats: {
    sqlInjection: number;
    xss: number;
    pathTraversal: number;
    commandInjection: number;
    other: number;
  };
  topAttackers: Array<{
    ip: string;
    events: number;
    lastSeen: string;
    threatTypes: string[];
  }>;
  vulnerableEndpoints: Array<{
    endpoint: string;
    threats: number;
    lastThreat: string;
    threatTypes: string[];
  }>;
  recommendations: string[];
}

interface ThreatAnalysis {
  threatId: string;
  type: string;
  severity: string;
  description: string;
  payload: string;
  pattern: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  timestamp: string;
  fingerprint?: any;
  context: {
    similarThreats: number;
    ipReputation: 'clean' | 'suspicious' | 'malicious';
    geoLocation?: string;
    isKnownAttacker: boolean;
  };
}

// ============================================================================
// Security Analytics
// ============================================================================

export class SecurityAnalytics {
  /**
   * Generates security metrics for a time period
   */
  static generateMetrics(
    logs: SecurityLogEntry[],
    startTime: number,
    endTime: number
  ): SecurityMetrics {
    const filteredLogs = logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
    
    const totalRequests = filteredLogs.filter(log => 
      log.event === 'request_processed'
    ).length;
    
    const threatLogs = filteredLogs.filter(log => 
      log.event === 'security_threat_detected'
    );
    
    const blockedLogs = filteredLogs.filter(log => 
      ['blocked_ip_access', 'blocked_user_agent', 'request_too_large'].includes(log.event)
    );
    
    const authFailures = filteredLogs.filter(log => 
      log.event === 'authentication_failure'
    ).length;
    
    // Analyze threats by type
    const threatCounts: Record<string, { count: number; severity: string }> = {};
    threatLogs.forEach(log => {
      if (log.threat) {
        const key = log.threat.type;
        if (!threatCounts[key]) {
          threatCounts[key] = { count: 0, severity: log.threat.severity };
        }
        threatCounts[key].count++;
      }
    });
    
    const topThreats = Object.entries(threatCounts)
      .map(([type, data]) => ({ type, count: data.count, severity: data.severity }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Analyze by IP
    const ipCounts: Record<string, { requests: number; threats: number }> = {};
    filteredLogs.forEach(log => {
      if (!ipCounts[log.ip]) {
        ipCounts[log.ip] = { requests: 0, threats: 0 };
      }
      ipCounts[log.ip].requests++;
      if (log.threat) {
        ipCounts[log.ip].threats++;
      }
    });
    
    const topIPs = Object.entries(ipCounts)
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.threats - a.threats || b.requests - a.requests)
      .slice(0, 10);
    
    // Analyze by endpoint
    const endpointCounts: Record<string, { requests: number; threats: number }> = {};
    filteredLogs.forEach(log => {
      if (!endpointCounts[log.endpoint]) {
        endpointCounts[log.endpoint] = { requests: 0, threats: 0 };
      }
      endpointCounts[log.endpoint].requests++;
      if (log.threat) {
        endpointCounts[log.endpoint].threats++;
      }
    });
    
    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, data]) => ({ endpoint, ...data }))
      .sort((a, b) => b.threats - a.threats || b.requests - a.requests)
      .slice(0, 10);
    
    return {
      totalRequests,
      threatsDetected: threatLogs.length,
      blockedRequests: blockedLogs.length,
      authenticationFailures: authFailures,
      topThreats,
      topIPs,
      topEndpoints,
      timeRange: {
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString()
      }
    };
  }
  
  /**
   * Generates comprehensive security report
   */
  static generateSecurityReport(
    logs: SecurityLogEntry[],
    period: string = '24h'
  ): SecurityReport {
    const endTime = Date.now();
    const startTime = endTime - this.parsePeriod(period);
    
    const filteredLogs = logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
    
    const criticalEvents = filteredLogs.filter(log => log.level === 'critical').length;
    const highEvents = filteredLogs.filter(log => log.level === 'error').length;
    const mediumEvents = filteredLogs.filter(log => log.level === 'warn').length;
    const lowEvents = filteredLogs.filter(log => log.level === 'info').length;
    
    // Threat analysis
    const threatTypes = {
      sqlInjection: 0,
      xss: 0,
      pathTraversal: 0,
      commandInjection: 0,
      other: 0
    };
    
    filteredLogs.forEach(log => {
      if (log.threat) {
        switch (log.threat.type) {
          case 'sql-injection':
            threatTypes.sqlInjection++;
            break;
          case 'xss':
            threatTypes.xss++;
            break;
          case 'path-traversal':
            threatTypes.pathTraversal++;
            break;
          case 'command-injection':
            threatTypes.commandInjection++;
            break;
          default:
            threatTypes.other++;
        }
      }
    });
    
    // Top attackers analysis
    const attackerData: Record<string, {
      events: number;
      lastSeen: number;
      threatTypes: Set<string>;
    }> = {};
    
    filteredLogs.forEach(log => {
      if (log.threat) {
        if (!attackerData[log.ip]) {
          attackerData[log.ip] = {
            events: 0,
            lastSeen: 0,
            threatTypes: new Set()
          };
        }
        attackerData[log.ip].events++;
        attackerData[log.ip].lastSeen = Math.max(attackerData[log.ip].lastSeen, log.timestamp);
        attackerData[log.ip].threatTypes.add(log.threat.type);
      }
    });
    
    const topAttackers = Object.entries(attackerData)
      .map(([ip, data]) => ({
        ip,
        events: data.events,
        lastSeen: new Date(data.lastSeen).toISOString(),
        threatTypes: Array.from(data.threatTypes)
      }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 10);
    
    // Vulnerable endpoints analysis
    const endpointData: Record<string, {
      threats: number;
      lastThreat: number;
      threatTypes: Set<string>;
    }> = {};
    
    filteredLogs.forEach(log => {
      if (log.threat) {
        if (!endpointData[log.endpoint]) {
          endpointData[log.endpoint] = {
            threats: 0,
            lastThreat: 0,
            threatTypes: new Set()
          };
        }
        endpointData[log.endpoint].threats++;
        endpointData[log.endpoint].lastThreat = Math.max(endpointData[log.endpoint].lastThreat, log.timestamp);
        endpointData[log.endpoint].threatTypes.add(log.threat.type);
      }
    });
    
    const vulnerableEndpoints = Object.entries(endpointData)
      .map(([endpoint, data]) => ({
        endpoint,
        threats: data.threats,
        lastThreat: new Date(data.lastThreat).toISOString(),
        threatTypes: Array.from(data.threatTypes)
      }))
      .sort((a, b) => b.threats - a.threats)
      .slice(0, 10);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations({
      criticalEvents,
      highEvents,
      threatTypes,
      topAttackers,
      vulnerableEndpoints
    });
    
    return {
      summary: {
        period,
        totalEvents: filteredLogs.length,
        criticalEvents,
        highSeverityEvents: highEvents,
        mediumSeverityEvents: mediumEvents,
        lowSeverityEvents: lowEvents
      },
      threats: threatTypes,
      topAttackers,
      vulnerableEndpoints,
      recommendations
    };
  }
  
  /**
   * Analyzes a specific threat in detail
   */
  static analyzeThreat(log: SecurityLogEntry): ThreatAnalysis {
    if (!log.threat) {
      throw new Error('Log entry does not contain threat information');
    }
    
    // Get all logs to analyze context
    const allLogs = SecurityLogger.getRecentLogs(1000);
    
    // Count similar threats from same IP
    const similarThreats = allLogs.filter(l => 
      l.ip === log.ip && 
      l.threat?.type === log.threat?.type &&
      Math.abs(l.timestamp - log.timestamp) < 3600000 // Within 1 hour
    ).length;
    
    // Simple IP reputation check (in real implementation, use external service)
    const ipReputation = this.checkIPReputation(log.ip, allLogs);
    
    // Check if this is a known attacker
    const isKnownAttacker = allLogs.filter(l => 
      l.ip === log.ip && l.threat
    ).length > 5;
    
    return {
      threatId: `threat_${log.timestamp}_${log.ip.replace(/\./g, '_')}`,
      type: log.threat.type,
      severity: log.threat.severity,
      description: log.threat.description,
      payload: log.threat.payload,
      pattern: log.threat.pattern,
      ip: log.ip,
      userAgent: log.userAgent,
      endpoint: log.endpoint,
      timestamp: new Date(log.timestamp).toISOString(),
      fingerprint: log.fingerprint,
      context: {
        similarThreats,
        ipReputation,
        isKnownAttacker
      }
    };
  }
  
  /**
   * Parses period string to milliseconds
   */
  private static parsePeriod(period: string): number {
    const match = period.match(/^(\d+)([hd])$/);
    if (!match) {
      return 24 * 60 * 60 * 1000; // Default to 24 hours
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
  
  /**
   * Simple IP reputation check
   */
  private static checkIPReputation(ip: string, logs: SecurityLogEntry[]): 'clean' | 'suspicious' | 'malicious' {
    const ipLogs = logs.filter(l => l.ip === ip);
    const threatCount = ipLogs.filter(l => l.threat).length;
    const totalRequests = ipLogs.length;
    
    if (threatCount === 0) return 'clean';
    if (threatCount / totalRequests > 0.5) return 'malicious';
    if (threatCount > 3) return 'suspicious';
    return 'clean';
  }
  
  /**
   * Generates security recommendations
   */
  private static generateRecommendations(data: any): string[] {
    const recommendations: string[] = [];
    
    if (data.criticalEvents > 0) {
      recommendations.push('Critical security events detected. Immediate investigation required.');
    }
    
    if (data.threatTypes.sqlInjection > 0) {
      recommendations.push('SQL injection attempts detected. Review input validation and use parameterized queries.');
    }
    
    if (data.threatTypes.xss > 0) {
      recommendations.push('XSS attempts detected. Implement proper output encoding and CSP headers.');
    }
    
    if (data.topAttackers.length > 0) {
      recommendations.push(`Consider blocking IPs with repeated attacks: ${data.topAttackers.slice(0, 3).map((a: any) => a.ip).join(', ')}`);
    }
    
    if (data.vulnerableEndpoints.length > 0) {
      recommendations.push(`Review security for frequently targeted endpoints: ${data.vulnerableEndpoints.slice(0, 3).map((e: any) => e.endpoint).join(', ')}`);
    }
    
    return recommendations;
  }
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Gets security metrics
 */
async function getSecurityMetrics(req: VercelRequest, res: VercelResponse) {
  const period = (req.query.period as string) || '24h';
  const endTime = Date.now();
  const startTime = endTime - SecurityAnalytics['parsePeriod'](period);
  
  try {
    const logs = SecurityLogger.getRecentLogs(10000);
    const metrics = SecurityAnalytics.generateMetrics(logs, startTime, endTime);
    
    return res.status(200).json({
      success: true,
      data: metrics,
      metadata: {
        processingTime: Date.now() - endTime,
        timestamp: Math.floor(Date.now() / 1000)
      }
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate security metrics'
    });
  }
}

/**
 * Gets security report
 */
async function getSecurityReport(req: VercelRequest, res: VercelResponse) {
  const period = (req.query.period as string) || '24h';
  const format = (req.query.format as string) || 'json';
  
  try {
    const logs = SecurityLogger.getRecentLogs(10000);
    const report = SecurityAnalytics.generateSecurityReport(logs, period);
    
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        data: report,
        metadata: {
          processingTime: 1,
          timestamp: Math.floor(Date.now() / 1000)
        }
      });
    }
    
    // TODO: Implement other formats (PDF, CSV, etc.)
    return res.status(400).json({
      success: false,
      error: 'Unsupported Format',
      message: 'Only JSON format is currently supported'
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate security report'
    });
  }
}

/**
 * Gets recent security logs
 */
async function getSecurityLogs(req: VercelRequest, res: VercelResponse) {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
  const level = req.query.level as string;
  const ip = req.query.ip as string;
  
  try {
    let logs = SecurityLogger.getRecentLogs(limit * 2); // Get more to allow filtering
    
    // Apply filters
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    if (ip) {
      logs = logs.filter(log => log.ip === ip);
    }
    
    // Limit results
    logs = logs.slice(-limit);
    
    return res.status(200).json({
      success: true,
      data: {
        logs,
        total: logs.length,
        filters: { level, ip, limit }
      },
      metadata: {
        processingTime: 1,
        timestamp: Math.floor(Date.now() / 1000)
      }
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get security logs'
    });
  }
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method Not Allowed',
        message: 'Only GET method is allowed'
      });
    }
    
    try {
      const action = req.query.action as string;
      
      switch (action) {
        case 'metrics':
          return getSecurityMetrics(req, res);
          
        case 'report':
          return getSecurityReport(req, res);
          
        case 'logs':
          return getSecurityLogs(req, res);
          
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid Action',
            message: 'Valid actions: metrics, report, logs'
          });
      }
      
    } catch (error) {
      console.error('Security monitoring error:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to process security monitoring request'
      });
    }
  });
}

// ============================================================================
// Exports
// ============================================================================

// SecurityAnalytics already exported above
