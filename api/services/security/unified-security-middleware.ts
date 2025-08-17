/**
 * Unified Security Middleware
 * Comprehensive security middleware that integrates policy management, threat detection, and logging
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { EnhancedSecurityLogger } from './enhanced-security-logger';
import {
  SecurityPolicyLevel,
  SecurityPolicyManager,
  SecurityThreat,
} from './security-policy-manager';
import { ThreatDetectionEngine } from './threat-detection-engine';

export interface SecurityMiddlewareConfig {
  policyLevel?: SecurityPolicyLevel;
  enableThreatDetection?: boolean;
  enableLogging?: boolean;
  enableRealTimeBlocking?: boolean;
  customPolicyConfig?: any;
  loggerConfig?: {
    maxLogs?: number;
    retentionPeriod?: number;
    logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  };
}

export interface SecurityContext {
  ip: string;
  userAgent?: string;
  country?: string;
  asn?: string;
  fingerprint: string;
  requestId: string;
  timestamp: number;
}

export interface SecurityResult {
  allowed: boolean;
  action: 'allow' | 'block' | 'throttle' | 'challenge' | 'monitor';
  threats: SecurityThreat[];
  processingTime: number;
  reason?: string;
  metadata: Record<string, unknown>;
}

/**
 * Unified Security Middleware
 */
export class UnifiedSecurityMiddleware {
  private policyManager: SecurityPolicyManager;
  private threatDetectionEngine: ThreatDetectionEngine;
  private securityLogger: EnhancedSecurityLogger;
  private config: SecurityMiddlewareConfig;
  private blockedIPs = new Set<string>();
  private throttledIPs = new Map<string, { until: number; count: number }>();

  constructor(config: SecurityMiddlewareConfig = {}) {
    this.config = {
      policyLevel: 'standard',
      enableThreatDetection: true,
      enableLogging: true,
      enableRealTimeBlocking: true,
      ...config,
    };

    // Initialize components
    this.policyManager = new SecurityPolicyManager(this.config.policyLevel);
    this.threatDetectionEngine = new ThreatDetectionEngine();
    this.securityLogger = new EnhancedSecurityLogger(this.config.loggerConfig);

    // Apply custom policy if provided
    if (this.config.customPolicyConfig) {
      this.policyManager.applyCustomPolicy(this.config.customPolicyConfig);
    }
  }

  /**
   * Create middleware function
   */
  createMiddleware() {
    return async (req: VercelRequest, res: VercelResponse, next?: () => void): Promise<void> => {
      const startTime = Date.now();
      const context = this.createSecurityContext(req);

      try {
        const result = await this.processRequest(req, context);

        // Log the security result
        if (this.config.enableLogging) {
          this.logSecurityResult(req, context, result);
        }

        // Handle security result
        if (!result.allowed) {
          this.handleBlockedRequest(req, res, result);
          return;
        }

        // Add security headers to response
        this.addSecurityHeaders(res, result);

        // Continue to next middleware
        if (next) {
          next();
        }
      } catch (error) {
        console.error('Security middleware error:', error);

        // Log error
        if (this.config.enableLogging) {
          this.securityLogger.log({
            level: 'error',
            event: 'suspicious_request',
            message: `Security middleware error: ${error}`,
            request: this.extractRequestInfo(req),
            security: {
              blocked: false,
              action: 'allow',
              reason: 'Security middleware error',
              policyLevel: this.policyManager.getCurrentPolicy().level,
            },
            performance: {
              processingTime: Date.now() - startTime,
            },
            metadata: {
              error: (error as Error).message,
              stack: (error as Error).stack,
            },
          });
        }

        // Continue on error (fail open)
        if (next) {
          next();
        }
      }
    };
  }

