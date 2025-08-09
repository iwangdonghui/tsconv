/**
 * Security Headers Audit API Endpoint
 * 
 * This endpoint provides comprehensive security headers analysis and scoring
 * for the current application or external URLs.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createCorsHeaders } from './utils/response';
import { 
  auditSecurityHeaders, 
  generateSecurityReportHTML,
  SecurityAuditReport,
  isSecureConnection
} from './utils/security-audit';
import { maximumSecurityHeadersMiddleware } from './middleware/enhanced-security-headers';

// ============================================================================
// Types
// ============================================================================

interface AuditRequest {
  url?: string;
  format?: 'json' | 'html';
  includeRecommendations?: boolean;
  checkExternal?: boolean;
}

interface ExternalAuditResult {
  url: string;
  headers: Record<string, string>;
  audit: SecurityAuditReport;
  timestamp: number;
}

// ============================================================================
// External URL Audit
// ============================================================================

/**
 * Audits security headers of an external URL
 */
async function auditExternalURL(url: string): Promise<ExternalAuditResult> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Security-Headers-Audit/1.0'
      }
    });
    
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Create a mock response object for audit
    const mockRes = {
      getHeader: (name: string) => headers[name.toLowerCase()],
      getHeaders: () => headers
    } as any;
    
    const audit = auditSecurityHeaders(mockRes);
    
    return {
      url,
      headers,
      audit,
      timestamp: Date.now()
    };
    
  } catch (error) {
    throw new Error(`Failed to audit external URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates URL format
 */
function isValidURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// ============================================================================
// Self Audit
// ============================================================================

/**
 * Performs self-audit by applying security headers and analyzing them
 */
function performSelfAudit(req: VercelRequest): SecurityAuditReport {
  // Create a mock response to apply headers to
  const mockRes = {
    headers: {} as Record<string, string>,
    setHeader: function(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    getHeader: function(name: string) {
      return this.headers[name.toLowerCase()];
    },
    getHeaders: function() {
      return this.headers;
    },
    removeHeader: function(name: string) {
      delete this.headers[name.toLowerCase()];
    }
  } as any;
  
  // Apply our security headers
  maximumSecurityHeadersMiddleware(req, mockRes);
  
  // Audit the applied headers
  return auditSecurityHeaders(mockRes);
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const corsHeaders = createCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only accept GET and POST requests
  if (!['GET', 'POST'].includes(req.method || '')) {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: 'Only GET and POST methods are allowed'
    });
  }
  
  try {
    const startTime = Date.now();
    
    // Parse request parameters
    const params: AuditRequest = {
      ...req.query,
      ...req.body
    };
    
    const {
      url,
      format = 'json',
      includeRecommendations = true,
      checkExternal = false
    } = params;
    
    let auditResult: SecurityAuditReport | ExternalAuditResult;
    
    if (checkExternal && url) {
      // Audit external URL
      if (!isValidURL(url)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL',
          message: 'Please provide a valid HTTP or HTTPS URL'
        });
      }
      
      auditResult = await auditExternalURL(url);
    } else {
      // Perform self-audit
      auditResult = performSelfAudit(req);
    }
    
    // Return HTML format if requested
    if (format === 'html') {
      const report = 'audit' in auditResult ? auditResult.audit : auditResult;
      const htmlReport = generateSecurityReportHTML(report);
      
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(htmlReport);
    }
    
    // Return JSON format
    const responseData = {
      success: true,
      data: {
        audit: auditResult,
        analysis: {
          isSecure: isSecureConnection(req),
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString(),
          auditType: checkExternal && url ? 'external' : 'self'
        }
      },
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: Math.floor(Date.now() / 1000),
        version: '1.0.0'
      }
    };
    
    // Filter out recommendations if not requested
    if (!includeRecommendations && 'recommendations' in responseData.data.audit) {
      delete responseData.data.audit.recommendations;
      responseData.data.audit.results.forEach(result => {
        delete result.recommendations;
      });
    }
    
    return res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Security audit error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to perform security audit'
    });
  }
}

// ============================================================================
// Utility Functions for Testing
// ============================================================================

/**
 * Quick security check for development
 */
export function quickSecurityCheck(req: VercelRequest): {
  score: number;
  grade: string;
  criticalIssues: number;
  recommendations: string[];
} {
  const audit = performSelfAudit(req);
  
  return {
    score: audit.overallScore,
    grade: audit.grade,
    criticalIssues: audit.criticalIssues,
    recommendations: audit.recommendations.slice(0, 3) // Top 3 recommendations
  };
}

/**
 * Checks if basic security headers are present
 */
export function hasBasicSecurityHeaders(res: VercelResponse): boolean {
  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection'
  ];
  
  return requiredHeaders.every(header => res.getHeader(header));
}

/**
 * Gets security score for monitoring
 */
export function getSecurityScore(req: VercelRequest): number {
  const audit = performSelfAudit(req);
  return audit.overallScore;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  auditExternalURL,
  performSelfAudit,
  isValidURL
};
