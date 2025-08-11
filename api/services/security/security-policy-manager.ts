/**
 * Security Policy Manager
 * Unified security policy management with dynamic configuration and threat detection
 */

export type SecurityPolicyLevel = 'minimal' | 'standard' | 'strict' | 'maximum' | 'custom';
export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SecurityEventType = 
  | 'suspicious_request' 
  | 'rate_limit_exceeded' 
  | 'invalid_input' 
  | 'unauthorized_access'
  | 'malicious_payload'
  | 'bot_detected'
  | 'geo_blocked'
  | 'ip_blocked'
  | 'pattern_matched';

export interface SecurityThreat {
  id: string;
  type: SecurityEventType;
  severity: ThreatSeverity;
  description: string;
  pattern?: string;
  payload?: unknown;
  confidence: number; // 0-100
  timestamp: number;
  source: {
    ip: string;
    userAgent?: string;
    country?: string;
    asn?: string;
  };
  context: {
    endpoint: string;
    method: string;
    headers: Record<string, string>;
    query?: Record<string, unknown>;
    body?: unknown;
  };
  mitigation?: {
    action: 'block' | 'throttle' | 'monitor' | 'challenge';
    duration?: number;
    reason: string;
  };
}

export interface SecurityPolicy {
  level: SecurityPolicyLevel;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  
  // Request filtering
  requestFiltering: {
    enabled: boolean;
    maxRequestSize: number;
    allowedMethods: string[];
    blockedUserAgents: string[];
    blockedIPs: string[];
    allowedCountries?: string[];
    blockedCountries?: string[];
  };
  
  // Input validation
  inputValidation: {
    enabled: boolean;
    sanitizeInput: boolean;
    validateContentType: boolean;
    maxFieldLength: number;
    maxFieldCount: number;
    blockedPatterns: string[];
  };
  
  // Rate limiting integration
  rateLimiting: {
    enabled: boolean;
    strictMode: boolean;
    adaptiveThrottling: boolean;
    penaltyMultiplier: number;
  };
  
  // Bot detection
  botDetection: {
    enabled: boolean;
    challengeMode: boolean;
    honeypotFields: string[];
    behaviorAnalysis: boolean;
    fingerprintTracking: boolean;
  };
  
  // Threat detection
  threatDetection: {
    enabled: boolean;
    realTimeAnalysis: boolean;
    patternMatching: boolean;
    anomalyDetection: boolean;
    mlBasedDetection: boolean;
    confidenceThreshold: number;
  };
  
  // Response security
  responseSecurity: {
    hideServerInfo: boolean;
    sanitizeErrors: boolean;
    preventInfoLeakage: boolean;
    addSecurityHeaders: boolean;
  };
  
  // Logging and monitoring
  logging: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logThreats: boolean;
    logBlocked: boolean;
    logSuspicious: boolean;
    retentionDays: number;
  };
}

/**
 * Predefined security policy configurations
 */
