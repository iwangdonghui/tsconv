/**
 * Security Headers Middleware
 *
 * This middleware applies comprehensive security headers including CSP,
 * HSTS, frame options, and other security-related HTTP headers.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import config from '../config/config';
import { createCSPMiddleware, CSPOptions } from './csp';

// ============================================================================
// Security Headers Configuration
// ============================================================================

export interface SecurityHeadersConfig {
  csp?: {
    enabled?: boolean;
    options?: Partial<CSPOptions>;
  };
  hsts?: {
    enabled?: boolean;
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  frameOptions?: string;
  contentTypeOptions?: string;
  xssProtection?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  crossOriginEmbedderPolicy?: string;
  crossOriginOpenerPolicy?: string;
  crossOriginResourcePolicy?: string;
}

// ============================================================================
// Default Security Headers
// ============================================================================

const DEFAULT_SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // XSS protection (legacy but still useful)
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy (feature policy)
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',

  // Cross-origin policies
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',

  // Prevent DNS prefetching
  'X-DNS-Prefetch-Control': 'off',

  // Download options for IE
  'X-Download-Options': 'noopen',

  // Prevent content type sniffing in IE
  'X-Permitted-Cross-Domain-Policies': 'none',
};

// ============================================================================
// HSTS Configuration
// ============================================================================

/**
 * Builds HSTS header value
 */
function buildHSTSHeader(config: SecurityHeadersConfig['hsts'] = {}): string {
  const {
    maxAge = 31536000, // 1 year
    includeSubDomains = true,
    preload = false,
  } = config;

  let hstsValue = `max-age=${maxAge}`;

  if (includeSubDomains) {
    hstsValue += '; includeSubDomains';
  }

  if (preload) {
    hstsValue += '; preload';
  }

  return hstsValue;
}

// ============================================================================
// Environment-Specific Headers
// ============================================================================

/**
 * Gets environment-specific security headers
 */
function getEnvironmentHeaders(environment: string): Record<string, string> {
  const headers: Record<string, string> = { ...DEFAULT_SECURITY_HEADERS };

  switch (environment) {
    case 'development':
      // Relax some restrictions for development
      headers['Cross-Origin-Embedder-Policy'] = 'unsafe-none';
      headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
      // Remove HSTS in development if present
      if ('Strict-Transport-Security' in headers) {
        delete headers['Strict-Transport-Security'];
      }
      break;

    case 'test':
      // Minimal headers for testing
      headers['Cross-Origin-Embedder-Policy'] = 'unsafe-none';
      headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
      if ('Strict-Transport-Security' in headers) {
        delete headers['Strict-Transport-Security'];
      }
      break;

    case 'production':
      // Full security headers for production
      headers['Strict-Transport-Security'] = buildHSTSHeader({
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      });
      break;
  }

  return headers;
}

// ============================================================================
// Security Headers Middleware
// ============================================================================

/**
 * Creates security headers middleware
 */
