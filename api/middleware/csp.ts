/**
 * Content Security Policy (CSP) Middleware
 *
 * This middleware provides comprehensive CSP header configuration
 * with environment-specific policies and nonce generation.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import * as crypto from 'crypto';

// ============================================================================
// CSP Configuration Types
// ============================================================================

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'child-src'?: string[];
  'frame-src'?: string[];
  'worker-src'?: string[];
  'frame-ancestors'?: string[];
  'form-action'?: string[];
  'base-uri'?: string[];
  'manifest-src'?: string[];
  'prefetch-src'?: string[];
  'navigate-to'?: string[];
  'report-uri'?: string[];
  'report-to'?: string[];
  'require-trusted-types-for'?: string[];
  'trusted-types'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

export interface CSPOptions {
  directives: CSPDirectives;
  reportOnly?: boolean;
  useNonces?: boolean;
  nonceLength?: number;
  enableViolationReporting?: boolean;
  reportEndpoint?: string;
}

export interface CSPContext {
  nonce?: string;
  environment: 'development' | 'production' | 'test';
  userAgent?: string;
  origin?: string;
}

// ============================================================================
// Default CSP Configurations
// ============================================================================

const PRODUCTION_CSP: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'strict-dynamic'",
    // Allow specific trusted CDNs
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
    // Analytics and monitoring
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com',
    // Error reporting
    'https://browser.sentry.io',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS libraries
    'https://fonts.googleapis.com',
    'https://cdn.jsdelivr.net',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
    // Allow images from trusted sources
    'https://images.unsplash.com',
    'https://via.placeholder.com',
  ],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
  'connect-src': [
    "'self'",
    // API endpoints
    'https://api.tsconv.com',
    'https://tsconv.com',
    'https://tsconv.vercel.app', // Add Vercel API endpoint
    'https://*.upstash.io', // Redis endpoints
    // Analytics
    'https://www.google-analytics.com',
    'https://analytics.google.com',
    // Error reporting
    'https://sentry.io',
    'https://*.sentry.io',
    'https://*.ingest.us.sentry.io', // Sentry ingest endpoints
    'https://o4509814924640256.ingest.us.sentry.io', // Specific Sentry DSN
  ],
  'media-src': ["'self'", 'data:', 'blob:'],
  'object-src': ["'none'"],
  'child-src': ["'self'"],
  'frame-src': ["'none'"],
  'worker-src': ["'self'", 'blob:'],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': true,
  'block-all-mixed-content': true,
};

const DEVELOPMENT_CSP: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'", // Required for development tools
    'localhost:*',
    '127.0.0.1:*',
    'https://cdn.jsdelivr.net',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'localhost:*',
    '127.0.0.1:*',
    'https://fonts.googleapis.com',
  ],
  'img-src': ["'self'", 'data:', 'blob:', 'https:', 'http:', 'localhost:*', '127.0.0.1:*'],
  'font-src': ["'self'", 'data:', 'localhost:*', '127.0.0.1:*', 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    'localhost:*',
    '127.0.0.1:*',
    'ws://localhost:*',
    'ws://127.0.0.1:*',
    'wss://localhost:*',
    'https:',
  ],
  'media-src': ["'self'", 'data:', 'blob:', 'localhost:*'],
  'object-src': ["'none'"],
  'child-src': ["'self'", 'localhost:*'],
  'frame-src': ["'self'", 'localhost:*'],
  'worker-src': ["'self'", 'blob:', 'localhost:*'],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'", 'localhost:*'],
  'base-uri': ["'self'"],
  'manifest-src': ["'self'", 'localhost:*'],
};

const TEST_CSP: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'"],
  'media-src': ["'self'", 'data:', 'blob:'],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
};

// ============================================================================
// CSP Utility Functions
// ============================================================================

/**
 * Generates a cryptographically secure nonce
 */
export function generateNonce(length: number = 16): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Builds CSP directive string from array of sources
 */
function buildDirective(sources: string[]): string {
  return sources.join(' ');
}

/**
 * Converts CSP directives object to policy string
 */
export function buildCSPPolicy(directives: CSPDirectives, nonce?: string): string {
  const policies: string[] = [];

  for (const [directive, sources] of Object.entries(directives)) {
    if (sources === true) {
      // Boolean directives (upgrade-insecure-requests, block-all-mixed-content)
      policies.push(directive.replace(/([A-Z])/g, '-$1').toLowerCase());
    } else if (Array.isArray(sources) && sources.length > 0) {
      const directiveSources = [...sources];

      // Add nonce to script-src and style-src if provided
      if (nonce && (directive === 'script-src' || directive === 'style-src')) {
        directiveSources.push(`'nonce-${nonce}'`);
      }

      const directiveName = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
      policies.push(`${directiveName} ${buildDirective(directiveSources)}`);
    }
  }

  return policies.join('; ');
}

