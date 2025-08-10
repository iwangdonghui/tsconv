/**
 * Security Headers Audit Utility
 *
 * This utility provides comprehensive analysis and scoring of HTTP security headers
 * to help identify security vulnerabilities and compliance issues.
 */

import { VercelResponse } from '@vercel/node';

// ============================================================================
// Security Audit Types
// ============================================================================

export interface SecurityHeaderRule {
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  required: boolean;
  validator?: (value: string) => boolean;
  recommendations?: string[];
}

export interface SecurityAuditResult {
  header: string;
  present: boolean;
  value?: string;
  score: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass';
  issues: string[];
  recommendations: string[];
}

export interface SecurityAuditReport {
  overallScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  totalHeaders: number;
  passedHeaders: number;
  failedHeaders: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  results: SecurityAuditResult[];
  summary: string;
  recommendations: string[];
}

// ============================================================================
// Security Header Rules
// ============================================================================

export const SECURITY_HEADER_RULES: Record<string, SecurityHeaderRule> = {
  'Content-Security-Policy': {
    name: 'Content Security Policy',
    description: 'Prevents XSS and data injection attacks',
    severity: 'critical',
    required: true,
    validator: (value: string) => {
      // Check for unsafe directives
      const unsafePatterns = ['unsafe-inline', 'unsafe-eval', '*'];
      const hasUnsafe = unsafePatterns.some(pattern => value.includes(pattern));
      return !hasUnsafe && value.includes('default-src');
    },
    recommendations: [
      'Use strict CSP policies',
      'Avoid unsafe-inline and unsafe-eval',
      'Use nonces or hashes for inline scripts',
      'Implement report-uri for violation monitoring',
    ],
  },

  'Strict-Transport-Security': {
    name: 'HTTP Strict Transport Security',
    description: 'Enforces HTTPS connections',
    severity: 'high',
    required: true,
    validator: (value: string) => {
      const maxAge = value.match(/max-age=(\d+)/);
      return maxAge && parseInt(maxAge[1]) >= 31536000; // At least 1 year
    },
    recommendations: [
      'Set max-age to at least 1 year (31536000 seconds)',
      'Include includeSubDomains directive',
      'Consider adding preload directive',
    ],
  },

  'X-Frame-Options': {
    name: 'Frame Options',
    description: 'Prevents clickjacking attacks',
    severity: 'high',
    required: true,
    validator: (value: string) => {
      return ['DENY', 'SAMEORIGIN'].includes(value.toUpperCase());
    },
    recommendations: [
      'Use DENY for maximum protection',
      'Use SAMEORIGIN if framing is needed within same origin',
      'Consider migrating to CSP frame-ancestors directive',
    ],
  },

  'X-Content-Type-Options': {
    name: 'Content Type Options',
    description: 'Prevents MIME type sniffing',
    severity: 'medium',
    required: true,
    validator: (value: string) => {
      return value.toLowerCase() === 'nosniff';
    },
    recommendations: ['Always set to "nosniff"', 'Ensure proper Content-Type headers are set'],
  },

  'X-XSS-Protection': {
    name: 'XSS Protection',
    description: 'Enables browser XSS filtering',
    severity: 'medium',
    required: true,
    validator: (value: string) => {
      return value.startsWith('1') && value.includes('mode=block');
    },
    recommendations: [
      'Set to "1; mode=block" for maximum protection',
      'Consider disabling if using strong CSP',
      'Monitor for false positives',
    ],
  },

  'Referrer-Policy': {
    name: 'Referrer Policy',
    description: 'Controls referrer information leakage',
    severity: 'medium',
    required: true,
    validator: (value: string) => {
      const secureValues = ['no-referrer', 'strict-origin', 'strict-origin-when-cross-origin'];
      return secureValues.includes(value);
    },
    recommendations: [
      'Use strict-origin-when-cross-origin for balanced security',
      'Use no-referrer for maximum privacy',
      'Avoid unsafe-url and origin-when-cross-origin',
    ],
  },

  'Permissions-Policy': {
    name: 'Permissions Policy',
    description: 'Controls browser feature access',
    severity: 'medium',
    required: true,
    validator: (value: string) => {
      // Check if dangerous features are restricted
      const dangerousFeatures = ['camera', 'microphone', 'geolocation', 'payment'];
      return dangerousFeatures.every(
        feature => value.includes(`${feature}=()`) || !value.includes(feature)
      );
    },
    recommendations: [
      'Disable unused browser features',
      'Restrict dangerous features like camera, microphone',
      'Use allowlists for required features',
    ],
  },

  'Cross-Origin-Embedder-Policy': {
    name: 'Cross-Origin Embedder Policy',
    description: 'Controls cross-origin resource embedding',
    severity: 'low',
    required: false,
    validator: (value: string) => {
      return ['require-corp', 'credentialless'].includes(value);
    },
    recommendations: [
      'Use require-corp for strict isolation',
      'Use credentialless for compatibility',
      'Test thoroughly before deployment',
    ],
  },

  'Cross-Origin-Opener-Policy': {
    name: 'Cross-Origin Opener Policy',
    description: 'Controls cross-origin window access',
    severity: 'low',
    required: false,
    validator: (value: string) => {
      return ['same-origin', 'same-origin-allow-popups'].includes(value);
    },
    recommendations: [
      'Use same-origin for strict isolation',
      'Use same-origin-allow-popups if popups are needed',
    ],
  },

  'Cross-Origin-Resource-Policy': {
    name: 'Cross-Origin Resource Policy',
    description: 'Controls cross-origin resource access',
    severity: 'low',
    required: false,
    validator: (value: string) => {
      return ['same-site', 'same-origin', 'cross-origin'].includes(value);
    },
    recommendations: [
      'Use same-origin for maximum protection',
      'Use same-site for related domains',
      'Use cross-origin only when necessary',
    ],
  },

  'Expect-CT': {
    name: 'Certificate Transparency',
    description: 'Enforces Certificate Transparency compliance',
    severity: 'low',
    required: false,
    validator: (value: string) => {
      return value.includes('max-age=') && parseInt(value.match(/max-age=(\d+)/)?.[1] || '0') > 0;
    },
    recommendations: [
      'Set appropriate max-age value',
      'Use enforce directive for strict compliance',
      'Monitor CT logs for certificate issues',
    ],
  },
};

