/**
 * Enhanced Security Logger
 * Advanced security event logging with structured data, filtering, and analysis
 */

import { SecurityThreat, SecurityEventType, ThreatSeverity } from './security-policy-manager';

export type SecurityLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface SecurityLogEntry {
  id: string;
  timestamp: number;
  level: SecurityLogLevel;
  event: SecurityEventType;
  message: string;
  
  // Request context
  request: {
    ip: string;
    method: string;
    url: string;
    userAgent?: string;
    headers: Record<string, string>;
    size: number;
  };
  
  // Security context
  security: {
    threat?: SecurityThreat;
    blocked: boolean;
    action: 'allow' | 'block' | 'throttle' | 'challenge' | 'monitor';
    reason?: string;
    policyLevel: string;
  };
  
  // Performance context
  performance: {
    processingTime: number;
    detectionTime?: number;
    responseTime?: number;
  };
  
  // Additional metadata
  metadata: Record<string, unknown>;
  
  // Correlation
  correlationId?: string;
  sessionId?: string;
  userId?: string;
}

export interface SecurityLogFilter {
  level?: SecurityLogLevel[];
  event?: SecurityEventType[];
  severity?: ThreatSeverity[];
  blocked?: boolean;
  timeRange?: {
    start: number;
    end: number;
  };
  ip?: string;
  endpoint?: string;
  limit?: number;
  offset?: number;
}

export interface SecurityLogStats {
  totalLogs: number;
  logsByLevel: Record<SecurityLogLevel, number>;
  logsByEvent: Record<SecurityEventType, number>;
  logsBySeverity: Record<ThreatSeverity, number>;
  blockedRequests: number;
  allowedRequests: number;
  averageProcessingTime: number;
  topIPs: Array<{ ip: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  timeRange: {
    earliest: number;
    latest: number;
  };
}

/**
 * Enhanced Security Logger
 */
export class EnhancedSecurityLogger {
  private logs: SecurityLogEntry[] = [];
  private maxLogs: number;
  private retentionPeriod: number;
  private cleanupInterval: ReturnType<typeof setInterval>;
  private logLevel: SecurityLogLevel;
  private enabledEvents: Set<SecurityEventType>;

  constructor(config: {
    maxLogs?: number;
    retentionPeriod?: number;
    logLevel?: SecurityLogLevel;
    enabledEvents?: SecurityEventType[];
  } = {}) {
    this.maxLogs = config.maxLogs || 10000;
    this.retentionPeriod = config.retentionPeriod || 7 * 24 * 60 * 60 * 1000; // 7 days
    this.logLevel = config.logLevel || 'info';
    this.enabledEvents = new Set(config.enabledEvents || [
      'suspicious_request',
      'rate_limit_exceeded',
      'invalid_input',
      'unauthorized_access',
      'malicious_payload',
      'bot_detected',
      'geo_blocked',
      'ip_blocked',
      'pattern_matched'
    ]);

    // Start cleanup interval (every hour)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 3600000);
  }

  /**
   * Log a security event
   */
  log(entry: Omit<SecurityLogEntry, 'id' | 'timestamp'>): void {
    // Check if event type is enabled
    if (!this.enabledEvents.has(entry.event)) {
      return;
    }

    // Check log level
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const logEntry: SecurityLogEntry = {
      ...entry,
      id: this.generateLogId(),
      timestamp: Date.now(),
    };

    this.logs.push(logEntry);

    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Output to console in development
    if (process.env.NODE_ENV === 'development') {
      this.outputToConsole(logEntry);
    }
  }

  /**
   * Log a security threat
   */
  logThreat(threat: SecurityThreat, request: {
    ip: string;
    method: string;
    url: string;
    userAgent?: string;
    headers: Record<string, string>;
    size: number;
  }, action: 'allow' | 'block' | 'throttle' | 'challenge' | 'monitor', processingTime: number): void {
    const level = this.severityToLogLevel(threat.severity);
    
    this.log({
      level,
      event: threat.type,
      message: threat.description,
      request,
      security: {
        threat,
        blocked: action === 'block',
        action,
        reason: threat.mitigation?.reason,
        policyLevel: 'standard', // This should come from the policy manager
      },
      performance: {
        processingTime,
        detectionTime: processingTime,
      },
      metadata: {
        threatId: threat.id,
        confidence: threat.confidence,
        pattern: threat.pattern,
      },
      correlationId: threat.id,
    });
  }

