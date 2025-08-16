/**
 * Enhanced Audit Logger
 * Comprehensive audit logging with compliance, security monitoring, and forensic capabilities
 */

export interface AuditEvent {
  id: string;
  timestamp: number;
  userId: string;
  sessionId: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  endpoint: string;
  ipAddress: string;
  userAgent: string;
  duration: number;
  status: 'success' | 'failure' | 'error' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'authentication'
    | 'authorization'
    | 'data_access'
    | 'data_modification'
    | 'system_admin'
    | 'security';
  details: {
    requestBody?: any;
    responseStatus: number;
    errorMessage?: string;
    changes?: {
      before: any;
      after: any;
      fields: string[];
    };
    validation?: {
      passed: boolean;
      errors: string[];
    };
  };
  context: {
    correlationId: string;
    traceId: string;
    parentSpanId?: string;
    riskScore: number;
    flags: string[];
    location?: {
      country: string;
      region: string;
      city: string;
      timezone: string;
    };
    device?: {
      type: string;
      os: string;
      browser: string;
      fingerprint: string;
    };
  };
  compliance: {
    regulations: string[]; // GDPR, SOX, HIPAA, etc.
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    retentionPeriod: number; // in days
    encryptionRequired: boolean;
  };
  metadata: {
    version: string;
    source: string;
    tags: string[];
    customFields: Record<string, any>;
  };
}

export interface AuditQuery {
  userId?: string;
  sessionId?: string;
  action?: string;
  resource?: string;
  category?: string;
  severity?: string;
  status?: string;
  timeRange?: { start: number; end: number };
  ipAddress?: string;
  correlationId?: string;
  riskScore?: { min: number; max: number };
  flags?: string[];
  regulations?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditAnalytics {
  summary: {
    totalEvents: number;
    timeRange: { start: number; end: number };
    uniqueUsers: number;
    uniqueIPs: number;
    successRate: number;
    averageRiskScore: number;
  };
  breakdown: {
    byAction: Record<string, number>;
    byResource: Record<string, number>;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    byUser: Record<string, number>;
    byIP: Record<string, number>;
    byHour: Record<string, number>;
  };
  trends: {
    hourly: Array<{ hour: number; count: number; riskScore: number }>;
    daily: Array<{ date: string; count: number; riskScore: number }>;
    weekly: Array<{ week: string; count: number; riskScore: number }>;
  };
  anomalies: Array<{
    type: string;
    description: string;
    severity: string;
    timestamp: number;
    affectedEvents: string[];
    riskScore: number;
  }>;
  compliance: {
    byRegulation: Record<string, number>;
    retentionStatus: {
      active: number;
      nearExpiry: number;
      expired: number;
    };
    encryptionStatus: {
      encrypted: number;
      unencrypted: number;
    };
  };
}

/**
 * Enhanced Audit Logger
 */
export class EnhancedAuditLogger {
  private static instance: EnhancedAuditLogger;
  private events: AuditEvent[] = [];
  private maxEvents: number = 100000;

  private complianceRules = new Map<string, any>();
  private anomalyDetectors = new Map<string, (events: AuditEvent[]) => any[]>();

  constructor() {
    this.initializeComplianceRules();
    this.initializeAnomalyDetectors();
    this.startMaintenanceTasks();
  }

  static getInstance(): EnhancedAuditLogger {
    if (!EnhancedAuditLogger.instance) {
      EnhancedAuditLogger.instance = new EnhancedAuditLogger();
    }
    return EnhancedAuditLogger.instance;
  }

  /**
   * Log audit event
   */
  logEvent(
    event: Omit<AuditEvent, 'id' | 'timestamp' | 'context' | 'compliance' | 'metadata'>
  ): void {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      context: {
        correlationId: this.generateCorrelationId(),
        traceId: this.generateTraceId(),
        riskScore: this.calculateRiskScore(event),
        flags: this.generateFlags(event),
      },
      compliance: this.determineCompliance(event),
      metadata: {
        version: '1.0.0',
        source: 'enhanced-audit-logger',
        tags: this.generateTags(event),
        customFields: {},
      },
    };

    // Encrypt sensitive data if required
    if (auditEvent.compliance.encryptionRequired) {
      auditEvent.details = this.encryptSensitiveData(auditEvent.details);
    }

    this.events.push(auditEvent);

    // Maintain event limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Real-time anomaly detection
    this.detectAnomalies([auditEvent]);

