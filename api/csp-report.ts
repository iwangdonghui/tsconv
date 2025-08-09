/**
 * CSP Violation Report Endpoint
 * 
 * This endpoint receives and processes Content Security Policy violation reports
 * from browsers when CSP policies are violated.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createCorsHeaders } from './utils/response';
import { CSPViolationReport, handleCSPViolation } from './middleware/csp';

// ============================================================================
// Types
// ============================================================================

interface CSPReportBody {
  'csp-report': CSPViolationReport;
}

interface ProcessedViolation {
  id: string;
  timestamp: number;
  userAgent: string;
  ip: string;
  violation: {
    directive: string;
    blockedUri: string;
    documentUri: string;
    sourceFile: string;
    lineNumber: number;
    columnNumber: number;
    sample: string;
  };
  severity: 'low' | 'medium' | 'high';
  category: string;
}

// ============================================================================
// Violation Analysis
// ============================================================================

/**
 * Categorizes CSP violations by type
 */
function categorizeViolation(report: CSPViolationReport): string {
  const directive = report['violated-directive'];
  const blockedUri = report['blocked-uri'];
  
  if (directive.includes('script-src')) {
    if (blockedUri.includes('eval') || blockedUri.includes('inline')) {
      return 'unsafe-script-execution';
    }
    return 'external-script-blocked';
  }
  
  if (directive.includes('style-src')) {
    if (blockedUri.includes('inline')) {
      return 'inline-style-blocked';
    }
    return 'external-style-blocked';
  }
  
  if (directive.includes('img-src')) {
    return 'image-source-blocked';
  }
  
  if (directive.includes('connect-src')) {
    return 'connection-blocked';
  }
  
  if (directive.includes('frame-src') || directive.includes('child-src')) {
    return 'frame-blocked';
  }
  
  return 'other-violation';
}

/**
 * Determines violation severity
 */
function assessViolationSeverity(report: CSPViolationReport): 'low' | 'medium' | 'high' {
  const directive = report['violated-directive'];
  const blockedUri = report['blocked-uri'];
  
  // High severity: Script execution attempts
  if (directive.includes('script-src') && 
      (blockedUri.includes('eval') || blockedUri.includes('javascript:'))) {
    return 'high';
  }
  
  // High severity: Frame injection attempts
  if (directive.includes('frame-src') && blockedUri.startsWith('http')) {
    return 'high';
  }
  
  // Medium severity: External resource loading
  if (blockedUri.startsWith('http') && !blockedUri.includes('localhost')) {
    return 'medium';
  }
  
  // Low severity: Inline styles, data URIs, etc.
  return 'low';
}

/**
 * Checks if violation should be ignored (common false positives)
 */
function shouldIgnoreViolation(report: CSPViolationReport): boolean {
  const blockedUri = report['blocked-uri'];
  const documentUri = report['document-uri'];
  
  // Ignore browser extension violations
  if (blockedUri.startsWith('chrome-extension://') || 
      blockedUri.startsWith('moz-extension://') ||
      blockedUri.startsWith('safari-extension://')) {
    return true;
  }
  
  // Ignore common browser injected scripts
  const ignoredPatterns = [
    'about:blank',
    'chrome://new-tab-page',
    'edge://new-tab-page',
    'safari://new-tab-page'
  ];
  
  return ignoredPatterns.some(pattern => 
    blockedUri.includes(pattern) || documentUri.includes(pattern)
  );
}

/**
 * Processes and enriches violation report
 */
function processViolation(
  report: CSPViolationReport, 
  req: VercelRequest
): ProcessedViolation {
  return {
    id: generateViolationId(),
    timestamp: Date.now(),
    userAgent: req.headers['user-agent'] || 'unknown',
    ip: req.headers['x-forwarded-for'] as string || 
        req.headers['x-real-ip'] as string || 
        'unknown',
    violation: {
      directive: report['violated-directive'],
      blockedUri: report['blocked-uri'],
      documentUri: report['document-uri'],
      sourceFile: report['source-file'] || '',
      lineNumber: report['line-number'] || 0,
      columnNumber: report['column-number'] || 0,
      sample: report['script-sample'] || ''
    },
    severity: assessViolationSeverity(report),
    category: categorizeViolation(report)
  };
}

/**
 * Generates unique violation ID
 */
function generateViolationId(): string {
  return `csp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Violation Storage and Reporting
// ============================================================================

/**
 * Stores violation for analysis (in production, use a proper database)
 */
async function storeViolation(violation: ProcessedViolation): Promise<void> {
  // In development/testing, just log to console
  if (process.env.NODE_ENV !== 'production') {
    console.log('CSP Violation Stored:', {
      id: violation.id,
      severity: violation.severity,
      category: violation.category,
      directive: violation.violation.directive,
      blockedUri: violation.violation.blockedUri
    });
    return;
  }
  
  // In production, you would store this in a database or send to monitoring service
  // Examples:
  // - Send to Sentry: Sentry.captureMessage('CSP Violation', { extra: violation });
  // - Store in database: await db.violations.create(violation);
  // - Send to analytics: await analytics.track('csp_violation', violation);
  
  console.warn('CSP Violation (Production):', violation);
}

/**
 * Sends violation to monitoring services
 */
async function reportToMonitoring(violation: ProcessedViolation): Promise<void> {
  // Only report high and medium severity violations to reduce noise
  if (violation.severity === 'low') {
    return;
  }
  
  try {
    // Example: Send to external monitoring service
    // await fetch('https://monitoring-service.com/csp-violations', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(violation)
    // });
    
    console.log('Violation reported to monitoring:', violation.id);
  } catch (error) {
    console.error('Failed to report violation to monitoring:', error);
  }
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
  
  // Only accept POST requests for CSP reports
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: 'CSP reports must be sent via POST'
    });
  }
  
  try {
    const startTime = Date.now();
    
    // Parse CSP report from request body
    const reportBody = req.body as CSPReportBody;
    
    if (!reportBody || !reportBody['csp-report']) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Report',
        message: 'CSP report body is missing or malformed'
      });
    }
    
    const cspReport = reportBody['csp-report'];
    
    // Check if violation should be ignored
    if (shouldIgnoreViolation(cspReport)) {
      return res.status(200).json({
        success: true,
        message: 'Violation ignored (known false positive)',
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: Math.floor(Date.now() / 1000)
        }
      });
    }
    
    // Process and enrich the violation report
    const processedViolation = processViolation(cspReport, req);
    
    // Store violation for analysis
    await storeViolation(processedViolation);
    
    // Report to monitoring services if needed
    await reportToMonitoring(processedViolation);
    
    // Handle violation using the CSP middleware handler
    handleCSPViolation(cspReport);
    
    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        violationId: processedViolation.id,
        severity: processedViolation.severity,
        category: processedViolation.category
      },
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: Math.floor(Date.now() / 1000)
      }
    });
    
  } catch (error) {
    console.error('CSP report processing error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to process CSP violation report'
    });
  }
}
