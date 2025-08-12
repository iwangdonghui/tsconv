/**
 * Threat Detection Engine
 * Advanced threat detection with pattern matching, anomaly detection, and ML-based analysis
 */

import {
  SecurityEventType,
  SecurityPolicy,
  SecurityThreat,
  ThreatSeverity,
} from './security-policy-manager';

export interface ThreatPattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  type: SecurityEventType;
  severity: ThreatSeverity;
  confidence: number;
  enabled: boolean;
  category: 'xss' | 'sqli' | 'rce' | 'lfi' | 'bot' | 'dos' | 'scan' | 'generic';
}

export interface RequestFingerprint {
  ip: string;
  userAgent: string;
  headers: Record<string, string>;
  timing: {
    requestTime: number;
    responseTime?: number;
  };
  behavior: {
    requestCount: number;
    errorCount: number;
    suspiciousCount: number;
    lastSeen: number;
  };
}

export interface AnomalyScore {
  overall: number;
  frequency: number;
  pattern: number;
  behavior: number;
  timing: number;
  details: Record<string, number>;
}

/**
 * Predefined threat detection patterns
 */
export const THREAT_PATTERNS: ThreatPattern[] = [
  // XSS Patterns
  {
    id: 'xss-script-tag',
    name: 'Script Tag Injection',
    description: 'Detects script tag injection attempts',
    pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    type: 'malicious_payload',
    severity: 'high',
    confidence: 90,
    enabled: true,
    category: 'xss',
  },
  {
    id: 'xss-javascript-protocol',
    name: 'JavaScript Protocol',
    description: 'Detects javascript: protocol usage',
    pattern: /javascript\s*:/gi,
    type: 'malicious_payload',
    severity: 'medium',
    confidence: 80,
    enabled: true,
    category: 'xss',
  },
  {
    id: 'xss-event-handlers',
    name: 'Event Handler Injection',
    description: 'Detects HTML event handler injection',
    pattern: /on\w+\s*=\s*["\']?[^"\'>\s]+/gi,
    type: 'malicious_payload',
    severity: 'medium',
    confidence: 75,
    enabled: true,
    category: 'xss',
  },

  // SQL Injection Patterns
  {
    id: 'sqli-union-select',
    name: 'SQL Union Select',
    description: 'Detects SQL UNION SELECT injection attempts',
    pattern: /union\s+select\s+/gi,
    type: 'malicious_payload',
    severity: 'critical',
    confidence: 95,
    enabled: true,
    category: 'sqli',
  },
  {
    id: 'sqli-or-1-equals-1',
    name: 'SQL OR 1=1',
    description: 'Detects classic SQL injection patterns',
    pattern: /(or|and)\s+\d+\s*=\s*\d+/gi,
    type: 'malicious_payload',
    severity: 'high',
    confidence: 85,
    enabled: true,
    category: 'sqli',
  },

  // Remote Code Execution
  {
    id: 'rce-eval-function',
    name: 'Eval Function Call',
    description: 'Detects eval() function usage',
    pattern: /eval\s*\(/gi,
    type: 'malicious_payload',
    severity: 'critical',
    confidence: 90,
    enabled: true,
    category: 'rce',
  },
  {
    id: 'rce-system-commands',
    name: 'System Command Injection',
    description: 'Detects system command injection attempts',
    pattern: /(system|exec|shell_exec|passthru|popen)\s*\(/gi,
    type: 'malicious_payload',
    severity: 'critical',
    confidence: 95,
    enabled: true,
    category: 'rce',
  },

  // Bot Detection
  {
    id: 'bot-user-agent',
    name: 'Bot User Agent',
    description: 'Detects common bot user agents',
    pattern: /(bot|crawler|spider|scraper|curl|wget|python-requests)/gi,
    type: 'bot_detected',
    severity: 'low',
    confidence: 70,
    enabled: true,
    category: 'bot',
  },

  // Directory Traversal
  {
    id: 'lfi-directory-traversal',
    name: 'Directory Traversal',
    description: 'Detects directory traversal attempts',
    pattern: /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/gi,
    type: 'malicious_payload',
    severity: 'high',
    confidence: 85,
    enabled: true,
    category: 'lfi',
  },

  // Scanning Attempts
  {
    id: 'scan-common-files',
    name: 'Common File Scanning',
    description: 'Detects scanning for common files',
    pattern: /(wp-admin|admin|phpmyadmin|config\.php|\.env|\.git)/gi,
    type: 'suspicious_request',
    severity: 'medium',
    confidence: 60,
    enabled: true,
    category: 'scan',
  },
];

/**
 * Threat Detection Engine
 */
export class ThreatDetectionEngine {
  private patterns: Map<string, ThreatPattern> = new Map();
  private fingerprints = new Map<string, RequestFingerprint>();
  private anomalyBaseline = new Map<string, AnomalyScore>();
  private detectionHistory: SecurityThreat[] = [];
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Initialize with default patterns
    THREAT_PATTERNS.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });

    // Start cleanup interval (every hour)
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 3600000);
  }

  /**
   * Analyze request for threats
   */
  analyzeRequest(
    request: {
      ip: string;
      method: string;
      url: string;
      headers: Record<string, string>;
      query?: Record<string, unknown>;
      body?: unknown;
      userAgent?: string;
      timestamp: number;
    },
    policy: SecurityPolicy
  ): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    if (!policy.threatDetection?.enabled) {
      return threats;
    }

    // Update request fingerprint
    this.updateFingerprint(request);

    // Pattern-based detection
    if (policy.threatDetection.patternMatching) {
      threats.push(...this.detectPatternThreats(request));
    }

    // Anomaly detection
    if (policy.threatDetection.anomalyDetection) {
      const anomalyThreat = this.detectAnomalies(request);
      if (anomalyThreat) {
        threats.push(anomalyThreat);
      }
    }

    // Behavior analysis
    const behaviorThreat = this.analyzeBehavior(request);
    if (behaviorThreat) {
      threats.push(behaviorThreat);
    }

    // Filter by confidence threshold
    const filteredThreats = threats.filter(
      threat => threat.confidence >= policy.threatDetection.confidenceThreshold
    );

    // Store detection history
    this.detectionHistory.push(...filteredThreats);

    // Keep only recent detections (last 1000)
    if (this.detectionHistory.length > 1000) {
      this.detectionHistory = this.detectionHistory.slice(-1000);
    }

    return filteredThreats;
  }

  /**
   * Detect pattern-based threats
   */
  private detectPatternThreats(request: {
    ip: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    query?: Record<string, unknown>;
    body?: unknown;
    userAgent?: string;
    timestamp: number;
  }): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    // Combine all request data for analysis
    const requestData = [
      request.url,
      JSON.stringify(request.query || {}),
      JSON.stringify(request.body || {}),
      request.userAgent || '',
      Object.values(request.headers).join(' '),
    ].join(' ');

    // Check each pattern
    for (const pattern of this.patterns.values()) {
      if (!pattern.enabled) continue;

      let matches = false;
      let matchedContent = '';

      if (pattern.pattern instanceof RegExp) {
        const match = requestData.match(pattern.pattern);
        if (match) {
          matches = true;
          matchedContent = match[0];
        }
      } else {
        if (requestData.toLowerCase().includes(pattern.pattern.toLowerCase())) {
          matches = true;
          matchedContent = pattern.pattern;
        }
      }

      if (matches) {
        threats.push({
          id: `${pattern.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: pattern.type,
          severity: pattern.severity,
          description: `${pattern.description}: ${matchedContent}`,
          pattern: pattern.pattern.toString(),
          confidence: pattern.confidence,
          timestamp: request.timestamp,
          source: {
            ip: request.ip,
            userAgent: request.userAgent,
          },
          context: {
            endpoint: request.url,
            method: request.method,
            headers: request.headers,
            query: request.query,
            body: request.body,
          },
          mitigation: this.suggestMitigation(pattern),
        });
      }
    }

    return threats;
  }

  /**
   * Detect anomalies in request patterns
   */
  private detectAnomalies(request: {
    ip: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    timestamp: number;
  }): SecurityThreat | null {
    const fingerprint = this.fingerprints.get(request.ip);
    if (!fingerprint) return null;

    const anomalyScore = this.calculateAnomalyScore(request, fingerprint);

    // Threshold for anomaly detection
    if (anomalyScore.overall > 80) {
      return {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'suspicious_request',
        severity: anomalyScore.overall > 90 ? 'high' : 'medium',
        description: `Anomalous request pattern detected (score: ${anomalyScore.overall})`,
        confidence: Math.min(anomalyScore.overall, 95),
        timestamp: request.timestamp,
        source: {
          ip: request.ip,
        },
        context: {
          endpoint: request.url,
          method: request.method,
          headers: request.headers,
        },
        payload: {
          anomalyScore,
          fingerprint: {
            requestCount: fingerprint.behavior.requestCount,
            errorCount: fingerprint.behavior.errorCount,
            suspiciousCount: fingerprint.behavior.suspiciousCount,
          },
        },
        mitigation: {
          action: anomalyScore.overall > 90 ? 'block' : 'throttle',
          duration: 300000, // 5 minutes
          reason: 'Anomalous behavior detected',
        },
      };
    }

    return null;
  }

  /**
   * Analyze request behavior
   */
  private analyzeBehavior(request: { ip: string; timestamp: number }): SecurityThreat | null {
    const fingerprint = this.fingerprints.get(request.ip);
    if (!fingerprint) return null;

    const now = request.timestamp;
    const timeSinceLastRequest = now - fingerprint.behavior.lastSeen;

    // Detect rapid requests (potential DoS)
    if (timeSinceLastRequest < 100 && fingerprint.behavior.requestCount > 50) {
      return {
        id: `dos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'rate_limit_exceeded',
        severity: 'high',
        description: 'Potential DoS attack detected - rapid requests',
        confidence: 85,
        timestamp: request.timestamp,
        source: {
          ip: request.ip,
        },
        context: {
          endpoint: '',
          method: '',
          headers: {},
        },
        payload: {
          requestCount: fingerprint.behavior.requestCount,
          timeSinceLastRequest,
          requestRate:
            fingerprint.behavior.requestCount / ((now - fingerprint.timing.requestTime) / 1000),
        },
        mitigation: {
          action: 'block',
          duration: 600000, // 10 minutes
          reason: 'DoS attack prevention',
        },
      };
    }

    return null;
  }

  /**
   * Update request fingerprint
   */
  private updateFingerprint(request: {
    ip: string;
    headers: Record<string, string>;
    userAgent?: string;
    timestamp: number;
  }): void {
    const existing = this.fingerprints.get(request.ip);

    if (existing) {
      existing.behavior.requestCount++;
      existing.behavior.lastSeen = request.timestamp;
      existing.timing.responseTime = request.timestamp;
    } else {
      this.fingerprints.set(request.ip, {
        ip: request.ip,
        userAgent: request.userAgent || '',
        headers: request.headers,
        timing: {
          requestTime: request.timestamp,
        },
        behavior: {
          requestCount: 1,
          errorCount: 0,
          suspiciousCount: 0,
          lastSeen: request.timestamp,
        },
      });
    }
  }

  /**
   * Calculate anomaly score
   */
  private calculateAnomalyScore(
    request: {
      ip: string;
      method: string;
      url: string;
      headers: Record<string, string>;
      timestamp: number;
    },
    fingerprint: RequestFingerprint
  ): AnomalyScore {
    const now = request.timestamp;
    const timeSinceFirst = now - fingerprint.timing.requestTime;
    const requestRate = fingerprint.behavior.requestCount / (timeSinceFirst / 1000);

    // Calculate individual scores
    const frequencyScore = Math.min(requestRate * 10, 100); // High frequency = high score
    const patternScore = this.calculatePatternScore(request, fingerprint);
    const behaviorScore = this.calculateBehaviorScore(fingerprint);
    const timingScore = this.calculateTimingScore(request, fingerprint);

    // Weighted overall score
    const overall =
      frequencyScore * 0.3 + patternScore * 0.25 + behaviorScore * 0.25 + timingScore * 0.2;

    return {
      overall: Math.min(overall, 100),
      frequency: frequencyScore,
      pattern: patternScore,
      behavior: behaviorScore,
      timing: timingScore,
      details: {
        requestRate,
        requestCount: fingerprint.behavior.requestCount,
        errorCount: fingerprint.behavior.errorCount,
        suspiciousCount: fingerprint.behavior.suspiciousCount,
      },
    };
  }

  /**
   * Calculate pattern-based anomaly score
   */
  private calculatePatternScore(
    request: {
      method: string;
      url: string;
      headers: Record<string, string>;
    },
    fingerprint: RequestFingerprint
  ): number {
    let score = 0;

    // Check for unusual headers
    const commonHeaders = ['user-agent', 'accept', 'accept-language', 'accept-encoding'];
    const headerCount = Object.keys(request.headers).length;
    const commonHeaderCount = commonHeaders.filter(h => request.headers[h]).length;

    if (headerCount < 3 || commonHeaderCount < 2) {
      score += 30; // Suspicious header pattern
    }

    // Check for unusual URL patterns
    if (request.url.length > 200) {
      score += 20; // Very long URL
    }

    if (request.url.includes('..') || request.url.includes('%2e%2e')) {
      score += 40; // Directory traversal attempt
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate behavior-based anomaly score
   */
  private calculateBehaviorScore(fingerprint: RequestFingerprint): number {
    let score = 0;

    // High error rate
    const errorRate = fingerprint.behavior.errorCount / fingerprint.behavior.requestCount;
    if (errorRate > 0.5) {
      score += 50;
    } else if (errorRate > 0.2) {
      score += 25;
    }

    // High suspicious activity rate
    const suspiciousRate = fingerprint.behavior.suspiciousCount / fingerprint.behavior.requestCount;
    if (suspiciousRate > 0.3) {
      score += 40;
    } else if (suspiciousRate > 0.1) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate timing-based anomaly score
   */
  private calculateTimingScore(
    request: {
      timestamp: number;
    },
    fingerprint: RequestFingerprint
  ): number {
    const timeSinceLastRequest = request.timestamp - fingerprint.behavior.lastSeen;

    // Very rapid requests
    if (timeSinceLastRequest < 50) {
      return 80;
    } else if (timeSinceLastRequest < 100) {
      return 40;
    } else if (timeSinceLastRequest < 500) {
      return 20;
    }

    return 0;
  }

  /**
   * Suggest mitigation for detected threat
   */
  private suggestMitigation(pattern: ThreatPattern): SecurityThreat['mitigation'] {
    switch (pattern.severity) {
      case 'critical':
        return {
          action: 'block',
          duration: 3600000, // 1 hour
          reason: `Critical threat detected: ${pattern.name}`,
        };
      case 'high':
        return {
          action: 'block',
          duration: 1800000, // 30 minutes
          reason: `High severity threat: ${pattern.name}`,
        };
      case 'medium':
        return {
          action: 'throttle',
          duration: 600000, // 10 minutes
          reason: `Medium threat detected: ${pattern.name}`,
        };
      case 'low':
        return {
          action: 'monitor',
          reason: `Low severity threat: ${pattern.name}`,
        };
      default:
        return {
          action: 'monitor',
          reason: 'Unknown threat pattern',
        };
    }
  }

  /**
   * Add custom threat pattern
   */
  addPattern(pattern: ThreatPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Remove threat pattern
   */
  removePattern(patternId: string): boolean {
    return this.patterns.delete(patternId);
  }

  /**
   * Get all patterns
   */
  getPatterns(): ThreatPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get detection statistics
   */
  getDetectionStats(): Record<string, unknown> {
    const recentThreats = this.detectionHistory.filter(
      threat => Date.now() - threat.timestamp < 3600000 // Last hour
    );

    const threatsByType = new Map<SecurityEventType, number>();
    const threatsBySeverity = new Map<ThreatSeverity, number>();

    recentThreats.forEach(threat => {
      threatsByType.set(threat.type, (threatsByType.get(threat.type) || 0) + 1);
      threatsBySeverity.set(threat.severity, (threatsBySeverity.get(threat.severity) || 0) + 1);
    });

    return {
      totalThreats: this.detectionHistory.length,
      recentThreats: recentThreats.length,
      threatsByType: Object.fromEntries(threatsByType),
      threatsBySeverity: Object.fromEntries(threatsBySeverity),
      activeFingerprints: this.fingerprints.size,
      patternsEnabled: Array.from(this.patterns.values()).filter(p => p.enabled).length,
      patternsTotal: this.patterns.size,
    };
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up old fingerprints
    for (const [ip, fingerprint] of this.fingerprints.entries()) {
      if (now - fingerprint.behavior.lastSeen > maxAge) {
        this.fingerprints.delete(ip);
      }
    }

    // Clean up old detection history
    this.detectionHistory = this.detectionHistory.filter(threat => now - threat.timestamp < maxAge);
  }

  /**
   * Destroy the engine and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.patterns.clear();
    this.fingerprints.clear();
    this.detectionHistory = [];
  }
}

export default ThreatDetectionEngine;