  /**
   * Process security for a request
   */
  private async processRequest(
    req: VercelRequest,
    context: SecurityContext
  ): Promise<SecurityResult> {
    const startTime = Date.now();
    const policy = this.policyManager.getCurrentPolicy();
    // const _requestInfo = this.extractRequestInfo(req); // TODO: Use for enhanced logging

    // Check if IP is already blocked
    if (this.blockedIPs.has(context.ip)) {
      return {
        allowed: false,
        action: 'block',
        threats: [],
        processingTime: Date.now() - startTime,
        reason: 'IP address is blocked',
        metadata: { blockedIP: true },
      };
    }

    // Check if IP is throttled
    const throttleInfo = this.throttledIPs.get(context.ip);
    if (throttleInfo && Date.now() < throttleInfo.until) {
      return {
        allowed: false,
        action: 'throttle',
        threats: [],
        processingTime: Date.now() - startTime,
        reason: 'IP address is throttled',
        metadata: {
          throttled: true,
          throttleUntil: throttleInfo.until,
          throttleCount: throttleInfo.count,
        },
      };
    }

    // Policy-based request filtering
    const policyCheck = this.policyManager.shouldBlockRequest({
      ip: context.ip,
      userAgent: context.userAgent,
      method: req.method || 'GET',
      size: this.getRequestSize(req),
      country: context.country,
    });

    if (policyCheck.blocked) {
      return {
        allowed: false,
        action: 'block',
        threats: [],
        processingTime: Date.now() - startTime,
        reason: policyCheck.reason,
        metadata: { policyBlocked: true },
      };
    }

    // Input validation
    const inputValidation = this.validateInput(req, policy);
    if (!inputValidation.valid) {
      return {
        allowed: false,
        action: 'block',
        threats: [],
        processingTime: Date.now() - startTime,
        reason: `Input validation failed: ${inputValidation.violations.join(', ')}`,
        metadata: {
          inputValidationFailed: true,
          violations: inputValidation.violations,
        },
      };
    }

    // Threat detection
    let threats: SecurityThreat[] = [];
    if (this.config.enableThreatDetection && policy.threatDetection?.enabled) {
      threats = this.threatDetectionEngine.analyzeRequest(
        {
          ip: context.ip,
          method: req.method || 'GET',
          url: req.url || '',
          headers: req.headers as Record<string, string>,
          query: req.query,
          body: req.body,
          userAgent: context.userAgent,
          timestamp: context.timestamp,
        },
        policy
      );
    }

    // Determine action based on threats
    const action = this.determineAction(threats, policy);
    const allowed = action === 'allow' || action === 'monitor';

    // Apply real-time blocking if enabled
    if (this.config.enableRealTimeBlocking && !allowed) {
      this.applyRealTimeBlocking(context.ip, action, threats);
    }

    return {
      allowed,
      action,
      threats,
      processingTime: Date.now() - startTime,
      reason: threats.length > 0 ? threats[0]?.description : undefined,
      metadata: {
        threatsDetected: threats.length,
        policyLevel: policy.level,
        threatTypes: threats.map(t => t.type),
      },
    };
  }

  /**
   * Create security context from request
   */
  private createSecurityContext(req: VercelRequest): SecurityContext {
    const ip = this.extractClientIP(req);
    const userAgent = req.headers['user-agent'];

    return {
      ip,
      userAgent,
      fingerprint: this.generateFingerprint(req),
      requestId: this.generateRequestId(),
      timestamp: Date.now(),
    };
  }

  /**
   * Extract client IP address
   */
  private extractClientIP(req: VercelRequest): string {
    const ip: string =
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    return (ip || '127.0.0.1').split(',')[0]!.trim();
  }

  /**
   * Generate request fingerprint
   */
  private generateFingerprint(req: VercelRequest): string {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.headers['accept'] || '',
    ];

    return Buffer.from(components.join('|')).toString('base64').substr(0, 16);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract request information
   */
  private extractRequestInfo(req: VercelRequest) {
    return {
      ip: this.extractClientIP(req),
      method: req.method || 'GET',
      url: req.url || '',
      userAgent: req.headers['user-agent'],
      headers: req.headers as Record<string, string>,
      size: this.getRequestSize(req),
    };
  }

  /**
   * Get request size
   */
  private getRequestSize(req: VercelRequest): number {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      return parseInt(contentLength, 10);
    }

    // Estimate size from body if available
    if (req.body) {
      return JSON.stringify(req.body).length;
    }

