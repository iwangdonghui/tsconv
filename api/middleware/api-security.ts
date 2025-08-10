/**
 * API Security Enhancement Middleware
 *
 * This middleware provides comprehensive API security including
 * input sanitization, request validation, security logging, and threat detection.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import * as crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface APISecurityConfig {
  enableInputSanitization?: boolean;
  enableSQLInjectionProtection?: boolean;
  enableXSSProtection?: boolean;
  enableRequestSigning?: boolean;
  enableSecurityLogging?: boolean;
  enableThreatDetection?: boolean;
  maxRequestSize?: number;
  allowedContentTypes?: string[];
  blockedUserAgents?: RegExp[];
  blockedIPs?: string[];
  requireHTTPS?: boolean;
  enableRequestFingerprinting?: boolean;
}

export interface SecurityThreat {
  type: 'sql-injection' | 'xss' | 'path-traversal' | 'command-injection' | 'suspicious-pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  payload: string;
  pattern: string;
}

export interface RequestFingerprint {
  id: string;
  ip: string;
  userAgent: string;
  headers: Record<string, string>;
  timestamp: number;
  endpoint: string;
  method: string;
  contentType?: string;
  contentLength?: number;
}

export interface SecurityLogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  event: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  threat?: SecurityThreat;
  fingerprint?: RequestFingerprint;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Security Patterns and Detection
// ============================================================================

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
  /('|\"|`|;|--|\|\|)/,
  /(\bUNION\b.*\bSELECT\b)/i,
  /(\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b)/i,
];

const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /expression\s*\(/gi,
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /\.\.%2f/gi,
  /\.\.%5c/gi,
];

const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]]/,
  /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|wget|curl|nc|telnet|ssh)\b/i,
  /(\||&&|;|`|\$\(|\${)/,
];

// ============================================================================
// Input Sanitization
// ============================================================================

export class InputSanitizer {
  /**
   * Sanitizes string input to prevent XSS
   */
  static sanitizeXSS(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/&/g, '&amp;');
  }

  /**
   * Sanitizes SQL input to prevent injection
   */
  static sanitizeSQL(input: string): string {
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  /**
   * Removes path traversal attempts
   */
  static sanitizePathTraversal(input: string): string {
    return input
      .replace(/\.\.\//g, '')
      .replace(/\.\.\\/g, '')
      .replace(/%2e%2e%2f/gi, '')
      .replace(/%2e%2e%5c/gi, '');
  }

  /**
   * Sanitizes command injection attempts
   */
  static sanitizeCommandInjection(input: string): string {
    return input
      .replace(/[;&|`$(){}[\]]/g, '')
      .replace(/\|\|/g, '')
      .replace(/&&/g, '');
  }

  /**
   * Comprehensive input sanitization
   */
  static sanitizeInput(input: unknown): unknown {
    if (typeof input === 'string') {
      let sanitized = input;
      sanitized = this.sanitizeXSS(sanitized);
      sanitized = this.sanitizeSQL(sanitized);
      sanitized = this.sanitizePathTraversal(sanitized);
      sanitized = this.sanitizeCommandInjection(sanitized);
      return sanitized;
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (input && typeof input === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }
}

// ============================================================================
// Threat Detection
// ============================================================================

export class ThreatDetector {
  /**
   * Detects SQL injection attempts
   */
  static detectSQLInjection(input: string): SecurityThreat | null {
    for (const pattern of SQL_INJECTION_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: 'sql-injection',
          severity: 'high',
          description: 'Potential SQL injection attempt detected',
          payload: input,
          pattern: pattern.toString(),
        };
      }
    }
    return null;
  }

  /**
   * Detects XSS attempts
   */
  static detectXSS(input: string): SecurityThreat | null {
    for (const pattern of XSS_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: 'xss',
          severity: 'high',
          description: 'Potential XSS attempt detected',
          payload: input,
          pattern: pattern.toString(),
        };
      }
    }
    return null;
  }

  /**
   * Detects path traversal attempts
   */
  static detectPathTraversal(input: string): SecurityThreat | null {
    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: 'path-traversal',
          severity: 'medium',
          description: 'Potential path traversal attempt detected',
          payload: input,
          pattern: pattern.toString(),
        };
      }
    }
    return null;
  }

  /**
   * Detects command injection attempts
   */
  static detectCommandInjection(input: string): SecurityThreat | null {
    for (const pattern of COMMAND_INJECTION_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: 'command-injection',
          severity: 'critical',
          description: 'Potential command injection attempt detected',
          payload: input,
          pattern: pattern.toString(),
        };
      }
    }
    return null;
  }

  /**
   * Comprehensive threat detection
   */
  static detectThreats(input: string): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    const sqlThreat = this.detectSQLInjection(input);
    if (sqlThreat) threats.push(sqlThreat);

    const xssThreat = this.detectXSS(input);
    if (xssThreat) threats.push(xssThreat);

    const pathThreat = this.detectPathTraversal(input);
    if (pathThreat) threats.push(pathThreat);

    const cmdThreat = this.detectCommandInjection(input);
    if (cmdThreat) threats.push(cmdThreat);

    return threats;
  }

  /**
   * Analyzes request for threats
   */
  static analyzeRequest(req: VercelRequest): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    // Check URL parameters
    const url = new URL(req.url || '', 'http://localhost');
    const searchParams = Array.from(url.searchParams.entries());
    for (const [key, value] of searchParams) {
      threats.push(...this.detectThreats(value));
    }

    // Check request body
    if (req.body) {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      threats.push(...this.detectThreats(bodyStr));
    }

    // Check headers for suspicious patterns
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        threats.push(...this.detectThreats(value));
      }
    }

    return threats;
  }
}

// ============================================================================
// Request Fingerprinting
// ============================================================================

export class RequestFingerprinter {
  /**
   * Generates a unique fingerprint for a request
   */
  static generateFingerprint(req: VercelRequest): RequestFingerprint {
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const endpoint = req.url || '';
    const method = req.method || 'GET';

    // Create a hash of key identifying features
    const fingerprintData = `${ip}:${userAgent}:${method}:${endpoint}`;
    const id = crypto.createHash('sha256').update(fingerprintData).digest('hex').substring(0, 16);

    return {
      id,
      ip,
      userAgent,
      headers: this.getRelevantHeaders(req),
      timestamp: Date.now(),
      endpoint,
      method,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length']
        ? parseInt(req.headers['content-length'] as string)
        : undefined,
    };
  }

  /**
   * Gets client IP address
   */
  private static getClientIP(req: VercelRequest): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['cf-connecting-ip'] as string) ||
      'unknown'
    );
  }

  /**
   * Gets relevant headers for fingerprinting
   */
  private static getRelevantHeaders(req: VercelRequest): Record<string, string> {
    const relevantHeaders = [
      'accept',
      'accept-language',
      'accept-encoding',
      'user-agent',
      'referer',
      'origin',
    ];

    const headers: Record<string, string> = {};
    for (const header of relevantHeaders) {
      const value = req.headers[header];
      if (value && typeof value === 'string') {
        headers[header] = value;
      }
    }

    return headers;
  }
}

// ============================================================================
// Security Logger
// ============================================================================

export class SecurityLogger {
  private static logs: SecurityLogEntry[] = [];

  /**
   * Logs a security event
   */
  static log(entry: Omit<SecurityLogEntry, 'timestamp'>): void {
    const logEntry: SecurityLogEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    this.logs.push(logEntry);

    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(logEntry);
    } else {
      console.log('Security Event:', logEntry);
    }

    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  /**
   * Gets recent security logs
   */
  static getRecentLogs(limit: number = 100): SecurityLogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Sends log to external logging service
   */
  private static sendToExternalLogger(entry: SecurityLogEntry): void {
    // Implementation would send to services like:
    // - Sentry
    // - DataDog
    // - CloudWatch
    // - Custom logging endpoint

    // For now, just console.log in production
    console.log('Security Event:', JSON.stringify(entry));
  }
}

// ============================================================================
// Main Security Middleware
// ============================================================================

/**
 * Creates comprehensive API security middleware
 */
export function createAPISecurityMiddleware(config: APISecurityConfig = {}) {
  const {
    enableInputSanitization = true,
    enableSQLInjectionProtection = true,
    enableXSSProtection = true,
    enableSecurityLogging = true,
    enableThreatDetection = true,
    maxRequestSize = 1024 * 1024, // 1MB
    allowedContentTypes = ['application/json', 'application/x-www-form-urlencoded', 'text/plain'],
    blockedUserAgents = [],
    blockedIPs = [],
    requireHTTPS = true,
    enableRequestFingerprinting = true,
  } = config;

  return async (req: VercelRequest, res: VercelResponse, next?: () => void) => {
    const startTime = Date.now();
    const fingerprint = enableRequestFingerprinting
      ? RequestFingerprinter.generateFingerprint(req)
      : undefined;

    try {
      // Check HTTPS requirement
      if (
        requireHTTPS &&
        req.headers['x-forwarded-proto'] !== 'https' &&
        process.env.NODE_ENV === 'production'
      ) {
        SecurityLogger.log({
          level: 'warn',
          event: 'insecure_request',
          ip: fingerprint?.ip || 'unknown',
          userAgent: fingerprint?.userAgent || 'unknown',
          endpoint: req.url || '',
          method: req.method || 'GET',
          fingerprint,
        });

        return res.status(400).json({
          success: false,
          error: 'HTTPS Required',
          message: 'This API requires HTTPS connections',
        });
      }

      // Check blocked IPs
      if (blockedIPs.length > 0 && fingerprint && blockedIPs.includes(fingerprint.ip)) {
        SecurityLogger.log({
          level: 'error',
          event: 'blocked_ip_access',
          ip: fingerprint.ip,
          userAgent: fingerprint.userAgent,
          endpoint: req.url || '',
          method: req.method || 'GET',
          fingerprint,
        });

        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'Your IP address has been blocked',
        });
      }

      // Check blocked user agents
      const userAgent = req.headers['user-agent'] || '';
      if (blockedUserAgents.some(pattern => pattern.test(userAgent))) {
        SecurityLogger.log({
          level: 'warn',
          event: 'blocked_user_agent',
          ip: fingerprint?.ip || 'unknown',
          userAgent,
          endpoint: req.url || '',
          method: req.method || 'GET',
          fingerprint,
        });

        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'Your user agent is not allowed',
        });
      }

      // Check request size
      const contentLength = req.headers['content-length'];
      if (contentLength && parseInt(contentLength as string) > maxRequestSize) {
        SecurityLogger.log({
          level: 'warn',
          event: 'request_too_large',
          ip: fingerprint?.ip || 'unknown',
          userAgent: fingerprint?.userAgent || 'unknown',
          endpoint: req.url || '',
          method: req.method || 'GET',
          metadata: { contentLength: parseInt(contentLength as string), maxSize: maxRequestSize },
          fingerprint,
        });

        return res.status(413).json({
          success: false,
          error: 'Request Too Large',
          message: `Request size exceeds maximum allowed size of ${maxRequestSize} bytes`,
        });
      }

      // Check content type
      const contentType = req.headers['content-type'];
      if (contentType && !allowedContentTypes.some(allowed => contentType.includes(allowed))) {
        SecurityLogger.log({
          level: 'warn',
          event: 'invalid_content_type',
          ip: fingerprint?.ip || 'unknown',
          userAgent: fingerprint?.userAgent || 'unknown',
          endpoint: req.url || '',
          method: req.method || 'GET',
          metadata: { contentType, allowedTypes: allowedContentTypes },
          fingerprint,
        });

        return res.status(415).json({
          success: false,
          error: 'Unsupported Media Type',
          message: `Content type ${contentType} is not allowed`,
        });
      }

      // Threat detection
      if (enableThreatDetection) {
        const threats = ThreatDetector.analyzeRequest(req);
        if (threats.length > 0) {
          const criticalThreats = threats.filter(t => t.severity === 'critical');
          const highThreats = threats.filter(t => t.severity === 'high');

          SecurityLogger.log({
            level: criticalThreats.length > 0 ? 'critical' : 'error',
            event: 'security_threat_detected',
            ip: fingerprint?.ip || 'unknown',
            userAgent: fingerprint?.userAgent || 'unknown',
            endpoint: req.url || '',
            method: req.method || 'GET',
            threat: threats[0], // Log the first threat
            metadata: { totalThreats: threats.length, threatTypes: threats.map(t => t.type) },
            fingerprint,
          });

          // Block critical and high severity threats
          if (criticalThreats.length > 0 || highThreats.length > 0) {
            return res.status(400).json({
              success: false,
              error: 'Security Threat Detected',
              message: 'Request contains potentially malicious content',
            });
          }
        }
      }

      // Input sanitization
      if (enableInputSanitization) {
        if (req.body) {
          req.body = InputSanitizer.sanitizeInput(req.body);
        }

        if (req.query) {
          req.query = InputSanitizer.sanitizeInput(req.query) as any;
        }
      }

      // Log successful security check
      if (enableSecurityLogging) {
        SecurityLogger.log({
          level: 'info',
          event: 'request_processed',
          ip: fingerprint?.ip || 'unknown',
          userAgent: fingerprint?.userAgent || 'unknown',
          endpoint: req.url || '',
          method: req.method || 'GET',
          metadata: { processingTime: Date.now() - startTime },
          fingerprint,
        });
      }

      // Attach security context to request
      (req as any).security = {
        fingerprint,
        threats: enableThreatDetection ? ThreatDetector.analyzeRequest(req) : [],
        sanitized: enableInputSanitization,
        processingTime: Date.now() - startTime,
      };

      if (next) {
        return next();
      }

      return undefined;
    } catch (error) {
      SecurityLogger.log({
        level: 'error',
        event: 'security_middleware_error',
        ip: fingerprint?.ip || 'unknown',
        userAgent: fingerprint?.userAgent || 'unknown',
        endpoint: req.url || '',
        method: req.method || 'GET',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        fingerprint,
      });

      return res.status(500).json({
        success: false,
        error: 'Internal Security Error',
        message: 'Security processing failed',
      });
    }
  };
}

/**
 * Default API security middleware with standard configuration
 */
export const defaultAPISecurityMiddleware = createAPISecurityMiddleware({
  enableInputSanitization: true,
  enableThreatDetection: true,
  enableSecurityLogging: true,
  requireHTTPS: process.env.NODE_ENV === 'production',
});

/**
 * Strict API security middleware for sensitive endpoints
 */
export const strictAPISecurityMiddleware = createAPISecurityMiddleware({
  enableInputSanitization: true,
  enableThreatDetection: true,
  enableSecurityLogging: true,
  requireHTTPS: true,
  maxRequestSize: 512 * 1024, // 512KB
  allowedContentTypes: ['application/json'],
});

// All classes are already exported above with their definitions