export const SECURITY_POLICY_PRESETS: Record<SecurityPolicyLevel, Partial<SecurityPolicy>> = {
  minimal: {
    level: 'minimal',
    name: 'Minimal Security',
    description: 'Basic security measures for development',
    enabled: true,
    priority: 1,
    requestFiltering: {
      enabled: true,
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      blockedUserAgents: [],
      blockedIPs: [],
    },
    inputValidation: {
      enabled: true,
      sanitizeInput: false,
      validateContentType: true,
      maxFieldLength: 10000,
      maxFieldCount: 100,
      blockedPatterns: [],
    },
    rateLimiting: {
      enabled: false,
      strictMode: false,
      adaptiveThrottling: false,
      penaltyMultiplier: 1,
    },
    botDetection: {
      enabled: false,
      challengeMode: false,
      honeypotFields: [],
      behaviorAnalysis: false,
      fingerprintTracking: false,
    },
    threatDetection: {
      enabled: false,
      realTimeAnalysis: false,
      patternMatching: false,
      anomalyDetection: false,
      mlBasedDetection: false,
      confidenceThreshold: 80,
    },
    responseSecurity: {
      hideServerInfo: true,
      sanitizeErrors: true,
      preventInfoLeakage: true,
      addSecurityHeaders: true,
    },
    logging: {
      enabled: true,
      logLevel: 'info',
      logThreats: true,
      logBlocked: true,
      logSuspicious: false,
      retentionDays: 7,
    },
  },
  
  standard: {
    level: 'standard',
    name: 'Standard Security',
    description: 'Balanced security for production environments',
    enabled: true,
    priority: 2,
    requestFiltering: {
      enabled: true,
      maxRequestSize: 5 * 1024 * 1024, // 5MB
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      blockedUserAgents: ['curl', 'wget', 'python-requests'],
      blockedIPs: [],
    },
    inputValidation: {
      enabled: true,
      sanitizeInput: true,
      validateContentType: true,
      maxFieldLength: 5000,
      maxFieldCount: 50,
      blockedPatterns: ['<script', 'javascript:', 'data:text/html'],
    },
    rateLimiting: {
      enabled: true,
      strictMode: false,
      adaptiveThrottling: true,
      penaltyMultiplier: 2,
    },
    botDetection: {
      enabled: true,
      challengeMode: false,
      honeypotFields: ['email_confirm', 'website'],
      behaviorAnalysis: true,
      fingerprintTracking: true,
    },
    threatDetection: {
      enabled: true,
      realTimeAnalysis: true,
      patternMatching: true,
      anomalyDetection: false,
      mlBasedDetection: false,
      confidenceThreshold: 70,
    },
    responseSecurity: {
      hideServerInfo: true,
      sanitizeErrors: true,
      preventInfoLeakage: true,
      addSecurityHeaders: true,
    },
    logging: {
      enabled: true,
      logLevel: 'info',
      logThreats: true,
      logBlocked: true,
      logSuspicious: true,
      retentionDays: 30,
    },
  },
  
  strict: {
    level: 'strict',
    name: 'Strict Security',
    description: 'High security for sensitive applications',
    enabled: true,
    priority: 3,
    requestFiltering: {
      enabled: true,
      maxRequestSize: 1 * 1024 * 1024, // 1MB
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
      blockedUserAgents: ['curl', 'wget', 'python-requests', 'bot', 'crawler', 'spider'],
      blockedIPs: [],
      allowedCountries: ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU'],
    },
    inputValidation: {
      enabled: true,
      sanitizeInput: true,
      validateContentType: true,
      maxFieldLength: 1000,
      maxFieldCount: 20,
      blockedPatterns: [
        '<script', 'javascript:', 'data:text/html', 'vbscript:', 'onload=', 'onerror=',
        'eval(', 'setTimeout(', 'setInterval(', 'Function(', 'constructor'
      ],
    },
    rateLimiting: {
      enabled: true,
      strictMode: true,
      adaptiveThrottling: true,
      penaltyMultiplier: 5,
    },
    botDetection: {
      enabled: true,
      challengeMode: true,
      honeypotFields: ['email_confirm', 'website', 'phone_backup'],
      behaviorAnalysis: true,
      fingerprintTracking: true,
    },
    threatDetection: {
      enabled: true,
      realTimeAnalysis: true,
      patternMatching: true,
      anomalyDetection: true,
      mlBasedDetection: false,
      confidenceThreshold: 60,
    },
    responseSecurity: {
      hideServerInfo: true,
      sanitizeErrors: true,
      preventInfoLeakage: true,
      addSecurityHeaders: true,
    },
    logging: {
      enabled: true,
      logLevel: 'debug',
      logThreats: true,
      logBlocked: true,
      logSuspicious: true,
      retentionDays: 90,
    },
  },
  
  maximum: {
    level: 'maximum',
    name: 'Maximum Security',
    description: 'Highest security level with all protections enabled',
    enabled: true,
    priority: 4,
    requestFiltering: {
      enabled: true,
      maxRequestSize: 512 * 1024, // 512KB
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
      blockedUserAgents: ['curl', 'wget', 'python-requests', 'bot', 'crawler', 'spider', 'scraper'],
      blockedIPs: [],
      allowedCountries: ['US', 'CA', 'GB'],
    },
    inputValidation: {
      enabled: true,
      sanitizeInput: true,
      validateContentType: true,
      maxFieldLength: 500,
      maxFieldCount: 10,
      blockedPatterns: [
        '<script', 'javascript:', 'data:text/html', 'vbscript:', 'onload=', 'onerror=',
        'eval(', 'setTimeout(', 'setInterval(', 'Function(', 'constructor', 'prototype',
        'union', 'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter'
      ],
    },
    rateLimiting: {
      enabled: true,
      strictMode: true,
      adaptiveThrottling: true,
      penaltyMultiplier: 10,
    },
    botDetection: {
      enabled: true,
      challengeMode: true,
      honeypotFields: ['email_confirm', 'website', 'phone_backup', 'company_name'],
      behaviorAnalysis: true,
      fingerprintTracking: true,
    },
    threatDetection: {
      enabled: true,
      realTimeAnalysis: true,
      patternMatching: true,
      anomalyDetection: true,
      mlBasedDetection: true,
      confidenceThreshold: 50,
    },
    responseSecurity: {
      hideServerInfo: true,
      sanitizeErrors: true,
      preventInfoLeakage: true,
      addSecurityHeaders: true,
    },
    logging: {
      enabled: true,
      logLevel: 'debug',
      logThreats: true,
      logBlocked: true,
      logSuspicious: true,
      retentionDays: 365,
    },
  },
  
  custom: {
    level: 'custom',
    name: 'Custom Security',
    description: 'Customizable security configuration',
    enabled: true,
    priority: 5,
  },
};