export function createSecurityHeadersMiddleware(customConfig: SecurityHeadersConfig = {}) {
  const environment = process.env.NODE_ENV || 'production';
  const securityConfig = config.security;

  // Create CSP middleware if enabled
  const cspMiddleware =
    customConfig.csp?.enabled !== false && securityConfig.csp.enabled
      ? createCSPMiddleware({
          reportOnly: securityConfig.csp.reportOnly,
          useNonces: securityConfig.csp.useNonces,
          enableViolationReporting: securityConfig.csp.enableViolationReporting,
          reportEndpoint: securityConfig.csp.reportEndpoint,
          ...customConfig.csp?.options,
        })
      : null;

  return (req: VercelRequest, res: VercelResponse, next?: () => void) => {
    // Apply CSP headers first
    if (cspMiddleware) {
      cspMiddleware(req, res);
    }

    // Get environment-specific headers
    const environmentHeaders = getEnvironmentHeaders(environment);

    // Apply custom configuration overrides
    const finalHeaders = { ...environmentHeaders };

    // Override with custom config
    if (customConfig.frameOptions) {
      finalHeaders['X-Frame-Options'] = customConfig.frameOptions;
    }

    if (customConfig.contentTypeOptions) {
      finalHeaders['X-Content-Type-Options'] = customConfig.contentTypeOptions;
    }

    if (customConfig.xssProtection) {
      finalHeaders['X-XSS-Protection'] = customConfig.xssProtection;
    }

    if (customConfig.referrerPolicy) {
      finalHeaders['Referrer-Policy'] = customConfig.referrerPolicy;
    }

    if (customConfig.permissionsPolicy) {
      finalHeaders['Permissions-Policy'] = customConfig.permissionsPolicy;
    }

    if (customConfig.crossOriginEmbedderPolicy) {
      finalHeaders['Cross-Origin-Embedder-Policy'] = customConfig.crossOriginEmbedderPolicy;
    }

    if (customConfig.crossOriginOpenerPolicy) {
      finalHeaders['Cross-Origin-Opener-Policy'] = customConfig.crossOriginOpenerPolicy;
    }

    if (customConfig.crossOriginResourcePolicy) {
      finalHeaders['Cross-Origin-Resource-Policy'] = customConfig.crossOriginResourcePolicy;
    }

    // Apply HSTS if enabled and in production/staging
    if (
      customConfig.hsts?.enabled !== false &&
      securityConfig.headers.hsts.enabled &&
      environment === 'production'
    ) {
      finalHeaders['Strict-Transport-Security'] = buildHSTSHeader({
        maxAge: securityConfig.headers.hsts.maxAge,
        includeSubDomains: securityConfig.headers.hsts.includeSubDomains,
        preload: securityConfig.headers.hsts.preload,
        ...customConfig.hsts,
      });
    }

    // Apply all security headers
    Object.entries(finalHeaders).forEach(([name, value]) => {
      res.setHeader(name, value);
    });

    // Add security context to response for debugging
    if (environment === 'development') {
      res.setHeader('X-Security-Headers-Applied', Object.keys(finalHeaders).length.toString());
      res.setHeader('X-Security-Environment', environment);
    }

    if (next) {
      return next();
    }

    return undefined;
  };
}

/**
 * Default security headers middleware with production-ready configuration
 */
export const defaultSecurityHeadersMiddleware = createSecurityHeadersMiddleware({
  csp: {
    enabled: true,
    options: {
      useNonces: true,
      enableViolationReporting: true,
    },
  },
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Development security headers middleware with relaxed policies
 */
export const developmentSecurityHeadersMiddleware = createSecurityHeadersMiddleware({
  csp: {
    enabled: true,
    options: {
      useNonces: false,
      enableViolationReporting: false,
    },
  },
  hsts: {
    enabled: false,
  },
  crossOriginEmbedderPolicy: 'unsafe-none',
  crossOriginResourcePolicy: 'cross-origin',
});

/**
 * API-specific security headers middleware
 */
export const apiSecurityHeadersMiddleware = createSecurityHeadersMiddleware({
  csp: {
    enabled: true,
    options: {
      directives: {
        'default-src': ["'none'"],
        'script-src': ["'none'"],
        'style-src': ["'none'"],
        'img-src': ["'none'"],
        'font-src': ["'none'"],
        'connect-src': ["'none'"],
        'media-src': ["'none'"],
        'object-src': ["'none'"],
        'child-src': ["'none'"],
        'frame-src': ["'none'"],
        'worker-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'none'"],
        'base-uri': ["'none'"],
      },
    },
  },
  frameOptions: 'DENY',
  crossOriginResourcePolicy: 'same-origin',
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if request is from a secure context
 */
export function isSecureContext(req: VercelRequest): boolean {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  return protocol === 'https';
}

/**
 * Gets security headers summary for debugging
 */
export function getSecurityHeadersSummary(res: VercelResponse): Record<string, string> {
  const headers: Record<string, string> = {};

  const securityHeaderNames = [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Permissions-Policy',
    'Cross-Origin-Embedder-Policy',
    'Cross-Origin-Opener-Policy',
    'Cross-Origin-Resource-Policy',
  ];

  securityHeaderNames.forEach(name => {
    const value = res.getHeader(name);
    if (value) {
      headers[name] = value.toString();
    }
  });

  return headers;
}

// ============================================================================
// Exports
// ============================================================================

export { buildHSTSHeader, DEFAULT_SECURITY_HEADERS, getEnvironmentHeaders };