  /**
   * Log a blocked request
   */
  logBlocked(request: {
    ip: string;
    method: string;
    url: string;
    userAgent?: string;
    headers: Record<string, string>;
    size: number;
  }, reason: string, processingTime: number): void {
    this.log({
      level: 'warn',
      event: 'ip_blocked',
      message: `Request blocked: ${reason}`,
      request,
      security: {
        blocked: true,
        action: 'block',
        reason,
        policyLevel: 'standard',
      },
      performance: {
        processingTime,
      },
      metadata: {
        blockReason: reason,
      },
    });
  }

  /**
   * Log suspicious activity
   */
  logSuspicious(request: {
    ip: string;
    method: string;
    url: string;
    userAgent?: string;
    headers: Record<string, string>;
    size: number;
  }, reason: string, severity: ThreatSeverity = 'medium', processingTime: number): void {
    this.log({
      level: this.severityToLogLevel(severity),
      event: 'suspicious_request',
      message: `Suspicious activity detected: ${reason}`,
      request,
      security: {
        blocked: false,
        action: 'monitor',
        reason,
        policyLevel: 'standard',
      },
      performance: {
        processingTime,
      },
      metadata: {
        suspiciousReason: reason,
        severity,
      },
    });
  }

  /**
   * Get logs with filtering
   */
  getLogs(filter: SecurityLogFilter = {}): SecurityLogEntry[] {
    let filteredLogs = [...this.logs];

    // Filter by level
    if (filter.level && filter.level.length > 0) {
      filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level));
    }

    // Filter by event type
    if (filter.event && filter.event.length > 0) {
      filteredLogs = filteredLogs.filter(log => filter.event!.includes(log.event));
    }