/**
 * Security Policy Manager
 */
export class SecurityPolicyManager {
  private currentPolicy: SecurityPolicy;
  private customPolicies = new Map<string, SecurityPolicy>();
  private policyHistory: Array<{ policy: SecurityPolicy; timestamp: number; reason: string }> = [];

  constructor(initialLevel: SecurityPolicyLevel = 'standard') {
    this.currentPolicy = this.createPolicyFromPreset(initialLevel);
  }

  /**
   * Create a policy from a preset
   */
  private createPolicyFromPreset(level: SecurityPolicyLevel): SecurityPolicy {
    const preset = SECURITY_POLICY_PRESETS[level];
    if (!preset) {
      throw new Error(`Unknown security policy level: ${level}`);
    }

    // Merge with defaults
    return {
      ...SECURITY_POLICY_PRESETS.standard,
      ...preset,
    } as SecurityPolicy;
  }

  /**
   * Get current security policy
   */
  getCurrentPolicy(): SecurityPolicy {
    return { ...this.currentPolicy };
  }

  /**
   * Update security policy
   */
  updatePolicy(level: SecurityPolicyLevel, reason: string = 'Manual update'): void {
    const oldPolicy = this.currentPolicy;
    this.currentPolicy = this.createPolicyFromPreset(level);
    
    // Record policy change
    this.policyHistory.push({
      policy: oldPolicy,
      timestamp: Date.now(),
      reason
    });

    // Keep only last 100 policy changes
    if (this.policyHistory.length > 100) {
      this.policyHistory = this.policyHistory.slice(-100);
    }
  }

  /**
   * Apply custom policy configuration
   */
  applyCustomPolicy(customConfig: Partial<SecurityPolicy>, reason: string = 'Custom configuration'): void {
    const oldPolicy = this.currentPolicy;
    this.currentPolicy = {
      ...this.currentPolicy,
      ...customConfig,
      level: 'custom'
    };

    this.policyHistory.push({
      policy: oldPolicy,
      timestamp: Date.now(),
      reason
    });
  }

  /**
   * Get policy history
   */
  getPolicyHistory(): Array<{ policy: SecurityPolicy; timestamp: number; reason: string }> {
    return [...this.policyHistory];
  }