// ============================================================================
// Audit Functions
// ============================================================================

/**
 * Audits security headers from a response object
 */
export function auditSecurityHeaders(res: VercelResponse): SecurityAuditReport {
  const results: SecurityAuditResult[] = [];
  let totalScore = 0;
  let maxScore = 0;

  let criticalIssues = 0;
  let highIssues = 0;
  let mediumIssues = 0;
  let lowIssues = 0;

  // Audit each security header
  Object.entries(SECURITY_HEADER_RULES).forEach(([headerName, rule]) => {
    const headerValue = res.getHeader(headerName)?.toString();
    const result = auditSingleHeader(headerName, headerValue, rule);

    results.push(result);
    totalScore += result.score;
    maxScore += 100; // Each header can contribute max 100 points

    // Count issues by severity
    if (result.severity === 'critical') criticalIssues++;
    else if (result.severity === 'high') highIssues++;
    else if (result.severity === 'medium') mediumIssues++;
    else if (result.severity === 'low') lowIssues++;
  });

  const overallScore = Math.round((totalScore / maxScore) * 100);
  const grade = calculateGrade(overallScore);

  const passedHeaders = results.filter(r => r.severity === 'pass').length;
  const failedHeaders = results.length - passedHeaders;

  return {
    overallScore,
    grade,
    totalHeaders: results.length,
    passedHeaders,
    failedHeaders,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    results,
    summary: generateSummary(overallScore, criticalIssues, highIssues),
    recommendations: generateRecommendations(results),
  };
}

/**
 * Audits a single security header
 */
function auditSingleHeader(
  headerName: string,
  headerValue: string | undefined,
  rule: SecurityHeaderRule
): SecurityAuditResult {
  const issues: string[] = [];
  let score = 0;
  let severity: SecurityAuditResult['severity'] = rule.severity;

  if (!headerValue) {
    if (rule.required) {
      issues.push(`Missing required security header: ${rule.name}`);
      score = 0;
    } else {
      issues.push(`Optional security header not present: ${rule.name}`);
      score = 50; // Partial credit for optional headers
      severity = 'info';
    }
  } else {
    // Header is present, validate its value
    if (rule.validator) {
      if (rule.validator(headerValue)) {
        score = 100;
        severity = 'pass';
      } else {
        issues.push(`Invalid or weak configuration for ${rule.name}`);
        score = 30; // Some credit for having the header
      }
    } else {
      // No validator, just check presence
      score = 100;
      severity = 'pass';
    }
  }

  return {
    header: headerName,
    present: !!headerValue,
    value: headerValue,
    score,
    severity,
    issues,
    recommendations: rule.recommendations || [],
  };
}

/**
 * Calculates letter grade from numeric score
 */