/**
 * Gets environment-specific CSP configuration
 */
export function getEnvironmentCSP(environment: string): CSPDirectives {
  switch (environment) {
    case 'production':
      return PRODUCTION_CSP;
    case 'development':
      return DEVELOPMENT_CSP;
    case 'test':
      return TEST_CSP;
    default:
      return PRODUCTION_CSP;
  }
}

/**
 * Merges custom CSP directives with environment defaults
 */
export function mergeCSPDirectives(
  base: CSPDirectives,
  custom: Partial<CSPDirectives>
): CSPDirectives {
  const merged = { ...base };

  for (const [directive, sources] of Object.entries(custom)) {
    if (sources === true || sources === false) {
      merged[directive as keyof CSPDirectives] = sources as any;
    } else if (Array.isArray(sources)) {
      const existingSources = (merged[directive as keyof CSPDirectives] as string[]) || [];
      merged[directive as keyof CSPDirectives] = [...existingSources, ...sources] as any;
    }
  }

  return merged;
}

// ============================================================================
// CSP Middleware
// ============================================================================

/**
 * Creates CSP middleware with configurable options
 */
export function createCSPMiddleware(options: Partial<CSPOptions> = {}) {
  const {
    reportOnly = false,
    useNonces = true,
    nonceLength = 16,
    enableViolationReporting = true,
    reportEndpoint = '/api/csp-report',
  } = options;

  return (req: VercelRequest, res: VercelResponse, next?: () => void) => {
    const environment = process.env.NODE_ENV || 'production';
    const userAgent = req.headers['user-agent'];
    const origin = req.headers.origin;
    void userAgent; // avoid TS6133 in minimal middleware
    void origin; // avoid TS6133 in minimal middleware

    // Generate nonce if enabled
    const nonce = useNonces ? generateNonce(nonceLength) : undefined;

    // Get base CSP configuration for environment
    let cspDirectives = getEnvironmentCSP(environment);

    // Merge with custom directives if provided
    if (options.directives) {
      cspDirectives = mergeCSPDirectives(cspDirectives, options.directives);
    }

    // Add violation reporting if enabled
    if (enableViolationReporting && reportEndpoint) {
      cspDirectives['report-uri'] = [reportEndpoint];
    }

    // Build CSP policy string
    const cspPolicy = buildCSPPolicy(cspDirectives, nonce);

    // Set CSP header
    const headerName = reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    res.setHeader(headerName, cspPolicy);

    // Add nonce to request context for use in templates
    if (nonce) {
      (req as any).cspNonce = nonce;
      res.setHeader('X-CSP-Nonce', nonce);
    }

    // Add CSP context to response locals for debugging
    if (environment === 'development') {
      res.setHeader('X-CSP-Environment', environment);
      res.setHeader('X-CSP-Policy-Length', cspPolicy.length.toString());
    }

    if (next) {
      return next();
    }

    return undefined;
  };
}

/**
 * Default CSP middleware with production-ready configuration
 */
export const defaultCSPMiddleware = createCSPMiddleware({
  useNonces: true,
  enableViolationReporting: true,
  reportEndpoint: '/api/csp-report',
});

/**
 * Development CSP middleware with relaxed policies
 */
export const developmentCSPMiddleware = createCSPMiddleware({
  useNonces: false,
  enableViolationReporting: false,
  directives: DEVELOPMENT_CSP,
});

/**
 * Report-only CSP middleware for testing new policies
 */
export const reportOnlyCSPMiddleware = createCSPMiddleware({
  reportOnly: true,
  useNonces: true,
  enableViolationReporting: true,
  reportEndpoint: '/api/csp-report',
});

// ============================================================================
// CSP Violation Reporting
// ============================================================================

export interface CSPViolationReport {
  'document-uri': string;
  referrer: string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  disposition: string;
  'blocked-uri': string;
  'line-number': number;
  'column-number': number;
  'source-file': string;
  'status-code': number;
  'script-sample': string;
}

/**
 * Handles CSP violation reports
 */
export function handleCSPViolation(report: CSPViolationReport): void {
  // Log violation for monitoring
  console.warn('CSP Violation:', {
    directive: report['violated-directive'],
    blockedUri: report['blocked-uri'],
    documentUri: report['document-uri'],
    sourceFile: report['source-file'],
    lineNumber: report['line-number'],
  });

  // In production, you might want to send this to a monitoring service
  // like Sentry, DataDog, or a custom analytics endpoint
}

// All functions and constants are already exported above with their definitions