    return 0;
  }

  /**
   * Validate input based on policy
   */
  private validateInput(req: VercelRequest, _policy: any) {
    // Combine query and body for validation
    const inputData = {
      ...req.query,
      ...(req.body || {}),
    };

    return this.policyManager.validateInput(inputData);
  }

  /**
   * Determine action based on threats
   */
  private determineAction(
    threats: SecurityThreat[],
    policy: any
  ): 'allow' | 'block' | 'throttle' | 'challenge' | 'monitor' {
    if (threats.length === 0) {
      return 'allow';
    }

    // Find highest severity threat
    const severities = { low: 1, medium: 2, high: 3, critical: 4 };
    const highestSeverity = Math.max(...threats.map(t => severities[t.severity]));

    // Determine action based on severity and policy
    if (highestSeverity >= 4) {
      // Critical
      return 'block';
    } else if (highestSeverity >= 3) {
      // High
      return policy.rateLimiting?.strictMode ? 'block' : 'throttle';
    } else if (highestSeverity >= 2) {
      // Medium
      return 'throttle';
    } else {
      // Low
      return 'monitor';
    }
  }

  /**
   * Apply real-time blocking
   */
  private applyRealTimeBlocking(ip: string, action: string, threats: SecurityThreat[]): void {
    if (action === 'block') {
      this.blockedIPs.add(ip);

      // Auto-unblock after some time based on threat severity
      const maxSeverity = Math.max(
        ...threats.map(t => ({ low: 1, medium: 2, high: 3, critical: 4 })[t.severity])
      );

      const blockDuration = maxSeverity * 300000; // 5 minutes per severity level
      setTimeout(() => {
        this.blockedIPs.delete(ip);
      }, blockDuration);
    } else if (action === 'throttle') {
      const existing = this.throttledIPs.get(ip);
      const count = existing ? existing.count + 1 : 1;
      const duration = Math.min(count * 60000, 3600000); // Max 1 hour

      this.throttledIPs.set(ip, {
        until: Date.now() + duration,
        count,
      });
    }
  }

  /**
   * Handle blocked request
   */
  private handleBlockedRequest(
    _req: VercelRequest,
    res: VercelResponse,
    result: SecurityResult
  ): void {
    // Set security headers
    res.setHeader('X-Security-Block-Reason', result.reason || 'Security policy violation');
    res.setHeader('X-Security-Block-Action', result.action);
    res.setHeader('X-Security-Processing-Time', result.processingTime.toString());

    // Return appropriate error response
    const statusCode = result.action === 'throttle' ? 429 : 403;
    const message =
      result.action === 'throttle' ? 'Too Many Requests' : 'Forbidden - Security Policy Violation';

    res.status(statusCode).json({
      error: message,
      code: result.action.toUpperCase(),
      reason: result.reason,
      timestamp: Date.now(),
      requestId: this.generateRequestId(),
    });
  }

  /**
   * Add security headers to response
   */
  private addSecurityHeaders(res: VercelResponse, result: SecurityResult): void {
    res.setHeader('X-Security-Policy', this.policyManager.getCurrentPolicy().level);
    res.setHeader('X-Security-Processing-Time', result.processingTime.toString());
    res.setHeader('X-Security-Threats-Detected', result.threats.length.toString());

    if (result.threats.length > 0) {
      res.setHeader('X-Security-Threat-Types', result.threats.map(t => t.type).join(','));
    }
  }

  /**
   * Log security result
   */
  private logSecurityResult(
    req: VercelRequest,
    _context: SecurityContext,
    result: SecurityResult
  ): void {
    const requestInfo = this.extractRequestInfo(req);

    // Log each threat
    result.threats.forEach(threat => {
      this.securityLogger.logThreat(threat, requestInfo, result.action, result.processingTime);
    });

    // Log blocked requests
    if (!result.allowed) {
      this.securityLogger.logBlocked(
        requestInfo,
        result.reason || 'Unknown',
        result.processingTime
      );
    }

    // Log suspicious activity for monitoring
    if (result.action === 'monitor' && result.threats.length > 0) {
      this.securityLogger.logSuspicious(
        requestInfo,
        result.reason || 'Threat detected but allowed',
        result.threats[0]?.severity || 'low',
        result.processingTime
      );
    }
  }

  /**
   * Update security policy
   */
  updatePolicy(level: SecurityPolicyLevel, reason?: string): void {
    this.policyManager.updatePolicy(level, reason);
  }

  /**
   * Apply custom policy configuration
   */
  applyCustomPolicy(config: any, reason?: string): void {
    this.policyManager.applyCustomPolicy(config, reason);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): Record<string, unknown> {
    return {
      policy: this.policyManager.getPolicySummary(),
      threats: this.threatDetectionEngine.getDetectionStats(),
      logs: this.securityLogger.getStats(),
      blocking: {
        blockedIPs: this.blockedIPs.size,
        throttledIPs: this.throttledIPs.size,
      },
    };
  }

  /**
   * Get security logs
   */
  getSecurityLogs(filter: any = {}) {
    return this.securityLogger.getLogs(filter);
  }

  /**
   * Clear blocked IPs
   */
  clearBlockedIPs(): void {
    this.blockedIPs.clear();
    this.throttledIPs.clear();
  }

  /**
   * Destroy middleware and clean up resources
   */
  destroy(): void {
    this.threatDetectionEngine.destroy();
    this.securityLogger.destroy();
  }
}

/**
 * Create security middleware with default configuration
 */
export function createSecurityMiddleware(config: SecurityMiddlewareConfig = {}) {
  const middleware = new UnifiedSecurityMiddleware(config);
  return middleware.createMiddleware();
}

/**
 * Create security middleware for different environments
 */
export const createDevelopmentSecurityMiddleware = () =>
  createSecurityMiddleware({
    policyLevel: 'minimal',
    enableThreatDetection: false,
    enableRealTimeBlocking: false,
    loggerConfig: { logLevel: 'debug' },
  });

export const createProductionSecurityMiddleware = () =>
  createSecurityMiddleware({
    policyLevel: 'strict',
    enableThreatDetection: true,
    enableRealTimeBlocking: true,
    loggerConfig: { logLevel: 'warn' },
  });

export const createTestingSecurityMiddleware = () =>
  createSecurityMiddleware({
    policyLevel: 'minimal',
    enableThreatDetection: true,
    enableRealTimeBlocking: false,
    loggerConfig: { logLevel: 'error' },
  });

export default UnifiedSecurityMiddleware;