function calculateGrade(score: number): SecurityAuditReport['grade'] {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Generates summary text
 */
function generateSummary(score: number, critical: number, high: number): string {
  if (critical > 0) {
    return `Critical security issues detected. Immediate action required.`;
  }

  if (high > 0) {
    return `High-priority security issues found. Address these soon.`;
  }

  if (score >= 90) {
    return `Excellent security header configuration.`;
  }

  if (score >= 80) {
    return `Good security header configuration with room for improvement.`;
  }

  if (score >= 70) {
    return `Adequate security headers but several improvements needed.`;
  }

  return `Poor security header configuration. Significant improvements required.`;
}

/**
 * Generates prioritized recommendations
 */
function generateRecommendations(results: SecurityAuditResult[]): string[] {
  const recommendations: string[] = [];

  // Critical and high severity issues first
  results
    .filter(r => r.severity === 'critical' || r.severity === 'high')
    .forEach(result => {
      if (result.issues.length > 0) {
        recommendations.push(`${result.header}: ${result.issues[0]}`);
      }
    });

  // Add specific recommendations for failed headers
  results
    .filter(r => r.severity !== 'pass' && r.recommendations.length > 0)
    .slice(0, 5) // Limit to top 5 recommendations
    .forEach(result => {
      recommendations.push(`${result.header}: ${result.recommendations[0]}`);
    });

  return recommendations;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if the current request is over HTTPS
 */
export function isSecureConnection(req: any): boolean {
  return (
    req.headers['x-forwarded-proto'] === 'https' ||
    req.headers['x-forwarded-ssl'] === 'on' ||
    req.connection?.encrypted === true
  );
}

/**
 * Gets security headers from response for analysis
 */
export function extractSecurityHeaders(res: VercelResponse): Record<string, string> {
  const headers: Record<string, string> = {};

  Object.keys(SECURITY_HEADER_RULES).forEach(headerName => {
    const value = res.getHeader(headerName);
    if (value) {
      headers[headerName] = value.toString();
    }
  });

  return headers;
}

/**
 * Validates CSP policy for common issues
 */
export function validateCSPPolicy(policy: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for unsafe directives
  if (policy.includes("'unsafe-inline'")) {
    issues.push("Contains 'unsafe-inline' directive");
  }

  if (policy.includes("'unsafe-eval'")) {
    issues.push("Contains 'unsafe-eval' directive");
  }

  if (policy.includes('*') && !policy.includes('*.')) {
    issues.push('Contains wildcard (*) source');
  }

  // Check for missing important directives
  if (!policy.includes('default-src')) {
    issues.push("Missing 'default-src' directive");
  }

  if (!policy.includes('script-src')) {
    issues.push("Missing 'script-src' directive");
  }

  if (!policy.includes('object-src')) {
    issues.push("Missing 'object-src' directive");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Generates security headers report in JSON format
 */
export function generateSecurityReport(res: VercelResponse): SecurityAuditReport {
  return auditSecurityHeaders(res);
}

/**
 * Generates security headers report in HTML format
 */
export function generateSecurityReportHTML(report: SecurityAuditReport): string {
  const gradeColor = {
    'A+': '#00C851',
    A: '#00C851',
    B: '#ffbb33',
    C: '#ff8800',
    D: '#ff4444',
    F: '#CC0000',
  }[report.grade];

  return `
    <html>
      <head>
        <title>Security Headers Audit Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .grade { font-size: 48px; color: ${gradeColor}; font-weight: bold; }
          .score { font-size: 24px; margin: 10px 0; }
          .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
          .header-result { margin: 10px 0; padding: 10px; border-left: 4px solid #ddd; }
          .pass { border-left-color: #00C851; }
          .critical { border-left-color: #CC0000; }
          .high { border-left-color: #ff4444; }
          .medium { border-left-color: #ffbb33; }
          .low { border-left-color: #33b5e5; }
        </style>
      </head>
      <body>
        <h1>Security Headers Audit Report</h1>
        <div class="grade">${report.grade}</div>
        <div class="score">Score: ${report.overallScore}/100</div>
        <div class="summary">
          <h3>Summary</h3>
          <p>${report.summary}</p>
          <p>Headers: ${report.passedHeaders}/${report.totalHeaders} passed</p>
          <p>Issues: ${report.criticalIssues} critical, ${report.highIssues} high, ${report.mediumIssues} medium, ${report.lowIssues} low</p>
        </div>
        
        <h3>Header Details</h3>
        ${report.results
          .map(
            result => `
          <div class="header-result ${result.severity}">
            <h4>${result.header} (${result.score}/100)</h4>
            <p><strong>Present:</strong> ${result.present ? 'Yes' : 'No'}</p>
            ${result.value ? `<p><strong>Value:</strong> ${result.value}</p>` : ''}
            ${result.issues.length > 0 ? `<p><strong>Issues:</strong> ${result.issues.join(', ')}</p>` : ''}
          </div>
        `
          )
          .join('')}
        
        <h3>Recommendations</h3>
        <ul>
          ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </body>
    </html>
  `;
}

// ============================================================================
// Exports
// ============================================================================

export { auditSingleHeader, calculateGrade, generateSummary, generateRecommendations };