  /**
   * Check if a request should be blocked based on current policy
   */
  shouldBlockRequest(request: {
    ip: string;
    userAgent?: string;
    method: string;
    size: number;
    country?: string;
  }): { blocked: boolean; reason?: string } {
    const policy = this.currentPolicy;

    // Check if request filtering is enabled
    if (!policy.requestFiltering?.enabled) {
      return { blocked: false };
    }

    // Check request size
    if (request.size > policy.requestFiltering.maxRequestSize) {
      return { blocked: true, reason: 'Request size exceeds limit' };
    }

    // Check allowed methods
    if (!policy.requestFiltering.allowedMethods.includes(request.method)) {
      return { blocked: true, reason: 'Method not allowed' };
    }

    // Check blocked IPs
    if (policy.requestFiltering.blockedIPs.includes(request.ip)) {
      return { blocked: true, reason: 'IP address blocked' };
    }

    // Check blocked user agents
    if (request.userAgent && policy.requestFiltering.blockedUserAgents.some(ua => 
      request.userAgent!.toLowerCase().includes(ua.toLowerCase())
    )) {
      return { blocked: true, reason: 'User agent blocked' };
    }

    // Check country restrictions
    if (request.country) {
      if (policy.requestFiltering.allowedCountries && 
          !policy.requestFiltering.allowedCountries.includes(request.country)) {
        return { blocked: true, reason: 'Country not allowed' };
      }

      if (policy.requestFiltering.blockedCountries && 
          policy.requestFiltering.blockedCountries.includes(request.country)) {
        return { blocked: true, reason: 'Country blocked' };
      }
    }

    return { blocked: false };
  }

  /**
   * Validate input based on current policy
   */
  validateInput(input: unknown): { valid: boolean; sanitized?: unknown; violations: string[] } {
    const policy = this.currentPolicy;
    const violations: string[] = [];

    if (!policy.inputValidation?.enabled) {
      return { valid: true, sanitized: input, violations: [] };
    }

    let sanitized = input;

    // Check if input is a string for pattern matching
    if (typeof input === 'string') {
      // Check blocked patterns
      for (const pattern of policy.inputValidation.blockedPatterns) {
        if (input.toLowerCase().includes(pattern.toLowerCase())) {
          violations.push(`Contains blocked pattern: ${pattern}`);
        }
      }

      // Check field length
      if (input.length > policy.inputValidation.maxFieldLength) {
        violations.push(`Field length exceeds limit: ${input.length} > ${policy.inputValidation.maxFieldLength}`);
      }

      // Sanitize input if enabled
      if (policy.inputValidation.sanitizeInput) {
        sanitized = input
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    }

    // Check object field count
    if (typeof input === 'object' && input !== null) {
      const fieldCount = Object.keys(input).length;
      if (fieldCount > policy.inputValidation.maxFieldCount) {
        violations.push(`Field count exceeds limit: ${fieldCount} > ${policy.inputValidation.maxFieldCount}`);
      }
    }

    return {
      valid: violations.length === 0,
      sanitized,
      violations
    };
  }

  /**
   * Get policy summary for monitoring
   */
  getPolicySummary(): Record<string, unknown> {
    const policy = this.currentPolicy;
    
    return {
      level: policy.level,
      name: policy.name,
      enabled: policy.enabled,
      priority: policy.priority,
      features: {
        requestFiltering: policy.requestFiltering?.enabled || false,
        inputValidation: policy.inputValidation?.enabled || false,
        rateLimiting: policy.rateLimiting?.enabled || false,
        botDetection: policy.botDetection?.enabled || false,
        threatDetection: policy.threatDetection?.enabled || false,
      },
      lastUpdated: this.policyHistory.length > 0 ? this.policyHistory[this.policyHistory.length - 1].timestamp : Date.now(),
      historyCount: this.policyHistory.length
    };
  }

  /**
   * Export policy configuration
   */
  exportPolicy(): string {
    return JSON.stringify({
      currentPolicy: this.currentPolicy,
      customPolicies: Object.fromEntries(this.customPolicies),
      policyHistory: this.policyHistory.slice(-10) // Last 10 changes
    }, null, 2);
  }

  /**
   * Import policy configuration
   */
  importPolicy(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      
      if (config.currentPolicy) {
        this.currentPolicy = config.currentPolicy;
      }
      
      if (config.customPolicies) {
        this.customPolicies = new Map(Object.entries(config.customPolicies));
      }
      
      if (config.policyHistory) {
        this.policyHistory = config.policyHistory;
      }
    } catch (error) {
      throw new Error(`Failed to import policy configuration: ${error}`);
    }
  }
}