    // Filter by severity
    if (filter.severity && filter.severity.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        log.security.threat && filter.severity!.includes(log.security.threat.severity)
      );
    }

    // Filter by blocked status
    if (filter.blocked !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.security.blocked === filter.blocked);
    }

    // Filter by time range
    if (filter.timeRange) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= filter.timeRange!.start && log.timestamp <= filter.timeRange!.end
      );
    }

    // Filter by IP
    if (filter.ip) {
      filteredLogs = filteredLogs.filter(log => log.request.ip === filter.ip);
    }

    // Filter by endpoint
    if (filter.endpoint) {
      filteredLogs = filteredLogs.filter(log => log.request.url.includes(filter.endpoint!));
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    
    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * Get security log statistics
   */
  getStats(timeRange?: { start: number; end: number }): SecurityLogStats {
    let logs = this.logs;
    
    if (timeRange) {
      logs = logs.filter(log => 
        log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }

    const stats: SecurityLogStats = {
      totalLogs: logs.length,
      logsByLevel: {} as Record<SecurityLogLevel, number>,
      logsByEvent: {} as Record<SecurityEventType, number>,
      logsBySeverity: {} as Record<ThreatSeverity, number>,
      blockedRequests: 0,
      allowedRequests: 0,
      averageProcessingTime: 0,
      topIPs: [],
      topEndpoints: [],
      timeRange: {
        earliest: logs.length > 0 ? Math.min(...logs.map(l => l.timestamp)) : 0,
        latest: logs.length > 0 ? Math.max(...logs.map(l => l.timestamp)) : 0,
      },
    };

    // Count by level
    const levelCounts = new Map<SecurityLogLevel, number>();
    const eventCounts = new Map<SecurityEventType, number>();
    const severityCounts = new Map<ThreatSeverity, number>();
    const ipCounts = new Map<string, number>();
    const endpointCounts = new Map<string, number>();
    let totalProcessingTime = 0;

    logs.forEach(log => {
      // Level counts
      levelCounts.set(log.level, (levelCounts.get(log.level) || 0) + 1);
      
      // Event counts
      eventCounts.set(log.event, (eventCounts.get(log.event) || 0) + 1);
      
      // Severity counts
      if (log.security.threat) {
        severityCounts.set(log.security.threat.severity, 
          (severityCounts.get(log.security.threat.severity) || 0) + 1);
      }
      
      // Blocked/allowed counts
      if (log.security.blocked) {
        stats.blockedRequests++;
      } else {
        stats.allowedRequests++;
      }
      
      // IP counts
      ipCounts.set(log.request.ip, (ipCounts.get(log.request.ip) || 0) + 1);
      
      // Endpoint counts
      endpointCounts.set(log.request.url, (endpointCounts.get(log.request.url) || 0) + 1);
      
      // Processing time
      totalProcessingTime += log.performance.processingTime;
    });

    // Convert maps to objects
    stats.logsByLevel = Object.fromEntries(levelCounts) as Record<SecurityLogLevel, number>;
    stats.logsByEvent = Object.fromEntries(eventCounts) as Record<SecurityEventType, number>;
    stats.logsBySeverity = Object.fromEntries(severityCounts) as Record<ThreatSeverity, number>;

    // Calculate average processing time
    stats.averageProcessingTime = logs.length > 0 ? totalProcessingTime / logs.length : 0;

    // Top IPs
    stats.topIPs = Array.from(ipCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // Top endpoints
    stats.topEndpoints = Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return stats;
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  export(filter: SecurityLogFilter = {}): string {
    const logs = this.getLogs(filter);
    return JSON.stringify({
      exportTime: Date.now(),
      totalLogs: logs.length,
      logs,
    }, null, 2);
  }

  /**
   * Update configuration
   */
  updateConfig(config: {
    maxLogs?: number;
    retentionPeriod?: number;
    logLevel?: SecurityLogLevel;
    enabledEvents?: SecurityEventType[];
  }): void {
    if (config.maxLogs !== undefined) {
      this.maxLogs = config.maxLogs;
      // Trim logs if necessary
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
    }

    if (config.retentionPeriod !== undefined) {
      this.retentionPeriod = config.retentionPeriod;
    }

    if (config.logLevel !== undefined) {
      this.logLevel = config.logLevel;
    }

    if (config.enabledEvents !== undefined) {
      this.enabledEvents = new Set(config.enabledEvents);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): {
    maxLogs: number;
    retentionPeriod: number;
    logLevel: SecurityLogLevel;
    enabledEvents: SecurityEventType[];
    currentLogCount: number;
  } {
    return {
      maxLogs: this.maxLogs,
      retentionPeriod: this.retentionPeriod,
      logLevel: this.logLevel,
      enabledEvents: Array.from(this.enabledEvents),
      currentLogCount: this.logs.length,
    };
  }

  /**
   * Check if should log based on level
   */
  private shouldLog(level: SecurityLogLevel): boolean {
    const levels: SecurityLogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const logLevelIndex = levels.indexOf(level);
    
    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Convert threat severity to log level
   */
  private severityToLogLevel(severity: ThreatSeverity): SecurityLogLevel {
    switch (severity) {
      case 'low':
        return 'info';
      case 'medium':
        return 'warn';
      case 'high':
        return 'error';
      case 'critical':
        return 'critical';
      default:
        return 'info';
    }
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Output log to console (development only)
   */
  private outputToConsole(entry: SecurityLogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(8);
    const message = `[${timestamp}] ${level} ${entry.event}: ${entry.message}`;
    
    switch (entry.level) {
      case 'debug':
        console.debug(message, entry);
        break;
      case 'info':
        console.info(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'error':
      case 'critical':
        console.error(message, entry.security.threat || entry.metadata);
        break;
    }
  }

  /**
   * Clean up old logs
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.retentionPeriod;
    
    this.logs = this.logs.filter(log => log.timestamp > cutoff);
  }

  /**
   * Destroy logger and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.logs = [];
  }
}

export default EnhancedSecurityLogger;