    // Output to console in development
    if (process.env.NODE_ENV === 'development') {
      this.outputToConsole(auditEvent);
    }
  }

  /**
   * Query audit events
   */
  queryEvents(query: AuditQuery = {}): { events: AuditEvent[]; total: number } {
    let filteredEvents = [...this.events];

    // Apply filters
    if (query.userId) {
      filteredEvents = filteredEvents.filter(e => e.userId === query.userId);
    }

    if (query.sessionId) {
      filteredEvents = filteredEvents.filter(e => e.sessionId === query.sessionId);
    }

    if (query.action) {
      filteredEvents = filteredEvents.filter(e => e.action.includes(query.action!));
    }

    if (query.resource) {
      filteredEvents = filteredEvents.filter(e => e.resource === query.resource);
    }

    if (query.category) {
      filteredEvents = filteredEvents.filter(e => e.category === query.category);
    }

    if (query.severity) {
      filteredEvents = filteredEvents.filter(e => e.severity === query.severity);
    }

    if (query.status) {
      filteredEvents = filteredEvents.filter(e => e.status === query.status);
    }

    if (query.timeRange) {
      filteredEvents = filteredEvents.filter(
        e => e.timestamp >= query.timeRange!.start && e.timestamp <= query.timeRange!.end
      );
    }

    if (query.ipAddress) {
      filteredEvents = filteredEvents.filter(e => e.ipAddress === query.ipAddress);
    }

    if (query.correlationId) {
      filteredEvents = filteredEvents.filter(e => e.context.correlationId === query.correlationId);
    }

    if (query.riskScore) {
      filteredEvents = filteredEvents.filter(
        e =>
          e.context.riskScore >= query.riskScore!.min && e.context.riskScore <= query.riskScore!.max
      );
    }

    if (query.flags && query.flags.length > 0) {
      filteredEvents = filteredEvents.filter(e =>
        query.flags!.some(flag => e.context.flags.includes(flag))
      );
    }

    if (query.regulations && query.regulations.length > 0) {
      filteredEvents = filteredEvents.filter(e =>
        query.regulations!.some(reg => e.compliance.regulations.includes(reg))
      );
    }

    const total = filteredEvents.length;

    // Apply sorting
    if (query.sortBy) {
      filteredEvents.sort((a, b) => {
        const aVal = this.getNestedValue(a, query.sortBy!);
        const bVal = this.getNestedValue(b, query.sortBy!);
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return query.sortOrder === 'desc' ? -comparison : comparison;
      });
    } else {
      // Default sort by timestamp (newest first)
      filteredEvents.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    filteredEvents = filteredEvents.slice(offset, offset + limit);

    return { events: filteredEvents, total };
  }

  /**
   * Generate audit analytics
   */
  generateAnalytics(timeRange?: { start: number; end: number }): AuditAnalytics {
    let events = this.events;

    if (timeRange) {
      events = events.filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end);
    }

    const summary = this.generateSummary(events, timeRange);
    const breakdown = this.generateBreakdown(events);
    const trends = this.generateTrends(events);
    const anomalies = this.detectAnomalies(events);
    const compliance = this.generateComplianceAnalytics(events);

    return {
      summary,
      breakdown,
      trends,
      anomalies,
      compliance,
    };
  }

  /**
   * Export audit events for compliance
   */
  exportEvents(query: AuditQuery = {}, format: 'json' | 'csv' | 'xml' = 'json'): string {
    const { events } = this.queryEvents(query);

    switch (format) {
      case 'csv':
        return this.exportToCSV(events);
      case 'xml':
        return this.exportToXML(events);
      default:
        return JSON.stringify(events, null, 2);
    }
  }

  /**
   * Risk score calculation
   */
  private calculateRiskScore(event: any): number {
    let score = 0;

    // Base score by action type
    const actionScores: Record<string, number> = {
      login: 2,
      logout: 1,
      create: 3,
      update: 4,
      delete: 6,
      admin_access: 7,
      permission_change: 8,
      system_config: 9,
      data_export: 5,
    };

    score += actionScores[event.action] || 3;

    // Increase score for failures
    if (event.status === 'failure' || event.status === 'error') {
      score += 3;
    }

    // Increase score for sensitive resources
    const sensitiveResources = ['users', 'admin', 'config', 'security', 'audit'];
    if (sensitiveResources.some(resource => event.resource.includes(resource))) {
      score += 2;
    }

    // Increase score for unusual times (outside business hours)
    const hour = new Date(event.timestamp || Date.now()).getHours();
    if (hour < 6 || hour > 22) {
      score += 2;
    }

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Generate flags for event
   */
  private generateFlags(event: any): string[] {
    const flags: string[] = [];

    if (event.status === 'failure') {
      flags.push('failed_operation');
    }

    if (event.duration > 5000) {
      flags.push('slow_operation');
    }

    const sensitiveActions = ['delete', 'admin_access', 'permission_change'];
    if (sensitiveActions.includes(event.action)) {
      flags.push('sensitive_operation');
    }

    if (event.method === 'DELETE') {
      flags.push('destructive_operation');
    }

    return flags;
  }

  /**
   * Determine compliance requirements
   */
  private determineCompliance(event: any): AuditEvent['compliance'] {
    const regulations: string[] = [];
    let dataClassification: 'public' | 'internal' | 'confidential' | 'restricted' = 'internal';
    let retentionPeriod = 365; // days
    let encryptionRequired = false;

    // GDPR compliance for user data
    if (event.resource === 'users' || event.action.includes('personal')) {
      regulations.push('GDPR');
      dataClassification = 'confidential';
      retentionPeriod = 2555; // 7 years
      encryptionRequired = true;
    }

    // SOX compliance for financial data
    if (event.resource.includes('financial') || event.action.includes('payment')) {
      regulations.push('SOX');
      dataClassification = 'restricted';
      retentionPeriod = 2555; // 7 years
      encryptionRequired = true;
    }

    // HIPAA compliance for health data
    if (event.resource.includes('health') || event.action.includes('medical')) {
      regulations.push('HIPAA');
      dataClassification = 'restricted';
      retentionPeriod = 2190; // 6 years
      encryptionRequired = true;
    }

    // Admin actions require higher security
    if (event.category === 'system_admin' || event.action.includes('admin')) {
      dataClassification = 'confidential';
      encryptionRequired = true;
    }

    return {
      regulations,
      dataClassification,
      retentionPeriod,
      encryptionRequired,
    };
  }

  /**
   * Generate tags for event
   */
  private generateTags(event: any): string[] {
    const tags: string[] = [];

    tags.push(`action:${event.action}`);
    tags.push(`resource:${event.resource}`);
    tags.push(`status:${event.status}`);
    tags.push(`method:${event.method}`);

    if (event.userId) {
      tags.push(`user:${event.userId}`);
    }

    return tags;
  }

  /**
   * Analytics generation methods
   */
  private generateSummary(
    events: AuditEvent[],
    timeRange?: { start: number; end: number }
  ): AuditAnalytics['summary'] {
    const uniqueUsers = new Set(events.map(e => e.userId)).size;
    const uniqueIPs = new Set(events.map(e => e.ipAddress)).size;
    const successfulEvents = events.filter(e => e.status === 'success').length;
    const successRate = events.length > 0 ? (successfulEvents / events.length) * 100 : 0;
    const averageRiskScore =
      events.length > 0
        ? events.reduce((sum, e) => sum + e.context.riskScore, 0) / events.length
        : 0;

    return {
      totalEvents: events.length,
      timeRange: timeRange || { start: 0, end: Date.now() },
      uniqueUsers,
      uniqueIPs,
      successRate,
      averageRiskScore,
    };
  }

  private generateBreakdown(events: AuditEvent[]): AuditAnalytics['breakdown'] {
    const breakdown: AuditAnalytics['breakdown'] = {
      byAction: {},
      byResource: {},
      byCategory: {},
      bySeverity: {},
      byStatus: {},
      byUser: {},
      byIP: {},
      byHour: {},
    };

    events.forEach(event => {
      // Count by various dimensions
      breakdown.byAction[event.action] = (breakdown.byAction[event.action] || 0) + 1;
      breakdown.byResource[event.resource] = (breakdown.byResource[event.resource] || 0) + 1;
      breakdown.byCategory[event.category] = (breakdown.byCategory[event.category] || 0) + 1;
      breakdown.bySeverity[event.severity] = (breakdown.bySeverity[event.severity] || 0) + 1;
      breakdown.byStatus[event.status] = (breakdown.byStatus[event.status] || 0) + 1;
      breakdown.byUser[event.userId] = (breakdown.byUser[event.userId] || 0) + 1;
      breakdown.byIP[event.ipAddress] = (breakdown.byIP[event.ipAddress] || 0) + 1;

      const hour = new Date(event.timestamp).getHours();
      breakdown.byHour[hour] = (breakdown.byHour[hour] || 0) + 1;
    });

    return breakdown;
  }

  private generateTrends(events: AuditEvent[]): AuditAnalytics['trends'] {
    const hourly: Array<{ hour: number; count: number; riskScore: number }> = [];
    const daily: Array<{ date: string; count: number; riskScore: number }> = [];
    const weekly: Array<{ week: string; count: number; riskScore: number }> = [];

    // Group events by time periods
    const hourlyGroups = new Map<number, AuditEvent[]>();
    const dailyGroups = new Map<string, AuditEvent[]>();
    const weeklyGroups = new Map<string, AuditEvent[]>();

    events.forEach(event => {
      const date = new Date(event.timestamp);
      const hour = date.getHours();
      const dayKey = date.toISOString().split('T')[0] || date.toDateString();
      const weekKey = this.getWeekKey(date) || date.toDateString();

      // Group by hour
      if (!hourlyGroups.has(hour)) hourlyGroups.set(hour, []);
      hourlyGroups.get(hour)!.push(event);

      // Group by day
      if (!dailyGroups.has(dayKey)) dailyGroups.set(dayKey, []);
      dailyGroups.get(dayKey)!.push(event);

      // Group by week
      if (!weeklyGroups.has(weekKey)) weeklyGroups.set(weekKey, []);
      weeklyGroups.get(weekKey)!.push(event);
    });

    // Calculate trends
    hourlyGroups.forEach((groupEvents, hour) => {
      const avgRiskScore =
        groupEvents.reduce((sum, e) => sum + e.context.riskScore, 0) / groupEvents.length;
      hourly.push({ hour, count: groupEvents.length, riskScore: avgRiskScore });
    });

    dailyGroups.forEach((groupEvents, date) => {
      const avgRiskScore =
        groupEvents.reduce((sum, e) => sum + e.context.riskScore, 0) / groupEvents.length;
      daily.push({ date, count: groupEvents.length, riskScore: avgRiskScore });
    });

    weeklyGroups.forEach((groupEvents, week) => {
      const avgRiskScore =
        groupEvents.reduce((sum, e) => sum + e.context.riskScore, 0) / groupEvents.length;
      weekly.push({ week, count: groupEvents.length, riskScore: avgRiskScore });
    });

    return { hourly, daily, weekly };
  }

  private generateComplianceAnalytics(events: AuditEvent[]): AuditAnalytics['compliance'] {
    const byRegulation: Record<string, number> = {};
    let active = 0,
      nearExpiry = 0,
      expired = 0;
    let encrypted = 0,
      unencrypted = 0;

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    events.forEach(event => {
      // Count by regulation
      event.compliance.regulations.forEach(reg => {
        byRegulation[reg] = (byRegulation[reg] || 0) + 1;
      });

      // Check retention status
      const expiryTime = event.timestamp + event.compliance.retentionPeriod * 24 * 60 * 60 * 1000;
      if (expiryTime < now) {
        expired++;
      } else if (expiryTime < now + thirtyDaysMs) {
        nearExpiry++;
      } else {
        active++;
      }

      // Check encryption status
      if (event.compliance.encryptionRequired) {
        encrypted++;
      } else {
        unencrypted++;
      }
    });

    return {
      byRegulation,
      retentionStatus: { active, nearExpiry, expired },
      encryptionStatus: { encrypted, unencrypted },
    };
  }

  /**
   * Anomaly detection
   */
  private detectAnomalies(events: AuditEvent[]): any[] {
    const anomalies: any[] = [];

    // Run all registered anomaly detectors
    for (const [name, detector] of this.anomalyDetectors.entries()) {
      try {
        const detected = detector(events);
        anomalies.push(...detected.map(anomaly => ({ ...anomaly, detector: name })));
      } catch (error) {
        console.error(`Anomaly detector ${name} failed:`, error);
      }
    }

    return anomalies;
  }

  /**
   * Initialize compliance rules
   */
  private initializeComplianceRules(): void {
    // GDPR rules
    this.complianceRules.set('GDPR', {
      retentionPeriod: 2555, // 7 years
      encryptionRequired: true,
      applicableResources: ['users', 'personal_data'],
      requiredFields: ['userId', 'action', 'timestamp'],
    });

    // SOX rules
    this.complianceRules.set('SOX', {
      retentionPeriod: 2555, // 7 years
      encryptionRequired: true,
      applicableResources: ['financial', 'accounting'],
      requiredFields: ['userId', 'action', 'timestamp', 'changes'],
    });
  }

  /**
   * Initialize anomaly detectors
   */
  private initializeAnomalyDetectors(): void {
    // Failed login attempts detector
    this.anomalyDetectors.set('failed_logins', (events: AuditEvent[]) => {
      const recentFailures = events.filter(
        e => e.action === 'login' && e.status === 'failure' && Date.now() - e.timestamp < 60000 // Last minute
      );

      if (recentFailures.length >= 5) {
        return [
          {
            type: 'suspicious_login_activity',
            description: `${recentFailures.length} failed login attempts in the last minute`,
            severity: 'high',
            timestamp: Date.now(),
            affectedEvents: recentFailures.map(e => e.id),
            riskScore: 8,
          },
        ];
      }

      return [];
    });

    // Unusual activity hours detector
    this.anomalyDetectors.set('unusual_hours', (events: AuditEvent[]) => {
      const recentEvents = events.filter(e => Date.now() - e.timestamp < 60000);
      const unusualHourEvents = recentEvents.filter(e => {
        const hour = new Date(e.timestamp).getHours();
        return hour < 6 || hour > 22;
      });

      if (unusualHourEvents.length >= 3) {
        return [
          {
            type: 'unusual_activity_hours',
            description: `${unusualHourEvents.length} events during unusual hours`,
            severity: 'medium',
            timestamp: Date.now(),
            affectedEvents: unusualHourEvents.map(e => e.id),
            riskScore: 6,
          },
        ];
      }

      return [];
    });
  }

  /**
   * Utility methods
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = Math.ceil(
      (date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private encryptSensitiveData(data: any): any {
    // Simple encryption placeholder - use proper encryption in production
    return { ...data, encrypted: true };
  }

  private outputToConsole(event: AuditEvent): void {
    const severity = event.severity.toUpperCase();
    const riskScore = event.context.riskScore;
    console.log(
      `[AUDIT:${severity}] ${event.action} on ${event.resource} by ${event.userId} (Risk: ${riskScore})`
    );
  }

  private exportToCSV(events: AuditEvent[]): string {
    const headers = [
      'id',
      'timestamp',
      'userId',
      'action',
      'resource',
      'status',
      'ipAddress',
      'riskScore',
    ];
    const rows = events.map(event => [
      event.id,
      new Date(event.timestamp).toISOString(),
      event.userId,
      event.action,
      event.resource,
      event.status,
      event.ipAddress,
      event.context.riskScore,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToXML(events: AuditEvent[]): string {
    const xmlEvents = events
      .map(
        event => `
      <event>
        <id>${event.id}</id>
        <timestamp>${new Date(event.timestamp).toISOString()}</timestamp>
        <userId>${event.userId}</userId>
        <action>${event.action}</action>
        <resource>${event.resource}</resource>
        <status>${event.status}</status>
        <ipAddress>${event.ipAddress}</ipAddress>
        <riskScore>${event.context.riskScore}</riskScore>
      </event>
    `
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?><auditEvents>${xmlEvents}</auditEvents>`;
  }

  private startMaintenanceTasks(): void {
    // Clean up expired events every hour
    setInterval(
      () => {
        const now = Date.now();
        this.events = this.events.filter(event => {
          const expiryTime =
            event.timestamp + event.compliance.retentionPeriod * 24 * 60 * 60 * 1000;
          return expiryTime > now;
        });
      },
      60 * 60 * 1000
    );
  }

  /**
   * Public methods for management
   */
  getEventCount(): number {
    return this.events.length;
  }

  getComplianceRules(): Map<string, any> {
    return new Map(this.complianceRules);
  }

  addComplianceRule(name: string, rule: any): void {
    this.complianceRules.set(name, rule);
  }

  addAnomalyDetector(name: string, detector: (events: AuditEvent[]) => any[]): void {
    this.anomalyDetectors.set(name, detector);
  }

  clearEvents(): void {
    this.events = [];
  }

  setMaxEvents(max: number): void {
    this.maxEvents = max;
    if (this.events.length > max) {
      this.events = this.events.slice(-max);
    }
  }
}

export default EnhancedAuditLogger;
